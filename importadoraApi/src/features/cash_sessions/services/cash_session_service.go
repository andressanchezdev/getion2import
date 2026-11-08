package services

// cash_session_service.go · reglas del turno de caja: una sola caja abierta por bodega, cierre con descuadre
// conecta con: cash_session_repo y cash_session_controller

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	authRepos "importadoraApi/src/features/auth/repositories"
	"importadoraApi/src/features/cash_sessions/dtos"
	"importadoraApi/src/features/cash_sessions/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CashSessionService struct {
	pool     *pgxpool.Pool
	repo     *repositories.CashSessionRepository
	authRepo *authRepos.AuthRepository
}

func NewCashSessionService(pool *pgxpool.Pool, repo *repositories.CashSessionRepository, authRepo *authRepos.AuthRepository) *CashSessionService {
	return &CashSessionService{
		pool:     pool,
		repo:     repo,
		authRepo: authRepo,
	}
}

func (s *CashSessionService) GetActive(ctx context.Context, actor *middlewares.ActorContext, warehouseID int64) (*dtos.CashSessionResponse, error) {
	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	entity, err := s.repo.FindActiveByActor(ctx, s.pool, companyID, warehouseID, string(actor.ActorType), actor.ActorID)
	if err != nil {
		return nil, utils.Internal("Error al consultar el turno de caja.", err)
	}
	if entity == nil {
		return nil, nil
	}

	// totales en vivo del turno (los gastos se declaran recién al cerrar)
	sums, err := s.repo.SessionTotals(ctx, s.pool, entity.ID)
	if err != nil {
		return nil, utils.Internal("Error al calcular los totales del turno.", err)
	}
	expected := entity.OpeningAmount + sums.Cash + sums.AbonosCash

	res := toResponse(entity)
	res.CashTotal = sums.Cash
	res.TransferTotal = sums.Transfer
	res.AbonosTotal = sums.Abonos
	res.PaymentsCount = sums.Count
	res.ExpectedCash = expected
	return res, nil
}

func (s *CashSessionService) Open(ctx context.Context, actor *middlewares.ActorContext, req dtos.OpenCashSessionRequest) (*dtos.CashSessionResponse, error) {
	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	if req.WarehouseID <= 0 {
		return nil, utils.BadRequest("INVALID_WAREHOUSE", "La bodega es obligatoria para abrir el turno.")
	}
	if req.OpeningAmount < 0 {
		return nil, utils.BadRequest("INVALID_AMOUNT", "El fondo inicial no puede ser negativo.")
	}

	if whCompanyID, err := s.repo.FindWarehouseCompanyID(ctx, s.pool, req.WarehouseID); err == nil && whCompanyID > 0 {
		companyID = whCompanyID
	}

	actorType := string(actor.ActorType)
	actorID := actor.ActorID

	existing, err := s.repo.FindActiveByActor(ctx, s.pool, companyID, req.WarehouseID, actorType, actorID)
	if err != nil {
		return nil, utils.Internal("Error al verificar turno existente.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("SESSION_ALREADY_OPEN", "Ya tienes un turno de caja abierto en esta bodega.")
	}

	actorName := s.authRepo.ResolveActorDisplayName(ctx, s.pool, actor)

	entity := &repositories.CashSessionEntity{
		CompanyID:         companyID,
		WarehouseID:       req.WarehouseID,
		OpenedByActorType: actorType,
		OpenedByActorID:   actorID,
		OpenedByName:      actorName,
		OpeningAmount:     req.OpeningAmount,
	}

	created, err := s.repo.OpenSession(ctx, s.pool, entity)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, utils.Conflict("SESSION_ALREADY_OPEN", "Ya existe un turno de caja abierto en esta bodega.")
		}
		return nil, utils.Internal("Error al abrir el turno de caja.", err)
	}

	return toResponse(created), nil
}

func (s *CashSessionService) Close(ctx context.Context, actor *middlewares.ActorContext, req dtos.CloseCashSessionRequest) (*dtos.CashSessionResponse, error) {
	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	if req.WarehouseID <= 0 {
		return nil, utils.BadRequest("INVALID_WAREHOUSE", "La bodega es obligatoria para cerrar el turno.")
	}
	if req.CountedCash < 0 {
		return nil, utils.BadRequest("INVALID_COUNTED_CASH", "El efectivo contado no puede ser negativo.")
	}

	if (req.CountedTransfer != nil && *req.CountedTransfer < 0) || (req.CountedAbonos != nil && *req.CountedAbonos < 0) {
		return nil, utils.BadRequest("INVALID_AMOUNT", "Los montos declarados de transferencias y abonos no pueden ser negativos.")
	}

	expenses, expensesCash, err := cleanExpenses(req.Expenses)
	if err != nil {
		return nil, err
	}

	existing, err := s.repo.FindActiveByActor(ctx, s.pool, companyID, req.WarehouseID, string(actor.ActorType), actor.ActorID)
	if err != nil {
		return nil, utils.Internal("Error al verificar turno existente.", err)
	}
	if existing == nil {
		return nil, utils.NotFound("NO_ACTIVE_SESSION", "No tienes un turno de caja abierto para cerrar en esta bodega.")
	}

	// Regla estricta: la caja no puede cerrar si existen pedidos en verificación pendientes
	pendingCount, err := s.repo.CountPendingVerificationSales(ctx, s.pool, companyID, req.WarehouseID)
	if err != nil {
		return nil, utils.Internal("Error al verificar pedidos pendientes.", err)
	}
	if pendingCount > 0 {
		return nil, utils.Conflict("PENDING_VERIFICATION_SALES", fmt.Sprintf("No se puede cerrar la caja: hay %d pedido(s) en verificación pendiente(s) en esta sede. Deben verificarse o cancelarse antes del cierre.", pendingCount))
	}

	sums, err := s.repo.SessionTotals(ctx, s.pool, existing.ID)
	if err != nil {
		return nil, utils.Internal("Error al calcular totales del turno.", err)
	}

	// efectivo esperado en la gaveta: fondo inicial + ventas en efectivo + abonos en efectivo - gastos pagados en efectivo
	expectedCash := existing.OpeningAmount + sums.Cash + sums.AbonosCash - expensesCash
	diff := req.CountedCash - expectedCash

	actorType := string(actor.ActorType)
	actorID := actor.ActorID
	actorName := s.authRepo.ResolveActorDisplayName(ctx, s.pool, actor)

	existing.ClosedByActorType = &actorType
	existing.ClosedByActorID = &actorID
	existing.ClosedByName = &actorName
	existing.CashTotal = &sums.Cash
	existing.TransferTotal = &sums.Transfer
	existing.AbonosTotal = &sums.Abonos
	existing.CountedTransfer = req.CountedTransfer
	existing.CountedAbonos = req.CountedAbonos
	existing.PaymentsCount = &sums.Count
	existing.ExpectedCash = &expectedCash
	existing.CountedCash = &req.CountedCash
	existing.Difference = &diff
	existing.Notes = req.Notes

	err = db.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		for _, expense := range expenses {
			if err := s.repo.InsertExpense(ctx, tx, existing.ID, expense); err != nil {
				return err
			}
		}
		return s.repo.CloseSession(ctx, tx, existing)
	})
	if err != nil {
		return nil, utils.Internal("Error al cerrar el turno de caja.", err)
	}

	res := toResponse(existing)
	res.ExpensesCash = expensesCash
	res.Expenses = toExpenseDTOs(expenses)
	return res, nil
}

