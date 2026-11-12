package services

// bank_statement_service.go · reglas de negocio de extractos bancarios: valida permisos, compañía y datos, coordina las transacciones y arma las respuestas
// conecta con: los repositories y dtos de extractos bancarios; los llama el controller y la conexión llega del contenedor

import (
	"context"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/bank_statements/dtos"
	"importadoraApi/src/features/bank_statements/entities"
	"importadoraApi/src/features/bank_statements/repositories"
	paymentDtos "importadoraApi/src/features/payments/dtos"
	paymentRepos "importadoraApi/src/features/payments/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PaymentVerifier es lo único que el servicio bancario necesita del servicio de pagos: verificar un pago que está en revisión
// ojo: así confirmar un registro bancario usa el mismo flujo de verificación (suma lo abonado a la venta y asienta el crédito del cliente) y no un UPDATE aparte
type PaymentVerifier interface {
	Verify(ctx context.Context, actor *middlewares.ActorContext, id int64, req paymentDtos.VerifyPaymentRequest, ip, ua string) (*paymentDtos.PaymentResponse, error)
}

type BankStatementService struct {
	pool            *pgxpool.Pool
	repo            *repositories.BankStatementRepository
	paymentRepo     *paymentRepos.PaymentRepository
	paymentVerifier PaymentVerifier
	events          *events.Recorder
}

// NewBankStatementService crea el servicio con las piezas que necesita para funcionar.
func NewBankStatementService(
	pool *pgxpool.Pool,
	repo *repositories.BankStatementRepository,
	paymentRepo *paymentRepos.PaymentRepository,
	paymentVerifier PaymentVerifier,
	events *events.Recorder,
) *BankStatementService {
	return &BankStatementService{
		pool:            pool,
		repo:            repo,
		paymentRepo:     paymentRepo,
		paymentVerifier: paymentVerifier,
		events:          events,
	}
}

// ListRecords lista los registros bancarios según los filtros, limitados a la compañía del usuario.
func (s *BankStatementService) ListRecords(
	ctx context.Context,
	actor *middlewares.ActorContext,
	filter dtos.BankStatementFilterQuery,
) ([]dtos.BankStatementRecordDTO, *utils.PaginatorMetadata, error) {
	if actor == nil {
		return nil, nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	filter.CompanyID = companyID
	records, total, err := s.repo.FindFiltered(ctx, s.pool, filter)
	if err != nil {
		return nil, nil, utils.Internal("Error al listar registros de extractos bancarios.", err)
	}

	dtoList := make([]dtos.BankStatementRecordDTO, len(records))
	for i, r := range records {
		dtoList[i] = s.mapEntityToDTO(r)
	}

	pageSize := filter.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	totalPages := (total + pageSize - 1) / pageSize

	meta := &utils.PaginatorMetadata{
		TotalRecords: total,
		CurrentPage:  filter.Page,
		PageSize:     pageSize,
		TotalPages:   totalPages,
	}

	return dtoList, meta, nil
}

// ConfirmRecord confirma un registro bancario; si está ligado a un pago, primero verifica ese pago y, si no se puede, no confirma.
func (s *BankStatementService) ConfirmRecord(
	ctx context.Context,
	actor *middlewares.ActorContext,
	recordID int64,
	req dtos.ConfirmBankRecordRequest,
	ip, ua string,
) (*dtos.BankStatementRecordDTO, error) {
	if actor == nil {
		return nil, utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	record, err := s.repo.FindByID(ctx, s.pool, companyID, recordID)
	if err != nil {
		return nil, utils.Internal("Error al consultar registro bancario.", err)
	}
	if record == nil {
		return nil, utils.NotFound("BANK_RECORD_NOT_FOUND", "Registro bancario no encontrado.")
	}

	// si el registro se liga a un pago, primero se verifica el pago: si no se puede (no existe, es de otra compañía o ya no está en revisión) el registro NO se confirma
	// ojo: un pago que ya estaba verificado no es un error (por ejemplo al reintentar); solo se confirma el registro
	if req.PaymentID != nil && *req.PaymentID > 0 {
		payment, err := s.paymentRepo.FindByID(ctx, s.pool, *req.PaymentID)
		if err != nil {
			return nil, utils.Internal("Error al consultar el pago ligado al registro bancario.", err)
		}
		if payment == nil {
			return nil, utils.NotFound("PAYMENT_NOT_FOUND", "El pago ligado al registro bancario no existe.")
		}
		if payment.Status != types.PaymentStatusVerified {
			if _, err := s.paymentVerifier.Verify(ctx, actor, *req.PaymentID, paymentDtos.VerifyPaymentRequest{IssueNote: req.Notes}, ip, ua); err != nil {
				return nil, err
			}
		}
	}

	// el cambio de estado y su evento van en la misma transacción: si no se guarda, nadie recibe el aviso
	err = db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.repo.UpdateStatus(ctx, tx, companyID, recordID, "confirmed", &actor.ActorID, req.Notes); err != nil {
			return err
		}
		s.events.Record(ctx, events.NewBankRecordStatusChanged(companyID, events.BankRecordStatusChangedData{
			Entity:    events.EntityRef{Kind: "bank_record", ID: recordID, Version: time.Now().UTC()},
			From:      record.Status,
			To:        "confirmed",
			PaymentID: req.PaymentID,
		}))
		return nil
	})
	if err != nil {
		return nil, utils.Internal("Error al confirmar registro bancario.", err)
	}

	updated, _ := s.repo.FindByID(ctx, s.pool, companyID, recordID)
	dto := s.mapEntityToDTO(*updated)
	return &dto, nil
}

// IgnoreRecord marca un registro bancario como ignorado (no corresponde a ningún pago).
func (s *BankStatementService) IgnoreRecord(
	ctx context.Context,
	actor *middlewares.ActorContext,
	recordID int64,
	notes *string,
) error {
	if actor == nil {
		return utils.Unauthorized("UNAUTHORIZED", "Acceso no autenticado.")
	}

	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	record, err := s.repo.FindByID(ctx, s.pool, companyID, recordID)
	if err != nil {
		return utils.Internal("Error al consultar registro bancario.", err)
	}
	if record == nil {
		return utils.NotFound("BANK_RECORD_NOT_FOUND", "Registro bancario no encontrado.")
	}

	// ignorar un movimiento (no corresponde a ningún pago) deja constancia del motivo en sus notas
	given := ""
	if notes != nil {
		given = *notes
	}
	reason, verr := utils.ValidateReason(given)
	if verr != nil {
		return verr
	}

	return db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.repo.UpdateStatus(ctx, tx, companyID, recordID, "ignored", &actor.ActorID, &reason); err != nil {
			return err
		}
		s.events.Record(ctx, events.NewBankRecordStatusChanged(companyID, events.BankRecordStatusChangedData{
			Entity: events.EntityRef{Kind: "bank_record", ID: recordID, Version: time.Now().UTC()},
			From:   record.Status,
			To:     "ignored",
		}))
		return nil
	})
}

// mapEntityToDTO convierte el registro bancario de la base en la respuesta que sale por la API.
func (s *BankStatementService) mapEntityToDTO(e entities.BankStatementRecordEntity) dtos.BankStatementRecordDTO {
	return dtos.BankStatementRecordDTO{
		ID:              e.ID,
		CompanyID:       e.CompanyID,
		BankName:        e.BankName,
		AccountNumber:   e.AccountNumber,
		MovementDate:    e.MovementDate.Format("2006-01-02"),
		Description:     e.Description,
		BranchChannel:   e.BranchChannel,
		Reference1:      e.Reference1,
		Reference2:      e.Reference2,
		DocumentNumber:  e.DocumentNumber,
		Amount:          e.Amount,
		IsIncome:        e.IsIncome,
		Status:          e.Status,
		ConfirmedByID:   e.ConfirmedByID,
		ConfirmedByName: e.ConfirmedByName,
		ConfirmedAt:     e.ConfirmedAt,
		Notes:           e.Notes,
		CreatedAt:       e.CreatedAt,
	}
}
