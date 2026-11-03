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
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/cash_sessions/dtos"
	"importadoraApi/src/features/cash_sessions/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CashSessionService struct {
	pool *pgxpool.Pool
	repo *repositories.CashSessionRepository
}

func NewCashSessionService(pool *pgxpool.Pool, repo *repositories.CashSessionRepository) *CashSessionService {
	return &CashSessionService{
		pool: pool,
		repo: repo,
	}
}

func (s *CashSessionService) GetActive(ctx context.Context, actor *middlewares.ActorContext, warehouseID int64) (*dtos.CashSessionResponse, error) {
	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	entity, err := s.repo.FindActiveByWarehouse(ctx, s.pool, companyID, warehouseID)
	if err != nil {
		return nil, utils.Internal("Error al consultar el turno de caja.", err)
	}
	if entity == nil {
		return nil, nil
	}

	// totales en vivo del turno (los gastos se declaran recién al cerrar)
	cash, transfer, count, err := s.repo.SessionTotals(ctx, s.pool, entity.ID)
	if err != nil {
		return nil, utils.Internal("Error al calcular los totales del turno.", err)
	}
	expected := entity.OpeningAmount + cash

	res := toResponse(entity)
	res.CashTotal = cash
	res.TransferTotal = transfer
	res.PaymentsCount = count
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

	var whCompanyID int64
	if err := s.pool.QueryRow(ctx, "SELECT company_id FROM warehouses WHERE id = $1", req.WarehouseID).Scan(&whCompanyID); err == nil && whCompanyID > 0 {
		companyID = whCompanyID
	}

	existing, err := s.repo.FindActiveByWarehouse(ctx, s.pool, companyID, req.WarehouseID)
	if err != nil {
		return nil, utils.Internal("Error al verificar turno existente.", err)
	}
	if existing != nil {
		return nil, utils.Conflict("SESSION_ALREADY_OPEN", "Ya existe un turno de caja abierto en esta bodega.")
	}

	actorType := string(actor.ActorType)
	actorID := actor.ActorID
	actorName := s.resolveActorName(ctx, actor)

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

	expenses, expensesCash, err := cleanExpenses(req.Expenses)
	if err != nil {
		return nil, err
	}

	existing, err := s.repo.FindActiveByWarehouse(ctx, s.pool, companyID, req.WarehouseID)
	if err != nil {
		return nil, utils.Internal("Error al verificar turno existente.", err)
	}
	if existing == nil {
		return nil, utils.NotFound("NO_ACTIVE_SESSION", "No hay un turno de caja abierto para cerrar en esta bodega.")
	}

	cash, transfer, count, err := s.repo.SessionTotals(ctx, s.pool, existing.ID)
	if err != nil {
		return nil, utils.Internal("Error al calcular totales del turno.", err)
	}

	// efectivo esperado en la gaveta: fondo inicial + ventas en efectivo - gastos pagados en efectivo
	expectedCash := existing.OpeningAmount + cash - expensesCash
	diff := req.CountedCash - expectedCash

	actorType := string(actor.ActorType)
	actorID := actor.ActorID
	actorName := s.resolveActorName(ctx, actor)

	existing.ClosedByActorType = &actorType
	existing.ClosedByActorID = &actorID
	existing.ClosedByName = &actorName
	existing.CashTotal = &cash
	existing.TransferTotal = &transfer
	existing.PaymentsCount = &count
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

// cleanExpenses valida los gastos declarados al cerrar (concepto y algún monto) y suma lo pagado en efectivo.
func cleanExpenses(items []dtos.CashExpenseRequest) ([]repositories.CashExpenseEntity, float64, error) {
	list := make([]repositories.CashExpenseEntity, 0, len(items))
	var cashTotal float64
	for _, item := range items {
		concept := strings.TrimSpace(item.Concept)
		if concept == "" {
			return nil, 0, utils.BadRequest("INVALID_EXPENSE", "Cada gasto necesita un concepto.")
		}
		if item.CashAmount < 0 || item.TransferAmount < 0 || item.CashAmount+item.TransferAmount <= 0 {
			return nil, 0, utils.BadRequest("INVALID_EXPENSE", fmt.Sprintf("El gasto '%s' necesita un monto mayor a cero.", concept))
		}
		list = append(list, repositories.CashExpenseEntity{ReceiptNumber: strings.TrimSpace(item.ReceiptNumber), Concept: concept, CashAmount: item.CashAmount, TransferAmount: item.TransferAmount})
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
	var cash, transfer, expected float64
	var count int
	if e.CashTotal != nil {
		cash = *e.CashTotal
	}
	if e.TransferTotal != nil {
		transfer = *e.TransferTotal
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
		PaymentsCount:     count,
		ExpectedCash:      expected,
		CountedCash:       e.CountedCash,
		Difference:        e.Difference,
		Notes:             e.Notes,
	}
}

func (s *CashSessionService) resolveActorName(ctx context.Context, actor *middlewares.ActorContext) string {
	if actor == nil {
		return "Desconocido"
	}
	if actor.ActorType == types.ActorSuperadmin {
		return "Super Administrador"
	}
	if actor.ActorType == types.ActorEmployee {
		var firstName, lastName string
		err := s.pool.QueryRow(ctx, "SELECT first_name, COALESCE(last_name, '') FROM employees WHERE id = $1", actor.ActorID).Scan(&firstName, &lastName)
		if err == nil {
			full := strings.TrimSpace(firstName + " " + lastName)
			if full != "" {
				return full
			}
		}
	} else if actor.ActorType == types.ActorAdmin {
		var firstName, lastName string
		err := s.pool.QueryRow(ctx, "SELECT first_name, COALESCE(last_name, '') FROM admins WHERE id = $1", actor.ActorID).Scan(&firstName, &lastName)
		if err == nil {
			full := strings.TrimSpace(firstName + " " + lastName)
			if full != "" {
				return full
			}
		}
	}
	if actor.Email != "" {
		return actor.Email
	}
	return fmt.Sprintf("Usuario #%d", actor.ActorID)
}
