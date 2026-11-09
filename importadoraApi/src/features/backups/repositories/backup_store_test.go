package repositories

import (
	"os"
	"testing"
	"time"
)

func TestValidBackupID(t *testing.T) {
	valid := []string{"20261107-173045-manual", "20261107-173045-pre_restore"}
	invalid := []string{"", "../etc/passwd", "20261107-173045", "20261107-173045-auto", "20261107-173045-manual/../x", "x20261107-173045-manual", "20261107-173045-manual.dump"}
	for _, id := range valid {
		if !ValidBackupID(id) {
			t.Errorf("%q debería ser válido", id)
		}
	}
	for _, id := range invalid {
		if ValidBackupID(id) {
			t.Errorf("%q NO debería ser válido", id)
		}
	}
}

func TestBackupStoreCommitFindListOrder(t *testing.T) {
	store := NewBackupStore(t.TempDir())
	if err := store.EnsureDir(); err != nil {
		t.Fatal(err)
	}
	base := time.Date(2026, 11, 7, 10, 0, 0, 0, time.UTC)
	for i, kind := range []string{"manual", "pre_restore", "manual"} {
		id := store.NewID(kind, base.Add(time.Duration(i)*time.Minute))
		if err := os.WriteFile(store.PartialPath(id), []byte("PGDMP-datos"), 0o600); err != nil {
			t.Fatal(err)
		}
		if err := store.Commit(BackupEntity{ID: id, Kind: kind, CreatedAt: base.Add(time.Duration(i) * time.Minute), CreatedByEmail: "su@x.com"}); err != nil {
			t.Fatal(err)
		}
	}

	items, err := store.List()
	if err != nil || len(items) != 3 {
		t.Fatalf("lista: n=%d err=%v", len(items), err)
	}
	if items[0].Kind != "manual" || !items[0].CreatedAt.After(items[1].CreatedAt) || !items[1].CreatedAt.After(items[2].CreatedAt) {
		t.Errorf("la lista debe ir del más nuevo al más viejo: %+v", items)
	}
	if items[0].SizeBytes != int64(len("PGDMP-datos")) {
		t.Errorf("el tamaño sale del archivo real, dio %d", items[0].SizeBytes)
	}
}

func TestBackupStoreIgnoresIncompleteAndMissing(t *testing.T) {
	store := NewBackupStore(t.TempDir())
	_ = store.EnsureDir()
	id := store.NewID("manual", time.Now())

	// solo el temporal (respaldo que no terminó): no aparece
	_ = os.WriteFile(store.PartialPath(id), []byte("x"), 0o600)
	if items, _ := store.List(); len(items) != 0 {
		t.Errorf("un respaldo incompleto no debe listarse, hay %d", len(items))
	}
	if _, err := store.Find(id); err != ErrBackupNotFound {
		t.Errorf("Find de uno incompleto debe dar ErrBackupNotFound, dio %v", err)
	}
	if _, err := store.Find("../secreto"); err != ErrBackupNotFound {
		t.Errorf("un id con ruta debe rechazarse, dio %v", err)
	}
	store.DiscardPartial(id)
	if _, err := os.Stat(store.PartialPath(id)); !os.IsNotExist(err) {
		t.Error("DiscardPartial debe borrar el temporal")
	}
	// carpeta que aún no existe: lista vacía, sin error
	if items, err := NewBackupStore(t.TempDir() + "/no-existe").List(); err != nil || len(items) != 0 {
		t.Errorf("carpeta inexistente debe dar lista vacía: n=%d err=%v", len(items), err)
	}
}
