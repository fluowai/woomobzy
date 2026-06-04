package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/whatsapp"
	"whatsapp-service/pkg/phone"
)

// MessageHandler handles message-related API requests
type MessageHandler struct {
	messageRepo *repository.MessageRepo
	mediaRepo   *repository.MediaRepo
	chatRepo    *repository.ChatRepo
	manager     *whatsapp.Manager
	logger      *zap.Logger
}

// NewMessageHandler creates a new MessageHandler
func NewMessageHandler(
	messageRepo *repository.MessageRepo,
	mediaRepo *repository.MediaRepo,
	chatRepo *repository.ChatRepo,
	manager *whatsapp.Manager,
	logger *zap.Logger,
) *MessageHandler {
	return &MessageHandler{
		messageRepo: messageRepo,
		mediaRepo:   mediaRepo,
		chatRepo:    chatRepo,
		manager:     manager,
		logger:      logger,
	}
}

// ListMessages handles GET /api/messages/:chatId
func (h *MessageHandler) ListMessages(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	chatID, err := uuid.Parse(c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	if _, err := h.getChatByIDForTenant(c.Request.Context(), chatID, instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Chat not found for tenant"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	messages, err := h.messageRepo.ListByChatForTenant(c.Request.Context(), chatID, instanceID, tenantID, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list messages", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if messages == nil {
		messages = []models.Message{}
	}

	// Get total count for pagination
	total, _ := h.messageRepo.CountByChatForTenant(c.Request.Context(), chatID, instanceID, tenantID)

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// SendMessage handles POST /api/messages/:chatId/send
func (h *MessageHandler) SendMessage(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	chatID, err := uuid.Parse(c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var req models.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Content and type are required"})
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Type == "" {
		req.Type = models.MessageTypeText
	}
	if req.Type == models.MessageTypeText && req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message content is required"})
		return
	}

	// Get chat to find instance and JID
	ctx := c.Request.Context()

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	// Get chat JID
	chat, err := h.getChatByIDForTenant(ctx, chatID, instanceID, tenantID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Chat not found for tenant"})
		return
	}

	client, err := h.getConnectedClient(ctx, instanceID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	// Send the message
	if err := client.SendTextMessage(ctx, chat.ChatJID, req.Content); err != nil {
		h.logger.Error("Failed to send message", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save sent message to database
	waClient := client.GetWAClient()
	senderPhone := ""
	if waClient.Store.ID != nil {
		senderPhone = phone.ExtractFromJID(waClient.Store.ID.String())
	}

	msg := &models.Message{
		InstanceID:  instanceID,
		ChatID:      chatID,
		MessageID:   fmt.Sprintf("sent_%d", time.Now().UnixNano()),
		SenderPhone: senderPhone,
		SenderName:  "Me",
		IsFromMe:    true,
		IsGroup:     chat.IsGroup,
		Type:        req.Type,
		Content:     req.Content,
		Timestamp:   time.Now(),
	}

	if err := h.messageRepo.Create(ctx, msg); err != nil {
		h.logger.Error("Failed to save sent message", zap.Error(err))
	}

	// Update chat last message
	now := time.Now()
	chat.LastMessage = req.Content
	chat.LastMessageAt = &now
	h.chatRepo.Upsert(ctx, chat)

	c.JSON(http.StatusOK, gin.H{
		"message": "Message sent",
		"data":    msg,
	})
}

// SendMediaMessage handles POST /api/messages/:chatId/send-media
func (h *MessageHandler) SendMediaMessage(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	chatID, err := uuid.Parse(c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read file"})
		return
	}

	if len(data) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is empty"})
		return
	}

	msgType := strings.TrimSpace(c.PostForm("type"))
	mimeType := header.Header.Get("Content-Type")
	if msgType == "" {
		msgType = messageTypeFromMime(mimeType)
	}
	if msgType != "image" && msgType != "audio" && msgType != "video" && msgType != "document" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported media type"})
		return
	}

	ctx := c.Request.Context()
	chat, err := h.getChatByIDForTenant(ctx, chatID, instanceID, tenantID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Chat not found for tenant"})
		return
	}

	client, err := h.getConnectedClient(ctx, instanceID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	caption := strings.TrimSpace(c.PostForm("content"))
	messageID, mediaURL, mediaMimetype, mediaFilename, err := client.SendMediaMessage(ctx, chat.ChatJID, msgType, data, mimeType, header.Filename, caption)
	if err != nil {
		h.logger.Error("Failed to send media message", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	waClient := client.GetWAClient()
	senderPhone := ""
	if waClient.Store.ID != nil {
		senderPhone = phone.ExtractFromJID(waClient.Store.ID.String())
	}

	msg := &models.Message{
		InstanceID:    instanceID,
		ChatID:        chatID,
		MessageID:     messageID,
		SenderPhone:   senderPhone,
		SenderName:    "Me",
		IsFromMe:      true,
		IsGroup:       chat.IsGroup,
		Type:          models.MessageType(msgType),
		Content:       caption,
		MediaURL:      mediaURL,
		MediaMimetype: mediaMimetype,
		MediaFilename: mediaFilename,
		Timestamp:     time.Now(),
	}

	if err := h.messageRepo.Create(ctx, msg); err != nil {
		h.logger.Error("Failed to save sent media message", zap.Error(err))
	} else if h.mediaRepo != nil {
		if err := h.mediaRepo.UpsertFromMessage(ctx, msg, tenantID, client.StorageBucket()); err != nil {
			h.logger.Warn("Failed to persist sent media metadata", zap.Error(err))
		}
	}

	now := time.Now()
	chat.LastMessage = fmt.Sprintf("[%s]", msgType)
	if caption != "" {
		chat.LastMessage = caption
	}
	chat.LastMessageAt = &now
	h.chatRepo.Upsert(ctx, chat)

	c.JSON(http.StatusOK, gin.H{
		"message": "Media sent",
		"data":    msg,
	})
}

func messageTypeFromMime(mimeType string) string {
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return "image"
	case strings.HasPrefix(mimeType, "audio/"):
		return "audio"
	case strings.HasPrefix(mimeType, "video/"):
		return "video"
	default:
		return "document"
	}
}

func (h *MessageHandler) getChatByIDForTenant(ctx context.Context, chatID, instanceID, tenantID uuid.UUID) (*models.Chat, error) {
	return h.chatRepo.GetByIDForTenant(ctx, chatID, instanceID, tenantID)
}

func (h *MessageHandler) getConnectedClient(ctx context.Context, instanceID uuid.UUID) (*whatsapp.Client, error) {
	client, exists := h.manager.GetClient(instanceID)
	if exists && client.IsConnected() {
		return client, nil
	}

	if err := h.manager.ConnectInstance(ctx, instanceID); err != nil {
		return nil, fmt.Errorf("instancia WhatsApp nao conectada: %w", err)
	}

	deadline := time.After(8 * time.Second)
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("instancia WhatsApp nao conectada")
		case <-deadline:
			return nil, fmt.Errorf("instancia WhatsApp reconectando, tente novamente em alguns segundos")
		case <-ticker.C:
			client, exists = h.manager.GetClient(instanceID)
			if exists && client.IsConnected() {
				return client, nil
			}
		}
	}
}
