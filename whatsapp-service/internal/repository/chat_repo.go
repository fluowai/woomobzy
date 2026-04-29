package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
)

// ChatRepo handles database operations for WhatsApp chats
type ChatRepo struct {
	db     *pgxpool.Pool
	logger *zap.Logger
}

// NewChatRepo creates a new ChatRepo
func NewChatRepo(db *pgxpool.Pool, logger *zap.Logger) *ChatRepo {
	return &ChatRepo{db: db, logger: logger}
}

// Upsert creates or updates a chat. Returns the chat (with ID populated).
func (r *ChatRepo) Upsert(ctx context.Context, chat *models.Chat) error {
	query := `
		INSERT INTO whatsapp_chats (id, instance_id, chat_jid, name, is_group, last_message, last_message_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (instance_id, chat_jid)
		DO UPDATE SET
			name = CASE WHEN EXCLUDED.name != '' THEN EXCLUDED.name ELSE whatsapp_chats.name END,
			last_message = EXCLUDED.last_message,
			last_message_at = EXCLUDED.last_message_at,
			unread_count = whatsapp_chats.unread_count + 1
		RETURNING id, created_at, updated_at, unread_count`

	if chat.ID == uuid.Nil {
		chat.ID = uuid.New()
	}

	now := time.Now()
	if chat.LastMessageAt == nil {
		chat.LastMessageAt = &now
	}

	return r.db.QueryRow(ctx, query,
		chat.ID, chat.InstanceID, chat.ChatJID, chat.Name, chat.IsGroup,
		chat.LastMessage, chat.LastMessageAt,
	).Scan(&chat.ID, &chat.CreatedAt, &chat.UpdatedAt, &chat.UnreadCount)
}

// GetByJID retrieves a chat by its JID and instance
func (r *ChatRepo) GetByJID(ctx context.Context, instanceID uuid.UUID, chatJID string) (*models.Chat, error) {
	query := `
		SELECT id, instance_id, chat_jid, name, is_group, 
		       COALESCE(last_message, '') as last_message,
		       last_message_at, unread_count,
		       COALESCE(avatar_url, '') as avatar_url,
		       created_at, updated_at
		FROM whatsapp_chats 
		WHERE instance_id = $1 AND chat_jid = $2`

	var chat models.Chat
	err := r.db.QueryRow(ctx, query, instanceID, chatJID).Scan(
		&chat.ID, &chat.InstanceID, &chat.ChatJID, &chat.Name, &chat.IsGroup,
		&chat.LastMessage, &chat.LastMessageAt, &chat.UnreadCount,
		&chat.AvatarURL, &chat.CreatedAt, &chat.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

// ListByInstance retrieves all chats for an instance, ordered by last message
func (r *ChatRepo) ListByInstance(ctx context.Context, instanceID uuid.UUID) ([]models.Chat, error) {
	query := `
		SELECT id, instance_id, chat_jid, name, is_group,
		       COALESCE(last_message, '') as last_message,
		       last_message_at, unread_count,
		       COALESCE(avatar_url, '') as avatar_url,
		       created_at, updated_at
		FROM whatsapp_chats
		WHERE instance_id = $1
		ORDER BY last_message_at DESC NULLS LAST`

	rows, err := r.db.Query(ctx, query, instanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to list chats: %w", err)
	}
	defer rows.Close()

	var chats []models.Chat
	for rows.Next() {
		var chat models.Chat
		if err := rows.Scan(
			&chat.ID, &chat.InstanceID, &chat.ChatJID, &chat.Name, &chat.IsGroup,
			&chat.LastMessage, &chat.LastMessageAt, &chat.UnreadCount,
			&chat.AvatarURL, &chat.CreatedAt, &chat.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan chat: %w", err)
		}
		chats = append(chats, chat)
	}
	return chats, nil
}

// MarkRead resets the unread count for a chat
func (r *ChatRepo) MarkRead(ctx context.Context, chatID uuid.UUID) error {
	query := `UPDATE whatsapp_chats SET unread_count = 0 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, chatID)
	return err
}
