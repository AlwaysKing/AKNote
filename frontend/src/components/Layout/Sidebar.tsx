import SpaceSelector from '../Sidebar/SpaceSelector';
import PageTree from '../Sidebar/PageTree';
import NewPageButton from '../Sidebar/NewPageButton';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  if (collapsed) {
    return null;
  }

  return (
    <aside className="w-60 bg-notion-sidebarBg h-screen flex flex-col border-r border-notion-border">
      <div className="p-3 border-b border-notion-border">
        <SpaceSelector />
      </div>
      <div className="flex-1 overflow-auto p-2">
        <PageTree />
      </div>
      <div className="p-3 border-t border-notion-border">
        <NewPageButton />
      </div>
    </aside>
  );
}
