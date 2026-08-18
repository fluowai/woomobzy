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
		message, _ := pairingFailureMessage(event)
		if message == "" {
			t.Fatalf("event %q was not recognized as a pairing failure", event)
		}
	}
}

func TestPairingFailureMessageMarksRecoverableErrors(t *testing.T) {
	recoverable := []string{
		whatsmeow.QRChannelTimeout.Event,
		whatsmeow.QRChannelErrUnexpectedEvent.Event,
	}
	terminal := []string{
		whatsmeow.QRChannelEventError,
		whatsmeow.QRChannelClientOutdated.Event,
		whatsmeow.QRChannelScannedWithoutMultidevice.Event,
	}

	for _, event := range recoverable {
		message, isRecoverable := pairingFailureMessage(event)
		if message == "" {
			t.Fatalf("event %q must be a recognized pairing failure", event)
		}
		if !isRecoverable {
			t.Fatalf("event %q must be marked as recoverable", event)
		}
	}

	for _, event := range terminal {
		message, isRecoverable := pairingFailureMessage(event)
		if message == "" {
			t.Fatalf("event %q must be a recognized pairing failure", event)
		}
		if isRecoverable {
			t.Fatalf("event %q must be marked as non-recoverable", event)
		}
	}
}

func TestPairingFailureMessageIgnoresCodeAndSuccess(t *testing.T) {
	events := []string{
		whatsmeow.QRChannelEventCode,
		whatsmeow.QRChannelSuccess.Event,
	}

	for _, event := range events {
		if message, _ := pairingFailureMessage(event); message != "" {
			t.Fatalf("event %q must not be handled as failure", event)
		}
	}
}
