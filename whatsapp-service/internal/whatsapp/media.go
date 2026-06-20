package whatsapp

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

// downloadAndUploadMedia downloads media from WhatsApp and uploads it to object storage.
func (c *Client) downloadAndUploadMedia(ctx context.Context, evt *events.Message) (mediaURL, mediaMimetype, mediaFilename, objectKey string, err error) {
	return c.downloadAndUploadMediaMessage(ctx, evt.Message, evt.Info.ID)
}

func (c *Client) downloadAndUploadMediaMessage(ctx context.Context, msg *waE2E.Message, messageID string) (mediaURL, mediaMimetype, mediaFilename, objectKey string, err error) {
	var (
		downloadable whatsmeow.DownloadableMessage
		mimeType     string
		fileName     string
	)

	switch {
	case msg.GetImageMessage() != nil:
		img := msg.GetImageMessage()
		downloadable = img
		mimeType = img.GetMimetype()

	case msg.GetAudioMessage() != nil:
		audio := msg.GetAudioMessage()
		downloadable = audio
		mimeType = audio.GetMimetype()

	case msg.GetVideoMessage() != nil:
		video := msg.GetVideoMessage()
		downloadable = video
		mimeType = video.GetMimetype()

	case msg.GetDocumentMessage() != nil:
		doc := msg.GetDocumentMessage()
		downloadable = doc
		mimeType = doc.GetMimetype()
		fileName = doc.GetFileName()

	case msg.GetStickerMessage() != nil:
		sticker := msg.GetStickerMessage()
		downloadable = sticker
		mimeType = sticker.GetMimetype()

	default:
		return "", "", "", "", fmt.Errorf("unsupported media type")
	}

	// Download media from WhatsApp servers
	data, err := c.waClient.Download(ctx, downloadable)
	if err != nil {
		return "", "", "", "", fmt.Errorf("failed to download media: %w", err)
	}

	sha := sha256Hex(data)
	if strings.TrimSpace(fileName) == "" {
		fileName = sha + extensionFromMime(mimeType)
	}

	url, objectKey, _, err := c.uploadToStorageWithDedup(ctx, "whatsapp/media", data, mimeType, "whatsapp", "whatsapp_message", messageID)
	if err != nil {
		return "", "", "", "", fmt.Errorf("failed to upload to storage: %w", err)
	}

	return url, mimeType, fileName, objectKey, nil
}

func (c *Client) uploadToStorageWithDedup(ctx context.Context, folder string, data []byte, contentType string, source string, entityType string, entityID string) (string, string, string, error) {
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	sha := sha256Hex(data)
	storagePath := c.contentAddressedStoragePath(folder, sha, extensionFromMime(contentType))

	if c.isMinIOConfigured() && c.mediaRepo != nil && c.tenantID != nil {
		existingKey, found, err := c.mediaRepo.FindReusableStorageObject(ctx, *c.tenantID, c.storageBucket, sha)
		if err != nil {
			c.logger.Warn("Failed to check reusable storage object", zap.Error(err))
		} else if found {
			return c.storagePublicURL(existingKey), existingKey, sha, nil
		}
	}

	publicURL, err := c.uploadToStorage(ctx, storagePath, data, contentType)
	if err != nil {
		return "", "", "", err
	}

	if c.mediaRepo != nil && c.tenantID != nil {
		if err := c.mediaRepo.UpsertStorageObject(
			ctx,
			*c.tenantID,
			c.storageBucket,
			storagePath,
			sha,
			"",
			int64(len(data)),
			contentType,
			source,
			entityType,
			entityID,
		); err != nil {
			c.logger.Warn("Failed to persist storage object metadata", zap.Error(err))
		}
	}

	return publicURL, storagePath, sha, nil
}

func (c *Client) contentAddressedStoragePath(folder, sha, ext string) string {
	tenantID := c.instanceID.String()
	if c.tenantID != nil && *c.tenantID != uuid.Nil {
		tenantID = c.tenantID.String()
	}
	if ext == "" {
		ext = ".bin"
	}
	now := time.Now().UTC()
	return fmt.Sprintf("%s/%s/%04d/%02d/%s%s", tenantID, strings.Trim(folder, "/"), now.Year(), int(now.Month()), sha, ext)
}

