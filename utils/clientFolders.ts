/**
 * Client-side folder state (per brand, sessionStorage).
 * Folders exist only in the client session; briefIds track which briefs are in each folder.
 */

export interface ClientFolder {
  id: string;
  name: string;
  briefIds: string[];
}

const STORAGE_PREFIX = 'dropam_client_folders_';

export function getClientFolders(brandSlug: string): ClientFolder[] {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${brandSlug}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientFolder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setClientFolders(brandSlug: string, folders: ClientFolder[]): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${brandSlug}`, JSON.stringify(folders));
  } catch {}
}

export function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
