import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { type FindReplaceAPI, type FindReplaceState } from './FindReplaceExtension';

/**
 * FindReplacePanel
 *
 * Floating search/replace panel rendered above the editor's top-right corner.
 * Replicates Notion's Ctrl+F / Ctrl+H panel: search input + match counter +
 * navigation/replace/close icons, plus an expandable replace row.
 *
 * The panel is purely presentational. All search/replace work is delegated
 * to FindReplaceExtension via the imperative API it stashes on the
 * underlying TipTap editor (BlockNote wraps TipTap at `_tiptapEditor`).
 */

/**
 * Resolve the TipTap editor from either a TipTap editor or a BlockNote editor.
 * The extension stashes the imperative API on the TipTap editor instance, so
 * we need it to access `findReplace` and to subscribe to `transaction` events.
 */
function resolveTipTapEditor(editor: any): Editor | null {
  if (!editor) return null;
  // TipTap editor (has .on/.off directly)
  if (typeof editor.on === 'function' && typeof editor.view !== 'undefined' && editor.view?.state) {
    return editor;
  }
  // BlockNote editor wraps TipTap at _tiptapEditor
  if (editor._tiptapEditor) return editor._tiptapEditor;
  return null;
}

const DEFAULT_STATE: FindReplaceState = {
  searchTerm: '',
  replaceTerm: '',
  matches: [],
  currentIndex: -1,
};

const PANEL_STYLE: React.CSSProperties = {
  // Fixed to the viewport so the panel stays in the top-right corner
  // regardless of editor scroll position. Sits just below the breadcrumb
  // bar (h-11 = 44px).
  position: 'fixed',
  top: 44,
  right: 16,
  zIndex: 1000,
  backgroundColor: '#ffffff',
  borderRadius: 12,
  width: 280,
  outline: '3px solid rgba(15, 123, 198, 0.25)',
  boxShadow:
    'rgba(25, 25, 25, 0.05) 0px 20px 24px 0px, rgba(25, 25, 25, 0.027) 0px 5px 8px 0px, rgba(42, 28, 0, 0.07) 0px 0px 0px 1px',
  overflow: 'hidden',
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  paddingInline: 10,
  gap: 10,
};

const INPUT_STYLE: React.CSSProperties = {
  fontSize: 14,
  paddingTop: 10,
  paddingBottom: 10,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  width: '100%',
  color: '#37352f',
};

const ICON_BTN_BASE: React.CSSProperties = {
  padding: 3,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(55, 53, 47, 0.45)',
  background: 'transparent',
  border: 'none',
  borderRadius: 4,
};

const ICON_BTN_HOVER = {
  background: 'rgba(55, 53, 47, 0.08)',
};

type Props = {
  editor: Editor;
  /** "find" (Ctrl+F) or "replace" (Ctrl+H). Controls whether the replace row starts open. */
  initialMode?: 'find' | 'replace';
  onClose: () => void;
};