func (c *Client) storagePublicURL(path string) string {
	if c.isMinIOConfigured() {
		publicBase := c.minioPublicURL
		if publicBase == "" {
			publicBase = c.minioEndpoint
		}
		return fmt.Sprintf("%s/%s/%s", strings.TrimRight(publicBase, "/"), url.PathEscape(c.storageBucket), encodeStoragePath(path))
	}
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", c.supabaseURL, c.storageBucket, path)
}

func (c *Client) uploadToStorage(ctx context.Context, path string, data []byte, contentType string) (string, error) {
	if c.isMinIOConfigured() {
		return c.uploadToMinIO(ctx, path, data, contentType)
	}
	if !allowSupabaseStorageFallback() {
		return "", fmt.Errorf("minio storage is not configured")
	}
	return c.uploadToSupabase(ctx, path, data, contentType)
}

// uploadToSupabase uploads a file to Supabase Storage via REST API
func (c *Client) uploadToSupabase(ctx context.Context, path string, data []byte, contentType string) (string, error) {
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", c.supabaseURL, c.storageBucket, path)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.supabaseKey))
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("storage upload failed (status %d): %s", resp.StatusCode, string(body))
	}

	// Return public URL
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", c.supabaseURL, c.storageBucket, path)

	c.logger.Info("Media uploaded",
		zap.String("path", path),
		zap.String("mime", contentType),
		zap.Int("size", len(data)),
	)

	return publicURL, nil
}

func (c *Client) isMinIOConfigured() bool {
	return strings.TrimSpace(c.minioEndpoint) != "" &&
		strings.TrimSpace(c.minioAccessKey) != "" &&
		strings.TrimSpace(c.minioSecretKey) != "" &&
		strings.TrimSpace(c.storageBucket) != ""
}

func allowSupabaseStorageFallback() bool {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("MEDIA_STORAGE_PROVIDER")))
	if provider == "" {
		provider = strings.ToLower(strings.TrimSpace(os.Getenv("STORAGE_PROVIDER")))
	}
	return provider == "supabase" || strings.EqualFold(strings.TrimSpace(os.Getenv("ALLOW_SUPABASE_STORAGE_FALLBACK")), "true")
}

func (c *Client) uploadToMinIO(ctx context.Context, path string, data []byte, contentType string) (string, error) {
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	endpointURL, err := url.Parse(strings.TrimRight(c.minioEndpoint, "/"))
	if err != nil {
		return "", err
	}
	endpoint := endpointURL.Host
	if endpoint == "" {
		endpoint = strings.TrimPrefix(strings.TrimPrefix(strings.TrimRight(c.minioEndpoint, "/"), "https://"), "http://")
	}
	secure := endpointURL.Scheme == "https"

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(c.minioAccessKey, c.minioSecretKey, ""),
		Secure: secure,
		Region: c.minioRegion,
	})
	if err != nil {
		return "", err
	}
	if _, err := client.PutObject(ctx, c.storageBucket, path, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{ContentType: contentType}); err != nil {
		return "", fmt.Errorf("minio upload failed: %w", err)
	}

	publicBase := c.minioPublicURL
	if publicBase == "" {
		publicBase = c.minioEndpoint
	}
	publicURL := fmt.Sprintf("%s/%s/%s", strings.TrimRight(publicBase, "/"), url.PathEscape(c.storageBucket), encodeStoragePath(path))

	c.logger.Info("Media uploaded to MinIO",
		zap.String("bucket", c.storageBucket),
		zap.String("path", path),
		zap.String("mime", contentType),
		zap.Int("size", len(data)),
	)

	return publicURL, nil
}

