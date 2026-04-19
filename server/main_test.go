package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseStroke(t *testing.T) {
	cases := []struct {
		in      string
		want    float64
		wantErr bool
	}{
		{"", 2, false},
		{"1", 1, false},
		{"1.5", 1.5, false},
		{"0.25", 0.25, false},
		{"10", 10, false},
		{"0.24", 0, true},
		{"10.01", 0, true},
		{"0", 0, true},
		{"-1", 0, true},
		{"abc", 0, true},
		{"NaN", 0, true},
		{"Inf", 0, true},
	}
	for _, c := range cases {
		got, err := parseStroke(c.in)
		if c.wantErr {
			if err == nil {
				t.Errorf("parseStroke(%q) expected error, got %v", c.in, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("parseStroke(%q) unexpected error: %v", c.in, err)
			continue
		}
		if got != c.want {
			t.Errorf("parseStroke(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestQuantize(t *testing.T) {
	cases := []struct {
		in, want float64
	}{
		{1.73, 1.75},
		{2.1, 2.0},
		{0.3, 0.25},
		{0.25, 0.25},
		{2, 2},
		{1.125, 1.25}, // math.Round rounds half away from zero
		{1.375, 1.5},
		{9.99, 10},
	}
	for _, c := range cases {
		if got := quantize(c.in); got != c.want {
			t.Errorf("quantize(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestFormatStroke(t *testing.T) {
	cases := []struct {
		in   float64
		want string
	}{
		{2, "2"},
		{1.5, "1.5"},
		{0.25, "0.25"},
		{1.75, "1.75"},
	}
	for _, c := range cases {
		if got := formatStroke(c.in); got != c.want {
			t.Errorf("formatStroke(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestReplaceStroke(t *testing.T) {
	svg := []byte(`<svg stroke-width="2" viewBox="0 0 24 24"></svg>`)
	out := replaceStroke(svg, 1.5)
	want := `<svg stroke-width="1.5" viewBox="0 0 24 24"></svg>`
	if string(out) != want {
		t.Errorf("got %q, want %q", out, want)
	}
}

func setupFakeRoot(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	dir := filepath.Join(root, "versions", "0.460.0")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	svg := `<svg xmlns="http://www.w3.org/2000/svg" stroke-width="2"><path d="M1 1"/></svg>`
	if err := os.WriteFile(filepath.Join(dir, "user.svg"), []byte(svg), 0o644); err != nil {
		t.Fatal(err)
	}
	return root
}

func TestIconHandler_OK(t *testing.T) {
	s := &server{root: setupFakeRoot(t)}
	req := httptest.NewRequest(http.MethodGet, "/0.460.0/user.svg?stroke=1.5", nil)
	w := httptest.NewRecorder()
	s.icon(w, req)

	resp := w.Result()
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "image/svg+xml") {
		t.Errorf("Content-Type = %q", ct)
	}
	if cc := resp.Header.Get("Cache-Control"); !strings.Contains(cc, "immutable") {
		t.Errorf("Cache-Control = %q", cc)
	}
	if ao := resp.Header.Get("Access-Control-Allow-Origin"); ao != "*" {
		t.Errorf("CORS = %q", ao)
	}
	if !strings.Contains(string(body), `stroke-width="1.5"`) {
		t.Errorf("body did not contain substituted stroke-width: %s", body)
	}
}

func TestIconHandler_Quantized(t *testing.T) {
	s := &server{root: setupFakeRoot(t)}
	req := httptest.NewRequest(http.MethodGet, "/0.460.0/user.svg?stroke=1.73", nil)
	w := httptest.NewRecorder()
	s.icon(w, req)

	body, _ := io.ReadAll(w.Result().Body)
	if !strings.Contains(string(body), `stroke-width="1.75"`) {
		t.Errorf("expected quantized stroke 1.75, body: %s", body)
	}
}

func TestIconHandler_DefaultStroke(t *testing.T) {
	s := &server{root: setupFakeRoot(t)}
	req := httptest.NewRequest(http.MethodGet, "/0.460.0/user.svg", nil)
	w := httptest.NewRecorder()
	s.icon(w, req)

	body, _ := io.ReadAll(w.Result().Body)
	if !strings.Contains(string(body), `stroke-width="2"`) {
		t.Errorf("expected default stroke 2, body: %s", body)
	}
}

func TestIconHandler_NotFound(t *testing.T) {
	s := &server{root: setupFakeRoot(t)}
	cases := []string{
		"/0.460.0/missing.svg",
		"/0.460.0/",
		"/bad-version/user.svg",
		"/0.460.0/User.svg",  // uppercase
		"/0.460.0/us_er.svg", // underscore
		"/0.460.0/../etc/passwd",
	}
	for _, path := range cases {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		s.icon(w, req)
		if w.Code != http.StatusNotFound {
			t.Errorf("%s: status = %d, want 404", path, w.Code)
		}
	}
}

func TestIconHandler_BadStroke(t *testing.T) {
	s := &server{root: setupFakeRoot(t)}
	cases := []string{"abc", "0", "-1", "10.5", "NaN"}
	for _, v := range cases {
		req := httptest.NewRequest(http.MethodGet, "/0.460.0/user.svg?stroke="+v, nil)
		w := httptest.NewRecorder()
		s.icon(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("stroke=%q: status = %d, want 400", v, w.Code)
		}
	}
}

func TestHealthHandler(t *testing.T) {
	s := &server{}
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	s.health(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	if body := w.Body.String(); body != "ok" {
		t.Errorf("body = %q, want ok", body)
	}
}
