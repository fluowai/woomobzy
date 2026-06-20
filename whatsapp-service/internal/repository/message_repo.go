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

// Create inserts or enriches a message and reports whether it was newly
// inserted. Callers use this to keep unread counters idempotent.
func (r *MessageRepo) Create(ctx context.Context, msg *models.Message) (bool, error) {
	query := `
		INSERT INTO whatsapp_messages (
			id, instance_id, chat_id, message_id, sender_phone, sender_name,
			is_from_me, is_group, type, content, delivery_status, media_url, media_mimetype,
			media_filename, media_status, media_error, media_retry_count,
			quoted_message_id, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, ''), $12, $13, $14, $15, $16, $17, $18, $19)
		ON CONFLICT (instance_id, message_id) DO UPDATE SET
			chat_id = EXCLUDED.chat_id,
			sender_phone = COALESCE(NULLIF(EXCLUDED.sender_phone, ''), whatsapp_messages.sender_phone),
			sender_name = COALESCE(NULLIF(EXCLUDED.sender_name, ''), whatsapp_messages.sender_name),
			is_from_me = EXCLUDED.is_from_me,
			is_group = EXCLUDED.is_group,
			type = CASE
				WHEN whatsapp_messages.type = 'unknown' THEN EXCLUDED.type
				ELSE whatsapp_messages.type
			END,
			content = COALESCE(NULLIF(EXCLUDED.content, ''), whatsapp_messages.content),
			delivery_status = COALESCE(NULLIF(EXCLUDED.delivery_status, ''), whatsapp_messages.delivery_status),
			media_url = COALESCE(NULLIF(EXCLUDED.media_url, ''), whatsapp_messages.media_url),
			media_mimetype = COALESCE(NULLIF(EXCLUDED.media_mimetype, ''), whatsapp_messages.media_mimetype),
			media_filename = COALESCE(NULLIF(EXCLUDED.media_filename, ''), whatsapp_messages.media_filename),
			media_status = CASE
				WHEN EXCLUDED.media_status <> 'none' THEN EXCLUDED.media_status
				ELSE whatsapp_messages.media_status
			END,
			media_error = CASE
				WHEN EXCLUDED.media_status = 'ready' THEN NULL
				ELSE COALESCE(NULLIF(EXCLUDED.media_error, ''), whatsapp_messages.media_error)
			END,
			media_retry_count = GREATEST(EXCLUDED.media_retry_count, whatsapp_messages.media_retry_count),
			quoted_message_id = COALESCE(NULLIF(EXCLUDED.quoted_message_id, ''), whatsapp_messages.quoted_message_id),
			timestamp = EXCLUDED.timestamp
		RETURNING id, created_at, (xmax = 0) AS inserted`

	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	if msg.DeliveryStatus == "" {
		msg.DeliveryStatus = "sent"
	}
	if msg.MediaStatus == "" {
		msg.MediaStatus = inferMessageMediaStatus(msg)
	}

	var inserted bool
	err := r.db.QueryRow(ctx, query,
		msg.ID, msg.InstanceID, msg.ChatID, msg.MessageID,
		msg.SenderPhone, msg.SenderName, msg.IsFromMe, msg.IsGroup,
		msg.Type, msg.Content, msg.DeliveryStatus, msg.MediaURL, msg.MediaMimetype,
		msg.MediaFilename, msg.MediaStatus, msg.MediaError, msg.MediaRetryCount,
		msg.QuotedMessageID, msg.Timestamp,
	).Scan(&msg.ID, &msg.CreatedAt, &inserted)

	return inserted, err
}

