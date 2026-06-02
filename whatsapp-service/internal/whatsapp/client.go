package whatsapp

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/ws"
	"whatsapp-service/pkg/phone"
)

// Client wraps a WhatsMeow client with business logic
type Client struct {
	instanceID     uuid.UUID
	tenantID       *uuid.UUID
	instanceName   string
	waClient       *whatsmeow.Client
	instanceRepo   *repository.InstanceRepo
	chatRepo       *repository.ChatRepo
	contactRepo    *repository.ContactRepo
	messageRepo    *repository.MessageRepo
	hub            *ws.Hub
	logger         *zap.Logger
	qrCode         string
	qrChan         <-chan whatsmeow.QRChannelItem
	connected      bool
	eventHandlerID uint32
	mu             sync.RWMutex
	supabaseURL    string
	supabaseKey    string
	storageBucket  string
	minioEndpoint  string
	minioPublicURL string
	minioAccessKey string
	minioSecretKey string
	minioRegion    string
	automation     *AutomationClient
}

// NewClient creates a new WhatsApp client wrapper
func NewClient(
	instanceID uuid.UUID,
	tenantID *uuid.UUID,
	instanceName string,
	waClient *whatsmeow.Client,
	instanceRepo *repository.InstanceRepo,
	chatRepo *repository.ChatRepo,
	contactRepo *repository.ContactRepo,
	messageRepo *repository.MessageRepo,
	hub *ws.Hub,
	logger *zap.Logger,
	supabaseURL string,
	supabaseKey string,
	storageBucket string,
	minioEndpoint string,
	minioPublicURL string,
	minioAccessKey string,
	minioSecretKey string,
	minioRegion string,
	nodeURL string,
	internalToken string,
	automationEnabled bool,
) *Client {
	var automation *AutomationClient
	if automationEnabled && nodeURL != "" && internalToken != "" {
		automation = NewAutomationClient(nodeURL, internalToken, logger)
	}

	return &Client{
		instanceID:     instanceID,
		tenantID:       tenantID,
		instanceName:   instanceName,
		waClient:       waClient,
		instanceRepo:   instanceRepo,
		chatRepo:       chatRepo,
		contactRepo:    contactRepo,
		messageRepo:    messageRepo,
		hub:            hub,
		logger:         logger,
		supabaseURL:    supabaseURL,
		supabaseKey:    supabaseKey,
		storageBucket:  storageBucket,
		minioEndpoint:  minioEndpoint,
		minioPublicURL: minioPublicURL,
		minioAccessKey: minioAccessKey,
		minioSecretKey: minioSecretKey,
		minioRegion:    minioRegion,
		automation:     automation,
	}
}

