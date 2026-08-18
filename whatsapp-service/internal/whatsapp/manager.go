package whatsapp

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/ws"
	"whatsapp-service/pkg/phone"
)

// Manager manages multiple WhatsApp instances
type Manager struct {
	clients           map[uuid.UUID]*Client
	connecting        map[uuid.UUID]bool
	leaseCancels      map[uuid.UUID]context.CancelFunc
	leaseOwners       map[uuid.UUID]string
	pairingErrors     map[uuid.UUID]string
	mu                sync.RWMutex
	instanceRepo      *repository.InstanceRepo
	chatRepo          *repository.ChatRepo
	contactRepo       *repository.ContactRepo
	messageRepo       *repository.MessageRepo
	mediaRepo         *repository.MediaRepo
	callRepo          *repository.CallRepo
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
	pairClientType    whatsmeow.PairClientType
	pairClientName    string
	ctx               context.Context
	cancel            context.CancelFunc
	sessionStore      *sqlstore.Container
	protocolLogger    waLog.Logger
	ownerID           string
}

const (
	qrStartupTimeout = 30 * time.Second
	instanceLeaseTTL = 45 * time.Second
)

// NewManager creates a new WhatsApp instance manager
func NewManager(
	instanceRepo *repository.InstanceRepo,
	chatRepo *repository.ChatRepo,
	contactRepo *repository.ContactRepo,
	messageRepo *repository.MessageRepo,
	mediaRepo *repository.MediaRepo,
	callRepo *repository.CallRepo,
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
	pairClientType string,
	pairClientName string,
	protocolLogLevel string,
) *Manager {
	managerCtx, cancel := context.WithCancel(context.Background())
	configureHistorySyncCapabilities()
	return &Manager{
		clients:           make(map[uuid.UUID]*Client),
		connecting:        make(map[uuid.UUID]bool),
		leaseCancels:      make(map[uuid.UUID]context.CancelFunc),
		leaseOwners:       make(map[uuid.UUID]string),
		pairingErrors:     make(map[uuid.UUID]string),
		instanceRepo:      instanceRepo,
		chatRepo:          chatRepo,
		contactRepo:       contactRepo,
		messageRepo:       messageRepo,
		mediaRepo:         mediaRepo,
		callRepo:          callRepo,
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
		pairClientType:    normalizePairClientType(pairClientType),
		pairClientName:    pairClientName,
		ctx:               managerCtx,
		cancel:            cancel,
		protocolLogger:    waLog.Stdout("WhatsMeow", normalizeProtocolLogLevel(protocolLogLevel), false),
		ownerID:           uuid.NewString(),
	}
}

func normalizeProtocolLogLevel(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "DEBUG", "INFO", "WARN", "ERROR":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return "INFO"
	}
}

// normalizePairClientType maps env-friendly names to whatsmeow constants.
// WhatsApp validates the companion display/type during phone-code pairing.
func normalizePairClientType(value string) whatsmeow.PairClientType {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "edge":
		return whatsmeow.PairClientEdge
	case "firefox":
		return whatsmeow.PairClientFirefox
	case "opera":
		return whatsmeow.PairClientOpera
	case "safari":
		return whatsmeow.PairClientSafari
	case "electron":
		return whatsmeow.PairClientElectron
	case "macos":
		return whatsmeow.PairClientMacOS
	case "android":
		return whatsmeow.PairClientAndroid
	case "chrome", "":
		return whatsmeow.PairClientChrome
	default:
		return whatsmeow.PairClientChrome
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
	container, err := sqlstore.New(ctx, "pgx", m.dbURI, m.protocolLogger.Sub("Database"))
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
	return m.connectInstance(ctx, instanceID, "")
}

