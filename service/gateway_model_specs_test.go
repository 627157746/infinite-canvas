package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tigerowo/infinite-canvas/model"
)

func TestFetchGatewayChannelModelSpecsKeepsKindAndCapabilities(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"object":"list","data":[
			{"id":"vid","kind":"video","capabilities":{"modes":["frames","reference"],"supports_audio":true}},
			{"id":"img","kind":"image","capabilities":null},
			{"id":"chat","kind":"text"},
			{"id":"","kind":"image"}
		]}`))
	}))
	defer server.Close()

	specs, err := fetchGatewayChannelModelSpecs(model.ModelChannel{Protocol: ModelChannelProtocolAIMG, BaseURL: server.URL, APIKey: "test-key"})
	if err != nil {
		t.Fatalf("fetchGatewayChannelModelSpecs returned error: %v", err)
	}
	if len(specs) != 2 {
		t.Fatalf("specs = %v, want vid and img only", specs)
	}
	var video struct {
		Kind         string `json:"kind"`
		Capabilities struct {
			Modes         []string `json:"modes"`
			SupportsAudio bool     `json:"supports_audio"`
		} `json:"capabilities"`
	}
	if err := json.Unmarshal(specs["vid"], &video); err != nil {
		t.Fatalf("decode vid: %v", err)
	}
	if video.Kind != "video" || len(video.Capabilities.Modes) != 2 || !video.Capabilities.SupportsAudio {
		t.Fatalf("vid = %+v", video)
	}
	if string(specs["img"]) != `{"capabilities":{},"kind":"image"}` {
		t.Fatalf("img = %s", specs["img"])
	}
}

func TestFetchGatewayChannelModelSpecsRejectsOtherProtocols(t *testing.T) {
	if _, err := fetchGatewayChannelModelSpecs(model.ModelChannel{Protocol: "openai", BaseURL: "https://example.test", APIKey: "k"}); err == nil {
		t.Fatal("expected error for non-aimg channel")
	}
}
