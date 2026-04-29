package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
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

	// Get the WhatsApp client
	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Instance not connected"})
		return
	}

	// Get chat JID
	chat, err := h.getChatByID(ctx, chatID, instanceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
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

func (h *MessageHandler) getChatByID(ctx context.Context, chatID, instanceID uuid.UUID) (*models.Chat, error) {
	// We need to query directly since we don't have a GetByID on chatRepo
	// For now, list and filter (this should be optimized with a proper GetByID)
	chats, err := h.chatRepo.ListByInstance(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	for i := range chats {
		if chats[i].ID == chatID {
			return &chats[i], nil
		}
	}
	return nil, fmt.Errorf("chat not found")
}
