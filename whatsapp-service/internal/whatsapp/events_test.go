package whatsapp

import (
	"testing"

	"go.mau.fi/whatsmeow/types"
)

func TestParseJIDNormalizesPhoneNumbers(t *testing.T) {
	tests := []string{"+5548988003260", "5548988003260", "(48) 98800-3260"}

	for _, input := range tests {
		jid, err := parseJID(input)
		if err != nil {
			t.Fatalf("parseJID(%q) returned error: %v", input, err)
		}
		if jid.User != "5548988003260" || jid.Server != types.DefaultUserServer {
			t.Fatalf("parseJID(%q) = %s, want 5548988003260@%s", input, jid.String(), types.DefaultUserServer)
		}
	}
}

func TestParseJIDPreservesFullJID(t *testing.T) {
	jid, err := parseJID("120363366882241499@g.us")
	if err != nil {
		t.Fatalf("parseJID returned error: %v", err)
	}
	if jid.User != "120363366882241499" || jid.Server != "g.us" {
		t.Fatalf("unexpected JID: %s", jid.String())
	}
}
