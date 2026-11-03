package services

// bank_statement_upload_service · carga del extracto en PDF y lectura de sus movimientos
// conecta con: BankStatementService (mismo servicio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en bank_statement_service.go)

import (
	"context"
	"fmt"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/bank_statements/dtos"
	"importadoraApi/src/features/bank_statements/entities"

	"github.com/ledongthuc/pdf"
)

// ProcessPDFUpload lee un extracto bancario en PDF, saca sus movimientos y los guarda como registros por conciliar.
func (s *BankStatementService) ProcessPDFUpload(
	ctx context.Context,
	companyID int64,
	r io.Reader,
	fileSize int64,
) (*dtos.UploadBankStatementResponse, error) {
	// Guardar archivo temporalmente para leer con pdf.Open
	tmpFile, err := os.CreateTemp("", "bank_stmt_*.pdf")
	if err != nil {
		return nil, utils.Internal("No se pudo crear archivo temporal para procesar PDF.", err)
	}
	defer func() {
		_ = tmpFile.Close()
		_ = os.Remove(tmpFile.Name())
	}()

	if _, err := io.Copy(tmpFile, r); err != nil {
		return nil, utils.Internal("Error al almacenar el archivo PDF.", err)
	}
	_ = tmpFile.Close()

	pdfFile, pdfReader, err := pdf.Open(tmpFile.Name())
	if err != nil {
		return nil, utils.BadRequest("INVALID_PDF", "El archivo subido no es un PDF válido o está protegido con contraseña.")
	}
	defer pdfFile.Close()

	totalPage := pdfReader.NumPage()
	var rawLines []string

	for pageIdx := 1; pageIdx <= totalPage; pageIdx++ {
		p := pdfReader.Page(pageIdx)
		if p.V.IsNull() {
			continue
		}
		text, err := p.GetPlainText(nil)
		if err != nil {
			continue
		}
		lines := strings.Split(text, "\n")
		for _, l := range lines {
			trimmed := strings.TrimSpace(l)
			if trimmed != "" {
				rawLines = append(rawLines, trimmed)
			}
		}
	}

	// Extraer cabeceras (Cuenta y Banco)
	accountNumber := "01400000369"
	bankName := "Bancolombia"

	for i, l := range rawLines {
		if strings.Contains(l, "Número de Cuenta:") && i+1 < len(rawLines) {
			accountNumber = strings.TrimSpace(rawLines[i+1])
		}
		if strings.Contains(strings.ToUpper(l), "BANCOLOMBIA") {
			bankName = "Bancolombia"
		}
	}

	dateRegex := regexp.MustCompile(`^(\d{4})[/-](\d{2})[/-](\d{2})$`)
	amountRegex := regexp.MustCompile(`^-?[\d,]+(\.\d{2})?$`)

	var parsedRecords []entities.BankStatementRecordEntity

	// Recorrer líneas buscando bloques de transacciones
	for i := 0; i < len(rawLines); i++ {
		line := rawLines[i]
		if dateRegex.MatchString(line) {
			mDate, err := time.Parse("2006/01/02", strings.ReplaceAll(line, "-", "/"))
			if err != nil {
				continue
			}

			// Tomar siguientes líneas hasta encontrar el monto
			var block []string
			j := i + 1
			for j < len(rawLines) && !dateRegex.MatchString(rawLines[j]) && j-i < 8 {
				block = append(block, rawLines[j])
				j++
			}

			if len(block) >= 2 {
				rec := s.parseTransactionBlock(companyID, bankName, accountNumber, mDate, block, amountRegex)
				if rec != nil {
					parsedRecords = append(parsedRecords, *rec)
				}
			}
			i = j - 1
		}
	}

	if len(parsedRecords) == 0 {
		return nil, utils.BadRequest("EMPTY_OR_UNPARSED", "No se encontraron transacciones legibles en el formato del extracto bancario.")
	}

	inserted, err := s.repo.InsertBatch(ctx, s.pool, parsedRecords)
	if err != nil {
		return nil, utils.Internal("Error al guardar registros bancarios en la base de datos.", err)
	}

	dtoList := make([]dtos.BankStatementRecordDTO, len(parsedRecords))
	for idx, r := range parsedRecords {
		dtoList[idx] = s.mapEntityToDTO(r)
	}

	return &dtos.UploadBankStatementResponse{
		TotalProcessed: len(parsedRecords),
		TotalInserted:  inserted,
		AccountInfo:    fmt.Sprintf("%s - %s", bankName, accountNumber),
		Records:        dtoList,
	}, nil
}

// parseTransactionBlock convierte un bloque de texto del extracto en un movimiento (fecha, descripción y monto) si lo reconoce.
func (s *BankStatementService) parseTransactionBlock(
	companyID int64,
	bankName, accountNum string,
	mDate time.Time,
	block []string,
	amountRegex *regexp.Regexp,
) *entities.BankStatementRecordEntity {
	amountIdx := -1
	var amount float64
	var isIncome bool = true

	for k := len(block) - 1; k >= 0; k-- {
		clean := strings.ReplaceAll(strings.ReplaceAll(block[k], "$", ""), " ", "")
		if amountRegex.MatchString(clean) {
			cleanVal := strings.ReplaceAll(clean, ",", "")
			val, err := strconv.ParseFloat(cleanVal, 64)
			if err == nil {
				amountIdx = k
				amount = val
				if val < 0 {
					isIncome = false
				}
				break
			}
		}
	}

	if amountIdx == -1 {
		return nil
	}

	metaFields := block[:amountIdx]
	branch := "LA PLAYA"
	desc := ""
	var ref1, ref2 *string

	if len(metaFields) > 0 {
		if metaFields[0] == "LA PLAYA" || metaFields[0] == "CNB REDES" || strings.HasPrefix(metaFields[0], "SUC") {
			branch = metaFields[0]
			metaFields = metaFields[1:]
		}
	}

	if len(metaFields) > 0 {
		desc = metaFields[0]
		metaFields = metaFields[1:]
	}

	if len(metaFields) > 0 {
		if metaFields[0] != "null" && metaFields[0] != "" {
			val := metaFields[0]
			ref1 = &val
		}
		metaFields = metaFields[1:]
	}

	if len(metaFields) > 0 {
		if metaFields[0] != "null" && metaFields[0] != "" {
			val := metaFields[0]
			ref2 = &val
		}
	}

	status := "pending"
	upperDesc := strings.ToUpper(desc)
	if strings.Contains(upperDesc, "4X1000") || strings.Contains(upperDesc, "COMISION") || strings.Contains(upperDesc, "INTERESES") {
		status = "ignored"
	}

	return &entities.BankStatementRecordEntity{
		CompanyID:      companyID,
		BankName:       bankName,
		AccountNumber:  accountNum,
		MovementDate:   mDate,
		Description:    desc,
		BranchChannel:  branch,
		Reference1:     ref1,
		Reference2:     ref2,
		DocumentNumber: nil,
		Amount:         amount,
		IsIncome:       isIncome,
		Status:         status,
	}
}
