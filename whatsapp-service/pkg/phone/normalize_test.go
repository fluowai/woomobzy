package phone

import "testing"

func TestNormalizeBrazilianNumbers(t *testing.T) {
	tests := map[string]string{
		"+5548988003260":  "5548988003260",
		"5548988003260":   "5548988003260",
		"(48) 98800-3260": "5548988003260",
		"048 98800-3260":  "5548988003260",
		"554833806836":    "554833806836",
		"48 3306-6836":    "554833066836",
	}

	for input, want := range tests {
		if got := Normalize(input); got != want {
			t.Fatalf("Normalize(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestIsGroupJID(t *testing.T) {
	if !IsGroupJID("120363366882241499@g.us") {
		t.Fatal("expected @g.us to be treated as group")
	}
	if IsGroupJID("104565810663442@lid") {
		t.Fatal("expected @lid to be treated as a non-group identifier")
	}
	if IsGroupJID("5548988003260@s.whatsapp.net") {
		t.Fatal("expected user JID to be treated as non-group")
	}
}

func TestIsLIDJID(t *testing.T) {
	if !IsLIDJID("84388272410703@lid") {
		t.Fatal("expected @lid to be identified as internal LID")
	}
	if IsLIDJID("5548988003260@s.whatsapp.net") {
		t.Fatal("expected phone JID not to be identified as LID")
	}
}

func TestIsUserPhoneJID(t *testing.T) {
	if !IsUserPhoneJID("5548988003260@s.whatsapp.net") {
		t.Fatal("expected canonical phone JID to be supported")
	}
	if IsUserPhoneJID("84388272410703@lid") {
		t.Fatal("expected LID not to be supported as phone JID")
	}
	if IsUserPhoneJID("120363366882241499@g.us") {
		t.Fatal("expected group JID not to be supported as phone JID")
	}
}

func TestGetDisplayNameRejectsPlaceholders(t *testing.T) {
	tests := []string{"~", "+55------30", "84388272410703@lid", "5548988003260", "ES"}
	for _, input := range tests {
		got := GetDisplayName(input, "5548988003260")
		if got != "+55 (48) 98800-3260" {
			t.Fatalf("GetDisplayName(%q) = %q, want formatted phone", input, got)
		}
	}

	if got := GetDisplayName("Elisangela Sanches", "5548988003260"); got != "Elisangela Sanches" {
		t.Fatalf("expected real push name, got %q", got)
	}
}
