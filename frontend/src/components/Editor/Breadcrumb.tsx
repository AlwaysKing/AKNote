import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpaceStore } from '../../stores/spaceStore';

interface BreadcrumbProps {
  pageTitle?: string;
  spaceSlug: string;
}

export default function Breadcrumb({ pageTitle, spaceSlug }: BreadcrumbProps) {
  const navigate = useNavigate();
  const { currentSpace } = useSpaceStore();

  return (
    <div className="flex items-center gap-1 text-sm text-notion-textSecondary px-4 pt-4 pb-2">
      <button
        onClick={() => navigate(`/s/${spaceSlug}`)}
        className="hover:bg-notion-hover px-1.5 py-0.5 rounded transition-colors"
      >
        {currentSpace?.icon && <span className="mr-1">{currentSpace.icon}</span>}
        {currentSpace?.name || 'Space'}
      </button>
      {pageTitle && (
        <>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-notion-text px-1.5 py-0.5">{pageTitle}</span>
        </>
      )}
    </div>
  );
}
