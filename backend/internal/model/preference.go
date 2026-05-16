package model

type UserPreferences struct {
	LastActiveSpaceSlug *string                     `json:"last_active_space_slug"`
	SpacePreferences    map[string]*SpacePreference `json:"space_preferences"`
}

type SpacePreference struct {
	LastViewedPageID *string   `json:"last_viewed_page_id"`
	ExpandedPageIDs  []string  `json:"expanded_page_ids"`
}

type UpdatePreferencesRequest struct {
	LastActiveSpaceSlug *string   `json:"last_active_space_slug"`
	SpaceSlug           *string   `json:"space_slug"`
	LastViewedPageID    *string   `json:"last_viewed_page_id"`
	ExpandedPageIDs     *[]string `json:"expanded_page_ids"`
}
