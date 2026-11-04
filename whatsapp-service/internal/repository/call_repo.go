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

type CallRepo struct {
	db     *pgxpool.Pool
	logger *zap.Logger
}

func NewCallRepo(db *pgxpool.Pool, logger *zap.Logger) *CallRepo {
	return &CallRepo{db: db, logger: logger}
}

func (r *CallRepo) Create(ctx context.Context, call *models.Call) error {
	query := `
		INSERT INTO call_history (
			id, instance_id, tenant_id, call_id, peer_jid, peer_phone, peer_name,
			direction, status, end_reason, duration_secs,
			started_at, connected_at, ended_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING created_at, updated_at`

	call.ID = uuid.New()
	return r.db.QueryRow(ctx, query,
		call.ID, call.InstanceID, call.TenantID, call.CallID, call.PeerJID,
		call.PeerPhone, call.PeerName, call.Direction, call.Status,
		call.EndReason, call.DurationSecs, call.StartedAt, call.ConnectedAt,
		call.EndedAt,
	).Scan(&call.CreatedAt, &call.UpdatedAt)
}

func (r *CallRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status models.CallStatus, endReason models.CallEndReason, durationSecs int) error {
	query := `
		UPDATE call_history
		SET status = $1, end_reason = $2, duration_secs = $3,
		    connected_at = CASE WHEN $1 = 'connected' AND connected_at IS NULL THEN NOW() ELSE connected_at END,
		    ended_at = CASE WHEN $1 IN ('ended','failed') THEN NOW() ELSE ended_at END,
		    updated_at = NOW()
		WHERE id = $4`
	_, err := r.db.Exec(ctx, query, status, endReason, durationSecs, id)
	return err
}

