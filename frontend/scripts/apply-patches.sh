#!/bin/bash
# Apply patches to node_modules after npm install
# Fix: prosemirror-tables updateColumnsOnResize should always set minWidth

PATCH_TARGET="node_modules/prosemirror-tables/dist/index.js"

if [ -f "$PATCH_TARGET" ]; then
  # Fix: when fixedWidth=true, minWidth should be set (not cleared)
  # This ensures column borders update in real-time during drag resize
  sed -i.bak 's/\t  table\.style\.minWidth = "";/\t  table.style.minWidth = totalWidth + "px";/' "$PATCH_TARGET" && rm -f "${PATCH_TARGET}.bak"
  echo "✓ Patched prosemirror-tables: minWidth fix applied"
else
  echo "⚠ Skipping prosemirror-tables patch: $PATCH_TARGET not found"
fi
