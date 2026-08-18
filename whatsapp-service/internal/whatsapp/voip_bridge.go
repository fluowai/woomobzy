package whatsapp

import (
	"context"
	"fmt"
	"sync"

	"go.mau.fi/whatsmeow"
	waBinary "go.mau.fi/whatsmeow/binary"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/voip"
	"whatsapp-service/internal/voip/call"
	"whatsapp-service/internal/voip/core"
	"whatsapp-service/internal/voip/signaling"
	"whatsapp-service/internal/wa"
)

var _ CallBridge = (*voipBridge)(nil)

type activeVoipCall struct {
	cm     *call.CallManager
	bridge *voip.Bridge
}

type voipBridge struct {
	waClient *whatsmeow.Client
	logger   *zap.Logger

	mu          sync.RWMutex
	activeCalls map[string]*activeVoipCall

	onIncomingCall    func(callID string, peerJID types.JID)
	onCallStateChange func(callID string, status models.CallStatus)
	onCallEnded       func(callID string, reason models.CallEndReason)
	onPeerAudio       func(callID string, pcm []float32)
}

func newVoipBridge(waClient *whatsmeow.Client, logger *zap.Logger) *voipBridge {
	return &voipBridge{
		waClient:    waClient,
		logger:      logger,
		activeCalls: make(map[string]*activeVoipCall),
	}
}

func (b *voipBridge) newCallManager() *call.CallManager {
	sock := wa.NewSocket(b.waClient)
	cm := call.NewCallManager(sock, b.logger.Sugar())
	return cm
}

func (b *voipBridge) StartCall(ctx context.Context, peerJID types.JID, isVideo bool) (string, error) {
	callID := signaling.GenerateCallID()
	cm := b.newCallManager()

	cm.OnStateChange = func(ci *call.CallInfo) {
		status := voipStateToStatus(ci.StateData.State)
		if b.onCallStateChange != nil {
			b.onCallStateChange(ci.CallID, status)
		}
	}
	cm.OnEnded = func(ci *call.CallInfo) {
		reason := voipEndReason(ci.StateData.EndReason)
		if b.onCallEnded != nil {
			b.onCallEnded(ci.CallID, reason)
		}
		b.cleanupCall(ci.CallID)
	}
	cm.OnPeerAudio = func(pcm []float32) {
		ac, _ := b.getActiveCall(callID)
		if ac != nil && ac.bridge != nil {
			_ = ac.bridge.WritePCM(pcm)
		}
		if b.onPeerAudio != nil {
			b.onPeerAudio(callID, pcm)
		}
	}

	if err := cm.StartCall(ctx, callID, peerJID, isVideo); err != nil {
		return "", err
	}

	b.mu.Lock()
	b.activeCalls[callID] = &activeVoipCall{cm: cm}
	b.mu.Unlock()

	return callID, nil
}

func (b *voipBridge) AcceptCall(ctx context.Context, callID string) error {
	ac, ok := b.getActiveCall(callID)
	if !ok {
		return fmt.Errorf("no active call: %s", callID)
	}
	return ac.cm.AcceptCall(ctx, callID)
}

func (b *voipBridge) RejectCall(ctx context.Context, callID string) error {
	ac, ok := b.getActiveCall(callID)
	if !ok {
		return fmt.Errorf("no active call: %s", callID)
	}
	return ac.cm.RejectCall(ctx, callID, core.EndCallReasonDeclined)
}

func (b *voipBridge) EndCall(ctx context.Context, callID string) error {
	ac, ok := b.getActiveCall(callID)
	if !ok {
		return nil
	}
	return ac.cm.EndCall(ctx, core.EndCallReasonUserEnded)
}

func (b *voipBridge) ExchangeWebRTC(ctx context.Context, callID string, sdpOffer string) (string, error) {
	ac, ok := b.getActiveCall(callID)
	if !ok {
		return "", fmt.Errorf("no active call: %s", callID)
	}

	webrtcBridge, answerSDP, err := voip.NewBridge(sdpOffer, b.logger)
	if err != nil {
		return "", fmt.Errorf("webrtc bridge failed: %w", err)
	}

	webrtcBridge.OnBrowserPCM = func(pcm []float32) {
		ac.cm.FeedCapturedPCM(pcm)
	}
	webrtcBridge.OnTerminalICE = func() {
		b.logger.Warn("webrtc bridge ice closed for call", zap.String("call_id", callID))
	}

	b.mu.Lock()
	ac.bridge = webrtcBridge
	b.mu.Unlock()

	return answerSDP, nil
}

func (b *voipBridge) getActiveCall(callID string) (*activeVoipCall, bool) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	ac, ok := b.activeCalls[callID]
	return ac, ok
}

func (b *voipBridge) cleanupCall(callID string) {
	b.mu.Lock()
	ac, ok := b.activeCalls[callID]
	if ok {
		delete(b.activeCalls, callID)
	}
	b.mu.Unlock()

	if !ok {
		return
	}
	if ac.bridge != nil {
		ac.bridge.Close()
	}
}

func (b *voipBridge) teardownAll() {
	b.mu.Lock()
	calls := b.activeCalls
	b.activeCalls = make(map[string]*activeVoipCall)
	b.mu.Unlock()

	for _, ac := range calls {
		_ = ac.cm.EndCall(context.Background(), core.EndCallReasonUserEnded)
		if ac.bridge != nil {
			ac.bridge.Close()
		}
	}
}

