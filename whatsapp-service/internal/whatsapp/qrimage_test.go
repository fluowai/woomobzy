package whatsapp

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestQRImageDataURL(t *testing.T) {
	img, err := qrImageDataURL("")
	if err != nil {
		t.Fatalf("empty code must not error, got %v", err)
	}
	if img != "" {
		t.Fatalf("empty code must return empty image, got %q", img)
	}

	code := "2@abc123very-long-whatsapp-pairing-token-with-plenty-of-data____"
	img, err = qrImageDataURL(code)
	if err != nil {
		t.Fatalf("qrImageDataURL() error = %v", err)
	}
	if !strings.HasPrefix(img, qrImageDataURLPrefix) {
		t.Fatalf("image must be a PNG data URL, got prefix %q", img[:32])
	}

	body := strings.TrimPrefix(img, qrImageDataURLPrefix)
	raw, err := base64.StdEncoding.DecodeString(body)
	if err != nil {
		t.Fatalf("image body must be valid base64: %v", err)
	}
	if len(raw) < 8 {
		t.Fatalf("decoded PNG too small: %d bytes", len(raw))
	}
	pngMagic := []byte{0x89, 0x50, 0x4e, 0x47}
	for i, b := range pngMagic {
		if raw[i] != b {
			t.Fatalf("decoded image is not a PNG (byte %d = %x)", i, b)
		}
	}
}

func TestIsQRImageDataURL(t *testing.T) {
	if !isQRImageDataURL(qrImageDataURLPrefix + "abc123") {
		t.Fatal("a PNG data URL must be recognized as a QR image")
	}
	if isQRImageDataURL("2@raw-legacy-pairing-token") {
		t.Fatal("a legacy raw pairing token must not be served")
	}
	if isQRImageDataURL(qrImageDataURLPrefix) {
		t.Fatal("bare prefix with no payload must not be served")
	}
	if isQRImageDataURL("") {
		t.Fatal("empty value must not be served")
	}
}
