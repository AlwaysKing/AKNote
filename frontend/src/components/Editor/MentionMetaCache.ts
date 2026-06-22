import { bookmarksApi, BookmarkMeta } from '../../api/bookmarks';
import { useSpaceStore } from '../../stores/spaceStore';
import { pagesApi, Page } from '../../api/pages';
import { normalizeInternalPageLink, parseInternalPageLink } from '../../utils/internalLinks';

export interface LinkMeta {
  title: string;
  description: string;
  favicon_url: string;
  image_url: string;
  is_internal?: boolean;
  page_id?: string;
}

const META_FAILURE_COOLDOWN_MS = 30000;

function findPageInTree(tree: Page[], pageId: string): Page | null {
  for (const page of tree) {
    if (page.id === pageId) return page;
    if (page.children) {
      const found = findPageInTree(page.children, pageId);
      if (found) return found;
    }
  }
  return null;
}

class MentionMetaCacheClass {
  private cache = new Map<string, LinkMeta>();
  private pending = new Map<string, Promise<LinkMeta | null>>();
  private failed = new Map<string, number>();

  get(url: string): LinkMeta | null {
    const normalizedUrl = normalizeInternalPageLink(url);
    return this.cache.get(normalizedUrl) || null;
  }

  async getOrFetch(url: string): Promise<LinkMeta | null> {
    const normalizedUrl = normalizeInternalPageLink(url);
    const cached = this.cache.get(normalizedUrl);
    if (cached) return cached;

    const pending = this.pending.get(normalizedUrl);
    if (pending) return pending;

    const failedAt = this.failed.get(normalizedUrl);
    if (failedAt && Date.now() - failedAt < META_FAILURE_COOLDOWN_MS) {
      return null;
    }

    const internalMatch = parseInternalPageLink(url);
    if (internalMatch) {
      const { spaceSlug, pageId, relativePath } = internalMatch;
      const { pageTree } = useSpaceStore.getState();
      const treeMatch = findPageInTree(pageTree, pageId);

      const internalPromise = (async () => {
        try {
          const page = treeMatch || await pagesApi.get(spaceSlug, pageId);
          const result: LinkMeta = {
            title: page.title || relativePath,
            description: '',
            favicon_url: page.icon || '',
            image_url: '',
            is_internal: true,
            page_id: page.id,
          };
          this.cache.set(relativePath, result);
          this.failed.delete(relativePath);
          this.pending.delete(relativePath);
          return result;
        } catch {
          this.failed.set(relativePath, Date.now());
          this.pending.delete(relativePath);
          return null;
        }
      })();

      this.pending.set(relativePath, internalPromise);
      return internalPromise;
    }

    const promise = bookmarksApi.getMeta(normalizedUrl)
      .then((meta: BookmarkMeta) => {
        const result: LinkMeta = {
          title: meta.title || normalizedUrl,
          description: meta.description || '',
          favicon_url: meta.favicon_url || '',
          image_url: meta.image_url || '',
          is_internal: false,
        };
        this.cache.set(normalizedUrl, result);
        this.failed.delete(normalizedUrl);
        this.pending.delete(normalizedUrl);
        return result;
      })
      .catch(() => {
        this.failed.set(normalizedUrl, Date.now());
        this.pending.delete(normalizedUrl);
        return null;
      });

    this.pending.set(normalizedUrl, promise);
    return promise;
  }
}

export const mentionMetaCache = new MentionMetaCacheClass();
