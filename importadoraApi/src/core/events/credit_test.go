package events

// credit_test · estado del crédito que viaja en credit.balance_changed

import "testing"

func TestCreditStatusOf(t *testing.T) {
	cases := []struct {
		name             string
		enabled          bool
		limit, available float64
		want             string
	}{
		{"sin crédito", false, 1000, 1000, "blocked"},
		{"sin cupo asignado", true, 0, 0, "blocked"},
		{"cupo agotado", true, 1000, 0, "blocked"},
		{"sobregirado", true, 1000, -50, "blocked"},
		{"70 % usado", true, 1000, 300, "warning"},
		{"69 % usado", true, 1000, 310, "ok"},
		{"libre", true, 1000, 1000, "ok"},
	}
	for _, c := range cases {
		if got := CreditStatusOf(c.enabled, c.limit, c.available); got != c.want {
			t.Errorf("%s: %s, esperaba %s", c.name, got, c.want)
		}
	}
}
