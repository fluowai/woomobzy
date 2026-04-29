package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
)

// InstanceRepo handles database operations for WhatsApp instances
type InstanceRepo struct {
	db     *pgxpool.Pool
	logger *zap.Logger
}

// NewInstanceRepo creates a new InstanceRepo
func NewInstanceRepo(db *pgxpool.Pool, logger *zap.Logger) *InstanceRepo {
	return &InstanceRepo{db: db, logger: logger}
}

// Create inserts a new instance
func (r *InstanceRepo) Create(ctx context.Context, inst *models.Instance) error {
	query := `
		INSERT INTO whatsapp_instances (id, tenant_id, name, status)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at, updated_at`

	inst.ID = uuid.New()
	inst.Status = models.StatusDisconnected

	return r.db.QueryRow(ctx, query,
		inst.ID, inst.TenantID, inst.Name, inst.Status,
	).Scan(&inst.CreatedAt, &inst.UpdatedAt)
}

// GetByID retrieves an instance by ID
func (r *InstanceRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Instance, error) {
	query := `
		SELECT id, tenant_id, name, status, COALESCE(qr_code, '') as qr_code,
		       COALESCE(phone, '') as phone, COALESCE(jid, '') as jid,
		       created_at, updated_at
		FROM whatsapp_instances WHERE id = $1`

	var inst models.Instance
	err := r.db.QueryRow(ctx, query, id).Scan(
		&inst.ID, &inst.TenantID, &inst.Name, &inst.Status, &inst.QRCode,
		&inst.Phone, &inst.JID, &inst.CreatedAt, &inst.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("instance not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get instance: %w", err)
	}
	return &inst, nil
}

// List retrieves all instances, optionally filtered by tenant
func (r *InstanceRepo) List(ctx context.Context, tenantID *uuid.UUID) ([]models.Instance, error) {
	var query string
	var args []interface{}

	if tenantID != nil {
		query = `
			SELECT id, tenant_id, name, status, COALESCE(qr_code, '') as qr_code,
			       COALESCE(phone, '') as phone, COALESCE(jid, '') as jid,
			       created_at, updated_at
			FROM whatsapp_instances WHERE tenant_id = $1 ORDER BY created_at DESC`
		args = append(args, *tenantID)
	} else {
		query = `
			SELECT id, tenant_id, name, status, COALESCE(qr_code, '') as qr_code,
			       COALESCE(phone, '') as phone, COALESCE(jid, '') as jid,
			       created_at, updated_at
			FROM whatsapp_instances ORDER BY created_at DESC`
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list instances: %w", err)
	}
	defer rows.Close()

	var instances []models.Instance
	for rows.Next() {
		var inst models.Instance
		if err := rows.Scan(
			&inst.ID, &inst.TenantID, &inst.Name, &inst.Status, &inst.QRCode,
			&inst.Phone, &inst.JID, &inst.CreatedAt, &inst.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan instance: %w", err)
		}
		instances = append(instances, inst)
	}
	return instances, nil
}

// UpdateStatus updates an instance's status
func (r *InstanceRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status models.InstanceStatus) error {
	query := `UPDATE whatsapp_instances SET status = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, status, id)
	return err
}

// UpdateQRCode sets the QR code for an instance
func (r *InstanceRepo) UpdateQRCode(ctx context.Context, id uuid.UUID, qrCode string) error {
	query := `UPDATE whatsapp_instances SET qr_code = $1, status = 'qr_pending' WHERE id = $2`
	_, err := r.db.Exec(ctx, query, qrCode, id)
	return err
}

// UpdateConnected marks an instance as connected and sets phone/JID
func (r *InstanceRepo) UpdateConnected(ctx context.Context, id uuid.UUID, phone, jid string) error {
	query := `UPDATE whatsapp_instances SET status = 'connected', phone = $1, jid = $2, qr_code = '' WHERE id = $3`
	_, err := r.db.Exec(ctx, query, phone, jid, id)
	return err
}

// Delete removes an instance by ID
func (r *InstanceRepo) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM whatsapp_instances WHERE id = $1`
	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete instance: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("instance not found: %s", id)
	}
	return nil
}
