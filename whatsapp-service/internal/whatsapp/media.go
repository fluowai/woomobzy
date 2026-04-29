package whatsapp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types/events"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

// downloadAndUploadMedia downloads media from WhatsApp and uploads it to Supabase Storage
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
		fileName = fmt.Sprintf("image_%d%s", time.Now().UnixMilli(), extensionFromMime(mimeType))

	case msg.GetAudioMessage() != nil:
		audio := msg.GetAudioMessage()
		downloadable = audio
		mimeType = audio.GetMimetype()
		fileName = fmt.Sprintf("audio_%d%s", time.Now().UnixMilli(), extensionFromMime(mimeType))

	case msg.GetVideoMessage() != nil:
		video := msg.GetVideoMessage()
		downloadable = video
		mimeType = video.GetMimetype()
		fileName = fmt.Sprintf("video_%d%s", time.Now().UnixMilli(), extensionFromMime(mimeType))

	case msg.GetDocumentMessage() != nil:
		doc := msg.GetDocumentMessage()
		downloadable = doc
		mimeType = doc.GetMimetype()
		fileName = doc.GetFileName()
		if fileName == "" {
			fileName = fmt.Sprintf("document_%d%s", time.Now().UnixMilli(), extensionFromMime(mimeType))
		}

	case msg.GetStickerMessage() != nil:
		sticker := msg.GetStickerMessage()
		downloadable = sticker
		mimeType = sticker.GetMimetype()
		fileName = fmt.Sprintf("sticker_%d.webp", time.Now().UnixMilli())

	default:
		return "", "", "", fmt.Errorf("unsupported media type")
	}

	// Download media from WhatsApp servers
	data, err := c.waClient.Download(ctx, downloadable)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to download media: %w", err)
	}

	// Upload to Supabase Storage
	storagePath := fmt.Sprintf("%s/%s/%s", c.instanceID.String(), time.Now().Format("2006-01-02"), fileName)

	url, err := c.uploadToSupabase(ctx, storagePath, data, mimeType)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to upload to storage: %w", err)
	}

	return url, mimeType, fileName, nil
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

// extensionFromMime returns a file extension for a given MIME type
func extensionFromMime(mimeType string) string {
	exts, err := mime.ExtensionsByType(mimeType)
	if err == nil && len(exts) > 0 {
		return exts[0]
	}

	switch mimeType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "audio/ogg; codecs=opus", "audio/ogg":
		return ".ogg"
	case "audio/mp4", "audio/mpeg":
		return ".mp3"
	case "video/mp4":
		return ".mp4"
	case "application/pdf":
		return ".pdf"
	default:
		ext := filepath.Ext(mimeType)
		if ext != "" {
			return ext
		}
		return ".bin"
	}
}

// sendTextMessage sends a text message via WhatsMeow
func (c *Client) SendTextMessage(ctx context.Context, chatJID string, text string) error {
	jid, err := parseJID(chatJID)
	if err != nil {
		return fmt.Errorf("invalid JID: %w", err)
	}

	msg := &proto.Message{} // This will be constructed properly
	_ = msg
	_ = jid

	// Use whatsmeow to send
	_, err = c.waClient.SendMessage(ctx, jid, &proto.Message{
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
