/**
 * Module-level clipboard state for cross-document block copy/paste.
 * Persists across SPA page navigations (React Router).
 */

let clipboardBlocks: any[] | null = null;
let clipboardMarkdown: string | null = null;
let clipboardIsCut = false;

export function setClipboardData(blocks: any[], markdown: string, isCut: boolean): void {
  clipboardBlocks = blocks;
  clipboardMarkdown = markdown;
  clipboardIsCut = isCut;
}

export function getClipboardData(): { blocks: any[]; markdown: string; isCut: boolean } | null {
  if (!clipboardBlocks || clipboardBlocks.length === 0) return null;
  return { blocks: clipboardBlocks, markdown: clipboardMarkdown!, isCut: clipboardIsCut };
}

export function clearClipboardData(): void {
  clipboardBlocks = null;
  clipboardMarkdown = null;
  clipboardIsCut = false;
}

/**
 * Track page IDs that are currently being restored from trash (undo of delete).
 * SubpageBlock checks this to avoid making API calls that would 404.
 */
const pendingRestores = new Set<string>();

export function addPendingRestore(pageId: string): void {
  pendingRestores.add(pageId);
}

export function removePendingRestore(pageId: string): void {
  pendingRestores.delete(pageId);
}

export function isPendingRestore(pageId: string): boolean {
  return pendingRestores.has(pageId);
}
