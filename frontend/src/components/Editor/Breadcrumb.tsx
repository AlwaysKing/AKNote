import { ChevronRight, ChevronDown, Menu, Landmark, FileText } from 'lucide-react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useSpaceStore } from '../../stores/spaceStore';
import { Page } from '../../api/pages';
import { useState, useRef, useEffect } from 'react';

interface BreadcrumbProps {
  pageTitle?: string;
  spaceSlug: string;
  actions?: React.ReactNode;
}

function TreeMenuItem({ page, level, spaceSlug, onClose }: { page: Page; level: number; spaceSlug: string; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = page.children && page.children.length > 0;
  const isActive = location.pathname.includes(`/p/${page.id}`);

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      navigate(`/s/${spaceSlug}/p/${page.id}`);
      onClose();
    }
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/s/${spaceSlug}/p/${page.id}`);
    onClose();
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center h-[30px] cursor-pointer rounded transition-colors text-left group ${
          isActive ? 'bg-notion-hover' : 'hover:bg-notion-hover'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px`, paddingRight: '8px' }}
      >
        <span className="flex items-center justify-center flex-shrink-0 mr-2" style={{ width: '22px', height: '18px' }}>
          {hasChildren ? (
            <ChevronRight className={`w-3 h-3 text-[#ada9a3] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          ) : page.icon ? (
            <span className="text-[18px] leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' }}>{page.icon}</span>
          ) : (
            <FileText className="w-[18px] h-[18px] text-[#91918e]" strokeWidth={1.7} />
          )}
        </span>
        <span
          onClick={handleNavigate}
          className={`text-sm font-medium truncate flex-1 cursor-pointer ${isActive ? 'text-notion-text' : 'text-notion-sidebarText'}`}
        >
          {page.title || '未命名页面'}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {page.children!.map(child => (
            <TreeMenuItem key={child.id} page={child} level={level + 1} spaceSlug={spaceSlug} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Breadcrumb({ pageTitle, spaceSlug, actions }: BreadcrumbProps) {
  const navigate = useNavigate();
  const { currentSpace, pageTree } = useSpaceStore();
  const { sidebarCollapsed, toggleSidebar } = useOutletContext<{ sidebarCollapsed: boolean; toggleSidebar: () => void }>();
  const [showPageTree, setShowPageTree] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!showPageTree) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPageTree(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPageTree]);

  return (
    <div className="flex items-center justify-between text-base text-notion-textSecondary h-11 px-4">
      <div className="flex items-center gap-1">
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="hover:bg-notion-hover p-1 rounded transition-colors mr-1"
          title="展开侧边栏"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowPageTree(!showPageTree)}
          className={`hover:bg-notion-hover px-1.5 py-0.5 rounded transition-colors flex items-center ${showPageTree ? 'bg-notion-hover' : ''}`}
        >
          {currentSpace?.icon ? <span className="mr-1">{currentSpace.icon}</span> : <Landmark className="w-4 h-4 mr-1 text-notion-textSecondary" />}
          {currentSpace?.name || 'Space'}
          <ChevronDown className="w-3 h-3 ml-1 text-notion-textSecondary" />
        </button>

        {showPageTree && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPageTree(false)} />
            <div className="absolute left-0 top-full mt-1 w-[280px] bg-white border border-notion-border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto scrollbar-thin py-1">
              {pageTree.length === 0 ? (
                <div className="text-sm text-notion-textSecondary px-3 py-2">暂无页面</div>
              ) : (
                pageTree.map(page => (
                  <TreeMenuItem key={page.id} page={page} level={0} spaceSlug={spaceSlug} onClose={() => setShowPageTree(false)} />
                ))
              )}
            </div>
          </>
        )}
      </div>
      {pageTitle && (
        <>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-notion-text px-1.5 py-0.5">{pageTitle}</span>
        </>
      )}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