// Connect initiates the WhatsApp connection
func (c *Client) Connect(ctx context.Context) error {
	c.mu.Lock()
	if c.eventHandlerID == 0 {
		c.eventHandlerID = c.waClient.AddEventHandler(c.eventHandler)
	}
	c.mu.Unlock()

	if c.waClient.Store.ID == nil {
		if err := c.instanceRepo.UpdateStatus(ctx, c.instanceID, models.StatusQRPending); err != nil {
			c.logger.Error("Failed to update QR pending status",
				zap.String("instance", c.instanceID.String()),
				zap.Error(err),
			)
		}

		c.broadcastEvent("instance_status", models.InstanceStatusEvent{
			InstanceID: c.instanceID,
			Status:     models.StatusQRPending,
		})

		qrChan, err := c.waClient.GetQRChannel(ctx)
		if err != nil {
			return fmt.Errorf("failed to get QR channel: %w", err)
		}
		c.qrChan = qrChan

		if err := c.waClient.Connect(); err != nil {
			return fmt.Errorf("failed to connect: %w", err)
		}

		// Process QR codes
		for evt := range qrChan {
			switch evt.Event {
			case "code":
				c.mu.Lock()
				c.qrCode = evt.Code
				c.mu.Unlock()

				c.logger.Info("QR Code generated",
					zap.String("instance", c.instanceID.String()),
				)

				// Save to DB
				c.instanceRepo.UpdateQRCode(ctx, c.instanceID, evt.Code)

				// Broadcast to WebSocket
				c.broadcastEvent("qr_code", models.QRCodeEvent{
					InstanceID: c.instanceID,
					QRCode:     evt.Code,
				})

			case "login":
				c.mu.Lock()
				c.connected = true
				c.qrCode = ""
				c.mu.Unlock()

				jid := c.waClient.Store.ID.String()
				phoneNum := phone.ExtractFromJID(jid)

				c.instanceRepo.UpdateConnected(ctx, c.instanceID, phoneNum, jid)

				c.logger.Info("Instance connected via QR",
					zap.String("instance", c.instanceID.String()),
					zap.String("phone", phoneNum),
				)

				c.broadcastEvent("instance_status", models.InstanceStatusEvent{
					InstanceID: c.instanceID,
					Status:     models.StatusConnected,
					Phone:      phoneNum,
				})

			case "timeout":
				c.logger.Warn("QR code timeout", zap.String("instance", c.instanceID.String()))
				c.instanceRepo.UpdateStatus(ctx, c.instanceID, models.StatusDisconnected)

			case "error":
				c.logger.Error("QR code error", zap.String("instance", c.instanceID.String()))
			}
		}
	} else {
		// Existing session — reconnect
		if err := c.waClient.Connect(); err != nil {
			return fmt.Errorf("failed to reconnect: %w", err)
		}

		c.mu.Lock()
		c.connected = true
		c.mu.Unlock()

		jid := c.waClient.Store.ID.String()
		phoneNum := phone.ExtractFromJID(jid)

		c.instanceRepo.UpdateConnected(ctx, c.instanceID, phoneNum, jid)

		c.logger.Info("Instance reconnected",
			zap.String("instance", c.instanceID.String()),
			zap.String("phone", phoneNum),
		)

		c.broadcastEvent("instance_status", models.InstanceStatusEvent{
			InstanceID: c.instanceID,
			Status:     models.StatusConnected,
			Phone:      phoneNum,
		})
	}

	return nil
}

// Disconnect cleanly disconnects the WhatsApp client
func (c *Client) Disconnect() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.waClient != nil {
		c.waClient.Disconnect()
	}
	c.connected = false
}

// IsConnected returns whether the client is currently connected
func (c *Client) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.connected
}

// GetWAClient returns the underlying WhatsMeow client (for sending messages)
func (c *Client) GetWAClient() *whatsmeow.Client {
	return c.waClient
}

func (c *Client) broadcastEvent(event string, data interface{}) {
	c.hub.BroadcastEventToTenant(uuidToString(c.tenantID), event, data)
}

// eventHandler processes all WhatsMeow events
func (c *Client) eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		c.handleMessage(v)

	case *events.Connected:
		c.mu.Lock()
		c.connected = true
		c.mu.Unlock()
		c.logger.Info("WhatsApp connected event", zap.String("instance", c.instanceID.String()))
		c.markConnected(context.Background())

	case *events.Disconnected:
		c.mu.Lock()
		c.connected = false
		c.mu.Unlock()
		c.logger.Warn("WhatsApp disconnected event", zap.String("instance", c.instanceID.String()))

		c.instanceRepo.UpdateStatus(context.Background(), c.instanceID, models.StatusDisconnected)
		c.broadcastEvent("instance_status", models.InstanceStatusEvent{
			InstanceID: c.instanceID,
			Status:     models.StatusDisconnected,
		})

		// Auto-reconnect after delay
		go func() {
			time.Sleep(5 * time.Second)
			c.logger.Info("Attempting auto-reconnect", zap.String("instance", c.instanceID.String()))
			if err := c.Connect(context.Background()); err != nil {
				c.logger.Error("Auto-reconnect failed",
					zap.String("instance", c.instanceID.String()),
					zap.Error(err),
				)
			}
		}()

	case *events.LoggedOut:
		c.mu.Lock()
		c.connected = false
		c.mu.Unlock()
		c.logger.Warn("WhatsApp logged out", zap.String("instance", c.instanceID.String()))
		c.instanceRepo.UpdateStatus(context.Background(), c.instanceID, models.StatusDisconnected)
		c.broadcastEvent("instance_status", models.InstanceStatusEvent{
			InstanceID: c.instanceID,
			Status:     models.StatusDisconnected,
		})

	case *events.HistorySync:
		c.handleHistorySync(v)
	}
}

