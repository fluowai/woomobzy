package whatsapp

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/ws"
)

// Manager manages multiple WhatsApp instances
type Manager struct {
	clients      map[uuid.UUID]*Client
	mu           sync.RWMutex
	instanceRepo *repository.InstanceRepo
	chatRepo     *repository.ChatRepo
	contactRepo  *repository.ContactRepo
	messageRepo  *repository.MessageRepo
	hub          *ws.Hub
	logger       *zap.Logger
	dbURI        string
	storageBucket string
	supabaseURL  string
	supabaseKey  string
}

// NewManager creates a new WhatsApp instance manager
func NewManager(
	instanceRepo *repository.InstanceRepo,
	chatRepo *repository.ChatRepo,
	contactRepo *repository.ContactRepo,
	messageRepo *repository.MessageRepo,
	hub *ws.Hub,
	logger *zap.Logger,
	dbURI string,
	supabaseURL string,
	supabaseKey string,
	storageBucket string,
) *Manager {
	return &Manager{
		clients:       make(map[uuid.UUID]*Client),
		instanceRepo:  instanceRepo,
		chatRepo:      chatRepo,
		contactRepo:   contactRepo,
		messageRepo:   messageRepo,
		hub:           hub,
		logger:        logger,
		dbURI:         dbURI,
		supabaseURL:   supabaseURL,
		supabaseKey:   supabaseKey,
		storageBucket: storageBucket,
	}
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
	defer m.mu.Unlock()

	// Check if already connected
	if client, exists := m.clients[instanceID]; exists {
		if client.IsConnected() {
			m.logger.Warn("Instance already connected", zap.String("id", instanceID.String()))
			return nil
		}
		// Disconnect stale client
		client.Disconnect()
	}

	inst, err := m.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}

	// Create WhatsMeow store for this instance
	sessionsDir := filepath.Join(".", ".sessions")
	os.MkdirAll(sessionsDir, 0755)

	dbPath := filepath.Join(sessionsDir, fmt.Sprintf("%s.db", instanceID.String()))
	container, err := sqlstore.New("sqlite3",
		fmt.Sprintf("file:%s?_foreign_keys=on", dbPath),
		waLog.Noop,
	)
	if err != nil {
		return fmt.Errorf("failed to create session store: %w", err)
	}

	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		return fmt.Errorf("failed to get device store: %w", err)
	}

	waClient := whatsmeow.NewClient(deviceStore, waLog.Noop)

	client := NewClient(
		instanceID,
		inst.Name,
		waClient,
		m.instanceRepo,
		m.chatRepo,
		m.contactRepo,
		m.messageRepo,
		m.hub,
		m.logger,
		m.supabaseURL,
		m.supabaseKey,
		m.storageBucket,
	)

	m.clients[instanceID] = client

	// Start connection in background
	go func() {
		if err := client.Connect(context.Background()); err != nil {
			m.logger.Error("Failed to connect instance",
				zap.String("id", instanceID.String()),
				zap.Error(err),
			)
		}
	}()

	return nil
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

	m.hub.BroadcastEvent("instance_status", models.InstanceStatusEvent{
		InstanceID: instanceID,
		Status:     models.StatusDisconnected,
	})

	return nil
}

// DeleteInstance deletes an instance and its session
func (m *Manager) DeleteInstance(ctx context.Context, instanceID uuid.UUID) error {
	// Disconnect first
	m.DisconnectInstance(ctx, instanceID)

	// Remove session file
	sessionsDir := filepath.Join(".", ".sessions")
	dbPath := filepath.Join(sessionsDir, fmt.Sprintf("%s.db", instanceID.String()))
	os.Remove(dbPath)

	return m.instanceRepo.Delete(ctx, instanceID)
}

// GetClient returns the WhatsMeow client for an instance
func (m *Manager) GetClient(instanceID uuid.UUID) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	client, exists := m.clients[instanceID]
	return client, exists
}

// GetQRCode returns the current QR code for an instance
func (m *Manager) GetQRCode(ctx context.Context, instanceID uuid.UUID) (string, error) {
	m.mu.RLock()
	client, exists := m.clients[instanceID]
	m.mu.RUnlock()

	if exists && client.qrCode != "" {
		return client.qrCode, nil
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

// Shutdown gracefully disconnects all instances
func (m *Manager) Shutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, client := range m.clients {
		m.logger.Info("Disconnecting instance on shutdown", zap.String("id", id.String()))
		client.Disconnect()
	}
	m.clients = make(map[uuid.UUID]*Client)
}
