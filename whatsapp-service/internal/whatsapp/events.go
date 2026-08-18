package whatsapp

import (
	"fmt"
	"strings"

	"go.mau.fi/whatsmeow/types"

	"whatsapp-service/pkg/phone"
)

// parseJID parses a JID string into a whatsmeow JID type
func parseJID(jidStr string) (types.JID, error) {
	if jidStr == "" {
		return types.JID{}, fmt.Errorf("empty JID")
	}

	// If it's already a full JID
	if strings.Contains(jidStr, "@") {
		jid, err := types.ParseJID(jidStr)
		if err != nil {
			return types.JID{}, fmt.Errorf("invalid JID format: %w", err)
		}
		if jid.Server == types.DefaultUserServer || jid.Server == types.LegacyUserServer {
			normalized := phone.Normalize(jid.User)
			if normalized == "" {
				return types.JID{}, fmt.Errorf("empty phone number")
			}
			return types.NewJID(normalized, types.DefaultUserServer), nil
		}
		return jid, nil
	}

	// If it's just a phone number, normalize to canonical Brazilian digits.
	normalized := phone.Normalize(jidStr)
	if normalized == "" {
		return types.JID{}, fmt.Errorf("empty phone number")
	}
	return types.NewJID(normalized, types.DefaultUserServer), nil
}
