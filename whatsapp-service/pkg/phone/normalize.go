package phone

import (
	"regexp"
	"strings"
)

var nonDigitRegex = regexp.MustCompile(`\D`)

// Normalize removes all non-digit characters and leading zeros from a phone number.
// Input examples: +5548988003260, (48) 98800-3260, 048988003260
// Output: 5548988003260
func Normalize(number string) string {
	// Remove all non-digit characters
	cleaned := nonDigitRegex.ReplaceAllString(number, "")
	// Remove leading zeros
	cleaned = strings.TrimLeft(cleaned, "0")
	return cleaned
}

// GetDisplayName returns the pushName if available, otherwise the normalized phone number.
func GetDisplayName(pushName string, phone string) string {
	trimmed := strings.TrimSpace(pushName)
	if trimmed != "" {
		return trimmed
	}
	return Normalize(phone)
}

// ExtractFromJID extracts the phone number from a WhatsApp JID.
// Example: 5548988003260@s.whatsapp.net -> 5548988003260
func ExtractFromJID(jid string) string {
	parts := strings.Split(jid, "@")
	if len(parts) > 0 {
		return Normalize(parts[0])
	}
	return ""
}

// IsGroupJID checks if a JID belongs to a group.
func IsGroupJID(jid string) bool {
	return strings.Contains(jid, "@g.us")
}