// extensionFromMime returns a file extension for a given MIME type
func extensionFromMime(mimeType string) string {
	if mimeType == "" {
		return ".bin"
	}

	// Try standard Go mime package first
	if exts, err := mime.ExtensionsByType(mimeType); err == nil && len(exts) > 0 {
		return exts[0]
	}

	// Manual mapping for common types
	var ext string
	switch {
	case strings.Contains(mimeType, "image/jpeg") || strings.Contains(mimeType, "image/jpg"):
		ext = ".jpg"
	case strings.Contains(mimeType, "image/png"):
		ext = ".png"
	case strings.Contains(mimeType, "image/webp"):
		ext = ".webp"
	case strings.Contains(mimeType, "image/gif"):
		ext = ".gif"
	case strings.Contains(mimeType, "image/"):
		ext = ".img"
	case strings.Contains(mimeType, "audio/ogg"):
		ext = ".ogg"
	case strings.Contains(mimeType, "audio/mpeg") || strings.Contains(mimeType, "audio/mp3"):
		ext = ".mp3"
	case strings.Contains(mimeType, "audio/mp4") || strings.Contains(mimeType, "audio/aac"):
		ext = ".m4a"
	case strings.Contains(mimeType, "audio/wav") || strings.Contains(mimeType, "audio/wave"):
		ext = ".wav"
	case strings.Contains(mimeType, "audio/"):
		ext = ".audio"
	case strings.Contains(mimeType, "video/mp4"):
		ext = ".mp4"
	case strings.Contains(mimeType, "video/3gpp"):
		ext = ".3gp"
	case strings.Contains(mimeType, "video/webm"):
		ext = ".webm"
	case strings.Contains(mimeType, "video/"):
		ext = ".video"
	case strings.Contains(mimeType, "application/pdf"):
		ext = ".pdf"
	case strings.Contains(mimeType, "application/msword") || strings.Contains(mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml"):
		ext = ".docx"
	case strings.Contains(mimeType, "application/vnd.ms-excel") || strings.Contains(mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml"):
		ext = ".xlsx"
	case strings.Contains(mimeType, "application/vnd.ms-powerpoint") || strings.Contains(mimeType, "application/vnd.openxmlformats-officedocument.presentationml"):
		ext = ".pptx"
	case strings.Contains(mimeType, "text/plain"):
		ext = ".txt"
	case strings.Contains(mimeType, "text/csv"):
		ext = ".csv"
	case strings.Contains(mimeType, "application/zip"):
		ext = ".zip"
	case strings.Contains(mimeType, "application/x-rar"):
		ext = ".rar"
	case strings.Contains(mimeType, "application/json"):
		ext = ".json"
	default:
		// Last resort: try filepath.Ext on the mime type itself
		ext = filepath.Ext(mimeType)
		if ext == "" {
			ext = ".bin"
		}
	}
	return ext
}

// SendTextMessage sends a text message via WhatsMeow and returns the canonical
// WhatsApp message ID used by delivery/read receipts.
func (c *Client) SendTextMessage(ctx context.Context, chatJID string, text string) (string, time.Time, error) {
	jid, err := parseJID(chatJID)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("invalid JID: %w", err)
	}

	resp, err := c.waClient.SendMessage(ctx, jid, &waE2E.Message{
		Conversation: proto.String(text),
	}, whatsmeow.SendRequestExtra{})
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to send message: %w", err)
	}

	c.logger.Info("Message sent",
		zap.String("instance", c.instanceID.String()),
		zap.String("to", chatJID),
	)

	timestamp := resp.Timestamp
	if timestamp.IsZero() {
		timestamp = time.Now()
	}
	return string(resp.ID), timestamp, nil
}

