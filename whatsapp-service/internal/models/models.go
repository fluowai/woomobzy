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
	ID            uuid.UUID  `json:"id" db:"id"`
	InstanceID    uuid.UUID  `json:"instance_id" db:"instance_id"`
	ChatJID       string     `json:"chat_jid" db:"chat_jid"`
	Name          string     `json:"name" db:"name"`
	IsGroup       bool       `json:"is_group" db:"is_group"`
	LastMessage   string     `json:"last_message,omitempty" db:"last_message"`
	LastMessageAt *time.Time `json:"last_message_at,omitempty" db:"last_message_at"`
	UnreadCount   int        `json:"unread_count" db:"unread_count"`
	AvatarURL     string     `json:"avatar_url,omitempty" db:"avatar_url"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
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
	SenderAvatarURL string      `json:"sender_avatar_url,omitempty"`
	IsFromMe        bool        `json:"is_from_me" db:"is_from_me"`
	IsGroup         bool        `json:"is_group" db:"is_group"`
	Type            MessageType `json:"type" db:"type"`
	Content         string      `json:"content,omitempty" db:"content"`
	MediaURL        string      `json:"media_url,omitempty" db:"media_url"`
	MediaID         string      `json:"media_id,omitempty"`
	MediaMimetype   string      `json:"media_mimetype,omitempty" db:"media_mimetype"`
	MediaFilename   string      `json:"media_filename,omitempty" db:"media_filename"`
	MediaStatus     string      `json:"media_status,omitempty" db:"media_status"`
	MediaError      string      `json:"media_error,omitempty" db:"media_error"`
	MediaRetryCount int         `json:"media_retry_count,omitempty" db:"media_retry_count"`
	QuotedMessageID string      `json:"quoted_message_id,omitempty" db:"quoted_message_id"`
	Timestamp       time.Time   `json:"timestamp" db:"timestamp"`
	CreatedAt       time.Time   `json:"created_at" db:"created_at"`
}

// Media represents processing metadata for a WhatsApp message attachment.
type Media struct {
	ID         uuid.UUID `json:"id" db:"id"`
	MessageID  uuid.UUID `json:"message_id" db:"message_id"`
	InstanceID uuid.UUID `json:"instance_id" db:"instance_id"`
	TenantID   uuid.UUID `json:"tenant_id" db:"tenant_id"`
	Type       string    `json:"type" db:"type"`
	Provider   string    `json:"provider" db:"provider"`
	Bucket     string    `json:"bucket" db:"bucket"`
	ObjectKey  string    `json:"object_key" db:"object_key"`
	PublicURL  string    `json:"public_url,omitempty" db:"public_url"`
	Filename   string    `json:"filename,omitempty" db:"filename"`
	MimeType   string    `json:"mime_type,omitempty" db:"mime_type"`
	Status     string    `json:"status" db:"status"`
	RetryCount int       `json:"retry_count" db:"retry_count"`
	LastError  string    `json:"last_error,omitempty" db:"last_error"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
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

// HistoryImportRequest controls an on-demand history import/analysis run.
type HistoryImportRequest struct {
	ChatLimit int `json:"chat_limit,omitempty"`
	PerChat   int `json:"per_chat,omitempty"`
}

// HistoryImportResponse summarizes a requested import/analysis run.
type HistoryImportResponse struct {
	Message       string `json:"message"`
	Requested     int    `json:"requested"`
	Analyzing     bool   `json:"analyzing"`
	ImportedChats int    `json:"imported_chats,omitempty"`
	ImportedMsgs  int    `json:"imported_messages,omitempty"`
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
	AvatarURL   string `json:"avatar_url,omitempty"`
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

// HistoryImportedEvent is emitted after a WhatsApp history sync chunk is stored.
type HistoryImportedEvent struct {
	InstanceID uuid.UUID `json:"instance_id"`
	Chats      int       `json:"chats"`
	Messages   int       `json:"messages"`
	Progress   uint32    `json:"progress,omitempty"`
	SyncType   string    `json:"sync_type,omitempty"`
}
