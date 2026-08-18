package repository

import (
	"context"
	"fmt"
	"time"

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
	if inst.TenantID != nil {
		var exists bool
		err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM organizations WHERE id = $1)", inst.TenantID).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to validate tenant: %w", err)
		} else if !exists {
			r.logger.Warn("Rejecting WhatsApp instance creation for invalid tenant", zap.String("id", inst.TenantID.String()))
			return fmt.Errorf("invalid tenant: organization not found")
		}
	}

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

// GetByIDForTenant retrieves an instance only when it belongs to the tenant.
func (r *InstanceRepo) GetByIDForTenant(ctx context.Context, id, tenantID uuid.UUID) (*models.Instance, error) {
	query := `
		SELECT id, tenant_id, name, status, COALESCE(qr_code, '') as qr_code,
		       COALESCE(phone, '') as phone, COALESCE(jid, '') as jid,
		       created_at, updated_at
		FROM whatsapp_instances WHERE id = $1 AND tenant_id = $2`

	var inst models.Instance
	err := r.db.QueryRow(ctx, query, id, tenantID).Scan(
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
	query := `
		UPDATE whatsapp_instances
		SET status = $1,
		    qr_code = CASE
		        WHEN $1 IN ('connecting', 'disconnected') THEN ''
		        ELSE qr_code
		    END
		WHERE id = $2`
	_, err := r.db.Exec(ctx, query, status, id)
	return err
}

// ClearQRCode invalidates any previously generated pairing code.
func (r *InstanceRepo) ClearQRCode(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE whatsapp_instances SET qr_code = '' WHERE id = $1`, id)
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

// BindSession persists the device identity during pairing without claiming the
// transport is authenticated. The Connected event performs that final state change.
func (r *InstanceRepo) BindSession(ctx context.Context, id uuid.UUID, phone, jid string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE whatsapp_instances
		SET phone = $1, jid = $2, qr_code = '', status = 'connecting'
		WHERE id = $3
	`, phone, jid, id)
	return err
}

// ClearSession removes the application-side link after a real WhatsApp logout.
func (r *InstanceRepo) ClearSession(ctx context.Context, id uuid.UUID, status models.InstanceStatus) error {
	_, err := r.db.Exec(ctx, `
		UPDATE whatsapp_instances
		SET status = $2, phone = '', jid = '', qr_code = ''
		WHERE id = $1
	`, id, status)
	return err
}

// AcquireLease grants short-lived ownership to one service replica.
func (r *InstanceRepo) AcquireLease(ctx context.Context, id uuid.UUID, ownerID string, ttl time.Duration) (bool, error) {
	var acquired bool
	err := r.db.QueryRow(ctx, `
		INSERT INTO whatsapp_instance_leases (instance_id, owner_id, expires_at)
		VALUES ($1, $2, now() + $3::interval)
		ON CONFLICT (instance_id) DO UPDATE SET
			owner_id = EXCLUDED.owner_id,
			expires_at = EXCLUDED.expires_at,
			updated_at = now()
		WHERE whatsapp_instance_leases.owner_id = EXCLUDED.owner_id
		   OR whatsapp_instance_leases.expires_at <= now()
		RETURNING true
	`, id, ownerID, ttl.String()).Scan(&acquired)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return acquired, err
}

func (r *InstanceRepo) RenewLease(ctx context.Context, id uuid.UUID, ownerID string, ttl time.Duration) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE whatsapp_instance_leases
		SET expires_at = now() + $3::interval, updated_at = now()
		WHERE instance_id = $1 AND owner_id = $2 AND expires_at > now()
	`, id, ownerID, ttl.String())
	return err == nil && tag.RowsAffected() == 1, err
}

func (r *InstanceRepo) ReleaseLease(ctx context.Context, id uuid.UUID, ownerID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM whatsapp_instance_leases WHERE instance_id = $1 AND owner_id = $2`, id, ownerID)
	return err
}

// Delete removes an instance by ID along with all of its dependent WhatsApp data
func (r *InstanceRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin delete transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	dependencyQueries := []string{
		`DELETE FROM whatsapp_media WHERE instance_id = $1`,
		`DELETE FROM whatsapp_messages WHERE instance_id = $1`,
		`DELETE FROM whatsapp_chats WHERE instance_id = $1`,
		`DELETE FROM whatsapp_contacts WHERE instance_id = $1`,
	}
	for _, query := range dependencyQueries {
		if _, err := tx.Exec(ctx, query, id); err != nil {
			return fmt.Errorf("failed to delete instance dependencies: %w", err)
		}
	}

	tag, err := tx.Exec(ctx, `DELETE FROM whatsapp_instances WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete instance: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("instance not found: %s", id)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit instance delete: %w", err)
	}
	return nil
}
