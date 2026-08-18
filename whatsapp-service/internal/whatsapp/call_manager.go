package whatsapp

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/ws"
)

type CallBridge interface {
	StartCall(ctx context.Context, peerJID types.JID, isVideo bool) (string, error)
	AcceptCall(ctx context.Context, callID string) error
	RejectCall(ctx context.Context, callID string) error
	EndCall(ctx context.Context, callID string) error
	ExchangeWebRTC(ctx context.Context, callID string, sdpOffer string) (string, error)
	OnIncomingCall(callback func(callID string, peerJID types.JID))
	OnCallStateChange(callback func(callID string, status models.CallStatus))
	OnCallEnded(callback func(callID string, reason models.CallEndReason))
	OnPeerAudio(callback func(callID string, pcm []float32))
}

type CallManager struct {
	client *Client
	repo   *repository.CallRepo
	hub    *ws.Hub
	logger *zap.Logger

	bridge CallBridge

	mu          sync.RWMutex
	activeCalls map[string]*activeCallState
}

type activeCallState struct {
	CallID      string
	PeerJID     string
	PeerPhone   string
	Direction   models.CallDirection
	Status      models.CallStatus
	StartedAt   time.Time
	ConnectedAt *time.Time
	Record      bool
	Bridge      CallBridge
}

func NewCallManager(client *Client, repo *repository.CallRepo, hub *ws.Hub, logger *zap.Logger) *CallManager {
	return &CallManager{
		client:      client,
		repo:        repo,
		hub:         hub,
		logger:      logger,
		activeCalls: make(map[string]*activeCallState),
	}
}

func (m *CallManager) SetBridge(bridge CallBridge) {
	m.mu.Lock()
	m.bridge = bridge
	m.mu.Unlock()

	bridge.OnIncomingCall(func(callID string, peerJID types.JID) {
		m.handleIncomingCall(callID, peerJID)
	})

	bridge.OnCallStateChange(func(callID string, status models.CallStatus) {
		m.handleStateChange(callID, status)
	})

	bridge.OnCallEnded(func(callID string, reason models.CallEndReason) {
		m.handleCallEnded(callID, reason)
	})
}

func (m *CallManager) StartCall(ctx context.Context, phone string, isVideo bool, record bool) (*models.Call, error) {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()

	if bridge == nil {
		return nil, fmt.Errorf("call bridge not initialized")
	}

	peerJID := types.NewJID(phone, types.DefaultUserServer)

	callID, err := bridge.StartCall(ctx, peerJID, isVideo)
	if err != nil {
		return nil, fmt.Errorf("start call failed: %w", err)
	}

	call := &models.Call{
		InstanceID: m.client.instanceID,
		TenantID:   m.client.tenantID,
		CallID:     callID,
		PeerJID:    peerJID.String(),
		PeerPhone:  phone,
		Direction:  models.CallDirectionOutbound,
		Status:     models.CallStatusRinging,
		StartedAt:  nowPtr(),
	}

	if err := m.repo.Create(ctx, call); err != nil {
		m.logger.Error("failed to persist outgoing call", zap.Error(err))
	}

	m.mu.Lock()
	m.activeCalls[callID] = &activeCallState{
		CallID:    callID,
		PeerJID:   peerJID.String(),
		PeerPhone: phone,
		Direction: models.CallDirectionOutbound,
		Status:    models.CallStatusRinging,
		StartedAt: time.Now(),
		Record:    record,
		Bridge:    bridge,
	}
	m.mu.Unlock()

	m.emitCallEvent("call_started", map[string]interface{}{
		"call_id":   callID,
		"peer":      phone,
		"direction": "outbound",
		"is_video":  isVideo,
		"record":    record,
	})

	return call, nil
}

func (m *CallManager) AcceptCall(ctx context.Context, callID string) error {
	m.mu.RLock()
	ac, ok := m.activeCalls[callID]
	bridge := m.bridge
	m.mu.RUnlock()

	if !ok {
		return fmt.Errorf("no active call with id %s", callID)
	}

	if bridge == nil {
		return fmt.Errorf("call bridge not initialized")
	}

	if err := bridge.AcceptCall(ctx, callID); err != nil {
		return fmt.Errorf("accept call failed: %w", err)
	}

	ac.Status = models.CallStatusConnected
	now := time.Now()
	ac.ConnectedAt = &now

	if err := m.repo.UpdateConnectedAt(ctx, m.getCallDBID(callID)); err != nil {
		m.logger.Warn("failed to update connected_at", zap.Error(err))
	}

	m.emitCallEvent("call_accepted", map[string]interface{}{
		"call_id": callID,
		"peer":    ac.PeerPhone,
	})

	return nil
}

func (m *CallManager) RejectCall(ctx context.Context, callID string) error {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()

	if bridge == nil {
		return fmt.Errorf("call bridge not initialized")
	}

	if err := bridge.RejectCall(ctx, callID); err != nil {
		return fmt.Errorf("reject call failed: %w", err)
	}

	m.finalizeCall(callID, models.CallEndReasonDeclined)
	return nil
}

func (m *CallManager) EndCall(ctx context.Context, callID string) error {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()

	if bridge == nil {
		return fmt.Errorf("call bridge not initialized")
	}

	if err := bridge.EndCall(ctx, callID); err != nil {
		return fmt.Errorf("end call failed: %w", err)
	}

	m.finalizeCall(callID, models.CallEndReasonUserEnded)
	return nil
}

func (m *CallManager) ExchangeWebRTC(ctx context.Context, callID string, sdpOffer string) (string, error) {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()

	if bridge == nil {
		return "", fmt.Errorf("call bridge not initialized")
	}

	sdpAnswer, err := bridge.ExchangeWebRTC(ctx, callID, sdpOffer)
	if err != nil {
		return "", fmt.Errorf("webrtc exchange failed: %w", err)
	}

	return sdpAnswer, nil
}

