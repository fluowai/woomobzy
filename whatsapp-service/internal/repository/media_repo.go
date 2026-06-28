package repository

import (
	"context"
	"database/sql"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"whatsapp-service/internal/models"
)

// MediaRepo handles database operations for WhatsApp media pipeline metadata.
type MediaRepo struct {
	db     *pgxpool.Pool
	logger *zap.Logger
}

// FindReusableStorageObject returns an existing object key for the same tenant and sha256.
func (r *MediaRepo) FindReusableStorageObject(ctx context.Context, tenantID uuid.UUID, bucket, sha256Value string) (string, bool, error) {
	if r == nil || tenantID == uuid.Nil || strings.TrimSpace(bucket) == "" || strings.TrimSpace(sha256Value) == "" {
		return "", false, nil
	}

	var objectKey string
	err := r.db.QueryRow(ctx, `
		SELECT object_key
		FROM storage_objects
		WHERE tenant_id = $1
		  AND bucket = $2
		  AND sha256 = $3
		  AND deleted_at IS NULL
		ORDER BY created_at ASC
		LIMIT 1
	`, tenantID, bucket, sha256Value).Scan(&objectKey)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", false, nil
		}
		return "", false, err
	}

	return objectKey, objectKey != "", nil
}

// UpsertStorageObject stores MinIO metadata used by Storage Intelligence.
func (r *MediaRepo) UpsertStorageObject(
	ctx context.Context,
	tenantID uuid.UUID,
	bucket string,
	objectKey string,
	sha256Value string,
	etag string,
	sizeBytes int64,
	mimeType string,
	source string,
	entityType string,
	entityID string,
) error {
	if r == nil || tenantID == uuid.Nil || strings.TrimSpace(bucket) == "" || strings.TrimSpace(objectKey) == "" {
		return nil
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO storage_objects (
			tenant_id, bucket, object_key, sha256, etag, size_bytes, mime_type,
			source, entity_type, entity_id, deleted_at
		) VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), NULL)
		ON CONFLICT (bucket, object_key) DO UPDATE SET
			tenant_id = EXCLUDED.tenant_id,
			sha256 = COALESCE(NULLIF(EXCLUDED.sha256, ''), storage_objects.sha256),
			etag = COALESCE(NULLIF(EXCLUDED.etag, ''), storage_objects.etag),
			size_bytes = COALESCE(EXCLUDED.size_bytes, storage_objects.size_bytes),
			mime_type = COALESCE(NULLIF(EXCLUDED.mime_type, ''), storage_objects.mime_type),
			source = COALESCE(NULLIF(EXCLUDED.source, ''), storage_objects.source),
			entity_type = COALESCE(NULLIF(EXCLUDED.entity_type, ''), storage_objects.entity_type),
			entity_id = COALESCE(NULLIF(EXCLUDED.entity_id, ''), storage_objects.entity_id),
			deleted_at = NULL
	`, tenantID, bucket, objectKey, sha256Value, etag, sizeBytes, mimeType, source, entityType, entityID)
	return err
}

// NewMediaRepo creates a new MediaRepo.
func NewMediaRepo(db *pgxpool.Pool, logger *zap.Logger) *MediaRepo {
	return &MediaRepo{db: db, logger: logger}
}

// UpsertFromMessage creates or updates the media row associated with a message.
func (r *MediaRepo) UpsertFromMessage(ctx context.Context, msg *models.Message, tenantID uuid.UUID, bucket string) error {
	if msg == nil || msg.ID == uuid.Nil || tenantID == uuid.Nil || !isMediaType(msg.Type) {
		return nil
	}

	status := msg.MediaStatus
	if status == "" {
		status = inferMediaStatus(msg.MediaURL)
	}
	provider := inferProvider(msg.MediaURL)
	objectKey := inferObjectKey(msg.MediaURL, bucket)

	query := `
		INSERT INTO whatsapp_media (
			message_id, instance_id, tenant_id, type, provider, bucket, object_key,
			public_url, filename, mime_type, status, retry_count, last_error
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (message_id) DO UPDATE SET
			instance_id = EXCLUDED.instance_id,
			tenant_id = EXCLUDED.tenant_id,
			type = EXCLUDED.type,
			provider = EXCLUDED.provider,
			bucket = COALESCE(NULLIF(EXCLUDED.bucket, ''), whatsapp_media.bucket),
			object_key = COALESCE(NULLIF(EXCLUDED.object_key, ''), whatsapp_media.object_key),
			public_url = COALESCE(NULLIF(EXCLUDED.public_url, ''), whatsapp_media.public_url),
			filename = COALESCE(NULLIF(EXCLUDED.filename, ''), whatsapp_media.filename),
			mime_type = COALESCE(NULLIF(EXCLUDED.mime_type, ''), whatsapp_media.mime_type),
			status = EXCLUDED.status,
			retry_count = GREATEST(EXCLUDED.retry_count, whatsapp_media.retry_count),
			last_error = CASE
				WHEN EXCLUDED.status = 'ready' THEN NULL
				ELSE COALESCE(NULLIF(EXCLUDED.last_error, ''), whatsapp_media.last_error)
			END`

	_, err := r.db.Exec(ctx, query,
		msg.ID,
		msg.InstanceID,
		tenantID,
		string(msg.Type),
		provider,
		bucket,
		objectKey,
		msg.MediaURL,
		msg.MediaFilename,
		msg.MediaMimetype,
		status,
		msg.MediaRetryCount,
		msg.MediaError,
	)
	return err
}

// UpsertPendingFromMessage creates a recoverable pending job for incoming WhatsApp media.
func (r *MediaRepo) UpsertPendingFromMessage(ctx context.Context, msg *models.Message, tenantID uuid.UUID, bucket string, payload []byte) (uuid.UUID, error) {
	if msg == nil || msg.ID == uuid.Nil || tenantID == uuid.Nil || !isMediaType(msg.Type) {
		return uuid.Nil, nil
	}
	var mediaID uuid.UUID
	err := r.db.QueryRow(ctx, `
		INSERT INTO whatsapp_media (
			message_id, instance_id, tenant_id, type, provider, bucket, object_key,
			public_url, filename, mime_type, status, retry_count, last_error,
			whatsapp_payload, source_message_id, next_retry_at
		) VALUES ($1, $2, $3, $4, 'minio', $5, '', '', $6, $7, 'pending', 0, NULL, $8, $9, now())
		ON CONFLICT (message_id) DO UPDATE SET
			whatsapp_payload = COALESCE(EXCLUDED.whatsapp_payload, whatsapp_media.whatsapp_payload),
			source_message_id = COALESCE(NULLIF(EXCLUDED.source_message_id, ''), whatsapp_media.source_message_id),
			status = CASE WHEN whatsapp_media.status = 'ready' THEN whatsapp_media.status ELSE 'pending' END,
			last_error = NULL,
			next_retry_at = now(),
			updated_at = now()
		RETURNING id
	`, msg.ID, msg.InstanceID, tenantID, string(msg.Type), bucket, msg.MediaFilename, msg.MediaMimetype, payload, msg.MessageID).Scan(&mediaID)
	return mediaID, err
}

// ClaimPending claims pending or retryable failed media jobs for this worker.
func (r *MediaRepo) ClaimPending(ctx context.Context, limit int) ([]models.Media, error) {
	if limit <= 0 || limit > 25 {
		limit = 10
	}
	rows, err := r.db.Query(ctx, `
		WITH claimed AS (
			SELECT id
			FROM whatsapp_media
			WHERE status IN ('pending', 'failed')
			  AND retry_count < 8
			  AND COALESCE(next_retry_at, now()) <= now()
			  AND whatsapp_payload IS NOT NULL
			ORDER BY updated_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE whatsapp_media wm
		SET status = 'downloading',
		    claimed_at = now(),
		    updated_at = now()
		FROM claimed
		WHERE wm.id = claimed.id
		RETURNING wm.id, wm.message_id, wm.instance_id, wm.tenant_id, wm.type,
		          wm.provider, wm.bucket, wm.object_key, COALESCE(wm.public_url, ''),
		          COALESCE(wm.filename, ''), COALESCE(wm.mime_type, ''), wm.status,
		          wm.retry_count, COALESCE(wm.last_error, ''), wm.whatsapp_payload,
		          wm.created_at, wm.updated_at
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Media, 0, limit)
	for rows.Next() {
		var media models.Media
		if err := rows.Scan(&media.ID, &media.MessageID, &media.InstanceID, &media.TenantID, &media.Type,
			&media.Provider, &media.Bucket, &media.ObjectKey, &media.PublicURL, &media.Filename,
			&media.MimeType, &media.Status, &media.RetryCount, &media.LastError, &media.Payload,
			&media.CreatedAt, &media.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, media)
	}
	return items, rows.Err()
}

