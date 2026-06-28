package whatsapp

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/mattn/go-sqlite3"
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/queue"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/ws"
)

// Manager manages multiple WhatsApp instances
type Manager struct {
	clients           map[uuid.UUID]*Client
	connecting        map[uuid.UUID]bool
	mu                sync.RWMutex
	instanceRepo      *repository.InstanceRepo
	chatRepo          *repository.ChatRepo
	contactRepo       *repository.ContactRepo
	messageRepo       *repository.MessageRepo
	mediaRepo         *repository.MediaRepo
	mediaQueue        *queue.RabbitMQ
	hub               *ws.Hub
	logger            *zap.Logger
	dbURI             string
	storageBucket     string
	supabaseURL       string
	supabaseKey       string
	minioEndpoint     string
	minioPublicURL    string
	minioAccessKey    string
	minioSecretKey    string
	minioRegion       string
	nodeURL           string
	internalToken     string
	automationEnabled bool
	ctx               context.Context
	cancel            context.CancelFunc
	sessionStore      *sqlstore.Container
}

// NewManager creates a new WhatsApp instance manager
func NewManager(
	instanceRepo *repository.InstanceRepo,
	chatRepo *repository.ChatRepo,
	contactRepo *repository.ContactRepo,
	messageRepo *repository.MessageRepo,
	mediaRepo *repository.MediaRepo,
	mediaQueue *queue.RabbitMQ,
	hub *ws.Hub,
	logger *zap.Logger,
	dbURI string,
	supabaseURL string,
	supabaseKey string,
	storageBucket string,
	minioEndpoint string,
	minioPublicURL string,
	minioAccessKey string,
	minioSecretKey string,
	minioRegion string,
	nodeURL string,
	internalToken string,
	automationEnabled bool,
) *Manager {
	managerCtx, cancel := context.WithCancel(context.Background())
	configureHistorySyncCapabilities()
	return &Manager{
		clients:           make(map[uuid.UUID]*Client),
		connecting:        make(map[uuid.UUID]bool),
		instanceRepo:      instanceRepo,
		chatRepo:          chatRepo,
		contactRepo:       contactRepo,
		messageRepo:       messageRepo,
		mediaRepo:         mediaRepo,
		mediaQueue:        mediaQueue,
		hub:               hub,
		logger:            logger,
		dbURI:             dbURI,
		supabaseURL:       supabaseURL,
		supabaseKey:       supabaseKey,
		storageBucket:     storageBucket,
		minioEndpoint:     minioEndpoint,
		minioPublicURL:    minioPublicURL,
		minioAccessKey:    minioAccessKey,
		minioSecretKey:    minioSecretKey,
		minioRegion:       minioRegion,
		nodeURL:           nodeURL,
		internalToken:     internalToken,
		automationEnabled: automationEnabled,
		ctx:               managerCtx,
		cancel:            cancel,
	}
}

func configureHistorySyncCapabilities() {
	if store.DeviceProps.HistorySyncConfig == nil {
		return
	}
	cfg := store.DeviceProps.HistorySyncConfig
	cfg.FullSyncDaysLimit = proto.Uint32(30)
	cfg.RecentSyncDaysLimit = proto.Uint32(30)
	cfg.OnDemandReady = proto.Bool(true)
	cfg.CompleteOnDemandReady = proto.Bool(true)
	cfg.InitialSyncMaxMessagesPerChat = proto.Uint32(100)
	cfg.InlineInitialPayloadInE2EeMsg = proto.Bool(true)
}

func (m *Manager) initializeSessionStore(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.sessionStore != nil {
		return nil
	}
	container, err := sqlstore.New(ctx, "pgx", m.dbURI, waLog.Noop)
	if err != nil {
		return fmt.Errorf("failed to initialize postgres session store: %w", err)
	}
	m.sessionStore = container
	return nil
}

// CreateInstance creates a new WhatsApp instance and prepares it for connection
func (m *Manager) CreateInstance(ctx context.Context, name string, tenantID *uuid.UUID) (*models.Instance, error) {
	inst := &models.Instance{
		Name:     name,
		TenantID: tenantID,
	}

	if err := m.instanceRepo.Create(ctx, inst); err != nil {
		return nil, fmt.Errorf("failed to create instance: %w", err)
	}

	m.logger.Info("Instance created",
		zap.String("id", inst.ID.String()),
		zap.String("name", inst.Name),
	)

	return inst, nil
}

