package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
)

type AutomationClient struct {
	nodeURL string
	token   string
	http    *http.Client
	logger  *zap.Logger
}

type AutomationMessagePayload struct {
	InstanceID   uuid.UUID               `json:"instance_id"`
	TenantID     string                  `json:"tenant_id,omitempty"`
	InstanceName string                  `json:"instance_name"`
	Chat         models.Chat             `json:"chat"`
	Message      models.Message          `json:"message"`
	Participant  *models.ParticipantInfo `json:"participant,omitempty"`
}

type AutomationImportPayload struct {
	InstanceID uuid.UUID   `json:"instance_id"`
	TenantID   string      `json:"tenant_id,omitempty"`
	ChatIDs    []uuid.UUID `json:"chat_ids,omitempty"`
	Limit      int         `json:"limit,omitempty"`
}

type AutomationResult struct {
	AgentID     string `json:"agent_id,omitempty"`
	AgentName   string `json:"agent_name,omitempty"`
	Reply       string `json:"reply,omitempty"`
	ShouldReply bool   `json:"should_reply"`
}

type automationResponse struct {
	Success bool             `json:"success"`
	Result  AutomationResult `json:"result"`
}

func NewAutomationClient(nodeURL, token string, logger *zap.Logger) *AutomationClient {
	return &AutomationClient{
		nodeURL: nodeURL,
		token:   token,
		http:    &http.Client{Timeout: 20 * time.Second},
		logger:  logger,
	}
}

func (a *AutomationClient) ProcessMessage(ctx context.Context, payload AutomationMessagePayload) (*AutomationResult, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.nodeURL+"/api/whatsapp/internal/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-whatsapp-internal-token", a.token)

	resp, err := a.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("automation endpoint returned status %d", resp.StatusCode)
	}

	var decoded automationResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("decode automation response: %w", err)
	}

	return &decoded.Result, nil
}

func (a *AutomationClient) AnalyzeImportedHistory(ctx context.Context, payload AutomationImportPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.nodeURL+"/api/whatsapp/internal/imports/analyze", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-whatsapp-internal-token", a.token)

	resp, err := a.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("history import analysis endpoint returned status %d", resp.StatusCode)
	}

	return nil
}
