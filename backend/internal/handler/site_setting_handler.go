package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/alwaysking/akmdlibrary/internal/model"
	"github.com/alwaysking/akmdlibrary/internal/service"
)

type SiteSettingHandler struct {
	siteSettingService *service.SiteSettingService
	siteDir            string
}

func NewSiteSettingHandler(siteSettingService *service.SiteSettingService, siteDir string) *SiteSettingHandler {
	os.MkdirAll(siteDir, 0755)
	return &SiteSettingHandler{
		siteSettingService: siteSettingService,
		siteDir:            siteDir,
	}
}

// Get returns site settings (public - no auth required)
func (h *SiteSettingHandler) Get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.siteSettingService.Get()
	if err != nil {
		http.Error(w, "Failed to get site settings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// UpdateSiteName updates site name (admin only)
func (h *SiteSettingHandler) UpdateSiteName(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SiteName string `json:"site_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.siteSettingService.Update(&model.UpdateSiteSettingsRequest{
		SiteName: &req.SiteName,
	}); err != nil {
		http.Error(w, "Failed to update site name", http.StatusInternalServerError)
		return
	}

	settings, _ := h.siteSettingService.Get()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// UploadFavicon handles favicon upload (admin only)
func (h *SiteSettingHandler) UploadFavicon(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read first bytes to detect extension
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])

	ext := ".png"
	if strings.Contains(contentType, "svg") {
		ext = ".svg"
	} else if strings.Contains(contentType, "jpeg") || strings.Contains(contentType, "jpg") {
		ext = ".jpg"
	} else if strings.Contains(contentType, "ico") {
		ext = ".ico"
	} else if strings.Contains(contentType, "gif") {
		ext = ".gif"
	}

	// Remove old favicon files
	oldFiles, _ := filepath.Glob(filepath.Join(h.siteDir, "favicon*"))
	for _, f := range oldFiles {
		os.Remove(f)
	}

	// Save new file
	filePath := filepath.Join(h.siteDir, "favicon"+ext)
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	dst.Write(buf[:n])
	io.Copy(dst, file)

	url := "/api/site-assets/favicon" + ext
	h.siteSettingService.Update(&model.UpdateSiteSettingsRequest{Favicon: &url})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

// UploadLogo handles logo upload (admin only)
func (h *SiteSettingHandler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])

	ext := ".png"
	if strings.Contains(contentType, "svg") {
		ext = ".svg"
	} else if strings.Contains(contentType, "jpeg") || strings.Contains(contentType, "jpg") {
		ext = ".jpg"
	} else if strings.Contains(contentType, "ico") {
		ext = ".ico"
	} else if strings.Contains(contentType, "gif") {
		ext = ".gif"
	}

	// Remove old logo files
	oldFiles, _ := filepath.Glob(filepath.Join(h.siteDir, "logo*"))
	for _, f := range oldFiles {
		os.Remove(f)
	}

	filePath := filepath.Join(h.siteDir, "logo"+ext)
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	dst.Write(buf[:n])
	io.Copy(dst, file)

	url := "/api/site-assets/logo" + ext
	h.siteSettingService.Update(&model.UpdateSiteSettingsRequest{Logo: &url})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

// ResetFavicon removes custom favicon (admin only)
func (h *SiteSettingHandler) ResetFavicon(w http.ResponseWriter, r *http.Request) {
	oldFiles, _ := filepath.Glob(filepath.Join(h.siteDir, "favicon*"))
	for _, f := range oldFiles {
		os.Remove(f)
	}
	empty := ""
	h.siteSettingService.Update(&model.UpdateSiteSettingsRequest{Favicon: &empty})
	w.WriteHeader(http.StatusNoContent)
}

// ResetLogo removes custom logo (admin only)
func (h *SiteSettingHandler) ResetLogo(w http.ResponseWriter, r *http.Request) {
	oldFiles, _ := filepath.Glob(filepath.Join(h.siteDir, "logo*"))
	for _, f := range oldFiles {
		os.Remove(f)
	}
	empty := ""
	h.siteSettingService.Update(&model.UpdateSiteSettingsRequest{Logo: &empty})
	w.WriteHeader(http.StatusNoContent)
}

// ServeAsset serves site asset files (public)
func (h *SiteSettingHandler) ServeAsset(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Path
	// Prevent directory traversal
	name = filepath.Base(name)

	filePath := filepath.Join(h.siteDir, name)
	if info, err := os.Stat(filePath); err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}

	// Set cache control
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, filePath)
}

// GetFaviconPath returns the current favicon file path for dynamic serving
func (h *SiteSettingHandler) GetFaviconPath() string {
	pattern := filepath.Join(h.siteDir, "favicon.*")
	matches, _ := filepath.Glob(pattern)
	if len(matches) > 0 {
		return matches[0]
	}
	return ""
}

// GetLogoPath returns the current logo file path for dynamic serving
func (h *SiteSettingHandler) GetLogoPath() string {
	pattern := filepath.Join(h.siteDir, "logo.*")
	matches, _ := filepath.Glob(pattern)
	if len(matches) > 0 {
		return matches[0]
	}
	return ""
}

// ServeManifest returns a PWA Web App Manifest reflecting current site settings (public).
// Site name and icon are wired to the admin-configured values so the installed PWA
// stays in sync with /api/site-settings without rebuilding the frontend.
func (h *SiteSettingHandler) ServeManifest(w http.ResponseWriter, r *http.Request) {
	settings, err := h.siteSettingService.Get()
	if err != nil {
		http.Error(w, "Failed to load site settings", http.StatusInternalServerError)
		return
	}

	name := "MD Library"
	if settings != nil && settings.SiteName != nil && *settings.SiteName != "" {
		name = *settings.SiteName
	}

	manifest := map[string]any{
		"name":             name,
		"short_name":       name,
		"description":      "MD Library",
		"start_url":        "/",
		"scope":            "/",
		"display":          "standalone",
		"background_color": "#ffffff",
		"theme_color":      "#ffffff",
		"icons": []map[string]any{
			{"src": "/api/site-assets/pwa-icon", "sizes": "any", "purpose": "any"},
			{"src": "/api/site-assets/pwa-icon", "sizes": "any", "purpose": "maskable"},
		},
	}

	w.Header().Set("Content-Type", "application/manifest+json; charset=utf-8")
	// Manifest 在站点设置变更后必须及时生效，禁用强制缓存，允许每次重新验证。
	w.Header().Set("Cache-Control", "no-cache")
	if err := json.NewEncoder(w).Encode(manifest); err != nil {
		http.Error(w, "Failed to encode manifest", http.StatusInternalServerError)
		return
	}
}

// ServePWAIcon serves the current favicon at a stable URL so the PWA manifest
// can reference it without knowing its extension. Falls back to the bundled
// frontend SVG when no custom favicon is configured.
func (h *SiteSettingHandler) ServePWAIcon(w http.ResponseWriter, r *http.Request) {
	favPath := h.GetFaviconPath()
	if favPath == "" {
		// No custom favicon → fall back to the default Vite SVG shipped with the frontend.
		http.Redirect(w, r, "/vite.svg", http.StatusFound)
		return
	}

	// http.ServeFile sets Content-Type from the file extension automatically.
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, favPath)
}
