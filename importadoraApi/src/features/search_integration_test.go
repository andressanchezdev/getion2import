package features_test

// search_integration_test · prueba contra una base PostgreSQL real que la búsqueda exacta y la tolerante a errores funcionan
// ojo: solo corre si TEST_DATABASE_URL está definida (por ejemplo la base local creada con startdb.pgsql); si no, se omite

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	customerDTOs "importadoraApi/src/features/customers/dtos"
	customerRepos "importadoraApi/src/features/customers/repositories"
	productDTOs "importadoraApi/src/features/products/dtos"
	productRepos "importadoraApi/src/features/products/repositories"
	staffDTOs "importadoraApi/src/features/staff/dtos"
	staffRepos "importadoraApi/src/features/staff/repositories"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no definida: se omite la prueba contra PostgreSQL")
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatalf("no se pudo conectar: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestProductSearchExactAndFuzzy(t *testing.T) {
	pool := testPool(t)
	repo := productRepos.NewProductRepository()
	cid := int64(1)
	search := func(text string) int {
		_, total, err := repo.List(context.Background(), pool, productDTOs.ProductFilterQuery{CompanyID: &cid, Search: text, Page: 1, PageSize: 50})
		if err != nil {
			t.Fatalf("buscar %q: %v", text, err)
		}
		return total
	}
	if search("aceite") == 0 {
		t.Error("la búsqueda exacta 'aceite' debería encontrar productos")
	}
	if search("acite") == 0 {
		t.Error("el error de ortografía 'acite' debería encontrar productos (respaldo tolerante)")
	}
	if search("abrasadera") == 0 {
		t.Error("'abrasadera' debería encontrar ABRAZADERA")
	}
	if n := search("zzzqqqxx"); n != 0 {
		t.Errorf("un texto sin parecido no debería devolver nada, devolvió %d", n)
	}
}

func TestCustomerSearchExactAndFuzzy(t *testing.T) {
	pool := testPool(t)
	repo := customerRepos.NewCustomerRepository()
	cid := int64(1)
	search := func(text string) int {
		_, total, err := repo.List(context.Background(), pool, customerDTOs.CustomerFilterQuery{CompanyID: &cid, Search: text, Page: 1, PageSize: 50})
		if err != nil {
			t.Fatalf("buscar %q: %v", text, err)
		}
		return total
	}
	if search("motosur") == 0 {
		t.Error("la búsqueda exacta 'motosur' debería encontrar clientes")
	}
	if search("motosor") == 0 {
		t.Error("'motosor' debería encontrar MOTOSUR")
	}
	sel, err := repo.ListSelector(context.Background(), pool, cid, "motosor")
	if err != nil || len(sel) == 0 {
		t.Errorf("el selector de clientes debería tolerar 'motosor' (err=%v, n=%d)", err, len(sel))
	}
}

func TestEmployeeSearch(t *testing.T) {
	pool := testPool(t)
	repo := staffRepos.NewEmployeeRepository()
	cid := int64(1)
	_, total, err := repo.List(context.Background(), pool, staffDTOs.EmployeeFilterQuery{CompanyID: &cid, Search: "a", Page: 1, PageSize: 50})
	if err != nil || total == 0 {
		t.Fatalf("buscar empleados: total=%d err=%v", total, err)
	}
}
