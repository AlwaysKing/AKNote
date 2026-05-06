package markdown

import (
	"strings"
)

// Converter handles Markdown to/from BlockNote JSON conversion
// For MVP, we store Markdown as-is and let BlockNote handle the conversion
type Converter struct{}

func NewConverter() *Converter {
	return &Converter{}
}

// MarkdownToJSON converts Markdown text to a simple JSON structure
// For MVP, we return the Markdown as-is since BlockNote can handle it
func (c *Converter) MarkdownToJSON(markdown string) interface{} {
	// For MVP, BlockNote frontend handles MD parsing
	// This is a placeholder for future enhancement
	return map[string]interface{}{
		"type":    "doc",
		"content": []interface{}{map[string]interface{}{"type": "paragraph", "content": []interface{}{map[string]interface{}{"type": "text", "text": markdown}}}},
	}
}

// JSONToMarkdown converts BlockNote JSON to Markdown
// For MVP, we return the content as-is since the editor will send MD
func (c *Converter) JSONToMarkdown(json interface{}) string {
	// For MVP, we expect the editor to send Markdown directly
	// This is a placeholder for future enhancement
	if str, ok := json.(string); ok {
		return str
	}
	return ""
}

// ExtractTitle extracts the first heading from Markdown as the page title
func (c *Converter) ExtractTitle(markdown string) string {
	lines := strings.Split(markdown, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") {
			// Remove # and trim
			title := strings.TrimLeft(trimmed, "#")
			return strings.TrimSpace(title)
		}
	}

	// If no heading found, use first non-empty line
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			// Truncate if too long
			if len(trimmed) > 50 {
				return trimmed[:50] + "..."
			}
			return trimmed
		}
	}

	return "Untitled"
}