func (m *Manager) connectInstance(ctx context.Context, instanceID uuid.UUID, pairPhone string) error {
	m.mu.Lock()
	delete(m.pairingErrors, instanceID)
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
		if client.IsRunning() {
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
	backgroundStarted := false
	defer func() {
		if !backgroundStarted {
			m.finishConnecting(instanceID)
		}
	}()
	m.releaseLocalLease(context.Background(), instanceID)

	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}

	leaseOwnerID := m.ownerID + ":" + uuid.NewString()
	acquired, err := m.instanceRepo.AcquireLease(ctx, instanceID, leaseOwnerID, instanceLeaseTTL)
	if err != nil {
		return m.failConnect(ctx, instanceID, inst.TenantID, fmt.Errorf("failed to acquire instance lease: %w", err))
	}
	if !acquired {
		return fmt.Errorf("instance is active on another WhatsApp service replica")
	}
	releaseLease := true
	defer func() {
		if releaseLease {
			_ = m.instanceRepo.ReleaseLease(context.Background(), instanceID, leaseOwnerID)
		}
	}()

	if err := m.instanceRepo.UpdateStatus(ctx, instanceID, models.StatusConnecting); err != nil {
		m.logger.Error("Failed to update connecting status",
			zap.String("id", instanceID.String()),
			zap.Error(err),
		)
	}

	if err := m.initializeSessionStore(ctx); err != nil {
		return m.failConnect(ctx, instanceID, inst.TenantID, err)
	}
	deviceStore, err := m.deviceForInstance(ctx, inst)
	if err != nil {
		return m.failConnect(ctx, instanceID, inst.TenantID, err)
	}

	waClient := whatsmeow.NewClient(deviceStore, m.protocolLogger.Sub(instanceID.String()))

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
		m.pairClientType,
		m.pairClientName,
	)
	if pairPhone != "" {
		client.PreparePairCode(pairPhone)
	}

	m.mu.Lock()
	old := m.clients[instanceID]
	m.clients[instanceID] = client
	m.mu.Unlock()
	if old != nil {
		old.Disconnect()
	}
	m.startLeaseHeartbeat(instanceID, client, leaseOwnerID)
	releaseLease = false

	// Initialize call manager
	if m.callRepo != nil {
		client.InitCallManager(m.callRepo)
	}

	// Start connection in background
	backgroundStarted = true
	go func() {
		defer m.finishConnecting(instanceID)
		connectCtx := client.ctx
		cancelConnect := func() {}
		if client.GetWAClient().Store.ID != nil {
			connectCtx, cancelConnect = context.WithTimeout(client.ctx, 90*time.Second)
		}
		defer cancelConnect()
		if err := client.Connect(connectCtx); err != nil {
			message := "Não foi possível conectar ao WhatsApp. Verifique o acesso à internet do serviço e tente novamente."
			m.setPairingError(instanceID, message)
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
			m.hub.BroadcastEventToTenant(uuidToString(inst.TenantID), "instance_status", models.InstanceStatusEvent{
				InstanceID: instanceID,
				Status:     models.StatusDisconnected,
				Error:      message,
			})
		}
	}()
	go m.watchQRStartup(instanceID, client, inst.TenantID)

	return nil
}

func (m *Manager) finishConnecting(instanceID uuid.UUID) {
	m.mu.Lock()
	delete(m.connecting, instanceID)
	m.mu.Unlock()
}

func (m *Manager) startLeaseHeartbeat(instanceID uuid.UUID, client *Client, leaseOwnerID string) {
	leaseCtx, cancel := context.WithCancel(m.ctx)
	m.mu.Lock()
	if previous := m.leaseCancels[instanceID]; previous != nil {
		previous()
	}
	m.leaseCancels[instanceID] = cancel
	m.leaseOwners[instanceID] = leaseOwnerID
	m.mu.Unlock()

	go func() {
		ticker := time.NewTicker(instanceLeaseTTL / 3)
		defer ticker.Stop()
		defer func() {
			_ = m.instanceRepo.ReleaseLease(context.Background(), instanceID, leaseOwnerID)
		}()
		for {
			select {
			case <-leaseCtx.Done():
				return
			case <-client.ctx.Done():
				return
			case <-ticker.C:
				renewed, err := m.instanceRepo.RenewLease(leaseCtx, instanceID, leaseOwnerID, instanceLeaseTTL)
				if err != nil || !renewed {
					m.logger.Error("Lost WhatsApp instance lease", zap.String("instance", instanceID.String()), zap.Error(err))
					client.Disconnect()
					return
				}
			}
		}
	}()
}