// ConnectInstance starts a WhatsApp session for an instance
func (m *Manager) ConnectInstance(ctx context.Context, instanceID uuid.UUID) error {
	m.mu.Lock()
	if client, exists := m.clients[instanceID]; exists {
		if client.IsConnected() {
			m.mu.Unlock()
			m.logger.Warn("Instance already connected", zap.String("id", instanceID.String()))
			return nil
		}
		if m.connecting[instanceID] {
			m.mu.Unlock()
			return nil
		}
	}
	if m.connecting[instanceID] {
		m.mu.Unlock()
		return nil
	}
	m.connecting[instanceID] = true
	m.mu.Unlock()
	defer func() {
		m.mu.Lock()
		delete(m.connecting, instanceID)
		m.mu.Unlock()
	}()

	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}

	if err := m.instanceRepo.UpdateStatus(ctx, instanceID, models.StatusConnecting); err != nil {
		m.logger.Error("Failed to update connecting status",
			zap.String("id", instanceID.String()),
			zap.Error(err),
		)
	}

	if err := m.initializeSessionStore(ctx); err != nil {
		return err
	}
	deviceStore, err := m.deviceForInstance(ctx, inst)
	if err != nil {
		return err
	}

	waClient := whatsmeow.NewClient(deviceStore, waLog.Noop)

	client := NewClient(
		m.ctx,
		instanceID,
		inst.TenantID,
		inst.Name,
		waClient,
		m.instanceRepo,
		m.chatRepo,
		m.contactRepo,
		m.messageRepo,
		m.mediaRepo,
		m.mediaQueue,
		m.hub,
		m.logger,
		m.supabaseURL,
		m.supabaseKey,
		m.storageBucket,
		m.minioEndpoint,
		m.minioPublicURL,
		m.minioAccessKey,
		m.minioSecretKey,
		m.minioRegion,
		m.nodeURL,
		m.internalToken,
		m.automationEnabled,
	)

	m.mu.Lock()
	if old := m.clients[instanceID]; old != nil {
		old.Disconnect()
	}
	m.clients[instanceID] = client
	m.mu.Unlock()

	// Start connection in background
	go func() {
		if err := client.Connect(client.ctx); err != nil {
			m.logger.Error("Failed to connect instance",
				zap.String("id", instanceID.String()),
				zap.Error(err),
			)
			if statusErr := m.instanceRepo.UpdateStatus(m.ctx, instanceID, models.StatusDisconnected); statusErr != nil {
				m.logger.Error("Failed to update disconnected status",
					zap.String("id", instanceID.String()),
					zap.Error(statusErr),
				)
			}
		}
	}()

	return nil
}

func (m *Manager) deviceForInstance(ctx context.Context, inst *models.Instance) (*store.Device, error) {
	if inst.JID != "" {
		jid, err := types.ParseJID(inst.JID)
		if err == nil {
			device, getErr := m.sessionStore.GetDevice(ctx, jid)
			if getErr != nil {
				return nil, fmt.Errorf("failed to load postgres device store: %w", getErr)
			}
			if device != nil {
				return device, nil
			}
		}
	}
	if migrated, err := m.migrateLegacySQLiteSession(ctx, inst.ID); err != nil {
		m.logger.Warn("Legacy session migration failed", zap.String("instance", inst.ID.String()), zap.Error(err))
	} else if migrated != nil {
		return migrated, nil
	}
	return m.sessionStore.NewDevice(), nil
}

func (m *Manager) migrateLegacySQLiteSession(ctx context.Context, instanceID uuid.UUID) (*store.Device, error) {
	dbPath := filepath.Join(".", ".sessions", instanceID.String()+".db")
	if _, err := os.Stat(dbPath); err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	legacy, err := sqlstore.New(ctx, "sqlite3", fmt.Sprintf("file:%s?_foreign_keys=on", dbPath), waLog.Noop)
	if err != nil {
		return nil, err
	}
	defer legacy.Close()
	device, err := legacy.GetFirstDevice(ctx)
	if err != nil || device == nil || device.ID == nil {
		return nil, err
	}
	if err := m.sessionStore.PutDevice(ctx, device); err != nil {
		return nil, err
	}
	m.logger.Info("Migrated WhatsApp session from SQLite to PostgreSQL", zap.String("instance", instanceID.String()))
	return m.sessionStore.GetDevice(ctx, *device.ID)
}

// DisconnectInstance disconnects a WhatsApp instance
func (m *Manager) DisconnectInstance(ctx context.Context, instanceID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	client, exists := m.clients[instanceID]
	if !exists {
		return fmt.Errorf("instance not connected: %s", instanceID)
	}

	client.Disconnect()
	delete(m.clients, instanceID)

	if err := m.instanceRepo.UpdateStatus(ctx, instanceID, models.StatusDisconnected); err != nil {
		m.logger.Error("Failed to update instance status", zap.Error(err))
	}

	m.hub.BroadcastEventToTenant(uuidToString(client.tenantID), "instance_status", models.InstanceStatusEvent{
		InstanceID: instanceID,
		Status:     models.StatusDisconnected,
	})

	return nil
}

