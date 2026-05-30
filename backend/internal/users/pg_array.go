package users

import (
	"database/sql/driver"
	"fmt"
	"strings"
)

// pgStringArray — минимальный Scanner для text[] из Postgres, без зависимости от lib/pq.
// Принимает формат "{a,b,c}" или "{}". Не предназначен для значений со спецсимволами.
type pgStringArray []string

func (a *pgStringArray) Scan(src any) error {
	if src == nil {
		*a = nil
		return nil
	}
	var s string
	switch v := src.(type) {
	case []byte:
		s = string(v)
	case string:
		s = v
	default:
		return fmt.Errorf("pgStringArray: unsupported type %T", src)
	}
	s = strings.TrimSpace(s)
	if s == "" || s == "{}" {
		*a = []string{}
		return nil
	}
	if !strings.HasPrefix(s, "{") || !strings.HasSuffix(s, "}") {
		return fmt.Errorf("pgStringArray: bad format %q", s)
	}
	inner := s[1 : len(s)-1]
	if inner == "" {
		*a = []string{}
		return nil
	}
	parts := strings.Split(inner, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, "\"")
		if p == "NULL" {
			continue
		}
		out = append(out, p)
	}
	*a = out
	return nil
}

func (a pgStringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return "{" + strings.Join([]string(a), ",") + "}", nil
}