// cleanExpenses valida los gastos declarados al cerrar (concepto y monto en efectivo) y suma lo pagado en efectivo.
// La caja solo desembolsa efectivo: transferencias se concilian por extracto bancario en cartera.
func cleanExpenses(items []dtos.CashExpenseRequest) ([]repositories.CashExpenseEntity, float64, error) {
	list := make([]repositories.CashExpenseEntity, 0, len(items))
	var cashTotal float64
	for _, item := range items {
		concept := strings.TrimSpace(item.Concept)
		if concept == "" {
			return nil, 0, utils.BadRequest("INVALID_EXPENSE", "Cada gasto necesita un concepto.")
		}
		if item.TransferAmount > 0 {
			return nil, 0, utils.BadRequest("CASH_ONLY_EXPENSE", "La caja solo registra gastos pagados en efectivo. Los egresos por transferencia se concilian en bancos/cartera.")
		}
		if item.CashAmount <= 0 {
			return nil, 0, utils.BadRequest("INVALID_EXPENSE", fmt.Sprintf("El gasto '%s' necesita un monto en efectivo mayor a cero.", concept))
		}
		list = append(list, repositories.CashExpenseEntity{ReceiptNumber: strings.TrimSpace(item.ReceiptNumber), Concept: concept, CashAmount: item.CashAmount, TransferAmount: 0})
		cashTotal += item.CashAmount
	}
	return list, cashTotal, nil
}

func toExpenseDTOs(items []repositories.CashExpenseEntity) []dtos.CashExpenseRequest {
	list := make([]dtos.CashExpenseRequest, 0, len(items))
	for _, e := range items {
		list = append(list, dtos.CashExpenseRequest{ReceiptNumber: e.ReceiptNumber, Concept: e.Concept, CashAmount: e.CashAmount, TransferAmount: e.TransferAmount})
	}
	return list
}

func toResponse(e *repositories.CashSessionEntity) *dtos.CashSessionResponse {
	var cash, transfer, abonos, expected float64
	var count int
	if e.CashTotal != nil {
		cash = *e.CashTotal
	}
	if e.TransferTotal != nil {
		transfer = *e.TransferTotal
	}
	if e.AbonosTotal != nil {
		abonos = *e.AbonosTotal
	}
	if e.PaymentsCount != nil {
		count = *e.PaymentsCount
	}
	if e.ExpectedCash != nil {
		expected = *e.ExpectedCash
	} else {
		expected = e.OpeningAmount + cash
	}

	return &dtos.CashSessionResponse{
		ID:                e.ID,
		CompanyID:         e.CompanyID,
		WarehouseID:       e.WarehouseID,
		WarehouseName:     e.WarehouseName,
		Status:            e.Status,
		OpenedByActorType: e.OpenedByActorType,
		OpenedByActorID:   e.OpenedByActorID,
		OpenedByName:      e.OpenedByName,
		OpenedAt:          e.OpenedAt,
		OpeningAmount:     e.OpeningAmount,
		ClosedByActorType: e.ClosedByActorType,
		ClosedByActorID:   e.ClosedByActorID,
		ClosedByName:      e.ClosedByName,
		ClosedAt:          e.ClosedAt,
		CashTotal:         cash,
		TransferTotal:     transfer,
		AbonosTotal:       abonos,
		PaymentsCount:     count,
		ExpectedCash:      expected,
		CountedCash:       e.CountedCash,
		Difference:        e.Difference,
		CountedTransfer:   e.CountedTransfer,
		TransferDiff:      diffOf(e.CountedTransfer, transfer),
		CountedAbonos:     e.CountedAbonos,
		AbonosDiff:        diffOf(e.CountedAbonos, abonos),
		Notes:             e.Notes,
	}
}

// diffOf es lo declarado menos lo recibido; sin declarar no hay diferencia
func diffOf(declared *float64, received float64) *float64 {
	if declared == nil {
		return nil
	}
	d := *declared - received
	return &d
}
