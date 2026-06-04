package repository

import (
	"context"
	"net/url"
	"regexp"
	"strings"

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
			last_error = COALESCE(NULLIF(EXCLUDED.last_error, ''), whatsapp_media.last_error)`

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
