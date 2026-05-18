/**
 * 共享拖拽状态：在 Editor Block 拖拽和 Sidebar 放置之间传递 block 数据。
 * 使用模块级变量而非 React state，因为 editor 和 sidebar 在不同的 React 树中。
 */

import { useSpaceStore } from '../../stores/spaceStore';
import { pagesApi, Page } from '../../api/pages';

export interface BlockDragBlock {
  type: string;
  props: Record<string, any>;
  content: any;
  children: any;
}

export interface BlockDragData {
  blocks: BlockDragBlock[];
  blockIds: string[];
}

let dragData: { data: BlockDragData; handled: boolean } | null = null;

/** 设置当前拖拽的 block 数据 */
export function setBlockDragData(data: BlockDragData): void {
  dragData = { data, handled: false };
}

/** 获取当前拖拽的 block 数据 */
export function getBlockDragData(): BlockDragData | null {
  return dragData?.data || null;
}

/** 标记 drop 已被侧边栏处理 */
export function markDragHandled(): void {
  if (dragData) dragData.handled = true;
}

/** 检查 drop 是否已被处理 */
export function isDragHandled(): boolean {
  return dragData?.handled === true;
}

/** 清理拖拽状态 */
export function clearBlockDragData(): void {
  dragData = null;
}

/**
 * 从 block 数组中提取页面标题。
 * 规则：取第一个 block 的纯文本内容，截取前 100 字符。
 */
export function extractTitleFromBlocks(blocks: BlockDragBlock[]): string {
  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      const text = block.content
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item.text) return item.text;
          if (item.type === 'text' && typeof item.text === 'string') return item.text;
          return '';
        })
        .join('')
        .trim();
      if (text) return text.substring(0, 100);
    }
  }
  return '未命名页面';
}

// ─── Subpage Order Sync ───────────────────────────────────

/** 在 pageTree 中查找指定页面 */
export function findPageInTree(pages: Page[], pageId: string): Page | null {
  for (const page of pages) {
    if (page.id === pageId) return page;
    if (page.children) {
      const found = findPageInTree(page.children, pageId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 编辑器内拖拽结束后，检查 subpage block 顺序是否变化。
 * 如果变化，调用 move API 同步到后端，刷新侧边栏。
 */
export async function syncSubpageOrderToBackend(editor: any): Promise<void> {
  // 从编辑器文档中提取所有 subpage block 的 pageId
  const subpageBlocks = editor.document.filter(
    (b: any) => b.type === 'subpage' && b.props?.pageId,
  );
  if (subpageBlocks.length < 2) return; // 不足 2 个无法重排

  const currentPageId = window.location.pathname.match(/\/p\/([^/]+)$/)?.[1];
  if (!currentPageId) return;

  const { currentSpace, pageTree } = useSpaceStore.getState();
  if (!currentSpace) return;

  // 从 pageTree 获取当前页面的子页面顺序
  const currentPage = findPageInTree(pageTree, currentPageId);
  if (!currentPage?.children || currentPage.children.length < 2) return;

  const treeOrder = currentPage.children.map((c: Page) => c.id);
  const editorOrder = subpageBlocks.map((b: any) => b.props.pageId);

  // 比较顺序（只比较两边都存在的 ID）
  const commonTree = treeOrder.filter((id: string) => editorOrder.includes(id));
  const commonEditor = editorOrder.filter((id: string) => treeOrder.includes(id));
  if (JSON.stringify(commonTree) === JSON.stringify(commonEditor)) return;

  // 顺序不同 → 调用 move API 同步
  const slug = currentSpace.slug;
  for (let i = 0; i < commonEditor.length; i++) {
    const pageId = commonEditor[i];
    const afterId = i > 0 ? commonEditor[i - 1] : null;

    // 检查 tree 中该 page 的前驱是否一致
    const treeIdx = commonTree.indexOf(pageId);
    const treeAfterId = treeIdx > 0 ? commonTree[treeIdx - 1] : null;

    if (afterId !== treeAfterId) {
      try {
        await pagesApi.move(slug, pageId, currentPageId, afterId);
      } catch (err) {
        console.error('[syncSubpageOrder] move failed:', err);
      }
    }
  }

  // 刷新侧边栏
  useSpaceStore.getState().refreshAll();
}
