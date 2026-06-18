package phone

import (
	"fmt"
	"regexp"
	"strings"
)

var nonDigitRegex = regexp.MustCompile(`\D`)

// Normalize removes all non-digit characters and leading zeros from a phone number.
// Input examples: +5548988003260, (48) 98800-3260, 048988003260
// Output: 5548988003260
func Normalize(number string) string {
	cleaned := nonDigitRegex.ReplaceAllString(number, "")
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

// FormatDisplay returns a user-friendly formatted Brazilian phone number.
// Input: 5548988003260 -> Output: +55 48 98800-3260
// Input: 554833806836 -> Output: +55 48 3306-6836
func FormatDisplay(number string) string {
	cleaned := Normalize(number)
	if !IsValidBR(cleaned) {
		return cleaned
	}
	// Remove 55 prefix for formatting
	local := cleaned[2:]
	if len(local) == 11 {
		// Mobile: DDI + DDD + 9-digit number
		return fmt.Sprintf("+55 (%s) %s-%s", local[:2], local[2:7], local[7:])
	}
	// Landline: DDI + DDD + 8-digit number
	return fmt.Sprintf("+55 (%s) %s-%s", local[:2], local[2:6], local[6:])
}

// GetDisplayName returns the pushName if available, otherwise a formatted phone number.
func GetDisplayName(pushName string, phone string) string {
	trimmed := strings.TrimSpace(pushName)
	if trimmed != "" {
		return trimmed
	}
	cleaned := Normalize(phone)
	if IsValidBR(cleaned) {
		return FormatDisplay(cleaned)
	}
	return cleaned
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

// ExtractDisplayFromJID extracts and formats a phone number from a JID for display.
// Example: 5548988003260@s.whatsapp.net -> +55 48 98800-3260
func ExtractDisplayFromJID(jid string) string {
	number := ExtractFromJID(jid)
	if number == "" {
		return ""
	}
	return FormatDisplay(number)
}

// IsGroupJID checks if a JID belongs to a WhatsApp group.
func IsGroupJID(jid string) bool {
	return strings.Contains(jid, "@g.us")
}

// IsLIDJID checks if a JID is WhatsApp's internal LID identifier.
// LIDs are not phone numbers and must not be displayed as contacts.
func IsLIDJID(jid string) bool {
	return strings.Contains(strings.ToLower(jid), "@lid")
}

// IsUserPhoneJID checks if a JID is a canonical one-to-one WhatsApp phone JID.
func IsUserPhoneJID(jid string) bool {
	lower := strings.ToLower(jid)
	if !strings.Contains(lower, "@s.whatsapp.net") && !strings.Contains(lower, "@c.us") {
		return false
	}
	return IsValidBR(ExtractFromJID(jid))
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

// UserJIDFromString extracts the user portion of a JID (digits before @).
func UserJIDFromString(jid string) string {
	parts := strings.Split(jid, "@")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}
