package repository

import (
	"context"
	"fmt"

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
		INSERT INTO whatsapp_contacts (id, instance_id, phone, push_name, display_name)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (instance_id, phone)
		DO UPDATE SET
			push_name = CASE WHEN EXCLUDED.push_name != '' THEN EXCLUDED.push_name ELSE whatsapp_contacts.push_name END,
			display_name = CASE WHEN EXCLUDED.display_name != '' THEN EXCLUDED.display_name ELSE whatsapp_contacts.display_name END
		RETURNING id, created_at, updated_at`

	if contact.ID == uuid.Nil {
		contact.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		contact.ID, contact.InstanceID, contact.Phone, contact.PushName, contact.DisplayName,
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

// ListByInstance retrieves all contacts for an instance
func (r *ContactRepo) ListByInstance(ctx context.Context, instanceID uuid.UUID) ([]models.Contact, error) {
	query := `
		SELECT id, instance_id, phone, COALESCE(push_name, '') as push_name,
		       display_name, COALESCE(avatar_url, '') as avatar_url,
		       created_at, updated_at
		FROM whatsapp_contacts
		WHERE instance_id = $1
		ORDER BY display_name ASC`

	rows, err := r.db.Query(ctx, query, instanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to list contacts: %w", err)
	}
	defer rows.Close()

	var contacts []models.Contact
	for rows.Next() {
		var contact models.Contact
		if err := rows.Scan(
			&contact.ID, &contact.InstanceID, &contact.Phone, &contact.PushName,
			&contact.DisplayName, &contact.AvatarURL, &contact.CreatedAt, &contact.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan contact: %w", err)
		}
		contacts = append(contacts, contact)
	}
	return contacts, nil
}
