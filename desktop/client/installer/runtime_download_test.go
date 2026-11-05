package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestRuntimeDownloadPreservesInstalledFile(t *testing.T) {
	for _, scenario := range []string{"complete", "truncated", "empty", "http-error", "timeout"} {
		t.Run(scenario, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch scenario {
				case "http-error":
					w.WriteHeader(http.StatusServiceUnavailable)
				case "truncated":
					w.Header().Set("Content-Length", "1000")
					w.Write([]byte("partial"))
				case "empty":
				case "timeout":
					w.WriteHeader(http.StatusOK)
					w.(http.Flusher).Flush()
					<-r.Context().Done()
				default:
					w.Write([]byte("complete runtime"))
				}
			}))
			defer server.Close()
			dir := t.TempDir()
			destination := filepath.Join(dir, "cloudcord.asar")
			if err := os.WriteFile(destination, []byte("working runtime"), 0644); err != nil { t.Fatal(err) }
			req, _ := http.NewRequest(http.MethodGet, server.URL, nil)
			timeout := 2 * time.Second
			if scenario == "timeout" { timeout = 100 * time.Millisecond }
			err := downloadRuntimeFile(&http.Client{Timeout: timeout}, req, destination)
			want := "working runtime"
			if scenario == "complete" {
				want = "complete runtime"
				if err != nil { t.Fatal(err) }
			} else if err == nil { t.Fatal("expected transfer error") }
			data, err := os.ReadFile(destination)
			if err != nil || string(data) != want { t.Fatalf("saved runtime = %q, error = %v", data, err) }
			entries, err := os.ReadDir(dir)
			if err != nil || len(entries) != 1 { t.Fatalf("temporary download leaked: %v, %v", entries, err) }
		})
	}
}
