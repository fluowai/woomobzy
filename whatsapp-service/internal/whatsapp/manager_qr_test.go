package whatsapp

import "testing"

func TestShouldAbortQRStartup(t *testing.T) {
	stuckClient := &Client{}
	if !shouldAbortQRStartup(stuckClient, stuckClient) {
		t.Fatal("a current client without connection or QR code must time out")
	}

	clientWithQR := &Client{qrCode: "test-qr"}
	if shouldAbortQRStartup(clientWithQR, clientWithQR) {
		t.Fatal("a client that generated a QR code must not time out")
	}

	connectedClient := &Client{connected: true}
	if shouldAbortQRStartup(connectedClient, connectedClient) {
		t.Fatal("a connected client must not time out")
	}

	replacedClient := &Client{}
	if shouldAbortQRStartup(replacedClient, stuckClient) {
		t.Fatal("a client replaced by a newer connection must not change instance state")
	}
}