func (m *Manager) releaseLocalLease(ctx context.Context, instanceID uuid.UUID) {
	m.mu.Lock()
	cancel := m.leaseCancels[instanceID]
	ownerID := m.leaseOwners[instanceID]
	delete(m.leaseCancels, instanceID)
	delete(m.leaseOwners, instanceID)
	m.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	if ownerID != "" {
		_ = m.instanceRepo.ReleaseLease(ctx, instanceID, ownerID)
	}
}

// watchQRStartup prevents a pre-login session from remaining in qr_pending
// forever when WhatsMeow opens the connection but emits neither a QR code nor
// a terminal QR-channel event.
func (m *Manager) watchQRStartup(instanceID uuid.UUID, client *Client, tenantID *uuid.UUID) {
	timer := time.NewTimer(qrStartupTimeout)
	defer timer.Stop()

	select {
	case <-client.ctx.Done():
		return
	case <-timer.C:
	}

	m.mu.RLock()
	currentClient := m.clients[instanceID]
	m.mu.RUnlock()
	if !shouldAbortQRStartup(currentClient, client) {
		return
	}

	socketConnected := client.IsSocketConnected()
	client.Disconnect()
	message := qrStartupFailureMessage(socketConnected)
	m.setPairingError(instanceID, message)
	m.logger.Warn("WhatsApp QR startup timed out",
		zap.String("id", instanceID.String()),
		zap.Duration("timeout", qrStartupTimeout),
	)
	if err := m.instanceRepo.UpdateStatus(m.ctx, instanceID, models.StatusDisconnected); err != nil {
		m.logger.Error("Failed to reset status after QR startup timeout",
			zap.String("id", instanceID.String()),
			zap.Error(err),
		)
	}
	m.hub.BroadcastEventToTenant(uuidToString(tenantID), "instance_status", models.InstanceStatusEvent{
		InstanceID: instanceID,
		Status:     models.StatusDisconnected,
		Error:      message,
	})
}

func qrStartupFailureMessage(socketConnected bool) string {
	if socketConnected {
		return "A conexão com o WhatsApp foi aberta, mas o servidor não enviou os dados do QR Code. Tente novamente e verifique os logs do protocolo."
	}
	return "A conexão com o WhatsApp foi encerrada antes da geração do QR Code. Verifique DNS, TLS, proxy e acesso de saída do container."
}

func shouldAbortQRStartup(currentClient, watchedClient *Client) bool {
	return currentClient == watchedClient &&
		watchedClient != nil &&
		!watchedClient.IsConnected() &&
		watchedClient.CurrentQRCode() == ""
}

// failConnect resets an instance to disconnected and notifies the frontend when
// connection setup fails before the WhatsApp client can be started.
func (m *Manager) failConnect(ctx context.Context, instanceID uuid.UUID, tenantID *uuid.UUID, err error) error {
	message := "Não foi possível iniciar a conexão com o WhatsApp. Tente novamente em alguns instantes."
	m.setPairingError(instanceID, message)
	m.logger.Error("Failed to connect instance",
		zap.String("id", instanceID.String()),
		zap.Error(err),
	)
	if updateErr := m.instanceRepo.UpdateStatus(ctx, instanceID, models.StatusDisconnected); updateErr != nil {
		m.logger.Error("Failed to reset status after connect error",
			zap.String("id", instanceID.String()),
			zap.Error(updateErr),
		)
	}
	m.hub.BroadcastEventToTenant(uuidToString(tenantID), "instance_status", models.InstanceStatusEvent{
		InstanceID: instanceID,
		Status:     models.StatusDisconnected,
		Error:      message,
	})
	return err
}