// handleMessage processes an incoming WhatsApp message
func (c *Client) handleMessage(evt *events.Message) {
	ctx := context.Background()

	info := evt.Info
	canonicalJID := canonicalChatJID(info)
	chatJID := canonicalJID.String()
	isGroup := phone.IsGroupJID(chatJID)
	alternateJIDs := alternateChatJIDs(info, chatJID)

	// Determine sender info
	var senderPhone, senderName string
	var participantInfo *models.ParticipantInfo

	if isGroup {
		senderJID := preferredSenderPhoneJID(info)
		senderPhone = normalizedBRPhoneFromJID(senderJID)
		pushName := info.PushName
		senderName = c.resolveDisplayName(ctx, firstNonEmptyJID(senderJID, info.Sender), pushName, senderPhone)
		avatarURL := c.resolveAvatarURL(ctx, firstNonEmptyJID(senderJID, info.Sender))

		participantInfo = &models.ParticipantInfo{
			PushName:    pushName,
			Phone:       senderPhone,
			DisplayName: senderName,
			AvatarURL:   avatarURL,
		}
	} else {
		if info.IsFromMe {
			if c.waClient.Store.ID != nil {
				senderPhone = phone.ExtractFromJID(c.waClient.Store.ID.String())
			}
			senderName = "Me"
		} else {
			senderPhone = normalizedBRPhoneFromJID(canonicalJID)
			senderName = c.resolveDisplayName(ctx, canonicalJID, info.PushName, senderPhone)
		}
	}

	// Determine message type and content
	msgType, content := extractMessageContent(evt)
	if (msgType == models.MessageTypeUnknown || msgType == models.MessageTypeText) && strings.TrimSpace(content) == "" {
		c.logger.Debug("Ignoring WhatsApp event without renderable message content",
			zap.String("instance", c.instanceID.String()),
			zap.String("message_id", info.ID),
		)
		return
	}

	// Determine chat name
	chatName := ""
	if isGroup {
		groupInfo, err := c.waClient.GetGroupInfo(ctx, info.Chat)
		if err == nil && groupInfo != nil {
			chatName = groupInfo.Name
		} else {
			chatName = chatJID
		}
	} else {
		if info.IsFromMe {
			// For sent messages, the chat is the recipient
			chatName = c.resolveDisplayName(ctx, canonicalJID, "", phone.Normalize(canonicalJID.User))
		} else {
			chatName = c.resolveDisplayName(ctx, canonicalJID, info.PushName, senderPhone)
		}
	}

	chatAvatarURL := c.resolveAvatarURL(ctx, canonicalJID)

	// Upsert contact (only for non-group or for the sender in a group)
	if senderPhone != "" && !info.IsFromMe {
		contact := &models.Contact{
			InstanceID:  c.instanceID,
			Phone:       senderPhone,
			PushName:    info.PushName,
			DisplayName: senderName,
			AvatarURL:   chatAvatarURL,
		}
		if err := c.contactRepo.Upsert(ctx, contact); err != nil {
			c.logger.Error("Failed to upsert contact", zap.Error(err))
		}
	}

	// Get preview content for last_message
	previewContent := content
	if msgType != models.MessageTypeText {
		previewContent = mediaPreviewContent(msgType, content)
	}
	if len(previewContent) > 100 {
		previewContent = previewContent[:100] + "..."
	}

	// Upsert chat
	now := time.Now()
	chat := &models.Chat{
		InstanceID:    c.instanceID,
		ChatJID:       chatJID,
		Name:          chatName,
		IsGroup:       isGroup,
		LastMessage:   previewContent,
		LastMessageAt: &now,
		AvatarURL:     chatAvatarURL,
	}
	if err := c.chatRepo.Upsert(ctx, chat); err != nil {
		c.logger.Error("Failed to upsert chat", zap.Error(err))
		return
	}
	if err := c.chatRepo.MergeJIDs(ctx, c.instanceID, chat.ID, alternateJIDs); err != nil {
		c.logger.Warn("Failed to merge duplicate chat JIDs",
			zap.String("instance", c.instanceID.String()),
			zap.String("chat_jid", chatJID),
			zap.Error(err),
		)
	}

	// Handle media download
	var mediaURL, mediaMimetype, mediaFilename string
	if msgType == models.MessageTypeImage || msgType == models.MessageTypeAudio ||
		msgType == models.MessageTypeVideo || msgType == models.MessageTypeDocument ||
		msgType == models.MessageTypeSticker {
		url, mime, filename, err := c.downloadAndUploadMedia(ctx, evt)
		if err != nil {
			c.logger.Error("Failed to handle media", zap.Error(err))
		} else {
			mediaURL = url
			mediaMimetype = mime
			mediaFilename = filename
		}
	}

	// Create message record
	msg := &models.Message{
		InstanceID:      c.instanceID,
		ChatID:          chat.ID,
		MessageID:       info.ID,
		SenderPhone:     senderPhone,
		SenderName:      senderName,
		SenderAvatarURL: chatAvatarURL,
		IsFromMe:        info.IsFromMe,
		IsGroup:         isGroup,
		Type:            msgType,
		Content:         content,
		MediaURL:        mediaURL,
		MediaMimetype:   mediaMimetype,
		MediaFilename:   mediaFilename,
		Timestamp:       info.Timestamp,
	}

	// Handle quoted message
	if evt.Message.GetExtendedTextMessage() != nil && evt.Message.GetExtendedTextMessage().ContextInfo != nil {
		if quotedID := evt.Message.GetExtendedTextMessage().ContextInfo.GetStanzaID(); quotedID != "" {
			msg.QuotedMessageID = quotedID
		}
	}

	if err := c.messageRepo.Create(ctx, msg); err != nil {
		c.logger.Error("Failed to save message", zap.Error(err))
		return
	}

	// Broadcast via WebSocket
	c.broadcastEvent("new_message", models.NewMessageEvent{
		Message: *msg,
		Chat:    *chat,
		Instance: struct {
			ID   uuid.UUID `json:"id"`
			Name string    `json:"name"`
		}{
			ID:   c.instanceID,
			Name: c.instanceName,
		},
		Participant: participantInfo,
	})

	c.logger.Info("Message processed",
		zap.String("instance", c.instanceID.String()),
		zap.String("from", senderName),
		zap.String("type", string(msgType)),
		zap.Bool("group", isGroup),
	)

	if c.automation != nil && !info.IsFromMe && !isGroup && senderPhone != "" {
		go func(saved models.Message, savedChat models.Chat, participant *models.ParticipantInfo) {
			if err := c.automation.ProcessMessage(context.Background(), AutomationMessagePayload{
				InstanceID:   c.instanceID,
				TenantID:     uuidToString(c.tenantID),
				InstanceName: c.instanceName,
				Chat:         savedChat,
				Message:      saved,
				Participant:  participant,
			}); err != nil {
				c.logger.Warn("AI automation failed",
					zap.String("instance", c.instanceID.String()),
					zap.String("message_id", saved.MessageID),
					zap.Error(err),
				)
			}
		}(*msg, *chat, participantInfo)
	}
}

