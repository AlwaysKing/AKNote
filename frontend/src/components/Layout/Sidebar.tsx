import { Settings, ChevronsLeft, Trash2, ArrowLeft, Users, Database, LogOut, User, Image, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import SpaceSelector from '../Sidebar/SpaceSelector';
import PageTree from '../Sidebar/PageTree';
import NewPageButton from '../Sidebar/NewPageButton';
import { useAuthStore } from '../../stores/authStore';
import { useSpaceStore } from '../../stores/spaceStore';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentSpace } = useSpaceStore();
  const isAdmin = location.pathname.startsWith('/admin');
  const isAdminRole = user?.role === 'admin';
  const adminTab = new URLSearchParams(location.search).get('tab') || (isAdminRole ? 'users' : 'profile');

  const handleAdminBack = () => {
    const slug = currentSpace?.slug || useSpaceStore.getState().spaces[0]?.slug;
    if (slug) {
      navigate(`/s/${slug}`);
    } else {
      navigate('/');
    }
  };

  // 管理面板侧边栏
  if (isAdmin) {
    return (
      <aside className="w-[270px] bg-notion-sidebarBg h-screen flex flex-col border-r border-notion-border flex-shrink-0">
        <div className="px-3 py-3 flex items-center gap-2">
          <button
            onClick={handleAdminBack}
            className="p-1 hover:bg-notion-hover rounded transition-colors flex-shrink-0"
            title="返回"
          >
            <ArrowLeft size={16} className="text-notion-textSecondary" />
          </button>
          <span className="text-sm font-medium text-notion-text">设置</span>
        </div>
        <div className="border-t border-notion-border/60 mx-2" />
        <nav className="px-2 py-2 space-y-0.5">
          {isAdminRole && (
            <>
              <button
                onClick={() => navigate('/admin?tab=users')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                  adminTab === 'users'
                    ? 'bg-notion-hover text-notion-text font-medium'
                    : 'text-notion-text hover:bg-notion-hover'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>用户管理</span>
              </button>
              <button
                onClick={() => navigate('/admin?tab=spaces')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                  adminTab === 'spaces'
                    ? 'bg-notion-hover text-notion-text font-medium'
                    : 'text-notion-text hover:bg-notion-hover'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>空间管理</span>
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/admin?tab=resources')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
              adminTab === 'resources'
                ? 'bg-notion-hover text-notion-text font-medium'
                : 'text-notion-text hover:bg-notion-hover'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>资源管理</span>
          </button>
          <button
            onClick={() => navigate('/admin?tab=profile')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
              adminTab === 'profile'
                ? 'bg-notion-hover text-notion-text font-medium'
                : 'text-notion-text hover:bg-notion-hover'
            }`}
          >
            <User className="w-4 h-4" />
            <span>个人设置</span>
          </button>
        </nav>
        <div className="mt-auto border-t border-notion-border/60 mx-2 pb-2">
          <button
            onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-notion-text hover:bg-notion-hover transition-colors mt-1"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>
    );
  }

  const { starredPages, recentPages } = useSpaceStore();
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setSectionsCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}天前`;
    return date.toLocaleDateString();
  };

  const SectionHeader = ({ title, sectionKey }: { title: string; sectionKey: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center h-[30px] px-2 rounded-md hover:bg-notion-hover transition-colors"
    >
      {sectionsCollapsed[sectionKey] ? (
        <ChevronRight className="w-3 h-3 text-notion-sidebarSecHeader mr-1" />
      ) : (
        <ChevronDown className="w-3 h-3 text-notion-sidebarSecHeader mr-1" />
      )}
      <span className="text-xs font-medium leading-none text-notion-sidebarSecHeader">{title}</span>
    </button>
  );

  const SimplePageItem = ({ page, suffix }: { page: { id: number; title: string; icon?: string; is_starred?: boolean; last_accessed_at?: string }; suffix?: string }) => (
    <div
      onClick={() => navigate(`/s/${currentSpace?.slug}/p/${page.id}`)}
      className="w-full flex items-center h-[30px] rounded-md hover:bg-notion-hover transition-colors text-left cursor-pointer group"
      style={{ paddingLeft: '16px', paddingRight: '8px' }}
    >
      <span className="flex items-center justify-center flex-shrink-0 mr-2 text-notion-sidebarText" style={{ width: '22px', height: '18px' }}>
        {page.icon ? (
          <span className="text-[18px] leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' }}>{page.icon}</span>
        ) : (
          <FileText className="w-[18px] h-[18px] text-[#91918e]" strokeWidth={1.7} />
        )}
      </span>
      <span className="text-sm font-medium text-notion-sidebarText truncate flex-1">{page.title || '未命名页面'}</span>
      {suffix && (
        <span className="text-xs text-notion-textSecondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {suffix}
        </span>
      )}
    </div>
  );

  return (
    <aside className="w-[270px] bg-notion-sidebarBg h-screen flex flex-col border-r border-notion-border flex-shrink-0">
      {/* Space selector header */}
      <div className="px-2 flex items-center h-11 gap-1">
        <span className="text-lg flex-shrink-0 pl-1">
          {user?.avatar_url || '👤'}
        </span>
        <div className="flex-1 min-w-0">
          <SpaceSelector />
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-notion-hover rounded transition-colors flex-shrink-0"
          title="Collapse sidebar"
        >
          <ChevronsLeft size={16} className="text-notion-textSecondary" />
        </button>
      </div>

      {/* Three sections: 最近 / 最爱 / 文档 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1">
        {/* 最近 */}
        {currentSpace && (
          <div className="mb-3">
            <SectionHeader title="最近" sectionKey="recent" />
            {!sectionsCollapsed['recent'] && (
              <div>
                {recentPages.length === 0 ? (
                  <div className="text-xs text-notion-textSecondary px-2 py-1.5">暂无最近访问</div>
                ) : (
                  recentPages.map(p => (
                    <SimplePageItem key={p.id} page={p} suffix={p.last_accessed_at ? formatRelativeTime(p.last_accessed_at) : undefined} />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 最爱 */}
        {currentSpace && (
          <div className="mb-3">
            <SectionHeader title="最爱" sectionKey="starred" />
            {!sectionsCollapsed['starred'] && (
              <div>
                {starredPages.length === 0 ? (
                  <div className="text-xs text-notion-textSecondary px-2 py-1.5">暂无收藏页面</div>
                ) : (
                  starredPages.map(p => (
                    <SimplePageItem key={p.id} page={p} />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 文档 */}
        <div>
          <SectionHeader title="文档" sectionKey="docs" />
          {!sectionsCollapsed['docs'] && (
            <div>
              <PageTree />
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-notion-border/60">
        <div className="py-1">
          <NewPageButton />
          <button
            onClick={() => navigate(`/s/${currentSpace?.slug}/trash`)}
            disabled={!currentSpace}
            className="w-full flex items-center h-[30px] rounded-md hover:bg-notion-hover transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ paddingLeft: '16px', paddingRight: '8px' }}
          >
            <span className="flex items-center justify-center flex-shrink-0 mr-2" style={{ width: '22px', height: '18px' }}>
              <Trash2 className="w-[18px] h-[18px] text-[#91918e]" strokeWidth={1.7} />
            </span>
            <span className="text-sm font-medium text-notion-sidebarText">回收站</span>
          </button>
          <button
            onClick={() => navigate('/admin?tab=profile')}
            className="w-full flex items-center h-[30px] rounded-md hover:bg-notion-hover transition-colors text-left"
            style={{ paddingLeft: '16px', paddingRight: '8px' }}
          >
            <span className="flex items-center justify-center flex-shrink-0 mr-2" style={{ width: '22px', height: '18px' }}>
              <Settings className="w-[18px] h-[18px] text-[#91918e]" strokeWidth={1.7} />
            </span>
            <span className="text-sm font-medium text-notion-sidebarText">设置</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
