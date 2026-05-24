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
	chatRepo    *repository.ChatRepo
	manager     *whatsapp.Manager
	logger      *zap.Logger
}

// NewMessageHandler creates a new MessageHandler
func NewMessageHandler(
	messageRepo *repository.MessageRepo,
	chatRepo *repository.ChatRepo,
	manager *whatsapp.Manager,
	logger *zap.Logger,
) *MessageHandler {
	return &MessageHandler{
		messageRepo: messageRepo,
		chatRepo:    chatRepo,
		manager:     manager,
		logger:      logger,
	}
}

// ListMessages handles GET /api/messages/:chatId
func (h *MessageHandler) ListMessages(c *gin.Context) {
	chatID, err := uuid.Parse(c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	messages, err := h.messageRepo.ListByChat(c.Request.Context(), chatID, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list messages", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if messages == nil {
		messages = []models.Message{}
	}

	// Get total count for pagination
	total, _ := h.messageRepo.CountByChat(c.Request.Context(), chatID)

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// SendMessage handles POST /api/messages/:chatId/send
func (h *MessageHandler) SendMessage(c *gin.Context) {
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

	// Get chat to find instance and JID
	ctx := c.Request.Context()

	// We need instance_id from query since chat doesn't have it easily
	instanceIDStr := c.Query("instance_id")
	if instanceIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "instance_id query parameter is required"})
		return
	}

	instanceID, err := uuid.Parse(instanceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance_id"})
		return
	}

	// Get chat JID
	chat, err := h.getChatByID(ctx, chatID, instanceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
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
	chatID, err := uuid.Parse(c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	instanceIDStr := c.Query("instance_id")
	if instanceIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "instance_id query parameter is required"})
		return
	}

	instanceID, err := uuid.Parse(instanceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance_id"})
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
	chat, err := h.getChatByID(ctx, chatID, instanceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
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
	}

	now := time.Now()
	chat.LastMessage = messagePreview(models.MessageType(msgType), caption)
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

func messagePreview(msgType models.MessageType, content string) string {
	if msgType == models.MessageTypeText {
		return content
	}
	if content != "" {
		return content
	}
	switch msgType {
	case models.MessageTypeImage:
		return "Imagem"
	case models.MessageTypeAudio:
		return "Audio"
	case models.MessageTypeVideo:
		return "Video"
	case models.MessageTypeDocument:
		return "Documento"
	case models.MessageTypeSticker:
		return "Figurinha"
	case models.MessageTypeLocation:
		return "Localizacao"
	case models.MessageTypeContact:
		return "Contato"
	default:
		return "Mensagem"
	}
}

func (h *MessageHandler) getChatByID(ctx context.Context, chatID, instanceID uuid.UUID) (*models.Chat, error) {
	return h.chatRepo.GetByID(ctx, chatID, instanceID)
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