// SendMediaMessage uploads and sends image, audio, video or document media via WhatsMeow.
func (c *Client) SendMediaMessage(ctx context.Context, chatJID string, msgType string, data []byte, mimeType, fileName, caption string) (messageID, mediaURL, mediaMimetype, mediaFilename, mediaError string, err error) {
	jid, err := parseJID(chatJID)
	if err != nil {
		return "", "", "", "", "", fmt.Errorf("invalid JID: %w", err)
	}

	appInfo, err := mediaTypeForMessage(msgType)
	if err != nil {
		return "", "", "", "", "", err
	}

	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	if fileName == "" {
		fileName = sha256Hex(data) + extensionFromMime(mimeType)
	}

	publicURL, _, _, uploadErr := c.uploadToStorageWithDedup(ctx, "whatsapp/media", data, mimeType, "whatsapp", "whatsapp_outbound", fileName)
	if uploadErr != nil {
		return "", "", "", "", fmt.Sprintf("MinIO upload failed before WhatsApp send: %v", uploadErr), fmt.Errorf("failed to persist media before sending: %w", uploadErr)
	}

	upload, err := c.waClient.Upload(ctx, data, appInfo)
	if err != nil {
		return "", "", "", "", "", fmt.Errorf("failed to upload media to WhatsApp: %w", err)
	}

	outgoing := &waE2E.Message{}
	switch msgType {
	case "image":
		outgoing.ImageMessage = &waE2E.ImageMessage{
			Caption:       proto.String(caption),
			Mimetype:      proto.String(mimeType),
			URL:           proto.String(upload.URL),
			DirectPath:    proto.String(upload.DirectPath),
			MediaKey:      upload.MediaKey,
			FileEncSHA256: upload.FileEncSHA256,
			FileSHA256:    upload.FileSHA256,
			FileLength:    proto.Uint64(upload.FileLength),
		}
	case "audio":
		outgoing.AudioMessage = &waE2E.AudioMessage{
			Mimetype:      proto.String(mimeType),
			URL:           proto.String(upload.URL),
			DirectPath:    proto.String(upload.DirectPath),
			MediaKey:      upload.MediaKey,
			FileEncSHA256: upload.FileEncSHA256,
			FileSHA256:    upload.FileSHA256,
			FileLength:    proto.Uint64(upload.FileLength),
		}
	case "video":
		outgoing.VideoMessage = &waE2E.VideoMessage{
			Caption:       proto.String(caption),
			Mimetype:      proto.String(mimeType),
			URL:           proto.String(upload.URL),
			DirectPath:    proto.String(upload.DirectPath),
			MediaKey:      upload.MediaKey,
			FileEncSHA256: upload.FileEncSHA256,
			FileSHA256:    upload.FileSHA256,
			FileLength:    proto.Uint64(upload.FileLength),
		}
	case "document":
		outgoing.DocumentMessage = &waE2E.DocumentMessage{
			Title:         proto.String(fileName),
			FileName:      proto.String(fileName),
			Mimetype:      proto.String(mimeType),
			Caption:       proto.String(caption),
			URL:           proto.String(upload.URL),
			DirectPath:    proto.String(upload.DirectPath),
			MediaKey:      upload.MediaKey,
			FileEncSHA256: upload.FileEncSHA256,
			FileSHA256:    upload.FileSHA256,
			FileLength:    proto.Uint64(upload.FileLength),
		}
	default:
		return "", "", "", "", "", fmt.Errorf("unsupported media type: %s", msgType)
	}

	resp, err := c.waClient.SendMessage(ctx, jid, outgoing, whatsmeow.SendRequestExtra{})
	if err != nil {
		return "", "", "", "", "", fmt.Errorf("failed to send media message: %w", err)
	}

	return string(resp.ID), publicURL, mimeType, fileName, mediaError, nil
}

func encodeStoragePath(value string) string {
	parts := strings.Split(value, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func sha256Hex(value []byte) string {
	sum := sha256.Sum256(value)
	return hex.EncodeToString(sum[:])
}

func mediaTypeForMessage(msgType string) (whatsmeow.MediaType, error) {
	switch msgType {
	case "image":
		return whatsmeow.MediaImage, nil
	case "audio":
		return whatsmeow.MediaAudio, nil
	case "video":
		return whatsmeow.MediaVideo, nil
	case "document":
		return whatsmeow.MediaDocument, nil
	default:
		return "", fmt.Errorf("unsupported media type: %s", msgType)
	}
}