func wrapCall(from types.JID, inner *waBinary.Node) *waBinary.Node {
	content := []waBinary.Node{}
	if inner != nil {
		content = append(content, *inner)
	}
	return &waBinary.Node{
		Tag:     "call",
		Attrs:   waBinary.Attrs{"from": from},
		Content: content,
	}
}

func callIDFromNode(node *waBinary.Node) string {
	info := signaling.ExtractNodeInfo(node)
	if info == nil {
		return ""
	}
	return info.CallID
}

func (b *voipBridge) setupCallbacksFor(callID string, cm *call.CallManager) {
	cm.OnStateChange = func(ci *call.CallInfo) {
		status := voipStateToStatus(ci.StateData.State)
		if b.onCallStateChange != nil {
			b.onCallStateChange(ci.CallID, status)
		}
	}
	cm.OnEnded = func(ci *call.CallInfo) {
		reason := voipEndReason(ci.StateData.EndReason)
		if b.onCallEnded != nil {
			b.onCallEnded(ci.CallID, reason)
		}
		b.cleanupCall(ci.CallID)
	}
	cm.OnPeerAudio = func(pcm []float32) {
		ac, _ := b.getActiveCall(callID)
		if ac != nil && ac.bridge != nil {
			_ = ac.bridge.WritePCM(pcm)
		}
		if b.onPeerAudio != nil {
			b.onPeerAudio(callID, pcm)
		}
	}
}

func (b *voipBridge) handleCallOffer(ctx context.Context, evt *events.CallOffer) {
	node := wrapCall(evt.From, evt.Data)
	info := signaling.ExtractNodeInfo(node)
	if info == nil {
		return
	}
	callID := info.CallID

	cm := b.newCallManager()
	cm.OnIncoming = func(ci *call.CallInfo) {
		if b.onIncomingCall != nil {
			peerJid, _ := types.ParseJID(ci.PeerJid)
			if peerJid.IsEmpty() {
				peerJid = evt.From
			}
			b.onIncomingCall(ci.CallID, peerJid)
		}
	}
	b.setupCallbacksFor(callID, cm)

	cm.HandleCallOffer(ctx, node, evt.From)

	b.mu.Lock()
	b.activeCalls[callID] = &activeVoipCall{cm: cm}
	b.mu.Unlock()
}

func (b *voipBridge) handleCallAccept(ctx context.Context, evt *events.CallAccept) {
	node := wrapCall(evt.From, evt.Data)
	callID := callIDFromNode(node)
	b.mu.RLock()
	ac, ok := b.activeCalls[callID]
	b.mu.RUnlock()
	if !ok {
		return
	}
	ac.cm.HandleCallAccept(ctx, node, evt.From)
}

func (b *voipBridge) handleCallTransport(ctx context.Context, evt *events.CallTransport) {
	node := wrapCall(evt.From, evt.Data)
	callID := callIDFromNode(node)
	b.mu.RLock()
	ac, ok := b.activeCalls[callID]
	b.mu.RUnlock()
	if !ok {
		return
	}
	ac.cm.HandleCallTransport(ctx, node, evt.From)
}

func (b *voipBridge) handleCallTerminate(evt *events.CallTerminate) {
	node := wrapCall(evt.From, evt.Data)
	callID := callIDFromNode(node)
	b.mu.RLock()
	ac, ok := b.activeCalls[callID]
	b.mu.RUnlock()
	if !ok {
		return
	}
	ac.cm.HandleCallTerminate(node)
}

func (b *voipBridge) OnIncomingCall(callback func(callID string, peerJID types.JID)) {
	b.mu.Lock()
	b.onIncomingCall = callback
	b.mu.Unlock()
}

func (b *voipBridge) OnCallStateChange(callback func(callID string, status models.CallStatus)) {
	b.mu.Lock()
	b.onCallStateChange = callback
	b.mu.Unlock()
}

func (b *voipBridge) OnCallEnded(callback func(callID string, reason models.CallEndReason)) {
	b.mu.Lock()
	b.onCallEnded = callback
	b.mu.Unlock()
}

func (b *voipBridge) OnPeerAudio(callback func(callID string, pcm []float32)) {
	b.mu.Lock()
	b.onPeerAudio = callback
	b.mu.Unlock()
}

func voipStateToStatus(s core.CallState) models.CallStatus {
	switch s {
	case core.CallStateInitiating:
		return models.CallStatusPending
	case core.CallStateRinging, core.CallStateIncomingRinging:
		return models.CallStatusRinging
	case core.CallStateConnecting, core.CallStateActive, core.CallStateOnHold:
		return models.CallStatusConnected
	case core.CallStateEnded:
		return models.CallStatusEnded
	default:
		return models.CallStatusPending
	}
}

func voipEndReason(r core.EndCallReason) models.CallEndReason {
	switch r {
	case core.EndCallReasonUserEnded:
		return models.CallEndReasonUserEnded
	case core.EndCallReasonDeclined:
		return models.CallEndReasonDeclined
	case core.EndCallReasonTimeout:
		return models.CallEndReasonTimeout
	case core.EndCallReasonBusy:
		return models.CallEndReasonBusy
	case core.EndCallReasonCancelled:
		return models.CallEndReasonCancelled
	case core.EndCallReasonFailed:
		return models.CallEndReasonFailed
	default:
		return models.CallEndReasonUnknown
	}
}
