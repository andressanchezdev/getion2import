package events

// diff_test · changedFields de entity.updated: solo los campos que cambiaron, por nombre

import (
	"reflect"
	"testing"
	"time"
)

type diffRow struct {
	ID          int64
	Name        string
	Phone       *string
	CreditLimit float64
	IVA         float64
	ImageURL    string
	UpdatedAt   time.Time
}

func TestChangedFields(t *testing.T) {
	phone, newPhone := "300", "301"
	before := Snapshot(&diffRow{ID: 1, Name: "Ana", Phone: &phone, CreditLimit: 100, IVA: 19, ImageURL: "a.png", UpdatedAt: time.Unix(1, 0)})

	same := &diffRow{ID: 1, Name: "Ana", Phone: &phone, CreditLimit: 100, IVA: 19, ImageURL: "a.png", UpdatedAt: time.Unix(99, 0)}
	if got := ChangedFields(before, same); len(got) != 0 {
		t.Fatalf("solo cambió la fecha de control, no debe haber campos: %v", got)
	}

	edited := &diffRow{ID: 1, Name: "Ana", Phone: &newPhone, CreditLimit: 250, IVA: 5, ImageURL: "b.png", UpdatedAt: time.Unix(99, 0)}
	want := []string{"creditLimit", "imageURL", "iva", "phone"}
	if got := ChangedFields(before, edited); !reflect.DeepEqual(got, want) {
		t.Fatalf("campos cambiados: %v, esperaba %v", got, want)
	}

	if got := ChangedFields(Snapshot((*diffRow)(nil)), edited); len(got) == 0 {
		t.Fatal("sin foto anterior, todos los campos cuentan como cambio")
	}
}
