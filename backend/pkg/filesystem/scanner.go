package filesystem

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/alwaysking/mdlibrary/internal/model"
)

type Scanner struct {
	docsDir string
}

func NewScanner(docsDir string) *Scanner {
	return &Scanner{docsDir: docsDir}
}

func (s *Scanner) ScanSpaces() ([]*model.Space, error) {
	entries, err := os.ReadDir(s.docsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read docs directory: %w", err)
	}

	var spaces []*model.Space
	for _, entry := range entries {
		// Skip non-directories and hidden files
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		// Skip public directory
		if entry.Name() == "public" {
			continue
		}

		// Create space from directory
		spaces = append(spaces, &model.Space{
			Name: entry.Name(),
			Slug: generateSlug(entry.Name()),
		})
	}

	return spaces, nil
}

func (s *Scanner) ScanPageTree(spaceSlug string) ([]*model.PageNode, error) {
	spacePath := filepath.Join(s.docsDir, spaceSlug)
	if _, err := os.Stat(spacePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("space not found: %s", spaceSlug)
	}

	entries, err := os.ReadDir(spacePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read space directory: %w", err)
	}

	var nodes []*model.PageNode
	for _, entry := range entries {
		// Skip hidden files
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		// Skip public directory
		if entry.Name() == "public" {
			continue
		}

		// If it's a .md file at root level
		if strings.HasSuffix(entry.Name(), ".md") {
			title := strings.TrimSuffix(entry.Name(), ".md")
			nodes = append(nodes, &model.PageNode{
				ID:        generateID(title),
				Title:     title,
				Icon:      "",
				SortOrder: 0,
				Children:  nil,
			})
			continue
		}

		// If it's a directory, check for corresponding .md file
		if entry.IsDir() {
			mdFile := filepath.Join(spacePath, entry.Name()+".md")
			if _, err := os.Stat(mdFile); err == nil {
				// .md file exists - this is a page with children
				children, _ := s.scanDirectory(filepath.Join(spacePath, entry.Name()), 0)
				nodes = append(nodes, &model.PageNode{
					ID:        generateID(entry.Name()),
					Title:     entry.Name(),
					Icon:      "",
					SortOrder: 0,
					Children:  children,
				})
			} else {
				// No .md file - might be a child directory without a parent page
				// Skip for now, or treat as a page
				children, _ := s.scanDirectory(filepath.Join(spacePath, entry.Name()), 0)
				if len(children) > 0 {
					nodes = append(nodes, &model.PageNode{
						ID:        generateID(entry.Name()),
						Title:     entry.Name(),
						Icon:      "",
						SortOrder: 0,
						Children:  children,
					})
				}
			}
		}
	}

	// Sort by title
	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Title < nodes[j].Title
	})

	return nodes, nil
}

func (s *Scanner) scanDirectory(dirPath string, depth int) ([]*model.PageNode, error) {
	if depth > 10 { // Prevent infinite recursion
		return nil, nil
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var nodes []*model.PageNode
	for _, entry := range entries {
		// Skip hidden files and public directory
		if strings.HasPrefix(entry.Name(), ".") || entry.Name() == "public" {
			continue
		}

		// If it's a .md file
		if strings.HasSuffix(entry.Name(), ".md") {
			title := strings.TrimSuffix(entry.Name(), ".md")
			nodes = append(nodes, &model.PageNode{
				ID:        generateID(title),
				Title:     title,
				Icon:      "",
				SortOrder: 0,
				Children:  nil,
			})
			continue
		}

		// If it's a directory, check for children
		if entry.IsDir() {
			children, _ := s.scanDirectory(filepath.Join(dirPath, entry.Name()), depth+1)
			if len(children) > 0 {
				nodes = append(nodes, &model.PageNode{
					ID:        generateID(entry.Name()),
					Title:     entry.Name(),
					Icon:      "",
					SortOrder: 0,
					Children:  children,
				})
			}
		}
	}

	// Sort by title
	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Title < nodes[j].Title
	})

	return nodes, nil
}

func generateSlug(name string) string {
	// Simple slug generation
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")

	// Remove special characters (keep only alphanumeric and hyphens)
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}

	slug = result.String()

	// Remove consecutive hyphens
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}

	// Trim hyphens
	slug = strings.Trim(slug, "-")

	if slug == "" {
		slug = "untitled"
	}

	return slug
}

func generateID(title string) int {
	// Simple hash-based ID generation
	// In production, this should come from the database
	hash := 0
	for _, r := range title {
		hash = hash*31 + int(r)
	}
	if hash < 0 {
		hash = -hash
	}
	return hash % 1000000 // Keep it reasonable
}
