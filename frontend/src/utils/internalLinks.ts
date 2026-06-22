export interface InternalPageLinkMatch {
  spaceSlug: string;
  pageId: string;
  relativePath: string;
}

const INTERNAL_PAGE_PATH_RE = /^\/?s\/([^/]+)\/p\/([a-f0-9]{32})(?:$|[/?#].*)/i;

function matchInternalPagePath(path: string): InternalPageLinkMatch | null {
  const match = path.match(INTERNAL_PAGE_PATH_RE);
  if (!match) return null;

  const spaceSlug = match[1];
  const pageId = match[2];
  return {
    spaceSlug,
    pageId,
    relativePath: `/s/${spaceSlug}/p/${pageId}`,
  };
}

export function parseInternalPageLink(rawUrl: string): InternalPageLinkMatch | null {
  const value = rawUrl.trim();
  if (!value) return null;

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return matchInternalPagePath(value);
  }

  try {
    const url = new URL(value);
    if (typeof window !== 'undefined' && url.hostname !== window.location.hostname) {
      return null;
    }
    return matchInternalPagePath(url.pathname);
  } catch {
    return null;
  }
}

export function normalizeInternalPageLink(rawUrl: string): string {
  return parseInternalPageLink(rawUrl)?.relativePath ?? rawUrl.trim();
}
