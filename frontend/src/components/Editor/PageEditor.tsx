import { useEffect, useState, useCallback, useRef } from 'react';
import { BlockNoteViewRaw, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteEditor } from '@blocknote/core';
import '@blocknote/react/style.css';
import { markdownToBlocks, blocksToMarkdown } from '../../utils/markdown';

interface PageEditorProps {
  initialContent: string;
  onSave: (content: string) => void | Promise<void>;
  readOnly?: boolean;
}

export function PageEditor({ initialContent, onSave, readOnly = false }: PageEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<HTMLDivElement>(null);

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: markdownToBlocks(initialContent),
  });

  const triggerSave = useCallback(async () => {
    if (!hasChanges || isSaving || readOnly) return;

    setIsSaving(true);
    try {
      const currentBlocks = editor.document;
      const markdown = blocksToMarkdown(currentBlocks);
      await onSave(markdown);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, hasChanges, isSaving, onSave, readOnly]);

  const handleChange = useCallback(() => {
    setHasChanges(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      triggerSave();
    }, 2000);
  }, [triggerSave]);

  // Block selection: click on empty space or use Escape to deselect
  useEffect(() => {
    const container = editorRef.current;
    if (!container || readOnly) return;

    const handleClick = (e: MouseEvent) => {
      // Clear any existing block selections
      const existing = container.querySelectorAll('.block-selected');
      existing.forEach(el => el.classList.remove('block-selected'));

      // Find the clicked block
      const target = (e.target as HTMLElement).closest('.bn-block-outer');
      if (target) {
        // Only select if clicked on the block's empty area (not on content)
        const contentEl = (e.target as HTMLElement).closest('.bn-block-content, .bn-inline-content, [contenteditable]');
        if (!contentEl) {
          e.preventDefault();
          target.classList.add('block-selected');
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const existing = container.querySelectorAll('.block-selected');
        existing.forEach(el => el.classList.remove('block-selected'));
      }
    };

    container.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [readOnly]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (hasChanges && !readOnly) {
        triggerSave();
      }
    };
  }, [hasChanges, readOnly, triggerSave]);

  return (
    <div className="relative" ref={editorRef}>
      {(hasChanges || isSaving) && (
        <div className="fixed top-4 right-4 z-50 bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-200 text-sm">
          {isSaving ? (
            <span className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600" />
              保存中...
            </span>
          ) : (
            <span className="text-gray-500">未保存的更改...</span>
          )}
        </div>
      )}

      <div className="w-full">
        <BlockNoteViewRaw
          editor={editor}
          editable={!readOnly}
          onChange={handleChange}
          theme="light"
          slashMenu={true}
          sideMenu={true}
          formattingToolbar={true}
          linkToolbar={true}
        />
      </div>
    </div>
  );
}

export default PageEditor;
