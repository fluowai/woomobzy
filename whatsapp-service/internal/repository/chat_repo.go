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
		INSERT INTO whatsapp_chats (id, instance_id, chat_jid, name, is_group, last_message, last_message_at, avatar_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (instance_id, chat_jid)
		DO UPDATE SET
			name = CASE
				WHEN COALESCE(whatsapp_chats.name, '') = '' THEN EXCLUDED.name
				WHEN lower(whatsapp_chats.name) IN ('~', 'contato sem telefone') THEN EXCLUDED.name
				WHEN regexp_replace(whatsapp_chats.name, '\D', '', 'g') = split_part(whatsapp_chats.chat_jid, '@', 1)
					AND EXCLUDED.name != '' THEN EXCLUDED.name
				ELSE whatsapp_chats.name
			END,
			avatar_url = CASE WHEN EXCLUDED.avatar_url != '' THEN EXCLUDED.avatar_url ELSE whatsapp_chats.avatar_url END,
			last_message = EXCLUDED.last_message,
			last_message_at = EXCLUDED.last_message_at,
			unread_count = COALESCE(whatsapp_chats.unread_count, 0) + 1
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
		chat.LastMessage, chat.LastMessageAt, chat.AvatarURL,
	).Scan(&chat.ID, &chat.CreatedAt, &chat.UpdatedAt, &chat.UnreadCount)
}

