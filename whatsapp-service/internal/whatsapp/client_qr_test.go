package whatsapp

import (
	"testing"

	"go.mau.fi/whatsmeow"
)

func TestPairingFailureMessageRecognizesTerminalErrors(t *testing.T) {
	events := []string{
		whatsmeow.QRChannelTimeout.Event,
		whatsmeow.QRChannelEventError,
		whatsmeow.QRChannelClientOutdated.Event,
		whatsmeow.QRChannelScannedWithoutMultidevice.Event,
		whatsmeow.QRChannelErrUnexpectedEvent.Event,
	}

	for _, event := range events {
		message, ok := pairingFailureMessage(event)
		if !ok {
			t.Fatalf("event %q was not recognized as a pairing failure", event)
		}
		if message == "" {
			t.Fatalf("event %q returned an empty user-facing message", event)
		}
	}
}

func TestPairingFailureMessageIgnoresCodeAndSuccess(t *testing.T) {
	events := []string{
		whatsmeow.QRChannelEventCode,
		whatsmeow.QRChannelSuccess.Event,
	}

	for _, event := range events {
		if message, ok := pairingFailureMessage(event); ok || message != "" {
			t.Fatalf("event %q must not be handled as failure", event)
		}
	}
}