func (c *Client) markConnected(ctx context.Context) {
	if c.waClient.Store.ID == nil {
		return
	}

	jid := c.waClient.Store.ID.String()
	phoneNum := phone.ExtractFromJID(jid)

	if err := c.instanceRepo.UpdateConnected(ctx, c.instanceID, phoneNum, jid); err != nil {
		c.logger.Error("Failed to update connected status",
			zap.String("instance", c.instanceID.String()),
			zap.Error(err),
		)
		return
	}

	c.broadcastEvent("instance_status", models.InstanceStatusEvent{
		InstanceID: c.instanceID,
		Status:     models.StatusConnected,
		Phone:      phoneNum,
	})
}

func (c *Client) resolveDisplayName(ctx context.Context, jid types.JID, pushName, fallbackPhone string) string {
	if pushName != "" {
		return pushName
	}
	if c.waClient.Store != nil && c.waClient.Store.Contacts != nil && !jid.IsEmpty() {
		if contact, err := c.waClient.Store.Contacts.GetContact(ctx, jid); err == nil {
			switch {
			case contact.FullName != "":
				return contact.FullName
			case contact.PushName != "":
				return contact.PushName
			case contact.BusinessName != "":
				return contact.BusinessName
			case contact.FirstName != "":
				return contact.FirstName
			}
		}
	}
	return phone.GetDisplayName("", fallbackPhone)
}

