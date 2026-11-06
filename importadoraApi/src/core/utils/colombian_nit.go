package utils

import (
	"errors"
	"regexp"
	"strings"
)

var colombianNITPattern = regexp.MustCompile(`^([0-9]{9})-?([0-9])$`)

func NormalizeColombianNIT(value string) (string, error) {
	value = strings.NewReplacer(".", "", " ", "").Replace(strings.TrimSpace(value))
	parts := colombianNITPattern.FindStringSubmatch(value)
	if parts == nil {
		return "", errors.New("el NIT debe contener nueve dígitos y un dígito de verificación")
	}

	weights := [...]int{41, 37, 29, 23, 19, 17, 13, 7, 3}
	sum := 0
	for i, digit := range parts[1] {
		sum += int(digit-'0') * weights[i]
	}
	checkDigit := sum % 11
	if checkDigit > 1 {
		checkDigit = 11 - checkDigit
	}
	if int(parts[2][0]-'0') != checkDigit {
		return "", errors.New("el dígito de verificación del NIT no es válido")
	}

	return parts[1] + "-" + parts[2], nil
}
