package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
)

// MessageRepo handles database operations for WhatsApp messages
type MessageRepo struct {
	db     *pgxpool.Pool
	logger *zap.Logger
}

// NewMessageRepo creates a new MessageRepo
func NewMessageRepo(db *pgxpool.Pool, logger *zap.Logger) *MessageRepo {
	return &MessageRepo{db: db, logger: logger}
}

// Create inserts a new message
func (r *MessageRepo) Create(ctx context.Context, msg *models.Message) error {
	query := `
		INSERT INTO whatsapp_messages (
			id, instance_id, chat_id, message_id, sender_phone, sender_name,
			is_from_me, is_group, type, content, media_url, media_mimetype,
			media_filename, quoted_message_id, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (instance_id, message_id) DO NOTHING
		RETURNING created_at`

	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}

	err := r.db.QueryRow(ctx, query,
		msg.ID, msg.InstanceID, msg.ChatID, msg.MessageID,
		msg.SenderPhone, msg.SenderName, msg.IsFromMe, msg.IsGroup,
		msg.Type, msg.Content, msg.MediaURL, msg.MediaMimetype,
		msg.MediaFilename, msg.QuotedMessageID, msg.Timestamp,
	).Scan(&msg.CreatedAt)

	// ON CONFLICT DO NOTHING won't return a row, which is fine (duplicate message)
	if err != nil && err.Error() == "no rows in result set" {
		r.logger.Debug("Duplicate message ignored", zap.String("message_id", msg.MessageID))
		return nil
	}
	return err
}

// ListByChat retrieves messages for a chat with pagination
func (r *MessageRepo) ListByChat(ctx context.Context, chatID uuid.UUID, limit, offset int) ([]models.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	query := `
		SELECT id, instance_id, chat_id, message_id, sender_phone, sender_name,
		       is_from_me, is_group, type, COALESCE(content, '') as content,
		       COALESCE(media_url, '') as media_url,
		       COALESCE(media_mimetype, '') as media_mimetype,
		       COALESCE(media_filename, '') as media_filename,
		       COALESCE(quoted_message_id, '') as quoted_message_id,
		       timestamp, created_at
		FROM whatsapp_messages
		WHERE chat_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, chatID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list messages: %w", err)
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var msg models.Message
		if err := rows.Scan(
			&msg.ID, &msg.InstanceID, &msg.ChatID, &msg.MessageID,
			&msg.SenderPhone, &msg.SenderName, &msg.IsFromMe, &msg.IsGroup,
			&msg.Type, &msg.Content, &msg.MediaURL, &msg.MediaMimetype,
			&msg.MediaFilename, &msg.QuotedMessageID, &msg.Timestamp, &msg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// CountByChat returns the total number of messages in a chat
func (r *MessageRepo) CountByChat(ctx context.Context, chatID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM whatsapp_messages WHERE chat_id = $1`, chatID).Scan(&count)
	return count, err
}
