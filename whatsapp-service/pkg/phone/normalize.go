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
	if len(cleaned) == 10 || len(cleaned) == 11 {
		cleaned = "55" + cleaned
	}
	return cleaned
}

// FormatE164 returns a phone number in +5548988003260 format.
func FormatE164(number string) string {
	cleaned := Normalize(number)
	if !IsValidBR(cleaned) {
		return ""
	}
	return "+" + cleaned
}

// GetDisplayName returns the pushName if available, otherwise the normalized phone number.
func GetDisplayName(pushName string, phone string) string {
	trimmed := strings.TrimSpace(pushName)
	if trimmed != "" {
		return trimmed
	}
	cleaned := Normalize(phone)
	if IsValidBR(cleaned) {
		return cleaned
	}
	return "Contato sem telefone"
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

// IsSupportedChatJID returns true for regular one-to-one chats and groups.
// WhatsApp newsletters/channels, status and broadcast JIDs are intentionally
// excluded from the CRM inbox.
func IsSupportedChatJID(jid string) bool {
	normalized := strings.ToLower(strings.TrimSpace(jid))
	return strings.Contains(normalized, "@s.whatsapp.net") || strings.Contains(normalized, "@g.us")
}

// IsValidBR checks if the number is a Brazilian phone in canonical digits.
// Accepted examples: 5548988003260, 554833806836.
func IsValidBR(number string) bool {
	cleaned := Normalize(number)
	if !strings.HasPrefix(cleaned, "55") {
		return false
	}
	return len(cleaned) == 12 || len(cleaned) == 13
}
