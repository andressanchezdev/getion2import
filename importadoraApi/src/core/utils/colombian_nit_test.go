package utils

import "testing"

func TestNormalizeColombianNIT(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "accepts formatted NIT", input: "900.373.913-4", want: "900373913-4"},
		{name: "accepts NIT without punctuation", input: "9003739134", want: "900373913-4"},
		{name: "rejects malformed length", input: "90037391-4", wantErr: true},
		{name: "rejects invalid check digit", input: "900373913-5", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeColombianNIT(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("NormalizeColombianNIT() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && got != tt.want {
				t.Errorf("NormalizeColombianNIT() = %q, want %q", got, tt.want)
			}
		})
	}
}
