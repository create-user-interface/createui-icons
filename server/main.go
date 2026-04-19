package main

import (
	"bytes"
	"context"
	"errors"
	"log"
	"math"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const (
	defaultStroke = 2.0
	minStroke     = 0.25
	maxStroke     = 10.0
	strokeStep    = 0.25
	defaultPort   = "3000"
	defaultRoot   = "/var/icons"
	defaultAddr   = "127.0.0.1"
)

var (
	pathRe            = regexp.MustCompile(`^/([0-9]+\.[0-9]+\.[0-9]+)/([a-z0-9-]+)\.svg$`)
	strokeWidthNeedle = []byte(`stroke-width="2"`)
)

type server struct {
	root string
}

func main() {
	port := envOr("PORT", defaultPort)
	addr := envOr("BIND_ADDR", defaultAddr)
	root := envOr("ICONS_ROOT", defaultRoot)

	s := &server{root: root}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/", s.icon)

	listen := addr + ":" + port
	srv := &http.Server{
		Addr:              listen,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	errs := make(chan error, 1)
	go func() {
		log.Printf("icon-server listening on %s, root=%s", listen, root)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errs <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-errs:
		log.Fatalf("listen: %v", err)
	case sig := <-stop:
		log.Printf("received %s, shutting down", sig)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	log.Print("stopped")
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}


func (s *server) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write([]byte("ok"))
	}
}

func (s *server) icon(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	m := pathRe.FindStringSubmatch(r.URL.Path)
	if m == nil {
		http.NotFound(w, r)
		return
	}
	version, icon := m[1], m[2]

	stroke, err := parseStroke(r.URL.Query().Get("stroke"))
	if err != nil {
		http.Error(w, "invalid stroke: "+err.Error(), http.StatusBadRequest)
		return
	}
	stroke = quantize(stroke)

	data, err := s.readIcon(version, icon)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			http.NotFound(w, r)
			return
		}
		log.Printf("read %s/%s: %v", version, icon, err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	out := replaceStroke(data, stroke)

	h := w.Header()
	h.Set("Content-Type", "image/svg+xml; charset=utf-8")
	// max-age=1y — URL versioned (/{semver}/...) + stroke квантуется до 0.25:
	// контент для данного URL зафиксирован навсегда. `immutable` запрещает
	// revalidation даже на Cmd+R. Match с CDN-бандлом в nginx/icon.conf.
	h.Set("Cache-Control", "public, max-age=31536000, immutable")
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Content-Length", strconv.Itoa(len(out)))
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write(out)
	}
}

func parseStroke(raw string) (float64, error) {
	if raw == "" {
		return defaultStroke, nil
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, errors.New("not a number")
	}
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, errors.New("not finite")
	}
	if v < minStroke || v > maxStroke {
		return 0, errors.New("out of range 0.25-10")
	}
	return v, nil
}

func quantize(v float64) float64 {
	q := math.Round(v/strokeStep) * strokeStep
	if q < minStroke {
		q = minStroke
	}
	if q > maxStroke {
		q = maxStroke
	}
	return q
}

func (s *server) readIcon(version, icon string) ([]byte, error) {
	absRoot, err := filepath.Abs(s.root)
	if err != nil {
		return nil, err
	}
	p := filepath.Join(absRoot, "versions", version, icon+".svg")
	if !strings.HasPrefix(p, absRoot+string(os.PathSeparator)) {
		return nil, os.ErrNotExist
	}
	return os.ReadFile(p)
}

func replaceStroke(svg []byte, stroke float64) []byte {
	if stroke == defaultStroke {
		return svg
	}
	repl := []byte(`stroke-width="` + formatStroke(stroke) + `"`)
	return bytes.ReplaceAll(svg, strokeWidthNeedle, repl)
}

func formatStroke(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}
