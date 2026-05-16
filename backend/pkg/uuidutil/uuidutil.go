package uuidutil

import (
	"strings"

	"github.com/google/uuid"
)

// NewPageID generates a 32-character hex UUID without dashes.
// Example: "550e8400e29b41d4a716446655440000"
func NewPageID() string {
	return strings.ReplaceAll(uuid.New().String(), "-", "")
}
