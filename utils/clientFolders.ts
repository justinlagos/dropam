/**
 * Client-side folder state (per brand, sessionStorage).
 * Folders exist only in the client session; briefIds track which briefs are in each folder.
 * position: world coords on client canvas (free drag, no snap).
 */

export interface ClientFolder {
  id: string;
  name: string;
  briefIds: string[];
  position?: { x: number; y: number };
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

const POSITIONS_PREFIX = 'dropam_client_brief_positions_';

export function getClientBriefPositions(shareToken: string): Record<string, { x: number; y: number }> {
  try {
    const raw = sessionStorage.getItem(`${POSITIONS_PREFIX}${shareToken}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function setClientBriefPositions(shareToken: string, positions: Record<string, { x: number; y: number }>): void {
  try {
    sessionStorage.setItem(`${POSITIONS_PREFIX}${shareToken}`, JSON.stringify(positions));
  } catch {}
}