func (m *Manager) setPairingError(instanceID uuid.UUID, message string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if message == "" {
		delete(m.pairingErrors, instanceID)
		return
	}
	m.pairingErrors[instanceID] = message
}

// GetPairingError returns the last terminal error for the current QR flow.
func (m *Manager) GetPairingError(instanceID uuid.UUID) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if client := m.clients[instanceID]; client != nil {
		if message := client.CurrentPairingError(); message != "" {
			return message
		}
	}
	return m.pairingErrors[instanceID]
}

// PairingErrorRecoverable reports whether the current pairing error can be
// resolved automatically (e.g. an expired QR code) instead of requiring the
// user to retry manually.
func (m *Manager) PairingErrorRecoverable(instanceID uuid.UUID) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if client := m.clients[instanceID]; client != nil {
		return client.PairingErrorRecoverable()
	}
	return false
}

// ClearPairingError clears a pending pairing error so the QR flow can restart
// automatically on the next poll.
func (m *Manager) ClearPairingError(instanceID uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.pairingErrors, instanceID)
	if client := m.clients[instanceID]; client != nil {
		client.ClearPairingError()
	}
}

// RequestPairCode generates the code shown in WhatsApp's "link with phone
// number" flow. It intentionally reuses the QR pre-login connection required
// by whatsmeow instead of creating a separate login path.
func (m *Manager) RequestPairCode(ctx context.Context, instanceID uuid.UUID, phoneNumber string) (*models.PairCodeResponse, error) {
	normalizedPhone := phone.Normalize(phoneNumber)
	if !phone.IsValidBR(normalizedPhone) {
		return nil, fmt.Errorf("telefone invalido: use DDI + DDD + numero, ex: +5511999999999")
	}

	m.mu.RLock()
	client, exists := m.clients[instanceID]
	m.mu.RUnlock()
	if exists && client.IsConnected() {
		return nil, fmt.Errorf("instância já conectada")
	}

	if exists {
		client.PreparePairCode(normalizedPhone)
		if client.CurrentQRCode() != "" {
			go client.generatePendingPairCode(ctx, 160*time.Second)
		}
	} else if err := m.connectInstance(ctx, instanceID, normalizedPhone); err != nil {
		return nil, err
	}

	m.mu.RLock()
	client, exists = m.clients[instanceID]
	m.mu.RUnlock()
	if !exists {
		return nil, fmt.Errorf("cliente WhatsApp não inicializado")
	}

	waitCtx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	code, pairedPhone, err := client.WaitPairCode(waitCtx)
	if err != nil {
		return nil, err
	}
	if code == "" {
		return nil, fmt.Errorf("código de pareamento não foi gerado")
	}

	return &models.PairCodeResponse{
		PairingCode: code,
		Phone:       pairedPhone,
		ExpiresIn:   160,
		Message:     "Digite este código no WhatsApp em Aparelhos conectados > Conectar com número de telefone.",
	}, nil
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
	legacy, err := sqlstore.New(ctx, "sqlite3", fmt.Sprintf("file:%s?_foreign_keys=on", dbPath), m.protocolLogger.Sub("LegacyDatabase"))
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
	client, exists := m.clients[instanceID]
	delete(m.clients, instanceID)
	delete(m.connecting, instanceID)
	delete(m.pairingErrors, instanceID)
	m.mu.Unlock()
	m.releaseLocalLease(ctx, instanceID)

	if exists {
		client.Disconnect()
	}

	if err := m.instanceRepo.UpdateStatus(ctx, instanceID, models.StatusDisconnected); err != nil {
		m.logger.Error("Failed to update instance status", zap.Error(err))
	}

	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err == nil {
		m.hub.BroadcastEventToTenant(uuidToString(inst.TenantID), "instance_status", models.InstanceStatusEvent{
			InstanceID: instanceID,
			Status:     models.StatusDisconnected,
		})
	}

	return nil
}

