package whatsapp

import (
	"fmt"
	"strings"

	"go.mau.fi/whatsmeow/types"
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
		return jid, nil
	}

	// If it's just a phone number, make it a user JID
	return types.NewJID(jidStr, types.DefaultUserServer), nil
}
