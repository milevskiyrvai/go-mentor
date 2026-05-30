package roadmap

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// Preview — простая структура с метаданными ссылки.
type Preview struct {
	Title       string
	Description string
	Image       string
	Source      string
}

var (
	reTitle = regexp.MustCompile(`<title[^>]*>([^<]+)</title>`)
	reMeta  = regexp.MustCompile(`(?i)<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["']`)
)

// FetchPreview — минимальный OpenGraph/HTML парсер. Без зависимостей.
func FetchPreview(ctx context.Context, rawURL string) (*Preview, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "GoMentorBot/0.1 (+preview-fetcher)")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return &Preview{Source: u.Host}, nil
	}

	// Ограничиваем чтение до 256 KB.
	body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return nil, err
	}
	html := string(body)

	p := &Preview{Source: u.Host}

	for _, m := range reMeta.FindAllStringSubmatch(html, -1) {
		key := strings.ToLower(m[1])
		val := m[2]
		switch key {
		case "og:title", "twitter:title":
			if p.Title == "" {
				p.Title = val
			}
		case "og:description", "twitter:description", "description":
			if p.Description == "" {
				p.Description = val
			}
		case "og:image", "twitter:image":
			if p.Image == "" {
				p.Image = val
			}
		case "og:site_name":
			p.Source = val
		}
	}
	if p.Title == "" {
		if m := reTitle.FindStringSubmatch(html); len(m) > 1 {
			p.Title = strings.TrimSpace(m[1])
		}
	}
	return p, nil
}
