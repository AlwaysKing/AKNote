import { useAuthStore } from '../stores/authStore';
import { Settings, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 bg-notion-sidebarBg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-notion-textSecondary" />
          </div>
          <h1 className="text-2xl font-bold text-notion-text mb-1">选择一个空间</h1>
          <p className="text-notion-textSecondary text-sm">
            从左侧选择一个空间以查看页面
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-notion-text text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            管理空间
          </button>
        )}
      </div>
    </div>
  );
}
