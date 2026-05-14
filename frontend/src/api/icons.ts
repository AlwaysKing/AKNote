import apiClient from './client';

export interface IconLibraryItem {
  name: string;
  url: string;
}

export async function fetchIconLibrary(): Promise<IconLibraryItem[]> {
  const { data } = await apiClient.get('/icons');
  return Array.isArray(data) ? data : [];
}

export async function checkIconName(name: string): Promise<boolean> {
  const { data } = await apiClient.get('/icons/check', { params: { name } });
  return data?.exists ?? false;
}

export async function useIconFromLibrary(iconName: string, pageId: number, spaceSlug: string): Promise<string> {
  const { data } = await apiClient.post('/icons/use', {
    icon_name: iconName,
    page_id: pageId,
    space_slug: spaceSlug,
  });
  return data.path;
}

export async function uploadToIconLibrary(file: File, name: string): Promise<IconLibraryItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('icon_name', name);
  const { data } = await apiClient.post('/icons/upload', formData);
  return data;
}

export async function deleteIcon(name: string): Promise<void> {
  await apiClient.post('/icons/delete', { name });
}

export async function renameIcon(oldName: string, newName: string): Promise<IconLibraryItem> {
  const { data } = await apiClient.put('/icons/rename', { old_name: oldName, new_name: newName });
  return data;
}
