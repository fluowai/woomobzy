package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/pkg/phone"
)

// ChatHandler handles chat-related API requests
type ChatHandler struct {
	chatRepo    *repository.ChatRepo
	contactRepo *repository.ContactRepo
	logger      *zap.Logger
}

// NewChatHandler creates a new ChatHandler
func NewChatHandler(chatRepo *repository.ChatRepo, contactRepo *repository.ContactRepo, logger *zap.Logger) *ChatHandler {
	return &ChatHandler{
		chatRepo:    chatRepo,
		contactRepo: contactRepo,
		logger:      logger,
	}
}

// ListChats handles GET /api/chats
func (h *ChatHandler) ListChats(c *gin.Context) {
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

	chats, err := h.chatRepo.ListByInstance(c.Request.Context(), instanceID)
	if err != nil {
		h.logger.Error("Failed to list chats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if chats == nil {
		chats = []models.Chat{}
	}

	c.JSON(http.StatusOK, chats)
}

// MarkChatRead handles POST /api/chats/:id/read
func (h *ChatHandler) MarkChatRead(c *gin.Context) {
	chatID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	if err := h.chatRepo.MarkRead(c.Request.Context(), chatID); err != nil {
		h.logger.Error("Failed to mark chat as read", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chat marked as read"})
}

// UpdateContactName handles PATCH /api/chats/:id/contact
func (h *ChatHandler) UpdateContactName(c *gin.Context) {
	chatID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	instanceID, err := uuid.Parse(c.Query("instance_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance_id"})
		return
	}

	var req struct {
		DisplayName string `json:"display_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "display_name is required"})
		return
	}

	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "display_name is required"})
		return
	}

	chat, err := h.chatRepo.UpdateName(c.Request.Context(), chatID, instanceID, displayName)
	if err != nil {
		h.logger.Error("Failed to update chat contact name", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	contactPhone := phone.ExtractFromJID(chat.ChatJID)
	if phone.IsValidBR(contactPhone) {
		contact := &models.Contact{
			InstanceID:  instanceID,
			Phone:       contactPhone,
			DisplayName: displayName,
		}
		if err := h.contactRepo.Upsert(c.Request.Context(), contact); err != nil {
			h.logger.Warn("Failed to update contact display name", zap.Error(err))
		}
	}

	c.JSON(http.StatusOK, chat)
}
