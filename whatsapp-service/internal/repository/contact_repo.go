package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
)

// ContactRepo handles database operations for WhatsApp contacts
type ContactRepo struct {
	db     *pgxpool.Pool
	logger *zap.Logger
}

// NewContactRepo creates a new ContactRepo
func NewContactRepo(db *pgxpool.Pool, logger *zap.Logger) *ContactRepo {
	return &ContactRepo{db: db, logger: logger}
}

// Upsert creates or updates a contact
func (r *ContactRepo) Upsert(ctx context.Context, contact *models.Contact) error {
	query := `
		INSERT INTO whatsapp_contacts (id, instance_id, phone, push_name, display_name, avatar_url)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (instance_id, phone)
		DO UPDATE SET
			push_name = CASE WHEN EXCLUDED.push_name != '' THEN EXCLUDED.push_name ELSE whatsapp_contacts.push_name END,
			display_name = CASE WHEN EXCLUDED.display_name != '' THEN EXCLUDED.display_name ELSE whatsapp_contacts.display_name END,
			avatar_url = CASE WHEN EXCLUDED.avatar_url != '' THEN EXCLUDED.avatar_url ELSE whatsapp_contacts.avatar_url END
		RETURNING id, created_at, updated_at`

	if contact.ID == uuid.Nil {
		contact.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		contact.ID, contact.InstanceID, contact.Phone, contact.PushName, contact.DisplayName, contact.AvatarURL,
	).Scan(&contact.ID, &contact.CreatedAt, &contact.UpdatedAt)
}

// GetByPhone retrieves a contact by phone number and instance
func (r *ContactRepo) GetByPhone(ctx context.Context, instanceID uuid.UUID, phone string) (*models.Contact, error) {
	query := `
		SELECT id, instance_id, phone, COALESCE(push_name, '') as push_name,
		       display_name, COALESCE(avatar_url, '') as avatar_url,
		       created_at, updated_at
		FROM whatsapp_contacts
		WHERE instance_id = $1 AND phone = $2`

	var contact models.Contact
	err := r.db.QueryRow(ctx, query, instanceID, phone).Scan(
		&contact.ID, &contact.InstanceID, &contact.Phone, &contact.PushName,
		&contact.DisplayName, &contact.AvatarURL, &contact.CreatedAt, &contact.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &contact, nil
}

// UpdateDisplayName updates a contact display name by phone.
func (r *ContactRepo) UpdateDisplayName(ctx context.Context, instanceID uuid.UUID, phone, displayName string) error {
	query := `
		UPDATE whatsapp_contacts
		SET display_name = $1, updated_at = NOW()
		WHERE instance_id = $2 AND phone = $3`
	_, err := r.db.Exec(ctx, query, displayName, instanceID, phone)
	return err
}
