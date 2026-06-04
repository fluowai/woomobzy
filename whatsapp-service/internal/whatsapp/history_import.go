package whatsapp

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow/proto/waHistorySync"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/pkg/phone"
)

func (c *Client) handleHistorySync(evt *events.HistorySync) {
	if evt == nil || evt.Data == nil {
		return
	}

	ctx := context.Background()
	importedChats := 0
	importedMessages := 0
	importedChatIDs := make([]uuid.UUID, 0)

	for _, conv := range evt.Data.GetConversations() {
		chatID, messages, err := c.importHistoryConversation(ctx, conv.GetID(), conv.GetName(), conv.GetDisplayName(), conv.GetMessages())
		if err != nil {
			c.logger.Warn("Failed to import history conversation",
				zap.String("instance", c.instanceID.String()),
				zap.String("chat_jid", conv.GetID()),
				zap.Error(err),
			)
			continue
		}
		if messages > 0 {
			importedChats++
			importedMessages += messages
			if chatID != uuid.Nil {
				importedChatIDs = append(importedChatIDs, chatID)
			}
		}
	}

	c.logger.Info("History sync imported",
		zap.String("instance", c.instanceID.String()),
		zap.String("type", evt.Data.GetSyncType().String()),
		zap.Uint32("progress", evt.Data.GetProgress()),
		zap.Int("chats", importedChats),
		zap.Int("messages", importedMessages),
	)

	if importedMessages > 0 {
		c.broadcastEvent("history_imported", models.HistoryImportedEvent{
			InstanceID: c.instanceID,
			Chats:      importedChats,
			Messages:   importedMessages,
			Progress:   evt.Data.GetProgress(),
			SyncType:   evt.Data.GetSyncType().String(),
		})
		c.analyzeImportedHistory(importedChatIDs, importedChats)
	}
}

func (c *Client) importHistoryConversation(ctx context.Context, rawJID, name, displayName string, historyMessages []*waHistorySync.HistorySyncMsg) (uuid.UUID, int, error) {
	if rawJID == "" || len(historyMessages) == 0 {
		return uuid.Nil, 0, nil
	}

	chatJID, err := types.ParseJID(rawJID)
	if err != nil {
		return uuid.Nil, 0, fmt.Errorf("invalid history chat JID: %w", err)
	}

	imported := 0
	var chatID uuid.UUID
	fallbackName := firstNonEmpty(displayName, name, phone.GetDisplayName("", phone.ExtractFromJID(rawJID)), rawJID)

	for _, historyMsg := range historyMessages {
		webMsg := historyMsg.GetMessage()
		if webMsg == nil {
			continue
		}

		msgEvt, err := c.waClient.ParseWebMessage(chatJID, webMsg)
		if err != nil {
			c.logger.Debug("Skipping unparsable history message",
				zap.String("instance", c.instanceID.String()),
				zap.String("chat_jid", rawJID),
				zap.Error(err),
			)
			continue
		}

		savedChatID, ok := c.saveHistoricalMessage(ctx, msgEvt, fallbackName)
		if ok {
			imported++
			chatID = savedChatID
		}
	}

	return chatID, imported, nil
}

