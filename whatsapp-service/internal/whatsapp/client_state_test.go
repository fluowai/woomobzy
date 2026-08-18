package whatsapp

import (
	"context"
	"testing"
)

func TestClientIsRunningTracksLifecycleContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	client := &Client{ctx: ctx, cancel: cancel}

	if !client.IsRunning() {
		t.Fatal("new client lifecycle should be running")
	}

	cancel()
	if client.IsRunning() {
		t.Fatal("cancelled client lifecycle must not be treated as running")
	}
}
