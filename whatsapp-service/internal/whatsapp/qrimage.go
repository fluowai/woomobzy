package whatsapp

import (
	"encoding/base64"
	"fmt"
	"strings"

	qrcode "github.com/skip2/go-qrcode"
)

// qrImageDataURLPrefix is the prefix of a base64 PNG data URL. The pairing QR
// is delivered to the frontend only as a rendered image, never as the raw
// WhatsApp pairing token.
const qrImageDataURLPrefix = "data:image/png;base64,"

// qrImageDataURL renders a WhatsApp pairing code as a base64 PNG data URL so
// the raw pairing token never leaves the service.
func qrImageDataURL(code string) (string, error) {
	if code == "" {
		return "", nil
	}
	png, err := qrcode.Encode(code, qrcode.Medium, 320)
	if err != nil {
		return "", fmt.Errorf("failed to encode QR image: %w", err)
	}
	return qrImageDataURLPrefix + base64.StdEncoding.EncodeToString(png), nil
}

// isQRImageDataURL reports whether a stored value is a rendered QR image
// rather than a legacy raw pairing token. Legacy raw tokens are never served
// so the credential does not leak through an API response.
func isQRImageDataURL(value string) bool {
	return strings.HasPrefix(value, qrImageDataURLPrefix) &&
		len(value) > len(qrImageDataURLPrefix)
}