// LogoutInstance revokes the linked WhatsApp device and clears the app-side
// session reference. DisconnectInstance intentionally preserves that link.
func (m *Manager) LogoutInstance(ctx context.Context, instanceID uuid.UUID) error {
	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return err
	}
	m.mu.RLock()
	client := m.clients[instanceID]
	m.mu.RUnlock()
	if inst.JID != "" && (client == nil || !client.IsConnected()) {
		if err := m.ConnectInstance(ctx, instanceID); err != nil {
			return fmt.Errorf("failed to reconnect WhatsApp device for logout: %w", err)
		}
		timer := time.NewTimer(15 * time.Second)
		ticker := time.NewTicker(200 * time.Millisecond)
		defer timer.Stop()
		defer ticker.Stop()
		for client == nil || !client.IsConnected() {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-timer.C:
				return fmt.Errorf("WhatsApp device did not reconnect in time for logout")
			case <-ticker.C:
				m.mu.RLock()
				client = m.clients[instanceID]
				m.mu.RUnlock()
			}
		}
	}
	if inst.JID != "" {
		if client == nil || client.GetWAClient() == nil || client.GetWAClient().Store.ID == nil {
			return fmt.Errorf("WhatsApp device is unavailable for logout")
		}
		if err := client.GetWAClient().Logout(ctx); err != nil {
			return fmt.Errorf("failed to logout WhatsApp device: %w", err)
		}
	}
	if err := m.DisconnectInstance(ctx, instanceID); err != nil {
		return err
	}
	if err := m.instanceRepo.ClearSession(ctx, instanceID, models.StatusLoggedOut); err != nil {
		return err
	}
	m.hub.BroadcastEventToTenant(uuidToString(inst.TenantID), "instance_status", models.InstanceStatusEvent{
		InstanceID: instanceID,
		Status:     models.StatusLoggedOut,
	})
	return nil
}

// DeleteInstance deletes an instance and its session
func (m *Manager) DeleteInstance(ctx context.Context, instanceID uuid.UUID) error {
	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return err
	}
	if inst.JID != "" {
		if err := m.initializeSessionStore(ctx); err != nil {
			return err
		}
	}
	// Disconnect first. This is idempotent even when another process already
	// lost or stopped the in-memory client.
	if err := m.DisconnectInstance(ctx, instanceID); err != nil {
		return err
	}

	if m.sessionStore != nil && inst.JID != "" {
		if jid, parseErr := types.ParseJID(inst.JID); parseErr == nil {
			if device, getErr := m.sessionStore.GetDevice(ctx, jid); getErr == nil && device != nil {
				if err := m.sessionStore.DeleteDevice(ctx, device); err != nil {
					return fmt.Errorf("failed to delete WhatsApp device session: %w", err)
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
				return nil, fmt.Errorf("instância WhatsApp reconectando, tente novamente em alguns segundos")
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
			message = "Não havia mensagens âncora para solicitar histórico por conversa, e o pedido completo do WhatsApp falhou. Reconecte a instância e tente novamente."
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

	// Try from database. Only rendered QR images are served; any legacy raw
	// pairing token stored before the image-only migration is dropped so the
	// credential never reaches the client through this endpoint.
	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return "", err
	}
	if !isQRImageDataURL(inst.QRCode) {
		return "", nil
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
			select {
			case <-ctx.Done():
				return
			case <-time.After(250 * time.Millisecond):
			}
		}
	}
}

// StartMediaWorker processes queued incoming WhatsApp media in the background.
func (m *Manager) StartMediaWorker() {
	if m.mediaRepo == nil {
		return
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
	semaphore := make(chan struct{}, 4)
	var workers sync.WaitGroup
	for _, job := range jobs {
		job := job
		workers.Add(1)
		go func() {
			defer workers.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			m.processMediaJob(job)
		}()
	}
	workers.Wait()
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