export default function FindReplacePanel({ editor, initialMode = 'find', onClose }: Props) {
  const [showReplace, setShowReplace] = useState(initialMode === 'replace');
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [state, setRemoteState] = useState<FindReplaceState>(DEFAULT_STATE);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<FindReplaceAPI | null>(null);

  // When the parent requests a different mode (e.g. Ctrl+H pressed after
  // Ctrl+F while the panel is already open), expand or collapse the row.
  useEffect(() => {
    setShowReplace(initialMode === 'replace');
  }, [initialMode]);

  // Resolve the TipTap editor (BlockNote wraps it at _tiptapEditor) and grab
  // the imperative API the extension stashed on it.
  useEffect(() => {
    const tiptap = resolveTipTapEditor(editor);
    if (!tiptap) return;
    apiRef.current = (tiptap as any).findReplace ?? null;
  }, [editor]);

  // Subscribe to plugin state so match count and decorations stay live.
  // We hook into the TipTap editor's transaction event, which fires after
  // every state change (search, navigation, document edits, replacement).
  useEffect(() => {
    const tiptap = resolveTipTapEditor(editor);
    if (!tiptap) return;
    const handler = () => {
      if (apiRef.current) setRemoteState(apiRef.current.getState());
    };
    handler();
    tiptap.on('transaction', handler);
    tiptap.on('update', handler);
    return () => {
      tiptap.off('transaction', handler);
      tiptap.off('update', handler);
    };
  }, [editor]);

  // Focus the search input on open.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Clear the search when the panel unmounts so highlights don't linger
  // in the document after the user closes the find/replace panel.
  useEffect(() => {
    return () => {
      apiRef.current?.setSearchTerm('');
    };
  }, []);

  const api = apiRef.current;

  // The transaction/update subscription above keeps `state` in sync, so
  // handlers here only dispatch — no manual re-read needed.
  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      api?.setSearchTerm(term);
    },
    [api],
  );

  const handleReplace = useCallback(
    (term: string) => {
      setReplaceTerm(term);
      api?.setReplaceTerm(term);
    },
    [api],
  );

  const goNext = useCallback(() => {
    api?.next();
  }, [api]);

  const goPrev = useCallback(() => {
    api?.prev();
  }, [api]);

  const doReplace = useCallback(() => {
    api?.replaceCurrent();
  }, [api]);

  const doReplaceAll = useCallback(() => {
    api?.replaceAll();
  }, [api]);

  // Keyboard: Enter/Shift+Enter to navigate, Esc to close.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const matchCount = state.matches.length;
  const currentDisplay = matchCount > 0 ? state.currentIndex + 1 : 0;

  return (
    <div style={PANEL_STYLE} role="dialog" aria-label="查找替换">
      {/* Search row */}
      <div
        style={showReplace ? { ...ROW_STYLE, borderBottom: '1px solid rgba(55, 53, 47, 0.09)' } : ROW_STYLE}
      >
        <input
          ref={searchInputRef}
          type="text"
          placeholder="查找、替换、询问…"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={onKeyDown}
          style={INPUT_STYLE}
        />
        <div
          style={{
            fontSize: '0.8rem',
            color: 'rgba(55, 53, 47, 0.4)',
            userSelect: 'none',
            cursor: 'default',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span>{currentDisplay}</span>
          <span>/</span>
          <span>{matchCount}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <IconButton title="上一个匹配项" onClick={goPrev} disabled={matchCount === 0}>
            <ArrowUpIcon />
          </IconButton>
          <IconButton title="下一个匹配项" onClick={goNext} disabled={matchCount === 0}>
            <ArrowDownIcon />
          </IconButton>
          <IconButton
            title="展开替换"
            onClick={() => setShowReplace((v) => !v)}
            active={showReplace}
          >
            <ReplaceIcon />
          </IconButton>
          <IconButton title="关闭" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      {/* Replace row */}
      {showReplace && (
        <>
          <div style={ROW_STYLE}>
            <input
              type="text"
              placeholder="替换为…"
              value={replaceTerm}
              onChange={(e) => handleReplace(e.target.value)}
              onKeyDown={onKeyDown}
              style={INPUT_STYLE}
            />
          </div>
          {/* Action buttons — right-aligned, side by side */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
              padding: '4px 12px 8px',
            }}
          >
            <button
              type="button"
              onClick={doReplaceAll}
              disabled={matchCount === 0}
              style={{
                border: 'none',
                background: 'none',
                cursor: matchCount === 0 ? 'default' : 'pointer',
                fontSize: 13,
                color: matchCount === 0 ? 'rgba(55, 53, 47, 0.25)' : 'rgba(55, 53, 47, 0.5)',
                padding: '4px 8px',
                borderRadius: 4,
              }}
            >
              替换全部
            </button>
            <button
              type="button"
              onClick={doReplace}
              disabled={matchCount === 0}
              style={{
                border: 'none',
                background: matchCount === 0 ? 'rgba(46, 170, 220, 0.5)' : '#2eaadc',
                cursor: matchCount === 0 ? 'default' : 'pointer',
                fontSize: 13,
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              替换
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Icon buttons & SVGs (matching Notion's icon set) ----

function IconButton({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const style: React.CSSProperties = {
    ...ICON_BTN_BASE,
    color: active ? '#2eaadc' : disabled ? 'rgba(55, 53, 47, 0.25)' : ICON_BTN_BASE.color,
    cursor: disabled ? 'default' : 'pointer',
    ...(hover && !disabled ? ICON_BTN_HOVER : {}),
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

const SVG_PROPS: React.SVGProps<SVGSVGElement> = {
  viewBox: '0 0 16 16',
  style: { width: 16, height: 16, fill: 'currentColor', display: 'block' },
  'aria-hidden': true,
};

function ArrowUpIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M8.442 2.308a.625.625 0 0 0-.884 0l-4.32 4.32a.625.625 0 0 0 .884.884l3.253-3.253v9.017c0 .334.283.599.625.599a.61.61 0 0 0 .625-.599V4.26l3.253 3.253a.625.625 0 0 0 .884-.884z" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M8 2.125a.61.61 0 0 0-.625.599v9.017L4.122 8.488a.625.625 0 1 0-.884.884l4.32 4.32c.244.244.64.244.884 0l4.32-4.32a.625.625 0 0 0-.884-.884l-3.253 3.253V2.724A.61.61 0 0 0 8 2.125" />
    </svg>
  );
}

function ReplaceIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M8.708 1.978a.625.625 0 0 0-.884.884l.914.913H3.84c-1.14 0-2.065.925-2.065 2.065v4.78a.625.625 0 0 0 1.25 0V5.84c0-.45.365-.815.815-.815h4.898l-.914.913a.625.625 0 0 0 .884.884l1.98-1.98a.625.625 0 0 0 0-.884zM13.6 4.755a.625.625 0 0 0-.625.625v4.78c0 .45-.365.815-.815.815H7.263l.913-.913a.625.625 0 0 0-.884-.884l-1.98 1.98a.625.625 0 0 0 0 .884l1.98 1.98a.625.625 0 1 0 .884-.884l-.913-.913h4.897c1.14 0 2.065-.924 2.065-2.065V5.38a.625.625 0 0 0-.625-.625" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M12.642 3.358a.625.625 0 0 0-.884 0L8 7.116 4.242 3.358a.625.625 0 1 0-.884.884L7.116 8l-3.758 3.758a.625.625 0 0 0 .884.884L8 8.884l3.758 3.758a.625.625 0 1 0 .884-.884L8.884 8l3.758-3.758a.625.625 0 0 0 0-.884" />
    </svg>
  );
}
