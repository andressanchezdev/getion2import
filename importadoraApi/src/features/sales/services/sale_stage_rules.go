package services

// sale_stage_rules · reglas del orden de las etapas del pedido: desde qué etapas se permite cada acción
// conecta con: sale_stage_service y sale_invoice_service (las llaman antes de mover el pedido)
// ojo: repetir una acción ya hecha devuelve 409 (por ejemplo despachar dos veces descontaría el stock dos veces); las etapas «_ok» también valen como punto de partida

import (
	"fmt"
	"strings"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/repositories"
)

type stageRule struct {
	verb    string               // lo que hace la acción, para el mensaje
	allowed []types.ProcessStage // etapas desde las que se puede hacer
}

var stageRules = map[string]stageRule{
	"pick":     {"alistar", []types.ProcessStage{types.StageVerificationOK, types.StagePicking}},
	"pack":     {"empacar", []types.ProcessStage{types.StagePicking, types.StagePickingOK, types.StagePacking}},
	"invoice":  {"facturar", []types.ProcessStage{types.StagePacking, types.StagePackingOK}},
	"dispatch": {"despachar", []types.ProcessStage{types.StageInvoicing, types.StageInvoicingOK}},
	"send":     {"enviar", []types.ProcessStage{types.StageDispatch}},
}

var stageLabels = map[types.ProcessStage]string{
	types.StageVerification:   "verificación",
	types.StageVerificationOK: "verificación confirmada",
	types.StagePicking:        "alistamiento",
	types.StagePickingOK:      "alistamiento terminado",
	types.StagePacking:        "empaque",
	types.StagePackingOK:      "empaque terminado",
	types.StageInvoicing:      "facturación",
	types.StageInvoicingOK:    "facturación terminada",
	types.StageDispatch:       "despacho",
	types.StageSent:           "enviado",
	types.StageCancelled:      "cancelado",
}

func stageLabel(stage types.ProcessStage) string {
	if label, ok := stageLabels[stage]; ok {
		return label
	}
	return string(stage)
}

// ensureStageFor devuelve un 409 si el pedido no está en una etapa desde la que se pueda hacer la acción
func ensureStageFor(sale *repositories.SaleEntity, action string) error {
	rule, ok := stageRules[action]
	if !ok {
		return nil
	}
	for _, stage := range rule.allowed {
		if sale.CurrentStage == stage {
			return nil
		}
	}
	names := make([]string, 0, len(rule.allowed))
	for _, stage := range rule.allowed {
		names = append(names, stageLabel(stage))
	}
	return utils.Conflict("INVALID_STAGE_TRANSITION", fmt.Sprintf(
		"No se puede %s el pedido %s: está en «%s» y solo se puede desde %s.",
		rule.verb, sale.SerialCode, stageLabel(sale.CurrentStage), strings.Join(names, " o ")))
}

// ensureOpen devuelve el error adecuado cuando el pedido ya no admite cambios
func ensureOpen(sale *repositories.SaleEntity, verb string) error {
	switch sale.Status {
	case types.SaleCancelled:
		return utils.Conflict("SALE_CANCELLED", fmt.Sprintf("No se puede %s el pedido %s: está cancelado.", verb, sale.SerialCode))
	case types.SaleCompleted:
		return utils.Conflict("SALE_COMPLETED", fmt.Sprintf("No se puede %s el pedido %s: ya está completado.", verb, sale.SerialCode))
	}
	return nil
}