func (m *CallManager) ActiveCalls() []activeCallState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	calls := make([]activeCallState, 0, len(m.activeCalls))
	for _, ac := range m.activeCalls {
		calls = append(calls, *ac)
	}
	return calls
}

func (m *CallManager) GetActiveCall(callID string) (*activeCallState, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ac, ok := m.activeCalls[callID]
	return ac, ok
}

func (m *CallManager) handleIncomingCall(callID string, peerJID types.JID) {
	phone := peerJID.User

	call := &models.Call{
		InstanceID: m.client.instanceID,
		TenantID:   m.client.tenantID,
		CallID:     callID,
		PeerJID:    peerJID.String(),
		PeerPhone:  phone,
		Direction:  models.CallDirectionInbound,
		Status:     models.CallStatusRinging,
		StartedAt:  nowPtr(),
	}

	if err := m.repo.Create(context.Background(), call); err != nil {
		m.logger.Error("failed to persist incoming call", zap.Error(err))
	}

	m.mu.Lock()
	m.activeCalls[callID] = &activeCallState{
		CallID:    callID,
		PeerJID:   peerJID.String(),
		PeerPhone: phone,
		Direction: models.CallDirectionInbound,
		Status:    models.CallStatusRinging,
		StartedAt: time.Now(),
	}
	m.mu.Unlock()

	m.emitCallEvent("call_incoming", map[string]interface{}{
		"call_id":  callID,
		"peer":     phone,
		"peer_jid": peerJID.String(),
	})
}

func (m *CallManager) handleStateChange(callID string, status models.CallStatus) {
	m.mu.RLock()
	ac, ok := m.activeCalls[callID]
	m.mu.RUnlock()

	if !ok {
		return
	}

	ac.Status = status

	if status == models.CallStatusConnected {
		now := time.Now()
		ac.ConnectedAt = &now
		m.repo.UpdateConnectedAt(context.Background(), m.getCallDBID(callID))
	}

	m.emitCallEvent("call_status", map[string]interface{}{
		"call_id": callID,
		"status":  status,
		"peer":    ac.PeerPhone,
	})
}

func (m *CallManager) handleCallEnded(callID string, reason models.CallEndReason) {
	m.finalizeCall(callID, reason)
}

func (m *CallManager) finalizeCall(callID string, reason models.CallEndReason) {
	m.mu.Lock()
	ac, ok := m.activeCalls[callID]
	if !ok {
		m.mu.Unlock()
		return
	}
	delete(m.activeCalls, callID)
	m.mu.Unlock()

	status := models.CallStatusEnded
	if reason == models.CallEndReasonFailed {
		status = models.CallStatusFailed
	}

	now := time.Now()
	duration := 0
	if ac.ConnectedAt != nil {
		duration = int(now.Sub(*ac.ConnectedAt).Seconds())
	}

	ac.Status = status
	dbID := m.getCallDBID(callID)
	if dbID != uuid.Nil {
		m.repo.UpdateStatus(context.Background(), dbID, status, reason, duration)
	}

	m.emitCallEvent("call_ended", map[string]interface{}{
		"call_id":       callID,
		"peer":          ac.PeerPhone,
		"reason":        reason,
		"duration_secs": duration,
		"direction":     ac.Direction,
	})
}

func (m *CallManager) getCallDBID(callID string) uuid.UUID {
	call, err := m.repo.GetByCallID(context.Background(), callID)
	if err != nil || call == nil {
		return uuid.Nil
	}
	return call.ID
}

func (m *CallManager) emitCallEvent(event string, data map[string]interface{}) {
	tenantID := ""
	if m.client.tenantID != nil {
		tenantID = m.client.tenantID.String()
	}

	data["instance_id"] = m.client.instanceID.String()
	data["instance_name"] = m.client.instanceName

	m.hub.BroadcastEventToTenant(tenantID, event, data)
	m.logger.Info("call event", zap.String("event", event), zap.Any("data", data))
}

func nowPtr() *time.Time {
	now := time.Now()
	return &now
}

func (m *CallManager) handleCallEventOffer(ctx context.Context, evt *events.CallOffer) {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()
	if vb, ok := bridge.(*voipBridge); ok {
		vb.handleCallOffer(ctx, evt)
	}
}

func (m *CallManager) handleCallEventAccept(ctx context.Context, evt *events.CallAccept) {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()
	if vb, ok := bridge.(*voipBridge); ok {
		vb.handleCallAccept(ctx, evt)
	}
}

func (m *CallManager) handleCallEventTransport(ctx context.Context, evt *events.CallTransport) {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()
	if vb, ok := bridge.(*voipBridge); ok {
		vb.handleCallTransport(ctx, evt)
	}
}

func (m *CallManager) handleCallEventTerminate(evt *events.CallTerminate) {
	m.mu.RLock()
	bridge := m.bridge
	m.mu.RUnlock()
	if vb, ok := bridge.(*voipBridge); ok {
		vb.handleCallTerminate(evt)
	}
}

func (m *CallManager) Shutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for callID, ac := range m.activeCalls {
		if m.bridge != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			m.bridge.EndCall(ctx, callID)
			cancel()
		}
		m.emitCallEvent("call_ended", map[string]interface{}{
			"call_id":       callID,
			"peer":          ac.PeerPhone,
			"reason":        models.CallEndReasonUserEnded,
			"duration_secs": 0,
			"direction":     ac.Direction,
		})
	}
	m.activeCalls = make(map[string]*activeCallState)
	// Teardown voip bridge
	if vb, ok := m.bridge.(*voipBridge); ok {
		vb.teardownAll()
	}
}
