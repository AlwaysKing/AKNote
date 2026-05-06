package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/alwaysking/mdlibrary/internal/middleware"
	"github.com/alwaysking/mdlibrary/internal/model"
	"github.com/alwaysking/mdlibrary/internal/service"
)

type SpaceHandler struct {
	spaceService *service.SpaceService
}

func NewSpaceHandler(spaceService *service.SpaceService) *SpaceHandler {
	return &SpaceHandler{
		spaceService: spaceService,
	}
}

func (h *SpaceHandler) List(w http.ResponseWriter, r *http.Request) {
	spaces, err := h.spaceService.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(spaces)
}

func (h *SpaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Path[len("/api/spaces/"):]
	if slug == "" {
		http.Error(w, "Space slug required", http.StatusBadRequest)
		return
	}

	space, err := h.spaceService.GetBySlug(slug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(space)
}

func (h *SpaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateSpaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	userID := middleware.GetUserID(r)
	space, err := h.spaceService.Create(&req, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(space)
}

func (h *SpaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Path[len("/api/spaces/"):]
	if slug == "" {
		http.Error(w, "Space slug required", http.StatusBadRequest)
		return
	}

	var req model.UpdateSpaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	space, err := h.spaceService.Update(slug, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(space)
}

func (h *SpaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Path[len("/api/spaces/"):]
	if slug == "" {
		http.Error(w, "Space slug required", http.StatusBadRequest)
		return
	}

	if err := h.spaceService.Delete(slug); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SpaceHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Path[len("/api/spaces/"):]
	if slug == "" {
		http.Error(w, "Space slug required", http.StatusBadRequest)
		return
	}

	space, err := h.spaceService.GetBySlug(slug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	members, err := h.spaceService.ListMembers(space.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

func (h *SpaceHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Path[len("/api/spaces/"):]
	if slug == "" {
		http.Error(w, "Space slug required", http.StatusBadRequest)
		return
	}

	var req model.AddMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	space, err := h.spaceService.GetBySlug(slug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	member, err := h.spaceService.AddMember(space.ID, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}

func (h *SpaceHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/spaces/:slug/members/:id
	parts := splitPath(r.URL.Path)
	if len(parts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	memberIDStr := parts[4]

	memberID, err := strconv.Atoi(memberIDStr)
	if err != nil {
		http.Error(w, "Invalid member ID", http.StatusBadRequest)
		return
	}

	space, err := h.spaceService.GetBySlug(slug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	var req model.UpdateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	member, err := h.spaceService.UpdateMember(space.ID, memberID, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}

func (h *SpaceHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	// Parse path: /api/spaces/:slug/members/:id
	parts := splitPath(r.URL.Path)
	if len(parts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	slug := parts[3]
	memberIDStr := parts[4]

	memberID, err := strconv.Atoi(memberIDStr)
	if err != nil {
		http.Error(w, "Invalid member ID", http.StatusBadRequest)
		return
	}

	space, err := h.spaceService.GetBySlug(slug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if err := h.spaceService.RemoveMember(space.ID, memberID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func splitPath(path string) []string {
	return strings.Split(strings.Trim(path, "/"), "/")
}
