package handlers

import (
	"testing"

	"whatsapp-service/internal/models"
)

func TestShouldStartQRConnection(t *testing.T) {
	tests := []struct {
		name            string
		status          models.InstanceStatus
		clientExists    bool
		clientConnected bool
		want            bool
	}{
		{
			name:         "recovers a client stuck while connecting",
			status:       models.StatusConnecting,
			clientExists: true,
			want:         true,
		},
		{
			name:         "starts a missing client after service restart",
			status:       models.StatusQRPending,
			clientExists: false,
			want:         true,
		},
		{
			name:         "keeps an active QR flow",
			status:       models.StatusQRPending,
			clientExists: true,
			want:         false,
		},
		{
			name:            "does not restart a connected client",
			status:          models.StatusConnected,
			clientExists:    true,
			clientConnected: true,
			want:            false,
		},
		{
			name:         "starts a disconnected client",
			status:       models.StatusDisconnected,
			clientExists: true,
			want:         true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shouldStartQRConnection(tt.status, tt.clientExists, tt.clientConnected); got != tt.want {
				t.Fatalf("shouldStartQRConnection() = %v, want %v", got, tt.want)
			}
		})
	}
}
