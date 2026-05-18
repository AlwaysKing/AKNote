/**
 * BlockDropOverlay — 检测 editor block 拖拽到侧边栏文档树时的放置操作。
 *
 * 使用原生 HTML5 Drag Events（非 @dnd-kit），与侧边栏的 @dnd-kit 页面拖拽共存。
 * 当检测到 block drag 进入侧边栏区域时，显示蓝色放置指示器（同 @dnd-kit 风格），
 * 并在 drop 时执行 block → 页面/内容的转换。
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSpaceStore } from '../../stores/spaceStore';
import { pagesApi, Page } from '../../api/pages';
import { blocksToMarkdown } from '../../utils/markdown';
import { getBlockDragData, markDragHandled, BlockDragBlock, BlockDragData } from '../Editor/blockDragState';

// ─── Helpers ────────────────────────────────────────────

/** 递归在 page tree 中查找 page 及其父级 children 数组 */
function findPageInTree(pages: Page[], pageId: string): { page: Page; parentChildren: Page[]; index: number } | null {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].id === pageId) {
      return { page: pages[i], parentChildren: pages, index: i };
    }
    if (pages[i].children) {
      const result = findPageInTree(pages[i].children!, pageId);
      if (result) return result;
    }
  }
  return null;
}

/** 获取某页面的父级 ID（null 表示根级） */
function findParentId(pages: Page[], pageId: string, parentId: string | null = null): string | null {
  for (const p of pages) {
    if (p.id === pageId) return parentId;
    if (p.children) {
      const result = findParentId(p.children, pageId, p.id);
      if (result !== null) return result;
    }
  }
  return null;
}

/** 从 cursor 位置查找最近的 page row 元素 */
function findDropTarget(clientX: number, clientY: number): { pageId: string; rect: DOMRect; level: number } | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;

  // Primary: cursor directly on a page row
  const pageRow = (el as HTMLElement).closest('[data-page-row]') as HTMLElement | null;
  if (pageRow) {
    const sortable = pageRow.closest('[data-sortable-id]');
    const pageId = sortable?.getAttribute('data-sortable-id');
    const style = window.getComputedStyle(pageRow);
    const paddingLeft = parseInt(style.paddingLeft) || 0;
    const level = Math.floor((paddingLeft - 8) / 16);
    if (pageId) return { pageId, rect: pageRow.getBoundingClientRect(), level };
  }

  // Fallback: cursor is inside a sortable container but not on a row
  // (e.g. in the gap between rows, on "内无页面" placeholder, or below all children).
  // [data-page-row] is a sibling of the children area, so closest() won't find it
  // going upward — we need to find the sortable container first, then get its row.
  const sortable = (el as HTMLElement).closest('[data-sortable-id]') as HTMLElement | null;
  if (sortable) {
    const pageId = sortable.getAttribute('data-sortable-id');
    const row = sortable.querySelector('[data-page-row]') as HTMLElement | null;
    if (pageId && row) {
      const style = window.getComputedStyle(row);
      const paddingLeft = parseInt(style.paddingLeft) || 0;
      const level = Math.floor((paddingLeft - 8) / 16);
      return { pageId, rect: row.getBoundingClientRect(), level };
    }
  }

  return null;
}

/** 判断放置位置：before/on/after（同 @dnd-kit 的 25%/50%/25% 分区） */
function getDropPosition(rect: DOMRect, clientY: number): 'before' | 'on' | 'after' {
  const relativeY = clientY - rect.top;
  if (relativeY < rect.height * 0.25) return 'before';
  if (relativeY > rect.height * 0.75) return 'after';
  return 'on';
}

/** 检查 DragEvent 是否来自 editor block
 *
 *  注：BlockNote 的 blockDragStart 会调用 dataTransfer.clearData() 清除所有自定义类型，
 *  因此不能仅依赖 dataTransfer.types。这里优先检查模块级共享状态 getBlockDragData()，
 *  该状态在 dragstart 时由 handleNativeDragStart 写入，贯穿整个拖拽生命周期。
 */