// DeleteInstance deletes an instance and its session
func (m *Manager) DeleteInstance(ctx context.Context, instanceID uuid.UUID) error {
	// Disconnect first
	m.DisconnectInstance(ctx, instanceID)

	if m.sessionStore != nil {
		if inst, err := m.instanceRepo.GetByID(ctx, instanceID); err == nil && inst.JID != "" {
			if jid, parseErr := types.ParseJID(inst.JID); parseErr == nil {
				if device, getErr := m.sessionStore.GetDevice(ctx, jid); getErr == nil && device != nil {
					_ = m.sessionStore.DeleteDevice(ctx, device)
				}
			}
		}
	}

	return m.instanceRepo.Delete(ctx, instanceID)
}

// GetClient returns the WhatsMeow client for an instance
func (m *Manager) GetClient(instanceID uuid.UUID) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	client, exists := m.clients[instanceID]
	return client, exists
}

// ImportHistory asks WhatsApp for older messages before the oldest stored
// message in each chat, then starts CRM analysis for the imported/existing chats.
func (m *Manager) ImportHistory(ctx context.Context, instanceID, tenantID uuid.UUID, chatLimit, perChat, sinceDays int) (*models.HistoryImportResponse, error) {
	if chatLimit <= 0 {
		chatLimit = 50
	}
	if chatLimit > 200 {
		chatLimit = 200
	}
	if perChat <= 0 {
		perChat = 50
	}
	if perChat > 100 {
		perChat = 100
	}
	if sinceDays < 0 {
		sinceDays = 0
	}
	if sinceDays > 3650 {
		sinceDays = 3650
	}

	client, exists := m.GetClient(instanceID)
	if !exists || !client.IsConnected() {
		if err := m.ConnectInstance(ctx, instanceID); err != nil {
			return nil, fmt.Errorf("failed to connect instance for history import: %w", err)
		}

		deadline := time.After(8 * time.Second)
		ticker := time.NewTicker(250 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-deadline:
				return nil, fmt.Errorf("instancia WhatsApp reconectando, tente novamente em alguns segundos")
			case <-ticker.C:
				client, exists = m.GetClient(instanceID)
				if exists && client.IsConnected() {
					goto connected
				}
			}
		}
	}

connected:
	var cutoff time.Time
	if sinceDays > 0 {
		cutoff = time.Now().AddDate(0, 0, -sinceDays)
	}
	client.SetHistoryImportCutoff(cutoff)

	chats, err := m.chatRepo.ListByInstanceForTenant(ctx, instanceID, tenantID)
	if err != nil {
		return nil, err
	}

	requested := 0
	skippedNoAnchor := 0
	skippedBeforeCutoff := 0
	chatIDs := make([]uuid.UUID, 0, chatLimit)
	for _, chat := range chats {
		if requested >= chatLimit {
			break
		}
		chatIDs = append(chatIDs, chat.ID)

		oldest, err := m.messageRepo.GetOldestByChat(ctx, chat.ID, instanceID)
		if err != nil || oldest == nil || oldest.MessageID == "" {
			skippedNoAnchor++
			continue
		}
		if !cutoff.IsZero() && oldest.Timestamp.Before(cutoff) {
			skippedBeforeCutoff++
			continue
		}

		if err := client.RequestAdditionalHistory(ctx, chat, *oldest, perChat); err != nil {
			m.logger.Warn("Failed to request on-demand history",
				zap.String("instance", instanceID.String()),
				zap.String("chat", chat.ID.String()),
				zap.Error(err),
			)
			continue
		}
		requested++
	}

	client.AnalyzeImportedHistory(chatIDs, len(chatIDs))

	fullHistoryRequested := false
	message := "Importacao solicitada. O WhatsApp enviara o historico disponivel em segundo plano e a IA analisara as conversas no CRM."
	if requested == 0 && skippedNoAnchor > 0 {
		if err := client.RequestFullHistoryOnDemand(ctx, sinceDays, perChat); err != nil {
			m.logger.Warn("Failed to request full on-demand history",
				zap.String("instance", instanceID.String()),
				zap.Error(err),
			)
			message = "Nao havia mensagens ancora para solicitar historico por conversa, e o pedido completo do WhatsApp falhou. Reconecte a instancia e tente novamente."
		} else {
			fullHistoryRequested = true
			requested = 1
			message = "Importacao completa solicitada para o WhatsApp. O historico dos ultimos dias sera entregue em segundo plano e aparecera no painel conforme os blocos forem recebidos."
		}
	}

	return &models.HistoryImportResponse{
		Message:              message,
		Requested:            requested,
		Analyzing:            true,
		SinceDays:            sinceDays,
		EligibleChats:        len(chatIDs),
		SkippedNoAnchor:      skippedNoAnchor,
		SkippedBeforeCutoff:  skippedBeforeCutoff,
		FullHistoryRequested: fullHistoryRequested,
	}, nil
}