func (r *CallRepo) UpdateConnectedAt(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE call_history SET connected_at = $1, updated_at = $1 WHERE id = $2`,
		now, id)
	return err
}

func (r *CallRepo) GetByCallID(ctx context.Context, callID string) (*models.Call, error) {
	query := `
		SELECT id, instance_id, tenant_id, call_id, peer_jid, peer_phone, peer_name,
		       direction, status, end_reason, duration_secs,
		       started_at, connected_at, ended_at, created_at, updated_at
		FROM call_history WHERE call_id = $1`

	var c models.Call
	err := r.db.QueryRow(ctx, query, callID).Scan(
		&c.ID, &c.InstanceID, &c.TenantID, &c.CallID, &c.PeerJID,
		&c.PeerPhone, &c.PeerName, &c.Direction, &c.Status,
		&c.EndReason, &c.DurationSecs, &c.StartedAt, &c.ConnectedAt,
		&c.EndedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get call by call_id: %w", err)
	}
	return &c, nil
}

func (r *CallRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Call, error) {
	query := `
		SELECT id, instance_id, tenant_id, call_id, peer_jid, peer_phone, peer_name,
		       direction, status, end_reason, duration_secs,
		       started_at, connected_at, ended_at, created_at, updated_at
		FROM call_history WHERE id = $1`

	var c models.Call
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.InstanceID, &c.TenantID, &c.CallID, &c.PeerJID,
		&c.PeerPhone, &c.PeerName, &c.Direction, &c.Status,
		&c.EndReason, &c.DurationSecs, &c.StartedAt, &c.ConnectedAt,
		&c.EndedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("call not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get call by id: %w", err)
	}
	return &c, nil
}

func (r *CallRepo) List(ctx context.Context, filter models.CallReportFilter) ([]models.Call, error) {
	args := []interface{}{}
	where := ""
	argN := 0

	addArg := func(v interface{}) string {
		argN++
		args = append(args, v)
		return fmt.Sprintf("$%d", argN)
	}

	clauses := []string{}
	if filter.InstanceID != nil {
		clauses = append(clauses, "c.instance_id = "+addArg(*filter.InstanceID))
	}
	if filter.TenantID != nil {
		clauses = append(clauses, "c.tenant_id = "+addArg(*filter.TenantID))
	}
	if filter.Direction != nil {
		clauses = append(clauses, "c.direction = "+addArg(string(*filter.Direction)))
	}
	if filter.Status != nil {
		clauses = append(clauses, "c.status = "+addArg(string(*filter.Status)))
	}
	if filter.DateFrom != nil {
		clauses = append(clauses, "c.created_at >= "+addArg(*filter.DateFrom))
	}
	if filter.DateTo != nil {
		clauses = append(clauses, "c.created_at <= "+addArg(*filter.DateTo))
	}
	if filter.PeerPhone != "" {
		clauses = append(clauses, "c.peer_phone LIKE "+addArg("%"+filter.PeerPhone+"%"))
	}

	if len(clauses) > 0 {
		where = " WHERE " + clauses[0]
		for i := 1; i < len(clauses); i++ {
			where += " AND " + clauses[i]
		}
	}

	limit := 50
	offset := 0
	if filter.Limit > 0 && filter.Limit <= 200 {
		limit = filter.Limit
	}
	if filter.Offset > 0 {
		offset = filter.Offset
	}

	query := `
		SELECT c.id, c.instance_id, c.tenant_id, c.call_id, c.peer_jid, c.peer_phone, c.peer_name,
		       c.direction, c.status, c.end_reason, c.duration_secs,
		       c.started_at, c.connected_at, c.ended_at, c.created_at, c.updated_at
		FROM call_history c` + where + ` ORDER BY c.created_at DESC LIMIT ` + addArg(limit) + ` OFFSET ` + addArg(offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list calls: %w", err)
	}
	defer rows.Close()

	var calls []models.Call
	for rows.Next() {
		var c models.Call
		if err := rows.Scan(
			&c.ID, &c.InstanceID, &c.TenantID, &c.CallID, &c.PeerJID,
			&c.PeerPhone, &c.PeerName, &c.Direction, &c.Status,
			&c.EndReason, &c.DurationSecs, &c.StartedAt, &c.ConnectedAt,
			&c.EndedAt, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan call: %w", err)
		}
		calls = append(calls, c)
	}
	return calls, nil
}

func (r *CallRepo) Stats(ctx context.Context, tenantID *uuid.UUID, days int) (*models.CallStats, error) {
	args := []interface{}{days}
	where := "WHERE c.created_at >= NOW() - make_interval(days => $1::int)"
	if tenantID != nil {
		where += fmt.Sprintf(" AND c.tenant_id = $2")
		args = append(args, *tenantID)
	}

	query := `
		SELECT
			COUNT(*)::int AS total_calls,
			COALESCE(SUM(c.duration_secs), 0)::int AS total_duration,
			COALESCE(AVG(c.duration_secs) FILTER (WHERE c.duration_secs > 0), 0)::int AS avg_duration,
			COUNT(*) FILTER (WHERE c.direction = 'inbound')::int AS inbound_calls,
			COUNT(*) FILTER (WHERE c.direction = 'outbound')::int AS outbound_calls,
			COUNT(*) FILTER (WHERE c.status = 'connected')::int AS answered_calls,
			COUNT(*) FILTER (WHERE c.end_reason IN ('no_answer','timeout','declined'))::int AS missed_calls,
			COUNT(*) FILTER (WHERE c.status = 'failed')::int AS failed_calls,
			COUNT(*) FILTER (WHERE c.end_reason = 'declined')::int AS declined_calls,
			COALESCE(
				ROUND(
					COUNT(*) FILTER (WHERE c.status = 'connected')::numeric /
					NULLIF(COUNT(*) FILTER (WHERE c.direction = 'inbound'), 0)::numeric * 100,
					1
				), 0
			)::float8 AS answer_rate,
			COUNT(DISTINCT c.peer_phone)::int AS total_unique_peers
		FROM call_history c ` + where

	stats := &models.CallStats{}
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&stats.TotalCalls, &stats.TotalDuration, &stats.AvgDuration,
		&stats.InboundCalls, &stats.OutboundCalls,
		&stats.AnsweredCalls, &stats.MissedCalls, &stats.FailedCalls,
		&stats.DeclinedCalls, &stats.AnswerRate, &stats.TotalUniquePeers,
	)
	if err != nil {
		return nil, fmt.Errorf("call stats: %w", err)
	}

	stats.TotalRecordings = 0
	recQuery := `SELECT COUNT(*)::int FROM call_recordings cr JOIN call_history c ON c.id = cr.call_id ` + where
	r.db.QueryRow(ctx, recQuery, args...).Scan(&stats.TotalRecordings)

	return stats, nil
}

func (r *CallRepo) DailySummary(ctx context.Context, instanceID uuid.UUID, days int) ([]models.CallDailySummary, error) {
	query := `
		SELECT
			DATE(c.created_at) AS date,
			COUNT(*)::int AS total_calls,
			COUNT(*) FILTER (WHERE c.direction = 'inbound')::int AS inbound_calls,
			COUNT(*) FILTER (WHERE c.direction = 'outbound')::int AS outbound_calls,
			COUNT(*) FILTER (WHERE c.status = 'connected')::int AS answered_calls,
			COUNT(*) FILTER (WHERE c.end_reason IN ('no_answer','timeout','declined'))::int AS missed_calls,
			COALESCE(SUM(c.duration_secs), 0)::int AS total_duration,
			COALESCE(AVG(c.duration_secs) FILTER (WHERE c.duration_secs > 0), 0)::int AS avg_duration,
			COUNT(*) FILTER (WHERE c.status = 'failed')::int AS failed_calls,
			0::int AS recorded_calls
		FROM call_history c
		WHERE c.instance_id = $1 AND c.created_at >= NOW() - make_interval(days => $2::int)
		GROUP BY DATE(c.created_at)
		ORDER BY date DESC
		LIMIT 90`

	rows, err := r.db.Query(ctx, query, instanceID, days)
	if err != nil {
		return nil, fmt.Errorf("daily summary: %w", err)
	}
	defer rows.Close()

	var summaries []models.CallDailySummary
	for rows.Next() {
		var s models.CallDailySummary
		if err := rows.Scan(
			&s.Date, &s.TotalCalls, &s.InboundCalls, &s.OutboundCalls,
			&s.AnsweredCalls, &s.MissedCalls, &s.TotalDuration,
			&s.AvgDuration, &s.FailedCalls, &s.RecordedCalls,
		); err != nil {
			return nil, fmt.Errorf("scan daily summary: %w", err)
		}
		summaries = append(summaries, s)
	}
	return summaries, nil
}

func (r *CallRepo) CreateRecording(ctx context.Context, rec *models.CallRecording) error {
	query := `
		INSERT INTO call_recordings (
			id, call_id, instance_id, tenant_id, status, provider,
			bucket, object_key, public_url, filename, mime_type,
			duration_secs, file_size_bytes, retry_count, last_error
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING created_at, updated_at`

	rec.ID = uuid.New()
	return r.db.QueryRow(ctx, query,
		rec.ID, rec.CallID, rec.InstanceID, rec.TenantID, rec.Status,
		rec.Provider, rec.Bucket, rec.ObjectKey, rec.PublicURL,
		rec.Filename, rec.MimeType, rec.DurationSecs, rec.FileSizeBytes,
		rec.RetryCount, rec.LastError,
	).Scan(&rec.CreatedAt, &rec.UpdatedAt)
}

func (r *CallRepo) UpdateRecording(ctx context.Context, id uuid.UUID, status models.CallRecordStatus, publicURL, lastError string) error {
	query := `
		UPDATE call_recordings
		SET status = $1, public_url = COALESCE(NULLIF($2,''), public_url),
		    last_error = $3, retry_count = retry_count + 1, updated_at = NOW()
		WHERE id = $4`
	_, err := r.db.Exec(ctx, query, status, publicURL, lastError, id)
	return err
}

func (r *CallRepo) GetRecordingByCallID(ctx context.Context, callID uuid.UUID) (*models.CallRecording, error) {
	query := `
		SELECT id, call_id, instance_id, tenant_id, status, provider,
		       bucket, object_key, public_url, filename, mime_type,
		       duration_secs, file_size_bytes, retry_count, last_error,
		       created_at, updated_at
		FROM call_recordings WHERE call_id = $1`

	var rec models.CallRecording
	err := r.db.QueryRow(ctx, query, callID).Scan(
		&rec.ID, &rec.CallID, &rec.InstanceID, &rec.TenantID, &rec.Status,
		&rec.Provider, &rec.Bucket, &rec.ObjectKey, &rec.PublicURL,
		&rec.Filename, &rec.MimeType, &rec.DurationSecs, &rec.FileSizeBytes,
		&rec.RetryCount, &rec.LastError, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get recording by call_id: %w", err)
	}
	return &rec, nil
}

func (r *CallRepo) ListWithRecordings(ctx context.Context, filter models.CallReportFilter) ([]models.CallReport, error) {
	args := []interface{}{}
	where := ""
	argN := 0

	addArg := func(v interface{}) string {
		argN++
		args = append(args, v)
		return fmt.Sprintf("$%d", argN)
	}

	clauses := []string{}
	if filter.InstanceID != nil {
		clauses = append(clauses, "c.instance_id = "+addArg(*filter.InstanceID))
	}
	if filter.TenantID != nil {
		clauses = append(clauses, "c.tenant_id = "+addArg(*filter.TenantID))
	}
	if filter.Direction != nil {
		clauses = append(clauses, "c.direction = "+addArg(string(*filter.Direction)))
	}
	if filter.Status != nil {
		clauses = append(clauses, "c.status = "+addArg(string(*filter.Status)))
	}
	if filter.DateFrom != nil {
		clauses = append(clauses, "c.created_at >= "+addArg(*filter.DateFrom))
	}
	if filter.DateTo != nil {
		clauses = append(clauses, "c.created_at <= "+addArg(*filter.DateTo))
	}

	if len(clauses) > 0 {
		where = " WHERE " + clauses[0]
		for i := 1; i < len(clauses); i++ {
			where += " AND " + clauses[i]
		}
	}

	limit := 50
	offset := 0
	if filter.Limit > 0 && filter.Limit <= 200 {
		limit = filter.Limit
	}
	if filter.Offset > 0 {
		offset = filter.Offset
	}

	query := `
		SELECT
			c.id, c.instance_id, c.tenant_id, c.call_id, c.peer_jid, c.peer_phone, c.peer_name,
			c.direction, c.status, c.end_reason, c.duration_secs,
			c.started_at, c.connected_at, c.ended_at, c.created_at, c.updated_at,
			cr.id IS NOT NULL AS has_recording,
			COALESCE(cr.id, '00000000-0000-0000-0000-000000000000'::uuid),
			COALESCE(cr.call_id, '00000000-0000-0000-0000-000000000000'::uuid),
			COALESCE(cr.instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
			cr.tenant_id,
			COALESCE(cr.status, ''),
			COALESCE(cr.provider, ''),
			COALESCE(cr.bucket, ''),
			COALESCE(cr.object_key, ''),
			COALESCE(cr.public_url, ''),
			COALESCE(cr.filename, ''),
			COALESCE(cr.mime_type, ''),
			COALESCE(cr.duration_secs, 0),
			COALESCE(cr.file_size_bytes, 0),
			COALESCE(cr.retry_count, 0),
			COALESCE(cr.last_error, ''),
			COALESCE(cr.created_at, 'epoch'::timestamptz),
			COALESCE(cr.updated_at, 'epoch'::timestamptz)
		FROM call_history c
		LEFT JOIN call_recordings cr ON cr.call_id = c.id` +
		where + ` ORDER BY c.created_at DESC LIMIT ` + addArg(limit) + ` OFFSET ` + addArg(offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list calls with recordings: %w", err)
	}
	defer rows.Close()

	var reports []models.CallReport
	for rows.Next() {
		var r models.CallReport
		hasRec := false
		var rec models.CallRecording

		err := rows.Scan(
			&r.ID, &r.InstanceID, &r.TenantID, &r.CallID, &r.PeerJID,
			&r.PeerPhone, &r.PeerName, &r.Direction, &r.Status,
			&r.EndReason, &r.DurationSecs, &r.StartedAt, &r.ConnectedAt,
			&r.EndedAt, &r.CreatedAt, &r.UpdatedAt,
			&hasRec,
			&rec.ID, &rec.CallID, &rec.InstanceID, &rec.TenantID, &rec.Status,
			&rec.Provider, &rec.Bucket, &rec.ObjectKey, &rec.PublicURL,
			&rec.Filename, &rec.MimeType, &rec.DurationSecs, &rec.FileSizeBytes,
			&rec.RetryCount, &rec.LastError, &rec.CreatedAt, &rec.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan call report: %w", err)
		}

		if hasRec {
			r.Recording = &rec
		}
		reports = append(reports, r)
	}
	return reports, nil
}

func (r *CallRepo) DeleteOlderThan(ctx context.Context, days int) (int64, error) {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM call_history WHERE created_at < NOW() - make_interval(days => $1::int)`, days)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
