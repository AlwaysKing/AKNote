package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/alwaysking/mdlibrary/internal/model"
	"github.com/alwaysking/mdlibrary/internal/service"
)

type PageHandler struct {
	pageService *service.PageService
	spaceService *service.SpaceService
}

func NewPageHandler(pageService *service.PageService, spaceService *service.SpaceService) *PageHandler {
	return &PageHandler{
		pageService: pageService,
		spaceService: spaceService,
	}
}

func (h *PageHandler) GetTree(w http.ResponseWriter, r *http.Request) {
	// Extract slug from path: /api/spaces/:slug/pages
	parts := splitPath(r.URL.Path)
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]

	tree, err := h.pageService.GetTree(slug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tree)
}

func (h *PageHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	// Extract slug and id from path: /api/spaces/:slug/pages/:id
	parts := splitPath(r.URL.Path)
	if len(parts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	pageIDStr := parts[4]

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	page, err := h.pageService.GetByID(slug, pageID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Create(w http.ResponseWriter, r *http.Request) {
	// Extract slug from path: /api/spaces/:slug/pages
	parts := splitPath(r.URL.Path)
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]

	var req model.CreatePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Get space ID
	space, err := h.spaceService.GetBySlug(slug)
	if err != nil {
		http.Error(w, "Space not found", http.StatusNotFound)
		return
	}

	page, err := h.pageService.Create(slug, &req, space.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Update(w http.ResponseWriter, r *http.Request) {
	// Extract slug and id from path: /api/spaces/:slug/pages/:id
	parts := splitPath(r.URL.Path)
	if len(parts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	pageIDStr := parts[4]

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	var req model.UpdatePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	page, err := h.pageService.Update(slug, pageID, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) UpdateMeta(w http.ResponseWriter, r *http.Request) {
	// Extract slug and id from path: /api/spaces/:slug/pages/:id/meta
	parts := splitPath(r.URL.Path)
	if len(parts) < 6 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	pageIDStr := parts[4]

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	var req model.UpdatePageMetaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	page, err := h.pageService.UpdateMeta(slug, pageID, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	// Extract slug and id from path: /api/spaces/:slug/pages/:id
	parts := splitPath(r.URL.Path)
	if len(parts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	pageIDStr := parts[4]

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	if err := h.pageService.Delete(slug, pageID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *PageHandler) ServeAsset(w http.ResponseWriter, r *http.Request) {
	// Extract slug, id, and asset path: /api/spaces/:slug/pages/:id/assets/*
	parts := splitPath(r.URL.Path)
	if len(parts) < 7 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	pageIDStr := parts[4]
	assetPath := strings.Join(parts[6:], "/")

	pageID, err := strconv.Atoi(pageIDStr)
	if err != nil {
		http.Error(w, "Invalid page ID", http.StatusBadRequest)
		return
	}

	filePath, err := h.pageService.GetAssetPath(slug, pageID, assetPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, filePath)
}
