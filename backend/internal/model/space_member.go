package model

import "time"

type SpaceMember struct {
	ID        int       `json:"id" db:"id"`
	SpaceID   int       `json:"space_id" db:"space_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Role      string    `json:"role" db:"role"` // "admin" | "editor" | "viewer"
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	User      *User     `json:"user,omitempty"`
}

type AddMemberRequest struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
}

type UpdateMemberRequest struct {
	Role string `json:"role"`
}
