/**
 * Single source of truth for folder actions. Used by context menu.
 */
import type { Folder } from '../types';
import type { MenuItem } from '../components/ContextMenu';

export type FolderActions = {
  createFolder: (podId: string, name: string, position: { x: number; y: number }) => void;
  updateFolderName: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  moveBriefToFolder: (briefId: string, folderId: string | undefined) => void;
};

export type FolderActionCallbacks = {
  openFolder: () => void;
  newFolder: () => void;
  moveBriefsHere: () => void;
  closeMenu: () => void;
};

export function getFolderContextMenuItems(
  folder: Folder,
  actions: FolderActions,
  podId: string,
  callbacks: FolderActionCallbacks,
  selectedBriefIds: string[]
): MenuItem[] {
  return [
    { label: 'Open folder', onClick: () => { callbacks.openFolder(); callbacks.closeMenu(); } },
    { label: 'Rename folder', onClick: () => { callbacks.openFolder(); callbacks.closeMenu(); } },
    { label: 'New folder', onClick: () => { actions.createFolder(podId, 'New folder', { x: (folder.position?.x ?? 0) + 140, y: folder.position?.y ?? 0 }); callbacks.closeMenu(); } },
    { label: 'Properties', onClick: () => { callbacks.openFolder(); callbacks.closeMenu(); } },
    { label: 'Move briefs here', onClick: () => { callbacks.moveBriefsHere(); callbacks.closeMenu(); }, disabled: selectedBriefIds.length === 0 },
    { label: 'Delete folder', onClick: () => { actions.deleteFolder(folder.id); callbacks.closeMenu(); }, danger: true },
  ];
}

export function getCanvasContextMenuItems(
  actions: FolderActions,
  podId: string,
  callbacks: { newFolder: () => void; closeMenu: () => void }
): MenuItem[] {
  return [
    { label: 'New folder', onClick: () => { actions.createFolder(podId, 'New folder', { x: 200, y: 200 }); callbacks.closeMenu(); } },
  ];
}
