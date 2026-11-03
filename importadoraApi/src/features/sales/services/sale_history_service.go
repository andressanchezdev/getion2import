package services

// sale_history_service · historial de etapas de un pedido (quién lo movió, cuándo entró y salió de cada etapa)
// conecta con: SaleService (mismo servicio) y sale_stage_history_repo; lo llama SaleController.StageHistory

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/features/sales/dtos"
)

// StageHistory devuelve las etapas del pedido de la primera a la última; solo de la compañía dada (0 = sin límite, superadmin).
func (s *SaleService) StageHistory(ctx context.Context, companyID, saleID int64) ([]dtos.StageHistoryResponse, error) {
	sale, err := s.saleRepo.FindByID(ctx, s.pool, saleID)
	if err != nil {
		return nil, err
	}
	if sale == nil || (companyID > 0 && sale.CompanyID != companyID) {
		return nil, errors.New("venta no encontrada")
	}

	entities, err := s.saleRepo.ListStageHistory(ctx, s.pool, saleID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	items := make([]dtos.StageHistoryResponse, 0, len(entities))
	for _, e := range entities {
		end := now
		if e.LeftAt != nil {
			end = *e.LeftAt
		}
		items = append(items, dtos.StageHistoryResponse{
			Stage:        e.Stage,
			EmployeeName: e.EmployeeName,
			EnteredAt:    e.EnteredAt,
			LeftAt:       e.LeftAt,
			Minutes:      int(end.Sub(e.EnteredAt).Minutes()),
		})
	}
	return items, nil
}
