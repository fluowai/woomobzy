package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/whatsapp"
)

// InstanceHandler handles instance-related API requests
type InstanceHandler struct {
	manager      *whatsapp.Manager
	instanceRepo *repository.InstanceRepo
	logger       *zap.Logger
}

// NewInstanceHandler creates a new InstanceHandler
func NewInstanceHandler(manager *whatsapp.Manager, instanceRepo *repository.InstanceRepo, logger *zap.Logger) *InstanceHandler {
	return &InstanceHandler{
		manager:      manager,
		instanceRepo: instanceRepo,
		logger:       logger,
	}
}

// CreateInstance handles POST /api/instances
func (h *InstanceHandler) CreateInstance(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	var req models.CreateInstanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}
	req.TenantID = &tenantID

	inst, err := h.manager.CreateInstance(c.Request.Context(), req.Name, req.TenantID)
	if err != nil {
		h.logger.Error("Failed to create instance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Auto-connect (start QR code generation)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := h.manager.ConnectInstance(ctx, inst.ID); err != nil {
			h.logger.Error("Failed to auto-connect instance", zap.Error(err))
		}
	}()

	c.JSON(http.StatusCreated, inst)
}

// ListInstances handles GET /api/instances
func (h *InstanceHandler) ListInstances(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instances, err := h.instanceRepo.List(c.Request.Context(), &tenantID)
	if err != nil {
		h.logger.Error("Failed to list instances", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if instances == nil {
		instances = []models.Instance{}
	}

	c.JSON(http.StatusOK, instances)
}

// GetInstance handles GET /api/instances/:id
func (h *InstanceHandler) GetInstance(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	inst, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Instance not found"})
		return
	}

	c.JSON(http.StatusOK, inst)
}

// DeleteInstance handles DELETE /api/instances/:id
func (h *InstanceHandler) DeleteInstance(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	if err := h.manager.DeleteInstance(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to delete instance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Instance deleted"})
}

// GetQRCode handles GET /api/instances/:id/qrcode
func (h *InstanceHandler) GetQRCode(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	inst, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Instance not found"})
		return
	}

	client, exists := h.manager.GetClient(id)
	shouldStart := !exists || (inst.Status == models.StatusDisconnected && (client == nil || !client.IsConnected()))

	// Start/restart only when there is no active QR flow. This avoids resetting
	// a valid QR while the user is scanning, but recovers after QR timeout.
	if shouldStart {
		if err := h.manager.ConnectInstance(c.Request.Context(), id); err != nil {
			h.logger.Error("Failed to connect for QR", zap.Error(err))
		}
	}

	qrCode, err := h.manager.GetQRCode(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "QR code not available"})
		return
	}

	if qrCode == "" {
		c.JSON(http.StatusAccepted, gin.H{
			"message": "QR code generating, listen on WebSocket for qr_code event",
			"status":  "pending",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"qr_code": qrCode,
		"status":  "ready",
	})
}

// RequestPairCode handles POST /api/instances/:id/pair-code
func (h *InstanceHandler) RequestPairCode(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req models.PairCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone is required"})
		return
	}

	result, err := h.manager.RequestPairCode(c.Request.Context(), id, req.Phone)
	if err != nil {
		h.logger.Warn("Failed to request WhatsApp pairing code", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ConnectInstance handles POST /api/instances/:id/connect
func (h *InstanceHandler) ConnectInstance(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	if err := h.manager.ConnectInstance(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to connect instance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Connection initiated"})
}

// LogoutInstance handles POST /api/instances/:id/logout
func (h *InstanceHandler) LogoutInstance(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	if err := h.manager.DisconnectInstance(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to logout instance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Instance disconnected"})
}

// ImportHistory handles POST /api/instances/:id/import-history
func (h *InstanceHandler) ImportHistory(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req models.HistoryImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = models.HistoryImportRequest{}
	}

	result, err := h.manager.ImportHistory(c.Request.Context(), id, tenantID, req.ChatLimit, req.PerChat, req.SinceDays)
	if err != nil {
		h.logger.Error("Failed to import WhatsApp history", zap.Error(err))
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