func (c *Client) saveHistoricalMessage(ctx context.Context, evt *events.Message, fallbackChatName string) (uuid.UUID, bool) {
	info := evt.Info
	canonicalJID := canonicalChatJID(info)
	chatJID := canonicalJID.String()
	isGroup := phone.IsGroupJID(chatJID)
	alternateJIDs := alternateChatJIDs(info, chatJID)

	var senderPhone, senderName string
	if isGroup {
		senderJID := preferredSenderPhoneJID(info)
		senderPhone = normalizedBRPhoneFromJID(senderJID)
		senderName = firstNonEmpty(info.PushName, c.resolveDisplayName(ctx, firstNonEmptyJID(senderJID, info.Sender), info.PushName, senderPhone))
	} else if info.IsFromMe {
		if c.waClient.Store.ID != nil {
			senderPhone = phone.ExtractFromJID(c.waClient.Store.ID.String())
		}
		senderName = "Me"
	} else {
		senderPhone = normalizedBRPhoneFromJID(canonicalJID)
		senderName = c.resolveDisplayName(ctx, canonicalJID, info.PushName, senderPhone)
	}

	msgType, content := extractMessageContent(evt)
	if (msgType == models.MessageTypeUnknown || msgType == models.MessageTypeText) && strings.TrimSpace(content) == "" {
		return uuid.Nil, false
	}

	chatName := fallbackChatName
	if chatName == "" || chatName == chatJID {
		if isGroup {
			chatName = chatJID
		} else {
			chatName = c.resolveDisplayName(ctx, canonicalJID, info.PushName, phone.Normalize(canonicalJID.User))
		}
	}

	if senderPhone != "" && !info.IsFromMe {
		contact := &models.Contact{
			InstanceID:  c.instanceID,
			Phone:       senderPhone,
			PushName:    info.PushName,
			DisplayName: senderName,
		}
		if err := c.contactRepo.Upsert(ctx, contact); err != nil {
			c.logger.Warn("Failed to upsert imported contact", zap.Error(err))
		}
	}

	previewContent := content
	if msgType != models.MessageTypeText {
		previewContent = mediaPreviewContent(msgType, content)
	}
	if len(previewContent) > 100 {
		previewContent = previewContent[:100] + "..."
	}

	messageTime := info.Timestamp
	if messageTime.IsZero() {
		messageTime = time.Now()
	}

	chat := &models.Chat{
		InstanceID:    c.instanceID,
		ChatJID:       chatJID,
		Name:          chatName,
		IsGroup:       isGroup,
		LastMessage:   previewContent,
		LastMessageAt: &messageTime,
	}
	if err := c.chatRepo.UpsertImported(ctx, chat); err != nil {
		c.logger.Warn("Failed to upsert imported chat", zap.Error(err))
		return uuid.Nil, false
	}
	if err := c.chatRepo.MergeJIDs(ctx, c.instanceID, chat.ID, alternateJIDs); err != nil {
		c.logger.Warn("Failed to merge imported duplicate chat JIDs", zap.Error(err))
	}

	msg := &models.Message{
		InstanceID:  c.instanceID,
		ChatID:      chat.ID,
		MessageID:   info.ID,
		SenderPhone: senderPhone,
		SenderName:  senderName,
		IsFromMe:    info.IsFromMe,
		IsGroup:     isGroup,
		Type:        msgType,
		Content:     content,
		Timestamp:   messageTime,
	}

	if isMediaMessageType(msgType) {
		mediaCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
		url, mime, filename, err := c.downloadAndUploadMedia(mediaCtx, evt)
		cancel()
		if err != nil {
			c.logger.Warn("Failed to handle imported media",
				zap.String("instance", c.instanceID.String()),
				zap.String("message_id", info.ID),
				zap.String("type", string(msgType)),
				zap.Error(err),
			)
		} else {
			msg.MediaURL = url
			msg.MediaMimetype = mime
			msg.MediaFilename = filename
		}
	}

	if evt.Message.GetExtendedTextMessage() != nil && evt.Message.GetExtendedTextMessage().ContextInfo != nil {
		if quotedID := evt.Message.GetExtendedTextMessage().ContextInfo.GetStanzaID(); quotedID != "" {
			msg.QuotedMessageID = quotedID
		}
	}

	if err := c.messageRepo.Create(ctx, msg); err != nil {
		c.logger.Warn("Failed to save imported message", zap.Error(err))
		return chat.ID, false
	}
	c.persistMessageMedia(ctx, msg)

	return chat.ID, true
}

func (c *Client) RequestAdditionalHistory(ctx context.Context, chat models.Chat, oldest models.Message, count int) error {
	if count <= 0 {
		count = 50
	}
	if count > 100 {
		count = 100
	}

	chatJID, err := types.ParseJID(chat.ChatJID)
	if err != nil {
		return fmt.Errorf("invalid chat JID: %w", err)
	}

	msgInfo := &types.MessageInfo{
		MessageSource: types.MessageSource{
			Chat:     chatJID,
			IsFromMe: oldest.IsFromMe,
			IsGroup:  chat.IsGroup,
		},
		ID:        oldest.MessageID,
		Timestamp: oldest.Timestamp,
	}

	_, err = c.waClient.SendPeerMessage(ctx, c.waClient.BuildHistorySyncRequest(msgInfo, count))
	return err
}

func (c *Client) AnalyzeImportedHistory(chatIDs []uuid.UUID, limit int) {
	c.analyzeImportedHistory(chatIDs, limit)
}

func (c *Client) analyzeImportedHistory(chatIDs []uuid.UUID, limit int) {
	if c.automation == nil {
		return
	}
	if limit <= 0 {
		limit = 100
	}

	go func() {
		if err := c.automation.AnalyzeImportedHistory(context.Background(), AutomationImportPayload{
			InstanceID: c.instanceID,
			TenantID:   uuidToString(c.tenantID),
			ChatIDs:    dedupeUUIDs(chatIDs),
			Limit:      limit,
		}); err != nil {
			c.logger.Warn("AI history import analysis failed",
				zap.String("instance", c.instanceID.String()),
				zap.Error(err),
			)
		}
	}()
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func dedupeUUIDs(values []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]bool, len(values))
	result := make([]uuid.UUID, 0, len(values))
	for _, value := range values {
		if value == uuid.Nil || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	return result
}