// UpsertImported creates or updates a chat from historical sync without
// increasing unread counters for old messages.
func (r *ChatRepo) UpsertImported(ctx context.Context, chat *models.Chat) error {
	query := `
		INSERT INTO whatsapp_chats (id, instance_id, chat_jid, name, is_group, last_message, last_message_at, avatar_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (instance_id, chat_jid)
		DO UPDATE SET
			name = CASE
				WHEN COALESCE(whatsapp_chats.name, '') = '' THEN EXCLUDED.name
				WHEN lower(whatsapp_chats.name) IN ('~', 'contato sem telefone') THEN EXCLUDED.name
				WHEN regexp_replace(whatsapp_chats.name, '\D', '', 'g') = split_part(whatsapp_chats.chat_jid, '@', 1)
					AND EXCLUDED.name != '' THEN EXCLUDED.name
				ELSE whatsapp_chats.name
			END,
			avatar_url = CASE WHEN EXCLUDED.avatar_url != '' THEN EXCLUDED.avatar_url ELSE whatsapp_chats.avatar_url END,
			last_message = CASE
				WHEN whatsapp_chats.last_message_at IS NULL
				  OR EXCLUDED.last_message_at >= whatsapp_chats.last_message_at
				THEN EXCLUDED.last_message
				ELSE whatsapp_chats.last_message
			END,
			last_message_at = GREATEST(whatsapp_chats.last_message_at, EXCLUDED.last_message_at)
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
		chat.LastMessage, chat.LastMessageAt, chat.AvatarURL,
	).Scan(&chat.ID, &chat.CreatedAt, &chat.UpdatedAt, &chat.UnreadCount)
}

// GetByJID retrieves a chat by its JID and instance
func (r *ChatRepo) GetByJID(ctx context.Context, instanceID uuid.UUID, chatJID string) (*models.Chat, error) {
	query := `
		SELECT id, instance_id, chat_jid, COALESCE(name, '') as name, is_group,
		       COALESCE(last_message, '') as last_message,
		       last_message_at, COALESCE(unread_count, 0) as unread_count,
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

// GetByIDForTenant retrieves a chat after proving its instance belongs to the tenant.
func (r *ChatRepo) GetByIDForTenant(ctx context.Context, chatID, instanceID, tenantID uuid.UUID) (*models.Chat, error) {
	query := `
		SELECT c.id, c.instance_id, c.chat_jid, COALESCE(c.name, '') as name, c.is_group,
		       COALESCE(c.last_message, '') as last_message,
		       c.last_message_at, COALESCE(c.unread_count, 0) as unread_count,
		       COALESCE(c.avatar_url, '') as avatar_url,
		       c.created_at, c.updated_at
		FROM whatsapp_chats c
		JOIN whatsapp_instances wi ON wi.id = c.instance_id
		WHERE c.id = $1 AND c.instance_id = $2 AND wi.tenant_id = $3`

	var chat models.Chat
	err := r.db.QueryRow(ctx, query, chatID, instanceID, tenantID).Scan(
		&chat.ID, &chat.InstanceID, &chat.ChatJID, &chat.Name, &chat.IsGroup,
		&chat.LastMessage, &chat.LastMessageAt, &chat.UnreadCount,
		&chat.AvatarURL, &chat.CreatedAt, &chat.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

// ListByInstanceForTenant retrieves chats only when the instance belongs to the tenant.
func (r *ChatRepo) ListByInstanceForTenant(ctx context.Context, instanceID, tenantID uuid.UUID) ([]models.Chat, error) {
	query := `
		SELECT c.id, c.instance_id, c.chat_jid, COALESCE(c.name, '') as name, c.is_group,
		       COALESCE(c.last_message, '') as last_message,
		       c.last_message_at, COALESCE(c.unread_count, 0) as unread_count,
		       COALESCE(c.avatar_url, '') as avatar_url,
		       c.created_at, c.updated_at
		FROM whatsapp_chats c
		JOIN whatsapp_instances wi ON wi.id = c.instance_id
		WHERE c.instance_id = $1 AND wi.tenant_id = $2
		ORDER BY c.last_message_at DESC NULLS LAST`

	rows, err := r.db.Query(ctx, query, instanceID, tenantID)
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
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate chats: %w", err)
	}
	return chats, nil
}

// DeleteAllByInstanceForTenant removes all chats and messages for a tenant-owned instance.
func (r *ChatRepo) DeleteAllByInstanceForTenant(ctx context.Context, instanceID, tenantID uuid.UUID) (*models.DeleteChatsResponse, error) {
	query := `
		WITH owned_instance AS (
			SELECT id
			FROM whatsapp_instances
			WHERE id = $1 AND tenant_id = $2
		),
		owned_chats AS (
			SELECT c.id, c.is_group
			FROM whatsapp_chats c
			JOIN owned_instance wi ON wi.id = c.instance_id
		),
		deleted_messages AS (
			DELETE FROM whatsapp_messages m
			USING owned_chats c
			WHERE m.chat_id = c.id
			  AND m.instance_id = $1
			RETURNING m.id
		),
		deleted_chats AS (
			DELETE FROM whatsapp_chats c
			USING owned_chats oc
			WHERE c.id = oc.id
			RETURNING c.id, c.is_group
		)
		SELECT
			EXISTS(SELECT 1 FROM owned_instance) AS instance_found,
			COUNT(dc.id)::int AS deleted_chats,
			COUNT(dc.id) FILTER (WHERE NOT dc.is_group)::int AS deleted_direct,
			COUNT(dc.id) FILTER (WHERE dc.is_group)::int AS deleted_groups,
			(SELECT COUNT(*)::int FROM deleted_messages) AS deleted_messages
		FROM deleted_chats dc`

	var instanceFound bool
	result := &models.DeleteChatsResponse{}
	err := r.db.QueryRow(ctx, query, instanceID, tenantID).Scan(
		&instanceFound,
		&result.DeletedChats,
		&result.DeletedDirect,
		&result.DeletedGroups,
		&result.DeletedMessages,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to delete chats: %w", err)
	}
	if !instanceFound {
		return nil, fmt.Errorf("instance not found")
	}
	return result, nil
}

// MarkReadForTenant resets unread count only for a chat owned by the tenant.
func (r *ChatRepo) MarkReadForTenant(ctx context.Context, chatID, instanceID, tenantID uuid.UUID) error {
	query := `
		UPDATE whatsapp_chats c
		SET unread_count = 0
		FROM whatsapp_instances wi
		WHERE c.id = $1
		  AND c.instance_id = $2
		  AND wi.id = c.instance_id
		  AND wi.tenant_id = $3`
	tag, err := r.db.Exec(ctx, query, chatID, instanceID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("chat not found")
	}
	return nil
}

// UpdateNameForTenant updates a chat display name only for a tenant-owned instance.
func (r *ChatRepo) UpdateNameForTenant(ctx context.Context, chatID, instanceID, tenantID uuid.UUID, name string) (*models.Chat, error) {
	query := `
		UPDATE whatsapp_chats c
		SET name = $1, updated_at = NOW()
		FROM whatsapp_instances wi
		WHERE c.id = $2
		  AND c.instance_id = $3
		  AND wi.id = c.instance_id
		  AND wi.tenant_id = $4
		RETURNING c.id, c.instance_id, c.chat_jid, COALESCE(c.name, '') as name, c.is_group,
		          COALESCE(c.last_message, '') as last_message,
		          c.last_message_at, COALESCE(c.unread_count, 0) as unread_count,
		          COALESCE(c.avatar_url, '') as avatar_url,
		          c.created_at, c.updated_at`

	var chat models.Chat
	err := r.db.QueryRow(ctx, query, name, chatID, instanceID, tenantID).Scan(
		&chat.ID, &chat.InstanceID, &chat.ChatJID, &chat.Name, &chat.IsGroup,
		&chat.LastMessage, &chat.LastMessageAt, &chat.UnreadCount,
		&chat.AvatarURL, &chat.CreatedAt, &chat.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

// MergeJIDs moves messages from alternate one-to-one JIDs into the canonical chat.
func (r *ChatRepo) MergeJIDs(ctx context.Context, instanceID, canonicalChatID uuid.UUID, alternateJIDs []string) error {
	for _, jid := range alternateJIDs {
		if jid == "" {
			continue
		}

		var duplicateID uuid.UUID
		err := r.db.QueryRow(ctx, `
			SELECT id
			FROM whatsapp_chats
			WHERE instance_id = $1 AND chat_jid = $2 AND id <> $3
			LIMIT 1`,
			instanceID, jid, canonicalChatID,
		).Scan(&duplicateID)
		if err != nil {
			continue
		}

		if _, err := r.db.Exec(ctx, `
			UPDATE whatsapp_messages
			SET chat_id = $1
			WHERE instance_id = $2 AND chat_id = $3`,
			canonicalChatID, instanceID, duplicateID,
		); err != nil {
			return fmt.Errorf("failed to merge duplicate chat messages: %w", err)
		}

		if _, err := r.db.Exec(ctx, `
			DELETE FROM whatsapp_chats
			WHERE id = $1`,
			duplicateID,
		); err != nil {
			return fmt.Errorf("failed to delete duplicate chat: %w", err)
		}
	}

	return nil
}