func (c *Client) resolveAvatarURL(ctx context.Context, jid types.JID) string {
	if jid.IsEmpty() {
		return ""
	}
	picture, err := c.waClient.GetProfilePictureInfo(ctx, jid, &whatsmeow.GetProfilePictureParams{Preview: true})
	if err != nil || picture == nil {
		return ""
	}
	return picture.URL
}

func uuidToString(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}

func canonicalChatJID(info types.MessageInfo) types.JID {
	if phone.IsGroupJID(info.Chat.String()) {
		return info.Chat.ToNonAD()
	}

	for _, jid := range []types.JID{info.RecipientAlt, info.SenderAlt, info.Chat, info.Sender} {
		if isPhoneJID(jid) {
			return types.NewJID(phone.Normalize(jid.User), types.DefaultUserServer)
		}
	}

	return info.Chat.ToNonAD()
}

func preferredSenderPhoneJID(info types.MessageInfo) types.JID {
	for _, jid := range []types.JID{info.SenderAlt, info.Sender} {
		if isPhoneJID(jid) {
			return types.NewJID(phone.Normalize(jid.User), types.DefaultUserServer)
		}
	}
	return types.JID{}
}

func firstNonEmptyJID(values ...types.JID) types.JID {
	for _, value := range values {
		if !value.IsEmpty() {
			return value
		}
	}
	return types.JID{}
}

func normalizedBRPhoneFromJID(jid types.JID) string {
	if !isPhoneJID(jid) {
		return ""
	}
	return phone.Normalize(jid.User)
}

func alternateChatJIDs(info types.MessageInfo, canonical string) []string {
	seen := map[string]bool{canonical: true, "": true}
	var alternates []string

	for _, jid := range []types.JID{info.Chat, info.Sender, info.SenderAlt, info.RecipientAlt} {
		value := jid.ToNonAD().String()
		if !seen[value] {
			seen[value] = true
			alternates = append(alternates, value)
		}
	}

	return alternates
}

func isPhoneJID(jid types.JID) bool {
	if jid.IsEmpty() || jid.User == "" {
		return false
	}
	if jid.Server != types.DefaultUserServer && jid.Server != types.LegacyUserServer {
		return false
	}
	return phone.IsValidBR(jid.User)
}

func mediaPreviewContent(msgType models.MessageType, content string) string {
	trimmed := strings.TrimSpace(content)
	if trimmed != "" {
		return trimmed
	}
	return ""
}

// extractMessageContent determines the type and text content of a message
func extractMessageContent(evt *events.Message) (models.MessageType, string) {
	msg := evt.Message

	if msg.GetConversation() != "" {
		return models.MessageTypeText, msg.GetConversation()
	}

	if ext := msg.GetExtendedTextMessage(); ext != nil {
		return models.MessageTypeText, ext.GetText()
	}

	if img := msg.GetImageMessage(); img != nil {
		caption := img.GetCaption()
		return models.MessageTypeImage, caption
	}

	if audio := msg.GetAudioMessage(); audio != nil {
		return models.MessageTypeAudio, ""
	}

	if video := msg.GetVideoMessage(); video != nil {
		caption := video.GetCaption()
		return models.MessageTypeVideo, caption
	}

	if doc := msg.GetDocumentMessage(); doc != nil {
		return models.MessageTypeDocument, doc.GetCaption()
	}

	if sticker := msg.GetStickerMessage(); sticker != nil {
		return models.MessageTypeSticker, ""
	}

	if loc := msg.GetLocationMessage(); loc != nil {
		return models.MessageTypeLocation, fmt.Sprintf("%f,%f", loc.GetDegreesLatitude(), loc.GetDegreesLongitude())
	}

	if contact := msg.GetContactMessage(); contact != nil {
		return models.MessageTypeContact, contact.GetDisplayName()
	}

	return models.MessageTypeUnknown, ""
}