// UpdateDeliveryStatus updates outgoing message receipt state by WhatsApp message ids.
func (r *MessageRepo) UpdateDeliveryStatus(ctx context.Context, instanceID uuid.UUID, messageIDs []string, status string) error {
	if len(messageIDs) == 0 || status == "" {
		return nil
	}
	_, err := r.db.Exec(ctx, `
		WITH updated AS (
			UPDATE whatsapp_messages
			SET delivery_status = $3
			WHERE instance_id = $1
			  AND message_id = ANY($2)
			RETURNING id, instance_id, message_id
		),
		instance_tenant AS (
			SELECT id, tenant_id
			FROM whatsapp_instances
			WHERE id = $1
		)
		INSERT INTO whatsapp_message_status (
			message_id, instance_id, tenant_id, whatsapp_message_id, status, occurred_at
		)
		SELECT updated.id, updated.instance_id, instance_tenant.tenant_id, updated.message_id, $3, now()
		FROM updated
		JOIN instance_tenant ON instance_tenant.id = updated.instance_id
		WHERE instance_tenant.tenant_id IS NOT NULL
		ON CONFLICT DO NOTHING
	`, instanceID, messageIDs, status)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		UPDATE whatsapp_messages
		SET delivery_status = $3
		WHERE instance_id = $1
		  AND message_id = ANY($2)
	`, instanceID, messageIDs, status)
	return err
}

// ListByChatForTenant retrieves messages only after proving the chat instance belongs to the tenant.
func (r *MessageRepo) ListByChatForTenant(ctx context.Context, chatID, instanceID, tenantID uuid.UUID, limit, offset int) ([]models.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	query := `
		SELECT m.id, m.instance_id, m.chat_id, m.message_id, m.sender_phone, m.sender_name,
		       m.is_from_me, m.is_group, m.type, COALESCE(m.content, '') as content,
		       COALESCE(m.delivery_status, '') as delivery_status,
		       COALESCE(m.media_url, '') as media_url,
		       COALESCE(wm.id::text, '') as media_id,
		       COALESCE(m.media_mimetype, '') as media_mimetype,
		       COALESCE(m.media_filename, '') as media_filename,
		       COALESCE(m.media_status, 'none') as media_status,
		       COALESCE(m.media_error, '') as media_error,
		       COALESCE(m.media_retry_count, 0) as media_retry_count,
		       COALESCE(m.quoted_message_id, '') as quoted_message_id,
		       m.timestamp, m.created_at,
		       COALESCE(c.avatar_url, '') as sender_avatar_url
		FROM whatsapp_messages m
		JOIN whatsapp_chats wc ON wc.id = m.chat_id
		JOIN whatsapp_instances wi ON wi.id = wc.instance_id
		LEFT JOIN whatsapp_contacts c
		  ON c.instance_id = m.instance_id AND c.phone = m.sender_phone
		LEFT JOIN LATERAL (
		  SELECT id
		  FROM whatsapp_media
		  WHERE message_id = m.id
		  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
		  LIMIT 1
		) wm ON TRUE
		WHERE m.chat_id = $1
		  AND m.instance_id = $4
		  AND wc.instance_id = $4
		  AND wi.tenant_id = $5
		ORDER BY m.timestamp DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, chatID, limit, offset, instanceID, tenantID)
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
			&msg.Type, &msg.Content, &msg.DeliveryStatus, &msg.MediaURL, &msg.MediaID, &msg.MediaMimetype,
			&msg.MediaFilename, &msg.MediaStatus, &msg.MediaError, &msg.MediaRetryCount,
			&msg.QuotedMessageID, &msg.Timestamp, &msg.CreatedAt,
			&msg.SenderAvatarURL,
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

// CountByChatForTenant counts messages only for a chat owned by the tenant.
func (r *MessageRepo) CountByChatForTenant(ctx context.Context, chatID, instanceID, tenantID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM whatsapp_messages m
		JOIN whatsapp_chats c ON c.id = m.chat_id
		JOIN whatsapp_instances wi ON wi.id = c.instance_id
		WHERE m.chat_id = $1
		  AND m.instance_id = $2
		  AND c.instance_id = $2
		  AND wi.tenant_id = $3`,
		chatID, instanceID, tenantID,
	).Scan(&count)
	return count, err
}

// GetOldestByChat returns the oldest stored message for on-demand history sync.
func (r *MessageRepo) GetOldestByChat(ctx context.Context, chatID, instanceID uuid.UUID) (*models.Message, error) {
	query := `
		SELECT id, instance_id, chat_id, message_id, sender_phone, sender_name,
		       is_from_me, is_group, type, COALESCE(content, '') as content,
		       COALESCE(delivery_status, '') as delivery_status,
		       COALESCE(media_url, '') as media_url,
		       '' as media_id,
		       COALESCE(media_mimetype, '') as media_mimetype,
		       COALESCE(media_filename, '') as media_filename,
		       COALESCE(media_status, 'none') as media_status,
		       COALESCE(media_error, '') as media_error,
		       COALESCE(media_retry_count, 0) as media_retry_count,
		       COALESCE(quoted_message_id, '') as quoted_message_id,
		       timestamp, created_at
		FROM whatsapp_messages
		WHERE chat_id = $1 AND instance_id = $2
		ORDER BY timestamp ASC
		LIMIT 1`

	var msg models.Message
	err := r.db.QueryRow(ctx, query, chatID, instanceID).Scan(
		&msg.ID, &msg.InstanceID, &msg.ChatID, &msg.MessageID,
		&msg.SenderPhone, &msg.SenderName, &msg.IsFromMe, &msg.IsGroup,
		&msg.Type, &msg.Content, &msg.DeliveryStatus, &msg.MediaURL, &msg.MediaID, &msg.MediaMimetype,
		&msg.MediaFilename, &msg.MediaStatus, &msg.MediaError, &msg.MediaRetryCount,
		&msg.QuotedMessageID, &msg.Timestamp, &msg.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func inferMessageMediaStatus(msg *models.Message) string {
	switch msg.Type {
	case models.MessageTypeImage, models.MessageTypeAudio, models.MessageTypeVideo, models.MessageTypeDocument, models.MessageTypeSticker:
		if msg.MediaError != "" {
			return "failed"
		}
		if msg.MediaURL != "" {
			return "ready"
		}
		return "pending"
	default:
		return "none"
	}
}
