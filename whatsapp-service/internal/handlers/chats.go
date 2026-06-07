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
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	chats, err := h.chatRepo.ListByInstanceForTenant(c.Request.Context(), instanceID, tenantID)
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

// DeleteAllChats handles DELETE /api/chats.
func (h *ChatHandler) DeleteAllChats(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	result, err := h.chatRepo.DeleteAllByInstanceForTenant(c.Request.Context(), instanceID, tenantID)
	if err != nil {
		h.logger.Error("Failed to delete all chats", zap.Error(err))
		if strings.Contains(err.Error(), "instance not found") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// MarkChatRead handles POST /api/chats/:id/read
func (h *ChatHandler) MarkChatRead(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	chatID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	if err := h.chatRepo.MarkReadForTenant(c.Request.Context(), chatID, instanceID, tenantID); err != nil {
		h.logger.Error("Failed to mark chat as read", zap.Error(err))
		c.JSON(http.StatusForbidden, gin.H{"error": "Chat not found for tenant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chat marked as read"})
}

// UpdateContactName handles PATCH /api/chats/:id/contact
func (h *ChatHandler) UpdateContactName(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	chatID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
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

	chat, err := h.chatRepo.UpdateNameForTenant(c.Request.Context(), chatID, instanceID, tenantID, displayName)
	if err != nil {
		h.logger.Error("Failed to update chat contact name", zap.Error(err))
		c.JSON(http.StatusForbidden, gin.H{"error": "Chat not found for tenant"})
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
