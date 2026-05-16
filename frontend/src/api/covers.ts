import apiClient from './client';

export interface CoverLibraryItem {
  name: string;
  url: string;
}

export async function fetchCoverLibrary(): Promise<CoverLibraryItem[]> {
  const { data } = await apiClient.get('/covers');
  return Array.isArray(data) ? data : [];
}

export async function checkCoverName(name: string): Promise<boolean> {
  const { data } = await apiClient.get('/covers/check', { params: { name } });
  return data?.exists ?? false;
}

export async function useCoverFromLibrary(coverName: string, pageId: string, spaceSlug: string): Promise<string> {
  const { data } = await apiClient.post('/covers/use', {
    cover_name: coverName,
    page_id: pageId,
    space_slug: spaceSlug,
  });
  return data.path;
}

export async function uploadToCoverLibrary(file: File, name: string): Promise<CoverLibraryItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('cover_name', name);
  const { data } = await apiClient.post('/covers/upload', formData);
  return data;
}

export async function deleteCover(name: string): Promise<void> {
  await apiClient.post('/covers/delete', { name });
}

export async function renameCover(oldName: string, newName: string): Promise<CoverLibraryItem> {
  const { data } = await apiClient.put('/covers/rename', { old_name: oldName, new_name: newName });
  return data;
}
