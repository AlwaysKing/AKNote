/**
 * 共享拖拽状态：在 Editor Block 拖拽和 Sidebar 放置之间传递 block 数据。
 * 使用模块级变量而非 React state，因为 editor 和 sidebar 在不同的 React 树中。
 */

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
