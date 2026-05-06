import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-notion-bg">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main
        className={`flex-1 overflow-auto transition-all duration-200 ${
          sidebarCollapsed ? 'ml-0' : 'ml-60'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
