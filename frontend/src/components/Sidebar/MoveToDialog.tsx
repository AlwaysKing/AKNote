import { useState, useRef, useMemo } from 'react';
import { FileText, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import { Page } from '../../api/pages';

interface MoveToDialogProps {
  pageId: number;
  pageTree: Page[];
  onClose: () => void;
  onMove: (targetParentId: number | null) => void;
  position?: { top: number; left: number };
}

// Recursively collect IDs of a page and all its descendants
function collectDescendantIds(page: Page): number[] {
  const ids = [page.id];
  if (page.children) {
    for (const child of page.children) {
      ids.push(...collectDescendantIds(child));
    }
  }
  return ids;
}

function findPageById(pages: Page[], id: number): Page | null {
  for (const p of pages) {
    if (p.id === id) return p;
    if (p.children) {
      const found = findPageById(p.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getChildrenOf(tree: Page[], parentId: number | null): Page[] {
  if (parentId === null) return tree;
  const parent = findPageById(tree, parentId);
  return parent?.children || [];
}

function searchAllPages(pages: Page[], query: string, excludedIds: Set<number>): Page[] {
  const results: Page[] = [];
  const q = query.toLowerCase();
  for (const p of pages) {
    if (!excludedIds.has(p.id) && (p.title || '未命名页面').toLowerCase().includes(q)) {
      results.push(p);
    }
    if (p.children) {
      results.push(...searchAllPages(p.children, query, excludedIds));
    }
  }
  return results;
}

export default function MoveToDialog({ pageId, pageTree, onClose, onMove, position }: MoveToDialogProps) {
  const [search, setSearch] = useState('');
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: number; title: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Collect excluded IDs (self + descendants)
  const excludedIds = useMemo(() => {
    const ids = new Set<number>();
    function findAndCollect(pages: Page[], targetId: number): boolean {
      for (const p of pages) {
        if (p.id === targetId) {
          ids.add(...collectDescendantIds(p));
          return true;
        }
        if (p.children && findAndCollect(p.children, targetId)) return true;
      }
      return false;
    }
    findAndCollect(pageTree, pageId);
    return ids;
  }, [pageTree, pageId]);

  const currentChildren = useMemo(() =>
    getChildrenOf(pageTree, currentParentId).filter(p => !excludedIds.has(p.id)),
    [pageTree, currentParentId, excludedIds]
  );

  const searchResults = useMemo(() =>
    search ? searchAllPages(pageTree, search, excludedIds) : [],
    [pageTree, search, excludedIds]
  );

  const visiblePages = search ? searchResults : currentChildren;

  // Calculate position with viewport clamping
  const dialogStyle: React.CSSProperties = position
    ? { position: 'fixed', top: position.top, left: position.left, zIndex: 50 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 };

  if (position) {
    const dialogWidth = 380;
    const dialogHeight = 400;
    let top = position.top;
    let left = position.left;
    if (left + dialogWidth > window.innerWidth - 8) left = window.innerWidth - dialogWidth - 8;
    if (left < 8) left = 8;
    if (top + dialogHeight > window.innerHeight - 8) top = window.innerHeight - dialogHeight - 8;
    if (top < 8) top = 8;
    dialogStyle.top = top;
    dialogStyle.left = left;
  }

  const navigateInto = (page: Page) => {
    setBreadcrumb(prev => [...prev, { id: page.id, title: page.title || '未命名页面' }]);
    setCurrentParentId(page.id);
    setSearch('');
  };

  const navigateBack = () => {
    const newBreadcrumb = [...breadcrumb];
    newBreadcrumb.pop();
    const lastItem = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null;
    setCurrentParentId(lastItem?.id ?? null);
    setBreadcrumb(newBreadcrumb);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setBreadcrumb([]);
      setCurrentParentId(null);
    } else {
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setCurrentParentId(breadcrumb[index].id);
      setBreadcrumb(newBreadcrumb);
    }
    setSearch('');
  };

  const handlePageClick = (page: Page) => {
    const hasNavigableChildren = page.children && page.children.length > 0 &&
      page.children.some(c => !excludedIds.has(c.id));

    if (hasNavigableChildren && !search) {
      navigateInto(page);
    } else {
      onMove(page.id);
    }
  };

  const renderIcon = (icon?: string) => {
    if (icon) {
      if (icon.startsWith('/') || icon.startsWith('http')) {
        return <img src={icon} alt="" className="w-[16px] h-[16px] object-contain" />;
      }
      return <span className="text-[16px] leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' }}>{icon}</span>;
    }
    return <FileText className="w-[16px] h-[16px] text-notion-textSecondary" strokeWidth={1.7} />;
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div style={dialogStyle} className="bg-white rounded-xl shadow-2xl border border-notion-border w-[380px] max-h-[400px] flex flex-col overflow-hidden">
        {/* Search input */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-notion-bg rounded-md border border-transparent focus-within:border-blue-400">
            {breadcrumb.length > 0 && !search && (
              <button onClick={navigateBack} className="flex-shrink-0 p-0.5 hover:bg-notion-hover rounded">
                <ArrowLeft className="w-3.5 h-3.5 text-notion-textSecondary" />
              </button>
            )}
            <Search className="w-3.5 h-3.5 text-notion-textSecondary flex-shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="将页面移至..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-notion-textSecondary"
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              autoFocus
            />
          </div>
        </div>

        {/* Breadcrumb */}
        {breadcrumb.length > 0 && !search && (
          <div className="px-4 py-1 flex items-center gap-1 text-xs text-notion-textSecondary overflow-hidden">
            <button onClick={() => navigateToBreadcrumb(-1)} className="hover:text-notion-text hover:underline flex-shrink-0">根目录</button>
            {breadcrumb.map((item, i) => (
              <span key={item.id} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-notion-border">/</span>
                {i < breadcrumb.length - 1 ? (
                  <button onClick={() => navigateToBreadcrumb(i)} className="hover:text-notion-text hover:underline">{item.title}</button>
                ) : (
                  <span className="text-notion-text font-medium">{item.title}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Section label */}
        <div className="px-4 py-1">
          <span className="text-xs font-medium text-notion-textSecondary">
            {search ? '搜索结果' : '建议'}
          </span>
        </div>

        {/* Page list */}
        <div className="flex-1 overflow-y-auto py-0.5 px-1.5 min-h-0">
          {/* Move here option (when navigated into a page) */}
          {currentParentId !== null && !search && (
            <button
              onClick={() => onMove(currentParentId)}
              className="w-full flex items-center h-[32px] rounded-md hover:bg-notion-hover transition-colors text-left px-2"
            >
              <span className="text-sm text-blue-500">移到此处</span>
            </button>
          )}

          {visiblePages.length === 0 ? (
            <div className="text-sm text-notion-textSecondary px-3 py-4 text-center">
              {search ? '没有找到匹配的页面' : '没有子页面'}
            </div>
          ) : (
            visiblePages.map((page) => {
              const hasNavigableChildren = page.children && page.children.length > 0 &&
                page.children.some(c => !excludedIds.has(c.id));
              return (
                <button
                  key={page.id}
                  onClick={() => handlePageClick(page)}
                  className="w-full flex items-center h-[32px] rounded-md hover:bg-notion-hover transition-colors text-left px-2 group"
                >
                  <span className="flex items-center justify-center flex-shrink-0 mr-2" style={{ width: '20px', height: '18px' }}>
                    {renderIcon(page.icon)}
                  </span>
                  <span className="text-sm text-notion-text truncate flex-1">{page.title || '未命名页面'}</span>
                  {hasNavigableChildren && !search && (
                    <ChevronRight className="w-3.5 h-3.5 text-notion-textSecondary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Root level option */}
        {!search && (
          <div className="border-t border-notion-border/60 px-2 py-1">
            <button
              onClick={() => onMove(null)}
              className="w-full flex items-center h-[30px] rounded-md hover:bg-notion-hover transition-colors text-sm text-notion-textSecondary justify-center"
            >
              移到根目录
            </button>
          </div>
        )}
      </div>
    </>
  );
}