function isBlockDrag(e: DragEvent): boolean {
  // Primary: 模块级状态（不会被 BlockNote 的 clearData() 影响）
  const data = getBlockDragData();
  if (data && data.blocks.length > 0) return true;
  // Fallback: dataTransfer 自定义类型
  return e.dataTransfer?.types.includes('application/x-blocknote-block') ?? false;
}

// ─── Component ──────────────────────────────────────────

interface DropTarget {
  pageId: string;
  rect: DOMRect;
  position: 'before' | 'on' | 'after';
  level: number;
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function BlockDropOverlay({ containerRef }: Props) {
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const dropTargetRef = useRef<DropTarget | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragEnter = (e: DragEvent) => {
      if (isBlockDrag(e)) {
        setIsDragActive(true);
        // 隐藏编辑器中的 BlockNote drop indicator，避免同时显示两处放置提示
        document.body.classList.add('sidebar-block-drag-active');
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!isBlockDrag(e)) return;
      e.preventDefault(); // 允许 drop

      let target = findDropTarget(e.clientX, e.clientY);
      if (target) {
        let position = getDropPosition(target.rect, e.clientY);

        // Redirect: 'after' on an expanded parent → 'before' first child.
        // Same logic as @dnd-kit's closestRowCenter (PageTree.tsx L93-113).
        // When a parent has visible children, "after parent" should feel like
        // "before first child" — indicator shows near cursor, no gap.
        if (position === 'after') {
          const sortableEl = document.querySelector(
            `[data-sortable-id="${target.pageId}"]`
          );
          const childRows = sortableEl?.querySelectorAll('[data-page-row]') ?? [];
          if (childRows.length > 1) {
            // [0] = parent row, [1] = first child row
            const firstChildRow = childRows[1] as HTMLElement;
            const childSortable = firstChildRow.closest('[data-sortable-id]');
            const childId = childSortable?.getAttribute('data-sortable-id');
            if (childId) {
              const childRect = firstChildRow.getBoundingClientRect();
              const style = window.getComputedStyle(firstChildRow);
              const paddingLeft = parseInt(style.paddingLeft) || 0;
              const childLevel = Math.floor((paddingLeft - 8) / 16);
              target = { pageId: childId, rect: childRect, level: childLevel };
              position = 'before';
            }
          }
        }

        // X-based ancestor resolution for 'after':
        // When cursor is at the bottom of a nested subtree, multiple ancestors'
        // "after" zones overlap at the same Y. Use X coordinate to disambiguate.
        // IMPORTANT: only ancestors whose subtree actually ends here are valid.
        // e.g. 测试 > a > b > c, with 测试 also having other children below:
        //   c's bottom is the bottom of subtree (a > b > c), but NOT 测试's bottom.
        //   X resolution should only go up to "a", not "测试".
        if (position === 'after' && target.level > 0) {
          // 1. Find the shallowest valid ancestor (minValidLevel)
          //    by walking up and checking if each ancestor's last row matches target's bottom.
          let minValidLevel = target.level;
          let walkSortable = document.querySelector(
            `[data-sortable-id="${target.pageId}"]`
          );
          const targetBottom = Math.round(target.rect.bottom);

          while (walkSortable) {
            const parentSortable = walkSortable.parentElement?.closest('[data-sortable-id]');
            if (!parentSortable) break;

            const parentRows = parentSortable.querySelectorAll('[data-page-row]');
            const parentLastBottom = Math.round(
              parentRows[parentRows.length - 1].getBoundingClientRect().bottom
            );

            if (parentLastBottom !== targetBottom) {
              // Parent's subtree extends beyond target → not valid, stop
              break;
            }

            // Parent's subtree ends at same Y → valid ancestor
            const parentRow = parentSortable.querySelector('[data-page-row]') as HTMLElement;
            const parentStyle = window.getComputedStyle(parentRow);
            const parentPL = parseInt(parentStyle.paddingLeft) || 0;
            minValidLevel = Math.floor((parentPL - 8) / 16);

            walkSortable = parentSortable;
          }

          // 2. Compute effective level from X, clamped to valid range
          const effectiveLevel = Math.max(
            minValidLevel,
            Math.min(
              target.level,
              Math.floor((e.clientX - target.rect.left - 8) / 16)
            )
          );

          // 3. Walk up to the resolved level
          if (effectiveLevel < target.level) {
            let currentSortable = document.querySelector(
              `[data-sortable-id="${target.pageId}"]`
            );
            let currentLevel = target.level;

            while (currentSortable && currentLevel > effectiveLevel) {
              const parentSortable = currentSortable.parentElement?.closest('[data-sortable-id]');
              if (!parentSortable) break;
              currentSortable = parentSortable;
              currentLevel--;
            }

            const resolvedId = currentSortable?.getAttribute('data-sortable-id');
            const resolvedRow = currentSortable?.querySelector('[data-page-row]') as HTMLElement | null;
            if (resolvedId && resolvedRow) {
              const resolvedRect = resolvedRow.getBoundingClientRect();
              const style = window.getComputedStyle(resolvedRow);
              const paddingLeft = parseInt(style.paddingLeft) || 0;
              const resolvedLevel = Math.floor((paddingLeft - 8) / 16);
              target = { pageId: resolvedId, rect: resolvedRect, level: resolvedLevel };
            }
          }
        }

        const dropInfo = { ...target, position };
        dropTargetRef.current = dropInfo;
        setDropTarget(dropInfo);
      } else {
        dropTargetRef.current = null;
        setDropTarget(null);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // 仅当真正离开容器时重置
      if (!container.contains(e.relatedTarget as Node)) {
        setIsDragActive(false);
        setDropTarget(null);
        dropTargetRef.current = null;
        // 恢复编辑器中的 BlockNote drop indicator
        document.body.classList.remove('sidebar-block-drag-active');
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (!isBlockDrag(e)) return;

      const target = dropTargetRef.current;
      if (!target) {
        setIsDragActive(false);
        document.body.classList.remove('sidebar-block-drag-active');
        return;
      }

      // ★ 同步保存 dragData 并标记 handled，防止 dragend 竞态清空模块状态。
      // drop 和 dragend 事件几乎同时触发，若 markDragHandled 在 await 之后才调用，
      // dragend 中的 isDragHandled() 会返回 false 导致 block 不被删除。
      const savedDragData = getBlockDragData();
      if (!savedDragData || !savedDragData.blocks.length) {
        setIsDragActive(false);
        setDropTarget(null);
        dropTargetRef.current = null;
        document.body.classList.remove('sidebar-block-drag-active');
        return;
      }
      markDragHandled();

      setIsDragActive(false);
      setDropTarget(null);
      dropTargetRef.current = null;
      document.body.classList.remove('sidebar-block-drag-active');

      try {
        await handleBlockDrop(target, savedDragData);
      } catch (err) {
        console.error('BlockDropOverlay: drop failed', err);
      }
    };

    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragenter', handleDragEnter);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [containerRef]);

  if (!isDragActive || !dropTarget) return null;

  return <DropIndicator target={dropTarget} />;
}

// ─── Visual Indicator ───────────────────────────────────

function DropIndicator({ target }: { target: DropTarget }) {
  const { rect, position, level } = target;
  const leftOffset = Math.max(level * 16 + 8, 0);

  if (position === 'on') {
    // For expanded parents: highlight covers the entire area (parent row + all children),
    // matching @dnd-kit's behavior where the wrapper div (containing children) is highlighted.
    let highlightTop = rect.top;
    let highlightHeight = rect.height;
    const sortableEl = document.querySelector(`[data-sortable-id="${target.pageId}"]`);
    const allRows = sortableEl?.querySelectorAll('[data-page-row]') ?? [];
    if (allRows.length > 1) {
      const lastRect = allRows[allRows.length - 1].getBoundingClientRect();
      highlightHeight = lastRect.bottom - rect.top;
    }

    return createPortal(
      <div
        className="block-drop-indicator-on"
        style={{
          position: 'fixed',
          top: highlightTop,
          left: rect.left,
          width: rect.width,
          height: highlightHeight,
          backgroundColor: 'rgba(35, 131, 226, 0.08)',
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />,
      document.body,
    );
  }

  // For 'after' on an expanded parent: show line at the bottom of the last visible child,
  // not at the parent's own row bottom. This matches Notion behavior and avoids the
  // "two positions" confusion when children are visible below the parent.
  let adjustedTop: number;
  if (position === 'before') {
    adjustedTop = rect.top - 1;
  } else {
    // Check if the target has visible children
    const sortableEl = document.querySelector(`[data-sortable-id="${target.pageId}"]`);
    const childRows = sortableEl?.querySelectorAll('[data-page-row]') ?? [];
    if (childRows.length > 1) {
      // Has visible children — use last child's bottom
      const lastChildRect = childRows[childRows.length - 1].getBoundingClientRect();
      adjustedTop = lastChildRect.bottom - 1;
    } else {
      adjustedTop = rect.bottom - 1;
    }
  }
  return createPortal(
    <div
      className="block-drop-indicator-line"
      style={{
        position: 'fixed',
        top: adjustedTop,
        left: rect.left + leftOffset,
        width: Math.max(rect.width - leftOffset, 0),
        height: 2,
        backgroundColor: 'rgb(35, 131, 226)',
        opacity: 0.5,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />,
    document.body,
  );
}

// ─── Drop Logic ──────────────────────────────────────────

/**
 * Subpage block 拖到侧边栏 → 调用 move API 执行真正的页面移动。
 * 逻辑与 PageTree.tsx 的 handleDragEnd 一致：
 *   'on'     → 成为 target 的子页面
 *   'after'  → 移到 target 同级后面
 *   'before' → 移到 target 同级前面
 */
async function moveSubpagesToSidebar(
  slug: string,
  target: DropTarget,
  blocks: BlockDragBlock[],
  pageTree: Page[],
) {
  let toParentId: string | null;
  let toAfterId: string | null;

  if (target.position === 'on') {
    toParentId = target.pageId;
    toAfterId = null;
  } else {
    toParentId = findParentId(pageTree, target.pageId);
    if (target.position === 'after') {
      toAfterId = target.pageId;
    } else {
      // 'before': 找到 target 前面的兄弟
      const found = findPageInTree(pageTree, target.pageId);
      if (found && found.index > 0) {
        toAfterId = found.parentChildren[found.index - 1].id;
      } else {
        toAfterId = null;
      }
    }
  }

  for (const block of blocks) {
    const pageId = block.props.pageId as string;
    if (!pageId) continue;

    try {
      await pagesApi.move(slug, pageId, toParentId, toAfterId);
      // 下一个 subpage 接在这个后面
      toAfterId = pageId;
    } catch (err) {
      console.error('[BlockDropOverlay] Failed to move subpage:', err);
    }
  }
}

async function handleBlockDrop(target: DropTarget, dragData: BlockDragData) {
  const { currentSpace, pageTree } = useSpaceStore.getState();
  if (!currentSpace) return;

  const slug = currentSpace.slug;

  // ① 分离 subpage block 和内容 block
  const subpageBlocks = dragData.blocks.filter(
    (b) => b.type === 'subpage' && b.props?.pageId,
  );
  const contentBlocks = dragData.blocks.filter((b) => b.type !== 'subpage');

  // ② Subpage blocks → 使用 move API（真正的页面移动）
  if (subpageBlocks.length > 0 && pageTree) {
    await moveSubpagesToSidebar(slug, target, subpageBlocks, pageTree);
  }

  // ③ Content blocks → 插入 markdown 内容到目标页面（原有逻辑）
  if (contentBlocks.length > 0) {
    if (target.position === 'on') {
      const currentPageId = window.location.pathname.match(/\/p\/([^/]+)$/)?.[1];
      if (currentPageId && target.pageId === currentPageId) {
        // 同页面 drop：跳过
      } else {
        await appendBlockToPage(slug, target.pageId, contentBlocks);
      }
    } else {
      if (!pageTree) return;
      const parentId = findParentId(pageTree, target.pageId);
      const currentPageId = window.location.pathname.match(/\/p\/([^/]+)$/)?.[1];
      if (currentPageId && parentId === currentPageId) {
        // 同文档：跳过
      } else {
        await insertBlockIntoParent(slug, target, parentId, contentBlocks);
      }
    }
  }

  // 刷新页面树
  useSpaceStore.getState().refreshAll();
}

/** 将 block 内容追加到目标页面末尾 */
async function appendBlockToPage(slug: string, pageId: string, blocks: BlockDragBlock[]) {
  const markdown = blocksToMarkdown(blocks as any);

  try {
    const targetPage = await pagesApi.get(slug, pageId);
    const existingContent = targetPage.content || '';
    const newContent = existingContent
      ? existingContent.trimEnd() + '\n\n' + markdown
      : markdown;

    await pagesApi.update(slug, pageId, newContent);
  } catch (err) {
    console.error('Failed to append block to page:', err);
    throw err;
  }
}

/**
 * 将 block 内容插入到目标页面的父文档中，根据拖放位置决定插入到
 * 对应 subpage block 的前面或后面。
 *
 * 文档结构示例：
 *   a（父文档，包含 subpage block：<sub-page data-id="b"> <sub-page data-id="c">）
 *   ├── b（子页面）
 *   ├── c（子页面）
 *
 *   before b → 插入到 a 中 b 的 subpage 之前
 *   after  b → 插入到 a 中 b 的 subpage 之后（即 b、c 之间）
 *   after  c → 插入到 a 中 c 的 subpage 之后
 *
 * 边界情况：
 *  - 根级页面（无父级）→ 回退到 appendBlockToPage()
 *  - subpage 引用行在父文档中找不到（缓存过期）→ 回退追加到父文档末尾
 */
async function insertBlockIntoParent(
  slug: string,
  target: DropTarget,
  parentId: string | null,
  blocks: BlockDragBlock[],
) {
  const markdown = blocksToMarkdown(blocks as any);

  // 边界：根级页面无父级 → 回退到直接追加到该页面
  if (!parentId) {
    await appendBlockToPage(slug, target.pageId, blocks);
    return;
  }

  try {
    const parentPage = await pagesApi.get(slug, parentId);
    const existingContent = parentPage.content || '';
    const lines = existingContent.split('\n');

    // 在父文档中查找目标子页面的 subpage 引用行
    // 格式：<sub-page data-id="uuid32"></sub-page>
    const subpageRef = `<sub-page data-id="${target.pageId}"></sub-page>`;
    const subpageLineIdx = lines.findIndex((line) => line.trim() === subpageRef);

    // 边界：subpage 引用行找不到 → 回退追加到父文档末尾
    if (subpageLineIdx === -1) {
      console.warn(
        `[BlockDropOverlay] Subpage ref not found in parent "${parentId}", falling back to append`,
      );
      const newContent = existingContent
        ? existingContent.trimEnd() + '\n\n' + markdown
        : markdown;
      await pagesApi.update(slug, parentId, newContent);
      return;
    }

    // 计算插入点：
    //   before → 插入到 subpage 行之前（subpageLineIdx）
    //   after  → 插入到 subpage 行之后（subpageLineIdx + 1）
    const insertAt = target.position === 'before' ? subpageLineIdx : subpageLineIdx + 1;

    // 将 markdown 拆成行，处理空行间距
    let insertLines = markdown.split('\n');

    // 如果插入位置前一行非空，在前面补一个空行
    if (insertAt > 0 && lines[insertAt - 1] !== '') {
      insertLines.unshift('');
    }
    // 如果插入位置当前行非空，在后面补一个空行
    if (insertAt < lines.length && lines[insertAt] !== '') {
      insertLines.push('');
    }

    lines.splice(insertAt, 0, ...insertLines);
    const newContent = lines.join('\n');

    await pagesApi.update(slug, parentId, newContent);
  } catch (err) {
    console.error('[BlockDropOverlay] Failed to insert block into parent page:', err);
    throw err;
  }
}