// ClaimByID claims a specific media job published by the external queue.
func (r *MediaRepo) ClaimByID(ctx context.Context, mediaID uuid.UUID) (*models.Media, error) {
	if mediaID == uuid.Nil {
		return nil, nil
	}
	var media models.Media
	err := r.db.QueryRow(ctx, `
		UPDATE whatsapp_media
		SET status = 'downloading',
		    claimed_at = now(),
		    updated_at = now()
		WHERE id = $1
		  AND status IN ('pending', 'failed')
		  AND retry_count < 8
		  AND COALESCE(next_retry_at, now()) <= now()
		  AND whatsapp_payload IS NOT NULL
		RETURNING id, message_id, instance_id, tenant_id, type,
		          provider, bucket, object_key, COALESCE(public_url, ''),
		          COALESCE(filename, ''), COALESCE(mime_type, ''), status,
		          retry_count, COALESCE(last_error, ''), whatsapp_payload,
		          created_at, updated_at
	`, mediaID).Scan(&media.ID, &media.MessageID, &media.InstanceID, &media.TenantID, &media.Type,
		&media.Provider, &media.Bucket, &media.ObjectKey, &media.PublicURL, &media.Filename,
		&media.MimeType, &media.Status, &media.RetryCount, &media.LastError, &media.Payload,
		&media.CreatedAt, &media.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &media, nil
}

// MarkReady records a successful media download/upload and updates the legacy message fields.
func (r *MediaRepo) MarkReady(ctx context.Context, mediaID uuid.UUID, publicURL, objectKey, mimeType, fileName string) error {
	_, err := r.db.Exec(ctx, `
		WITH updated AS (
			UPDATE whatsapp_media
			SET status = 'ready',
			    public_url = $2,
			    object_key = $3,
			    mime_type = COALESCE(NULLIF($4, ''), mime_type),
			    filename = COALESCE(NULLIF($5, ''), filename),
			    last_error = NULL,
			    updated_at = now()
			WHERE id = $1
			RETURNING message_id, public_url, mime_type, filename
		)
		UPDATE whatsapp_messages m
		SET media_status = 'ready',
		    media_url = updated.public_url,
		    media_mimetype = COALESCE(NULLIF(updated.mime_type, ''), m.media_mimetype),
		    media_filename = COALESCE(NULLIF(updated.filename, ''), m.media_filename),
		    media_error = NULL
		FROM updated
		WHERE m.id = updated.message_id
	`, mediaID, publicURL, objectKey, mimeType, fileName)
	return err
}

// MarkFailed stores retry metadata for a failed media job.
func (r *MediaRepo) MarkFailed(ctx context.Context, mediaID uuid.UUID, reason string, retryCount int) error {
	nextRetry := time.Now().Add(time.Duration(1<<min(retryCount, 8)) * time.Minute)
	_, err := r.db.Exec(ctx, `
		WITH updated AS (
			UPDATE whatsapp_media
			SET status = CASE WHEN retry_count + 1 >= 8 THEN 'failed' ELSE 'pending' END,
			    retry_count = retry_count + 1,
			    last_error = $2,
			    next_retry_at = $3,
			    updated_at = now()
			WHERE id = $1
			RETURNING message_id, retry_count, last_error, status
		)
		UPDATE whatsapp_messages m
		SET media_status = updated.status,
		    media_error = updated.last_error,
		    media_retry_count = updated.retry_count
		FROM updated
		WHERE m.id = updated.message_id
	`, mediaID, reason, nextRetry)
	return err
}

func isMediaType(msgType models.MessageType) bool {
	switch msgType {
	case models.MessageTypeImage, models.MessageTypeAudio, models.MessageTypeVideo, models.MessageTypeDocument, models.MessageTypeSticker:
		return true
	default:
		return false
	}
}

func inferMediaStatus(publicURL string) string {
	if strings.TrimSpace(publicURL) != "" {
		return "ready"
	}
	return "pending"
}

func inferProvider(publicURL string) string {
	if strings.Contains(strings.ToLower(publicURL), "supabase") {
		return "supabase"
	}
	return "minio"
}

func inferObjectKey(publicURL, bucket string) string {
	publicURL = strings.TrimSpace(publicURL)
	if publicURL == "" {
		return ""
	}

	if strings.Contains(publicURL, "/storage/v1/object/public/") {
		re := regexp.MustCompile(`^.*/storage/v1/object/public/[^/]+/?`)
		return decodePath(re.ReplaceAllString(publicURL, ""))
	}

	parsed, err := url.Parse(publicURL)
	if err != nil {
		return ""
	}
	path := strings.TrimPrefix(parsed.EscapedPath(), "/")
	bucket = strings.Trim(bucket, "/")
	if bucket != "" {
		path = strings.TrimPrefix(path, url.PathEscape(bucket)+"/")
		path = strings.TrimPrefix(path, bucket+"/")
	}
	return decodePath(path)
}

func decodePath(value string) string {
	decoded, err := url.PathUnescape(value)
	if err != nil {
		return value
	}
	return decoded
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
