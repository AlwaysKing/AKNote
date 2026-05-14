import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useSpaceStore } from '../../stores/spaceStore';

export default function NewPageButton() {
  const navigate = useNavigate();
  const createPage = usePageStore((state) => state.createPage);
  const { currentSpace } = useSpaceStore();

  const handleNewPage = async () => {
    if (!currentSpace) return;

    try {
      const newPage = await createPage(currentSpace.slug, '未命名页面');
      navigate(`/s/${currentSpace.slug}/p/${newPage.id}`);
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  return (
    <button
      onClick={handleNewPage}
      disabled={!currentSpace}
      className="w-full flex items-center h-[30px] rounded-md hover:bg-notion-hover transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ paddingLeft: '16px', paddingRight: '8px' }}
    >
      <span className="flex items-center justify-center flex-shrink-0 mr-2" style={{ width: '22px', height: '18px' }}>
        <Plus className="w-[18px] h-[18px] text-[#91918e]" strokeWidth={1.7} />
      </span>
      <span className="text-sm font-medium text-notion-sidebarText">新建页面</span>
    </button>
  );
}
