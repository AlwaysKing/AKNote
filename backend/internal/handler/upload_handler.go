package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/alwaysking/mdlibrary/internal/service"
)

type UploadHandler struct {
	pageService *service.PageService
	uploadDir   string
}

func NewUploadHandler(pageService *service.PageService, uploadDir string) *UploadHandler {
	return &UploadHandler{
		pageService: pageService,
		uploadDir:   uploadDir,
	}
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Check if it's a multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get file
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get page ID if provided
	pageIDStr := r.FormValue("page_id")
	var pageID int
	var slug string

	if pageIDStr != "" {
		pageID, err = strconv.Atoi(pageIDStr)
		if err != nil {
			http.Error(w, "Invalid page ID", http.StatusBadRequest)
			return
		}
		slug = r.FormValue("space_slug")
	}

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	var filePath string
	if pageID > 0 && slug != "" {
		// Upload to page's public directory
		filePath, err = h.pageService.UploadAsset(slug, pageID, header.Filename, content)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		// Upload to system upload directory
		filePath = fmt.Sprintf("/api/upload/%s", header.Filename)
		uploadPath := filepath.Join(h.uploadDir, header.Filename)
		if err := os.WriteFile(uploadPath, content, 0644); err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"path": filePath})
}

func (h *UploadHandler) ServeUpload(w http.ResponseWriter, r *http.Request) {
	filename := r.URL.Path[len("/api/upload/"):]
	if filename == "" {
		http.Error(w, "Filename required", http.StatusBadRequest)
		return
	}

	// Security check
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		http.Error(w, "Invalid filename", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(h.uploadDir, filename)
	http.ServeFile(w, r, filePath)
}
