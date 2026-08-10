package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mau.fi/whatsmeow/types"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/whatsapp"
	"whatsapp-service/pkg/phone"
)

// ChatHandler handles chat-related API requests
type ChatHandler struct {
	chatRepo     *repository.ChatRepo
	contactRepo  *repository.ContactRepo
	instanceRepo *repository.InstanceRepo
	manager      *whatsapp.Manager
	logger       *zap.Logger
}

// NewChatHandler creates a new ChatHandler
func NewChatHandler(chatRepo *repository.ChatRepo, contactRepo *repository.ContactRepo, instanceRepo *repository.InstanceRepo, manager *whatsapp.Manager, logger *zap.Logger) *ChatHandler {
	return &ChatHandler{
		chatRepo:     chatRepo,
		contactRepo:  contactRepo,
		instanceRepo: instanceRepo,
		manager:      manager,
		logger:       logger,
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

// EnsureDirectChat handles POST /api/chats/ensure and creates a local
// one-to-one chat record for a valid WhatsApp phone before the first message.
func (h *ChatHandler) EnsureDirectChat(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, ok := requireInstanceID(c)
	if !ok {
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req struct {
		Phone string `json:"phone" binding:"required"`
		Name  string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	normalizedPhone := phone.Normalize(req.Phone)
	if !phone.IsValidBR(normalizedPhone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid Brazilian phone is required"})
		return
	}

	onWhatsApp, canonicalPN, err := h.isNumberOnWhatsApp(c.Request.Context(), instanceID, normalizedPhone)
	if err != nil {
		h.logger.Warn("Failed to verify WhatsApp number",
			zap.String("instance", instanceID.String()),
			zap.String("phone", normalizedPhone),
			zap.Error(err),
		)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Conecte a instancia do WhatsApp para validar o numero antes de criar a conversa.",
			"code":  "WHATSAPP_INSTANCE_OFFLINE",
		})
		return
	}
	if !onWhatsApp {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": "Este numero nao esta registrado no WhatsApp. Confira o numero e tente novamente.",
			"code":  "NUMBER_NOT_ON_WHATSAPP",
		})
		return
	}

	effectivePN := normalizedPhone
	if canonicalPN != "" {
		effectivePN = canonicalPN
	}

	displayName := strings.TrimSpace(req.Name)
	if displayName == "" {
		displayName = phone.FormatDisplay(effectivePN)
	}

	chat := &models.Chat{
		InstanceID:  instanceID,
		ChatJID:     effectivePN + "@s.whatsapp.net",
		Name:        displayName,
		IsGroup:     false,
		LastMessage: "",
	}
	if err := h.chatRepo.UpsertImported(c.Request.Context(), chat); err != nil {
		h.logger.Error("Failed to ensure direct chat", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	contact := &models.Contact{
		InstanceID:  instanceID,
		Phone:       effectivePN,
		DisplayName: displayName,
	}
	if err := h.contactRepo.Upsert(c.Request.Context(), contact); err != nil {
		h.logger.Warn("Failed to ensure direct contact", zap.Error(err))
	}

	c.JSON(http.StatusOK, chat)
}

// isNumberOnWhatsApp checks whether the phone number is registered on WhatsApp.
// It uses the connected client so the LID mapping is also warmed in the store,
// avoiding the "no LID found" error on later sends.
// It also returns the canonical phone number reported by WhatsApp (when
// available), which may differ from the typed number (e.g. extra/missing digit).
func (h *ChatHandler) isNumberOnWhatsApp(ctx context.Context, instanceID uuid.UUID, normalizedPhone string) (bool, string, error) {
	client, err := h.getConnectedClient(ctx, instanceID)
	if err != nil {
		return false, "", err
	}
	resp, err := client.GetWAClient().IsOnWhatsApp(ctx, []string{"+" + normalizedPhone})
	if err != nil {
		return false, "", err
	}
	if len(resp) == 0 {
		return false, "", nil
	}
	canonicalPN := ""
	if !resp[0].PhoneNumber.IsEmpty() && resp[0].PhoneNumber.Server == types.DefaultUserServer {
		canonicalPN = phone.ExtractFromJID(resp[0].PhoneNumber.String())
	}
	return resp[0].IsIn, canonicalPN, nil
}

func (h *ChatHandler) getConnectedClient(ctx context.Context, instanceID uuid.UUID) (*whatsapp.Client, error) {
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
