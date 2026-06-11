package whatsapp

import (
	"bytes"
	"context"
	"crypto/hmac"
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
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

// downloadAndUploadMedia downloads media from WhatsApp and uploads it to object storage.
func (c *Client) downloadAndUploadMedia(ctx context.Context, evt *events.Message) (mediaURL, mediaMimetype, mediaFilename string, err error) {
	msg := evt.Message

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
		return "", "", "", fmt.Errorf("unsupported media type")
	}

	// Download media from WhatsApp servers
	data, err := c.waClient.Download(ctx, downloadable)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to download media: %w", err)
	}

	sha := sha256Hex(data)
	if strings.TrimSpace(fileName) == "" {
		fileName = sha + extensionFromMime(mimeType)
	}

	url, _, _, err := c.uploadToStorageWithDedup(ctx, "whatsapp/media", data, mimeType, "whatsapp", "whatsapp_message", evt.Info.ID)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to upload to storage: %w", err)
	}

	return url, mimeType, fileName, nil
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

	endpoint := strings.TrimRight(c.minioEndpoint, "/")
	region := c.minioRegion
	if region == "" {
		region = "us-east-1"
	}

	objectURL, err := url.Parse(fmt.Sprintf("%s/%s/%s", endpoint, url.PathEscape(c.storageBucket), encodeStoragePath(path)))
	if err != nil {
		return "", err
	}

	payloadHash := sha256Hex(data)
	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	canonicalHeaders := fmt.Sprintf(
		"content-type:%s\nhost:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n",
		contentType,
		objectURL.Host,
		payloadHash,
		amzDate,
	)
	signedHeaders := "content-type;host;x-amz-content-sha256;x-amz-date"
	canonicalRequest := strings.Join([]string{
		http.MethodPut,
		objectURL.EscapedPath(),
		"",
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	}, "\n")

	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		sha256Hex([]byte(canonicalRequest)),
	}, "\n")
	signature := hmacHex(signingKey(c.minioSecretKey, dateStamp, region), stringToSign)
	authorization := fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		c.minioAccessKey,
		credentialScope,
		signedHeaders,
		signature,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, objectURL.String(), bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", authorization)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-amz-content-sha256", payloadHash)
	req.Header.Set("x-amz-date", amzDate)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("minio upload failed (status %d): %s", resp.StatusCode, string(body))
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

// sendTextMessage sends a text message via WhatsMeow
func (c *Client) SendTextMessage(ctx context.Context, chatJID string, text string) error {
	jid, err := parseJID(chatJID)
	if err != nil {
		return fmt.Errorf("invalid JID: %w", err)
	}

	_, err = c.waClient.SendMessage(ctx, jid, &waE2E.Message{
		Conversation: proto.String(text),
	}, whatsmeow.SendRequestExtra{})
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}

	c.logger.Info("Message sent",
		zap.String("instance", c.instanceID.String()),
		zap.String("to", chatJID),
	)

	return nil
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

	publicURL, _, _, uploadErr := c.uploadToStorageWithDedup(ctx, "whatsapp/media", data, mimeType, "whatsapp", "whatsapp_message", string(resp.ID))
	if uploadErr != nil {
		c.logger.Warn("Media sent but local preview upload failed", zap.Error(uploadErr))
		mediaError = fmt.Sprintf("media sent but MinIO upload failed: %v", uploadErr)
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

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(value))
	return mac.Sum(nil)
}

func hmacHex(key []byte, value string) string {
	return hex.EncodeToString(hmacSHA256(key, value))
}

func signingKey(secretKey string, dateStamp string, region string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secretKey), dateStamp)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, "s3")
	return hmacSHA256(kService, "aws4_request")
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
