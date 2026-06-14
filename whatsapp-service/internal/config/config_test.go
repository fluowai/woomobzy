package config

import "testing"

func TestGetEnvAnyUsesLegacyInternalTokenFallback(t *testing.T) {
	t.Setenv("WHATSAPP_SERVICE_TOKEN", "")
	t.Setenv("WHATSAPP_INTERNAL_TOKEN", "legacy-token")

	got := getEnvAny(
		[]string{"WHATSAPP_SERVICE_TOKEN", "WHATSAPP_INTERNAL_TOKEN"},
		"",
	)
	if got != "legacy-token" {
		t.Fatalf("expected legacy token fallback, got %q", got)
	}
}

func TestGetEnvAnyPrefersServiceToken(t *testing.T) {
	t.Setenv("WHATSAPP_SERVICE_TOKEN", "service-token")
	t.Setenv("WHATSAPP_INTERNAL_TOKEN", "legacy-token")

	got := getEnvAny(
		[]string{"WHATSAPP_SERVICE_TOKEN", "WHATSAPP_INTERNAL_TOKEN"},
		"",
	)
	if got != "service-token" {
		t.Fatalf("expected service token, got %q", got)
	}
}
