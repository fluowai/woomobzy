package models

import (
	"time"

	"github.com/google/uuid"
)

// InstanceStatus represents the connection state of a WhatsApp instance
type InstanceStatus string

const (
	StatusConnected    InstanceStatus = "connected"
	StatusDisconnected InstanceStatus = "disconnected"
	StatusConnecting   InstanceStatus = "connecting"
	StatusQRPending    InstanceStatus = "qr_pending"
)

// Instance represents a WhatsApp connection instance
type Instance struct {
	ID        uuid.UUID      `json:"id" db:"id"`
	TenantID  *uuid.UUID     `json:"tenant_id,omitempty" db:"tenant_id"`
	Name      string         `json:"name" db:"name"`
	Status    InstanceStatus `json:"status" db:"status"`
	QRCode    string         `json:"qr_code,omitempty" db:"qr_code"`
	Phone     string         `json:"phone,omitempty" db:"phone"`
	JID       string         `json:"jid,omitempty" db:"jid"`
	CreatedAt time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt time.Time      `json:"updated_at" db:"updated_at"`
}

// Contact represents a WhatsApp contact
type Contact struct {
	ID          uuid.UUID `json:"id" db:"id"`
	InstanceID  uuid.UUID `json:"instance_id" db:"instance_id"`
	Phone       string    `json:"phone" db:"phone"`
	PushName    string    `json:"push_name,omitempty" db:"push_name"`
	DisplayName string    `json:"display_name" db:"display_name"`
	AvatarURL   string    `json:"avatar_url,omitempty" db:"avatar_url"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Chat represents a conversation (individual or group)
type Chat struct {
	ID            uuid.UUID `json:"id" db:"id"`
	InstanceID    uuid.UUID `json:"instance_id" db:"instance_id"`
	ChatJID       string    `json:"chat_jid" db:"chat_jid"`
	Name          string    `json:"name" db:"name"`
	IsGroup       bool      `json:"is_group" db:"is_group"`
	LastMessage   string    `json:"last_message,omitempty" db:"last_message"`
	LastMessageAt *time.Time `json:"last_message_at,omitempty" db:"last_message_at"`
	UnreadCount   int       `json:"unread_count" db:"unread_count"`
	AvatarURL     string    `json:"avatar_url,omitempty" db:"avatar_url"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// MessageType represents the type of message content
type MessageType string

const (
	MessageTypeText     MessageType = "text"
	MessageTypeImage    MessageType = "image"
	MessageTypeAudio    MessageType = "audio"
	MessageTypeVideo    MessageType = "video"
	MessageTypeDocument MessageType = "document"
	MessageTypeSticker  MessageType = "sticker"
	MessageTypeLocation MessageType = "location"
	MessageTypeContact  MessageType = "contact"
	MessageTypeUnknown  MessageType = "unknown"
)

// Message represents a single WhatsApp message
type Message struct {
	ID              uuid.UUID   `json:"id" db:"id"`
	InstanceID      uuid.UUID   `json:"instance_id" db:"instance_id"`
	ChatID          uuid.UUID   `json:"chat_id" db:"chat_id"`
	MessageID       string      `json:"message_id" db:"message_id"`
	SenderPhone     string      `json:"sender_phone" db:"sender_phone"`
	SenderName      string      `json:"sender_name" db:"sender_name"`
	IsFromMe        bool        `json:"is_from_me" db:"is_from_me"`
	IsGroup         bool        `json:"is_group" db:"is_group"`
	Type            MessageType `json:"type" db:"type"`
	Content         string      `json:"content,omitempty" db:"content"`
	MediaURL        string      `json:"media_url,omitempty" db:"media_url"`
	MediaMimetype   string      `json:"media_mimetype,omitempty" db:"media_mimetype"`
	MediaFilename   string      `json:"media_filename,omitempty" db:"media_filename"`
	QuotedMessageID string      `json:"quoted_message_id,omitempty" db:"quoted_message_id"`
	Timestamp       time.Time   `json:"timestamp" db:"timestamp"`
	CreatedAt       time.Time   `json:"created_at" db:"created_at"`
}

// ---- Request/Response DTOs ----

// CreateInstanceRequest is the payload for creating a new instance
type CreateInstanceRequest struct {
	Name     string     `json:"name" binding:"required"`
	TenantID *uuid.UUID `json:"tenant_id,omitempty"`
}

// SendMessageRequest is the payload for sending a message
type SendMessageRequest struct {
	Content string      `json:"content" binding:"required"`
	Type    MessageType `json:"type" binding:"required"`
}

// ---- WebSocket Events ----

// WSEvent represents a WebSocket event sent to the frontend
type WSEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// NewMessageEvent is the data payload for a new message WebSocket event
type NewMessageEvent struct {
	Message  Message `json:"message"`
	Chat     Chat    `json:"chat"`
	Instance struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	} `json:"instance"`
	Participant *ParticipantInfo `json:"participant,omitempty"`
}

// ParticipantInfo holds group message participant details
type ParticipantInfo struct {
	PushName    string `json:"push_name"`
	Phone       string `json:"phone"`
	DisplayName string `json:"display_name"`
}

// QRCodeEvent is emitted when a QR code is generated
type QRCodeEvent struct {
	InstanceID uuid.UUID `json:"instance_id"`
	QRCode     string    `json:"qr_code"`
}

// InstanceStatusEvent is emitted when an instance status changes
type InstanceStatusEvent struct {
	InstanceID uuid.UUID      `json:"instance_id"`
	Status     InstanceStatus `json:"status"`
	Phone      string         `json:"phone,omitempty"`
}