// GetQRCode returns the current QR code for an instance
func (m *Manager) GetQRCode(ctx context.Context, instanceID uuid.UUID) (string, error) {
	m.mu.RLock()
	client, exists := m.clients[instanceID]
	m.mu.RUnlock()

	if exists {
		if qrCode := client.CurrentQRCode(); qrCode != "" {
			return qrCode, nil
		}
	}

	// Try from database
	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return "", err
	}
	return inst.QRCode, nil
}

// ReconnectAll reconnects all instances that were previously connected
func (m *Manager) ReconnectAll(ctx context.Context) {
	instances, err := m.instanceRepo.List(ctx, nil)
	if err != nil {
		m.logger.Error("Failed to list instances for reconnection", zap.Error(err))
		return
	}

	for _, inst := range instances {
		// Only reconnect instances that have a JID (were previously connected)
		if inst.JID != "" {
			m.logger.Info("Reconnecting instance",
				zap.String("id", inst.ID.String()),
				zap.String("name", inst.Name),
			)
			if err := m.ConnectInstance(ctx, inst.ID); err != nil {
				m.logger.Error("Failed to reconnect instance",
					zap.String("id", inst.ID.String()),
					zap.Error(err),
				)
			}
		}
	}
}

// StartMediaWorker processes queued incoming WhatsApp media in the background.
func (m *Manager) StartMediaWorker() {
	if m.mediaRepo == nil {
		return
	}
	if m.mediaQueue != nil {
		go func() {
			m.logger.Info("RabbitMQ media worker started")
			if err := m.mediaQueue.ConsumeMediaJobs(m.ctx, func(ctx context.Context, job queue.MediaJob) error {
				return m.processMediaByID(ctx, job.MediaID)
			}); err != nil && err != context.Canceled {
				m.logger.Warn("RabbitMQ media worker stopped", zap.Error(err))
			}
		}()
	}
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-m.ctx.Done():
				return
			case <-ticker.C:
				m.processMediaBatch()
			}
		}
	}()
}

func (m *Manager) processMediaBatch() {
	ctx, cancel := context.WithTimeout(m.ctx, 2*time.Minute)
	defer cancel()
	jobs, err := m.mediaRepo.ClaimPending(ctx, 10)
	if err != nil {
		m.logger.Warn("Failed to claim media jobs", zap.Error(err))
		return
	}
	for _, job := range jobs {
		m.processMediaJob(job)
	}
}

func (m *Manager) processMediaByID(ctx context.Context, mediaID uuid.UUID) error {
	job, err := m.mediaRepo.ClaimByID(ctx, mediaID)
	if err != nil {
		return err
	}
	if job == nil {
		return nil
	}
	m.processMediaJob(*job)
	return nil
}

func (m *Manager) processMediaJob(job models.Media) {
	client, ok := m.GetClient(job.InstanceID)
	if !ok || !client.IsConnected() {
		_ = m.mediaRepo.MarkFailed(m.ctx, job.ID, "WhatsApp instance is not connected", job.RetryCount)
		return
	}
	var waMessage waE2E.Message
	if err := proto.Unmarshal(job.Payload, &waMessage); err != nil {
		_ = m.mediaRepo.MarkFailed(m.ctx, job.ID, "invalid stored WhatsApp media payload: "+err.Error(), job.RetryCount)
		return
	}
	ctx, cancel := context.WithTimeout(m.ctx, 2*time.Minute)
	defer cancel()
	url, mimeType, filename, objectKey, err := client.downloadAndUploadMediaMessage(ctx, &waMessage, job.MessageID.String())
	if err != nil {
		_ = m.mediaRepo.MarkFailed(m.ctx, job.ID, err.Error(), job.RetryCount)
		client.broadcastEvent("media_failed", models.MediaStatusEvent{MessageID: job.MessageID, MediaID: job.ID, Status: "failed", Error: err.Error()})
		return
	}
	if err := m.mediaRepo.MarkReady(ctx, job.ID, url, objectKey, mimeType, filename); err != nil {
		m.logger.Warn("Failed to mark media ready", zap.String("media_id", job.ID.String()), zap.Error(err))
		return
	}
	client.broadcastEvent("media_ready", models.MediaStatusEvent{MessageID: job.MessageID, MediaID: job.ID, Status: "ready", URL: url})
}

// Shutdown gracefully disconnects all instances
func (m *Manager) Shutdown() {
	m.cancel()
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, client := range m.clients {
		m.logger.Info("Disconnecting instance on shutdown", zap.String("id", id.String()))
		client.Disconnect()
	}
	m.clients = make(map[uuid.UUID]*Client)
	if m.sessionStore != nil {
		_ = m.sessionStore.Close()
	}
}
