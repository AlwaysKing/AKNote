import PageTreeItem from './PageTreeItem';
import { useSpaceStore } from '../../stores/spaceStore';

export default function PageTree() {
  const { pageTree, currentSpace } = useSpaceStore();

  if (!currentSpace) {
    return (
      <div className="text-notion-textSecondary text-sm px-2 py-4">
        Select a space to view pages
      </div>
    );
  }

  if (pageTree.length === 0) {
    return (
      <div className="text-notion-textSecondary text-sm px-2 py-4">
        No pages yet. Create your first page!
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {pageTree.map((page) => (
        <PageTreeItem key={page.id} page={page} level={0} />
      ))}
    </div>
  );
}
