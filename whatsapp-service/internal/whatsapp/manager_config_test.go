package whatsapp

import "testing"

func TestNormalizeProtocolLogLevel(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  string
	}{
		{name: "defaults empty values to info", value: "", want: "INFO"},
		{name: "normalizes lowercase", value: "debug", want: "DEBUG"},
		{name: "trims whitespace", value: " warn ", want: "WARN"},
		{name: "accepts errors", value: "ERROR", want: "ERROR"},
		{name: "rejects unsupported values", value: "trace", want: "INFO"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeProtocolLogLevel(tt.value); got != tt.want {
				t.Fatalf("normalizeProtocolLogLevel(%q) = %q, want %q", tt.value, got, tt.want)
			}
		})
	}
}
