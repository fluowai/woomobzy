package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/whatsapp"
)

type CallHandler struct {
	manager      *whatsapp.Manager
	instanceRepo *repository.InstanceRepo
	callRepo     *repository.CallRepo
	logger       *zap.Logger
}

func NewCallHandler(manager *whatsapp.Manager, instanceRepo *repository.InstanceRepo, callRepo *repository.CallRepo, logger *zap.Logger) *CallHandler {
	return &CallHandler{
		manager:      manager,
		instanceRepo: instanceRepo,
		callRepo:     callRepo,
		logger:       logger,
	}
}

func (h *CallHandler) StartCall(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req models.StartCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Instance is not connected"})
		return
	}

	callManager := client.CallManager()
	if callManager == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Call system not initialized for this instance"})
		return
	}

	call, err := callManager.StartCall(c.Request.Context(), req.Phone, req.IsVideo, req.Record)
	if err != nil {
		h.logger.Error("start call failed", zap.String("instance", instanceID.String()), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"call": call,
	})
}

func (h *CallHandler) AcceptCall(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req models.AcceptCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "call_id is required"})
		return
	}

	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Instance is not connected"})
		return
	}

	callManager := client.CallManager()
	if callManager == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Call system not initialized"})
		return
	}

	if err := callManager.AcceptCall(c.Request.Context(), req.CallID); err != nil {
		h.logger.Error("accept call failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "accepted", "call_id": req.CallID})
}

func (h *CallHandler) RejectCall(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req models.AcceptCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "call_id is required"})
		return
	}

	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Instance is not connected"})
		return
	}

	callManager := client.CallManager()
	if callManager == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Call system not initialized"})
		return
	}

	if err := callManager.RejectCall(c.Request.Context(), req.CallID); err != nil {
		h.logger.Error("reject call failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "rejected", "call_id": req.CallID})
}

func (h *CallHandler) EndCall(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	callID := c.Param("callId")
	if callID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "callId is required"})
		return
	}

	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Instance is not connected"})
		return
	}

	callManager := client.CallManager()
	if callManager == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Call system not initialized"})
		return
	}

	if err := callManager.EndCall(c.Request.Context(), callID); err != nil {
		h.logger.Error("end call failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ended", "call_id": callID})
}

func (h *CallHandler) ExchangeWebRTC(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	var req models.WebRTCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "call_id and sdp_offer are required"})
		return
	}

	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Instance is not connected"})
		return
	}

	callManager := client.CallManager()
	if callManager == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Call system not initialized"})
		return
	}

	sdpAnswer, err := callManager.ExchangeWebRTC(c.Request.Context(), req.CallID, req.SDPOffer)
	if err != nil {
		h.logger.Error("webrtc exchange failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.WebRTCResponse{
		CallID:    req.CallID,
		SDPAnswer: sdpAnswer,
	})
}

func (h *CallHandler) ListActiveCalls(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	client, exists := h.manager.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		c.JSON(http.StatusOK, gin.H{"calls": []interface{}{}})
		return
	}

	callManager := client.CallManager()
	if callManager == nil {
		c.JSON(http.StatusOK, gin.H{"calls": []interface{}{}})
		return
	}

	calls := callManager.ActiveCalls()
	c.JSON(http.StatusOK, gin.H{"calls": calls})
}

func (h *CallHandler) GetCallHistory(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	filter := models.CallReportFilter{
		InstanceID: &instanceID,
		TenantID:   &tenantID,
		Limit:      50,
	}

	if since := c.Query("since"); since != "" {
		if t, err := time.Parse(time.RFC3339, since); err == nil {
			filter.DateFrom = &t
		}
	}
	if dir := c.Query("direction"); dir == "inbound" || dir == "outbound" {
		d := models.CallDirection(dir)
		filter.Direction = &d
	}
	if status := c.Query("status"); status != "" {
		s := models.CallStatus(status)
		filter.Status = &s
	}
	if limit := c.Query("limit"); limit != "" {
		if l, err := fmt.Sscanf(limit, "%d", &filter.Limit); err == nil && l > 0 {
			_ = l
		}
	}

	calls, err := h.callRepo.List(c.Request.Context(), filter)
	if err != nil {
		h.logger.Error("failed to list call history", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if calls == nil {
		calls = []models.Call{}
	}

	c.JSON(http.StatusOK, gin.H{"calls": calls})
}

func (h *CallHandler) GetCallStats(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	days := 30
	if d := c.Query("days"); d != "" {
		fmt.Sscanf(d, "%d", &days)
	}
	if days < 1 {
		days = 1
	}
	if days > 365 {
		days = 365
	}

	stats, err := h.callRepo.Stats(c.Request.Context(), &tenantID, days)
	if err != nil {
		h.logger.Error("failed to get call stats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *CallHandler) GetCallReport(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	callID := c.Param("callId")
	if callID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "callId is required"})
		return
	}

	call, err := h.callRepo.GetByCallID(c.Request.Context(), callID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Call not found"})
		return
	}

	if call.TenantID != nil && *call.TenantID != tenantID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Call not found for tenant"})
		return
	}

	report := models.CallReport{
		Call: *call,
	}

	rec, _ := h.callRepo.GetRecordingByCallID(c.Request.Context(), call.ID)
	if rec != nil {
		report.Recording = rec
	}

	c.JSON(http.StatusOK, report)
}

func (h *CallHandler) ListReports(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	filter := models.CallReportFilter{
		TenantID: &tenantID,
		Limit:    50,
	}

	if since := c.Query("since"); since != "" {
		if t, err := time.Parse(time.RFC3339, since); err == nil {
			filter.DateFrom = &t
		}
	}
	if until := c.Query("until"); until != "" {
		if t, err := time.Parse(time.RFC3339, until); err == nil {
			filter.DateTo = &t
		}
	}
	if dir := c.Query("direction"); dir == "inbound" || dir == "outbound" {
		d := models.CallDirection(dir)
		filter.Direction = &d
	}
	if instanceID := c.Query("instance_id"); instanceID != "" {
		if id, err := uuid.Parse(instanceID); err == nil {
			filter.InstanceID = &id
		}
	}
	if limit := c.Query("limit"); limit != "" {
		fmt.Sscanf(limit, "%d", &filter.Limit)
	}
	if offset := c.Query("offset"); offset != "" {
		fmt.Sscanf(offset, "%d", &filter.Offset)
	}

	reports, err := h.callRepo.ListWithRecordings(c.Request.Context(), filter)
	if err != nil {
		h.logger.Error("failed to list call reports", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if reports == nil {
		reports = []models.CallReport{}
	}

	c.JSON(http.StatusOK, gin.H{"reports": reports})
}

func (h *CallHandler) GetDailySummary(c *gin.Context) {
	tenantID, ok := requireTenantID(c)
	if !ok {
		return
	}

	instanceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance ID"})
		return
	}

	if _, err := h.instanceRepo.GetByIDForTenant(c.Request.Context(), instanceID, tenantID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Instance not found for tenant"})
		return
	}

	days := 30
	if d := c.Query("days"); d != "" {
		fmt.Sscanf(d, "%d", &days)
	}
	if days < 1 {
		days = 1
	}
	if days > 90 {
		days = 90
	}

	summaries, err := h.callRepo.DailySummary(c.Request.Context(), instanceID, days)
	if err != nil {
		h.logger.Error("failed to get daily summary", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if summaries == nil {
		summaries = []models.CallDailySummary{}
	}

	c.JSON(http.StatusOK, gin.H{"summaries": summaries})
}
