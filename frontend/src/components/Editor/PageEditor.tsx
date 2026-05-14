import { useEffect, useState, useCallback, useRef } from 'react';
import { BlockNoteViewRaw, useCreateBlockNote, ComponentsContext } from '@blocknote/react';
import { BlockNoteEditor } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import '@blocknote/react/style.css';
import { markdownToBlocks, blocksToMarkdown } from '../../utils/markdown';
import { blockNoteComponents, clearBlockSelection } from './BlockNoteComponents';

// Override zh dictionary: reorganize groups + rename toggle headings
const customZh = {
  ...zh,
  slash_menu: {
    ...zh.slash_menu,
    // 基础区块 — headings + toggle headings
    heading: { ...zh.slash_menu.heading, group: '基础区块' },
    heading_2: { ...zh.slash_menu.heading_2, group: '基础区块' },
    heading_3: { ...zh.slash_menu.heading_3, group: '基础区块' },
    heading_4: { ...zh.slash_menu.heading_4, group: '基础区块' },
    heading_5: { ...zh.slash_menu.heading_5, group: '基础区块' },
    heading_6: { ...zh.slash_menu.heading_6, group: '基础区块' },
    toggle_heading: { ...zh.slash_menu.toggle_heading, group: '基础区块', title: '一级折叠标题' },
    toggle_heading_2: { ...zh.slash_menu.toggle_heading_2, group: '基础区块', title: '二级折叠标题' },
    toggle_heading_3: { ...zh.slash_menu.toggle_heading_3, group: '基础区块', title: '三级折叠标题' },
    // 高级区块 — code, quote, divider, table
    quote: { ...zh.slash_menu.quote, group: '高级区块' },
    code_block: { ...zh.slash_menu.code_block, group: '高级区块' },
    divider: { ...zh.slash_menu.divider, group: '高级区块' },
    table: { ...zh.slash_menu.table, group: '高级区块' },
    // 列表 — toggle, numbered, bullet, check, paragraph
    toggle_list: { ...zh.slash_menu.toggle_list, group: '列表' },
    numbered_list: { ...zh.slash_menu.numbered_list, group: '列表' },
    bullet_list: { ...zh.slash_menu.bullet_list, group: '列表' },
    check_list: { ...zh.slash_menu.check_list, group: '列表' },
    paragraph: { ...zh.slash_menu.paragraph, group: '列表' },
    // 媒体 and 其他 keep original groups
  },
};

interface PageEditorProps {
  initialContent: string;
  onSave: (content: string) => void | Promise<void>;
  onSyncStatusChange?: (status: 'syncing' | 'synced') => void;
  readOnly?: boolean;
}

export function PageEditor({ initialContent, onSave, onSyncStatusChange, readOnly = false }: PageEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<HTMLDivElement>(null);

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: markdownToBlocks(initialContent),
    dictionary: customZh as any,
  });

  const triggerSave = useCallback(async () => {
    if (!hasChanges || isSaving || readOnly) return;

    setIsSaving(true);
    onSyncStatusChange?.('syncing');
    try {
      const currentBlocks = editor.document;
      const markdown = blocksToMarkdown(currentBlocks);
      await onSave(markdown);
      setHasChanges(false);
      onSyncStatusChange?.('synced');
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearBlockSelection();
      }
    };

    container.addEventListener('click', () => clearBlockSelection());
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('click', () => clearBlockSelection());
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
      <ComponentsContext.Provider value={blockNoteComponents}>
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
      </ComponentsContext.Provider>
    </div>
  );
}

export default PageEditor;
