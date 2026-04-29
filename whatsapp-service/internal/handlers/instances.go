package handlers

import (
	"net/http"

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
	var req models.CreateInstanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	inst, err := h.manager.CreateInstance(c.Request.Context(), req.Name, req.TenantID)
	if err != nil {
		h.logger.Error("Failed to create instance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Auto-connect (start QR code generation)
	go func() {
		if err := h.manager.ConnectInstance(c.Request.Context(), inst.ID); err != nil {
			h.logger.Error("Failed to auto-connect instance", zap.Error(err))
		}
	}()

	c.JSON(http.StatusCreated, inst)
}

// ListInstances handles GET /api/instances
func (h *InstanceHandler) ListInstances(c *gin.Context) {
	var tenantID *uuid.UUID
	if tid := c.Query("tenant_id"); tid != "" {
		parsed, err := uuid.Parse(tid)
		if err == nil {
			tenantID = &parsed
		}
	}

	instances, err := h.instanceRepo.List(c.Request.Context(), tenantID)
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
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	inst, err := h.instanceRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Instance not found"})
		return
	}

	c.JSON(http.StatusOK, inst)
}

// DeleteInstance handles DELETE /api/instances/:id
func (h *InstanceHandler) DeleteInstance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
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
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	// Ensure instance is connecting
	if err := h.manager.ConnectInstance(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to connect for QR", zap.Error(err))
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

// ConnectInstance handles POST /api/instances/:id/connect
func (h *InstanceHandler) ConnectInstance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
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
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if err := h.manager.DisconnectInstance(c.Request.Context(), id); err != nil {
		h.logger.Error("Failed to logout instance", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Instance disconnected"})
}
