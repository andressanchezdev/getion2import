package features_test

// notification_integration_test · prueba contra PostgreSQL real a quién le llega cada notificación: cada empleado y administrador ve solo las suyas
// y la notificación de restauración llega únicamente a los administradores de la compañía (nunca a empleados ni a otra compañía)
// ojo: solo corre si TEST_DATABASE_URL está definida; todo se escribe dentro de una transacción que se revierte

import (
	"context"
	"fmt"
	"testing"
	"time"

	"importadoraApi/src/features/notifications/dtos"
	notificationRepos "importadoraApi/src/features/notifications/repositories"
)

func TestNotificationsReachOnlyTheirRecipient(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	repo := notificationRepos.NewNotificationRepository()

	var empA, empB int64
	if err := tx.QueryRow(ctx, `SELECT id FROM employees ORDER BY id LIMIT 1`).Scan(&empA); err != nil {
		t.Fatal(err)
	}
	if err := tx.QueryRow(ctx, `SELECT id FROM employees WHERE id <> $1 ORDER BY id LIMIT 1`, empA).Scan(&empB); err != nil {
		t.Skip("hace falta un segundo empleado para esta prueba")
	}
	var admin, adminCompany int64
	if err := tx.QueryRow(ctx, `SELECT id, company_id FROM admins ORDER BY id LIMIT 1`).Scan(&admin, &adminCompany); err != nil {
		t.Fatal(err)
	}

	var idA int64
	if err := tx.QueryRow(ctx, `INSERT INTO notifications (employee_id, kind, title) VALUES ($1, 'info', 'solo-empleado-A') RETURNING id`, empA).Scan(&idA); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO notifications (admin_id, kind, title) VALUES ($1, 'info', 'solo-admin')`, admin); err != nil {
		t.Fatal(err)
	}

	titles := func(actorType string, id int64) map[string]bool {
		list, _, err := repo.List(ctx, tx, dtos.NotificationFilterQuery{ActorType: actorType, ActorID: id, Page: 1, PageSize: 200})
		if err != nil {
			t.Fatalf("listar %s %d: %v", actorType, id, err)
		}
		out := map[string]bool{}
		for _, n := range list {
			out[n.Title] = true
		}
		return out
	}

	if !titles("employee", empA)["solo-empleado-A"] {
		t.Error("el empleado A debe ver su notificación")
	}
	if titles("employee", empB)["solo-empleado-A"] {
		t.Error("el empleado B NO debe ver la notificación del empleado A")
	}
	if titles("employee", empA)["solo-admin"] || titles("employee", empB)["solo-admin"] {
		t.Error("ningún empleado debe ver la notificación del administrador")
	}
	if !titles("admin", admin)["solo-admin"] || titles("admin", admin)["solo-empleado-A"] {
		t.Error("el administrador ve la suya y no la de un empleado")
	}
	if _, _, err := repo.List(ctx, tx, dtos.NotificationFilterQuery{ActorType: "superadmin", ActorID: 1, Page: 1, PageSize: 10}); err == nil {
		t.Error("el repositorio no debe tener destinatario para el superadmin")
	}

	// el empleado B no puede marcar como leída la del empleado A
	if err := repo.MarkAsRead(ctx, tx, "employee", idA, empB); err != nil {
		t.Fatal(err)
	}
	var readAt *string
	if err := tx.QueryRow(ctx, `SELECT read_at::text FROM notifications WHERE id = $1`, idA).Scan(&readAt); err != nil || readAt != nil {
		t.Errorf("la notificación del empleado A no debía marcarse desde el empleado B (read_at=%v err=%v)", readAt, err)
	}
	if err := repo.MarkAsRead(ctx, tx, "employee", idA, empA); err != nil {
		t.Fatal(err)
	}
	if err := tx.QueryRow(ctx, `SELECT read_at::text FROM notifications WHERE id = $1`, idA).Scan(&readAt); err != nil || readAt == nil {
		t.Errorf("el empleado A sí debe poder marcar la suya (read_at=%v err=%v)", readAt, err)
	}

	// restauración: solo administradores de esa compañía (se filtra por un título único para no contar notificaciones legítimas de otras pruebas o de los e2e)
	restoreTitle := fmt.Sprintf("Registro restaurado prueba-%d", time.Now().UnixNano())
	if err := repo.CreateCompanyAdminNotification(ctx, tx, adminCompany, restoreTitle, "prueba", "customers", 1); err != nil {
		t.Fatalf("crear la notificación de restauración: %v", err)
	}
	var toEmployees, toOtherCompanies int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE kind = 'restore_record' AND title = $1 AND employee_id IS NOT NULL`, restoreTitle).Scan(&toEmployees); err != nil {
		t.Fatal(err)
	}
	if toEmployees != 0 {
		t.Errorf("la restauración no debe notificar a empleados, llegó a %d", toEmployees)
	}
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM notifications n JOIN admins a ON a.id = n.admin_id WHERE n.kind = 'restore_record' AND n.title = $2 AND a.company_id <> $1`, adminCompany, restoreTitle).Scan(&toOtherCompanies); err != nil {
		t.Fatal(err)
	}
	if toOtherCompanies != 0 {
		t.Errorf("la restauración no debe llegar a administradores de otra compañía, llegó a %d", toOtherCompanies)
	}
}
