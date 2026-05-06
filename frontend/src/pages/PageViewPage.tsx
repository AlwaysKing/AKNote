import { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { usePageStore } from '../stores/pageStore';
import { useSpaceStore } from '../stores/spaceStore';
import Breadcrumb from '../components/Editor/Breadcrumb';
import CoverImage from '../components/Editor/CoverImage';
import PageIcon from '../components/Editor/PageIcon';
import PageEditor from '../components/Editor/PageEditor';

export default function PageViewPage() {
  const { slug, pageId } = useParams<{ slug: string; pageId: string }>();
  const { currentPage, currentContent, fetchPage, isLoading, error, savePage, refreshPageTree } = usePageStore();
  const { setCurrentSpace } = useSpaceStore();

  useEffect(() => {
    if (slug && pageId) {
      fetchPage(slug, parseInt(pageId));
      const spaces = useSpaceStore.getState().spaces;
      const space = spaces.find((s) => s.slug === slug);
      if (space) {
        setCurrentSpace(space);
      }
    }
  }, [slug, pageId, fetchPage, setCurrentSpace]);

  const handleSave = useCallback(async (content: string) => {
    if (!slug || !pageId) return;
    await savePage(slug, parseInt(pageId), content);
    await refreshPageTree();
  }, [slug, pageId, savePage, refreshPageTree]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notion-text"></div>
      </div>
    );
  }

  if (error || !currentPage) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-notion-textSecondary">{error || 'Page not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-notion-bg">
      <Breadcrumb pageTitle={currentPage.title} spaceSlug={slug!} />

      <div className="max-w-4xl mx-auto px-4">
        <div className="relative">
          <CoverImage
            coverUrl={currentPage.cover_url}
            spaceSlug={slug!}
            pageId={currentPage.id}
          />
        </div>

        <div className="relative -mt-6 pl-4">
          <PageIcon
            icon={currentPage.icon}
            spaceSlug={slug!}
            pageId={currentPage.id}
          />
        </div>

        <div className="mt-4">
          <h1 className="text-4xl font-semibold text-notion-text mb-8">
            {currentPage.title}
          </h1>

          <PageEditor
            initialContent={currentContent}
            onSave={handleSave}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
}
