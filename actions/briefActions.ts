/**
 * Single source of truth for brief actions. Used by SidePanel and context menu.
 * All menu items call the same handlers from ActionContext.
 */
import type { Brief, Folder } from '../types';
import type { MenuItem } from '../components/ContextMenu';

export type BriefActions = {
  assignBrief: (briefId: string, userId: string, userName: string) => void;
  updateBriefStatus: (briefId: string, status: 'new' | 'in_progress' | 'review' | 'delivered') => void;
  addMessage: (briefId: string, text: string, visibility: 'internal' | 'client') => void;
  addDeliverable: (briefId: string, file: File) => void;
  updateBriefMeta: (briefId: string, meta: { deadline?: Date | null; priority?: 'normal' | 'urgent' }) => void;
  updateBriefTitle: (briefId: string, title: string) => void;
  moveBriefToFolder: (briefId: string, folderId: string | undefined) => void;
  deleteBrief: (briefId: string) => void;
};

export type BriefActionCallbacks = {
  openDetails: () => void;
  openMessagesClient: () => void;
  openMessagesPod: () => void;
  openProperties: () => void;
  openDelivery: () => void;
  closeMenu: () => void;
};

// Helper to download a file
async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

// Download all files from a brief
export async function downloadBriefFiles(brief: Brief) {
  const files = brief.files || [];
  if (files.length === 0) {
    alert('No files to download');
    return;
  }

  // Download each file with a small delay to prevent browser blocking
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await downloadFile(file.url, file.name);
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

export type UserContext = {
  currentUser: { id: string; name: string } | null;
  checkPermission: (action: string, resourceOwnerId?: string) => boolean;
};

export function getBriefContextMenuItems(
  brief: Brief,
  actions: BriefActions,
  user: UserContext,
  callbacks: BriefActionCallbacks,
  folders?: Folder[]
): MenuItem[] {
  const { currentUser, checkPermission } = user;
  const canTake = checkPermission('take_brief') && brief.status === 'new';
  const canDeliver = checkPermission('deliver_brief', brief.ownerId);
  const canSetDeadline = checkPermission('set_deadline');
  const canReassign = checkPermission('reassign_brief');
  const canDelete = checkPermission('delete_brief');

  const hasFiles = brief.files && brief.files.length > 0;

  // Build folder submenu items
  const folderSubmenu: MenuItem[] = folders && folders.length > 0
    ? [
        // Option to remove from folder (move to root)
        ...(brief.folderId ? [{ label: '📤 Remove from folder', onClick: () => { actions.moveBriefToFolder(brief.id, undefined); callbacks.closeMenu(); } }] : []),
        // List of folders to move to
        ...folders
          .filter(f => f.id !== brief.folderId) // Don't show current folder
          .map(f => ({
            label: `📁 ${f.name}`,
            onClick: () => { actions.moveBriefToFolder(brief.id, f.id); callbacks.closeMenu(); }
          }))
      ]
    : [];

  const items: MenuItem[] = [
    { label: 'Open details', onClick: () => { callbacks.openDetails(); callbacks.closeMenu(); } },
    ...(hasFiles ? [{ label: 'Download files', onClick: () => { downloadBriefFiles(brief); callbacks.closeMenu(); } }] : []),
    ...(canTake ? [{ label: 'Take brief', onClick: () => { currentUser && actions.assignBrief(brief.id, currentUser.id, currentUser.name); callbacks.closeMenu(); } }] : []),
    ...(brief.status === 'in_progress' ? [{ label: 'Mark in progress', onClick: () => {}, disabled: true }] : []),
    ...(canDeliver && brief.status === 'in_progress' ? [{ label: 'Move to review', onClick: () => { actions.updateBriefStatus(brief.id, 'review'); callbacks.closeMenu(); } }] : []),
    ...(canDeliver && (brief.status === 'in_progress' || brief.status === 'review') ? [{ label: 'Deliver and send to client', onClick: () => { actions.updateBriefStatus(brief.id, 'delivered'); callbacks.closeMenu(); } }] : []),
    { label: 'Send message to client', onClick: () => { callbacks.openMessagesClient(); callbacks.closeMenu(); } },
    { label: 'Send message to pod', onClick: () => { callbacks.openMessagesPod(); callbacks.closeMenu(); } },
    { label: 'Upload deliverables', onClick: () => { callbacks.openDelivery(); callbacks.closeMenu(); } },
    // Move to folder submenu
    ...(folderSubmenu.length > 0 ? [{ label: 'Move to folder', onClick: () => {}, submenu: folderSubmenu }] : []),
    ...(canSetDeadline ? [{ label: 'Set deadline', onClick: () => { callbacks.openProperties(); callbacks.closeMenu(); } }] : []),
    ...(canReassign ? [{ label: 'Reassign owner', onClick: () => { callbacks.openProperties(); callbacks.closeMenu(); } }] : []),
    { label: 'Properties', onClick: () => { callbacks.openProperties(); callbacks.closeMenu(); } },
    { label: 'Rename', onClick: () => { callbacks.openDetails(); callbacks.closeMenu(); } },
    ...(canDelete ? [{ label: 'Delete', onClick: () => { actions.deleteBrief(brief.id); callbacks.closeMenu(); }, danger: true }] : [{ label: 'Delete', onClick: () => {}, disabled: true, danger: true }]),
  ];
  return items.filter(Boolean) as MenuItem[];
}
