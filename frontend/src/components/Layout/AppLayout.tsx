import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggle = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="flex h-screen bg-notion-bg">
      <div
        className="flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden"
        style={{ width: sidebarCollapsed ? 0 : 270 }}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggle} />
      </div>
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet context={{ sidebarCollapsed, toggleSidebar: toggle }} />
      </main>
    </div>
  );
}
