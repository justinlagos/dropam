/**
 * Admin-only canvas: all briefs and folders from all pods on one white canvas.
 * Must comply with docs/DROPAM_CORE.md, docs/DROPAM_COPY.md, docs/DROPAM_STATE.md, docs/DROPAM_FLOW.md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { useActions } from '../contexts/ActionContext';
import { BriefIcon } from '../components/BriefIcon';
import { FolderIcon } from '../components/FolderIcon';
import { SidePanel } from '../components/SidePanel';
import { FolderSidePanel } from '../components/FolderSidePanel';
import { SpatialCanvas } from '../components/SpatialCanvas';
import { Brief, Folder } from '../types';
import { Search, Loader2, ShieldAlert } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { ContextMenu } from '../components/ContextMenu';
import { getBriefContextMenuItems } from '../actions/briefActions';
import { getFolderContextMenuItems, getCanvasContextMenuItems } from '../actions/folderActions';

export const AdminCanvasPage: React.FC = () => {
  const { pods, briefs, brands, folders, loading, refetchSilent } = useData();
  const { currentUser, checkPermission } = useUser();
  const navigate = useNavigate();

  // Security: Redirect non-admins
  useEffect(() => {
    if (!loading && currentUser && currentUser.role !== 'admin') {
      navigate('/no-access', { replace: true });
    }
  }, [loading, currentUser, navigate]);
  const actions = useActions();
  const { updateBriefPosition, updateFolderPosition, moveBriefToFolder, createFolder, updateBriefStatus, deleteBrief, deleteFolder, assignBrief, updateBriefMeta, updateBriefTitle, updateFolderName } = actions;

  const activePods = pods.filter((p: { archivedAt?: string }) => !p.archivedAt);
  const allBriefs = briefs;
  const allFolders = folders;

  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [panelState, setPanelState] = useState<{ activeTab?: 'details' | 'messages'; messageFilter?: 'internal' | 'client' }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'brief' | 'folder' | 'canvas'; id?: string } | null>(null);
  const [panelFocusMeta, setPanelFocusMeta] = useState(false);

  const filteredBriefs = useMemo(() => {
    if (!searchQuery.trim()) return allBriefs;
    const q = searchQuery.toLowerCase();
    return allBriefs.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.ownerName?.toLowerCase().includes(q)) ||
        (brands.find((br) => br.id === b.brandId)?.name?.toLowerCase().includes(q))
    );
  }, [allBriefs, searchQuery, brands]);

  const handleLassoSelect = (rect: { x: number; y: number; width: number; height: number }) => {
    if (rect.width < 5 && rect.height < 5) {
      setSelectedIds(new Set());
      return;
    }
    const inRect = filteredBriefs.filter((b) => {
      const pos = b.position || { x: 0, y: 0 };
      return pos.x >= rect.x && pos.x <= rect.x + rect.width && pos.y >= rect.y && pos.y <= rect.y + rect.height;
    });
    setSelectedIds(new Set(inRect.map((b) => b.id)));
  };

  const openContextMenu = (e: React.MouseEvent, type: 'brief' | 'folder' | 'canvas', id?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const firstPodId = activePods[0]?.id;

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (currentUser?.role !== 'admin') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F5F5F7] text-[#111111] gap-4">
        <ShieldAlert size={32} className="text-gray-400" />
        <p className="text-sm text-gray-500">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white backdrop-blur-sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#111111] tracking-tight">All PODS</h1>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search briefs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 text-sm bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-gray-200"
              />
            </div>
          </div>
          <Link to="/settings" className="text-xs font-medium text-gray-500 hover:text-[#111111]">Settings</Link>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-white">
        <div className="flex-1 min-w-0 relative bg-white">
          <SpatialCanvas
            onLassoSelect={handleLassoSelect}
            onCanvasClick={() => {
              setSelectedIds(new Set());
              setSelectedBrief(null);
              setSelectedFolder(null);
              setPanelFocusMeta(false);
            }}
            onCanvasContextMenu={(e) => openContextMenu(e, 'canvas')}
          >
            {allFolders.map((folder) => {
              const count = allBriefs.filter((b) => b.folderId === folder.id).length;
              return (
                <FolderIcon
                  key={folder.id}
                  folder={folder}
                  itemCount={count}
                  selected={selectedIds.has(folder.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBrief(null);
                    setSelectedFolder(folder);
                    setSelectedIds(new Set([folder.id]));
                  }}
                  onContextMenu={(e) => openContextMenu(e, 'folder', folder.id)}
                  onCommitPosition={(pos) => updateFolderPosition(folder.id, pos)}
                  onBriefDrop={(briefId) => moveBriefToFolder(briefId, folder.id)}
                  style={{ position: 'absolute' }}
                />
              );
            })}
            {filteredBriefs.map((brief) => {
              const brand = brands.find((b) => b.id === brief.brandId);
              const pod = pods.find((p) => p.id === brief.podId);
              return (
                <BriefIcon
                  key={brief.id}
                  brief={brief}
                  brandName={brand?.name}
                  podName={pod?.name}
                  showMeta
                  selected={selectedIds.has(brief.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBrief(brief);
                    setSelectedFolder(null);
                    setPanelState({ activeTab: 'details' });
                    setSelectedIds((prev) => new Set(prev).add(brief.id));
                  }}
                  onContextMenu={(e) => openContextMenu(e, 'brief', brief.id)}
                  onCommitPosition={(pos) => updateBriefPosition(brief.id, pos)}
                  draggableForFolder
                  style={{ position: 'absolute' }}
                />
              );
            })}
          </SpatialCanvas>
        </div>

        <AnimatePresence>
          {selectedBrief && (() => {
            const brand = brands.find((b) => b.id === selectedBrief.brandId);
            if (!brand) return null;
            return (
              <SidePanel
                key="brief-panel"
                brief={selectedBrief}
                brand={brand}
                onClose={() => {
                  setSelectedBrief(null);
                  setSelectedIds((prev) => {
                    const s = new Set(prev);
                    s.delete(selectedBrief.id);
                    return s;
                  });
                  setPanelFocusMeta(false);
                }}
                activeTab={panelState.activeTab}
                messageFilter={panelState.messageFilter}
                viewType="internal"
                focusMeta={panelFocusMeta}
                onMetaBlur={() => setPanelFocusMeta(false)}
              />
            );
          })()}
          {selectedFolder && !selectedBrief && (
            <FolderSidePanel
              key="folder-panel"
              folder={selectedFolder}
              briefsInFolder={allBriefs.filter((b) => b.folderId === selectedFolder.id)}
              brands={brands}
              onClose={() => {
                setSelectedFolder(null);
                setSelectedIds((prev) => {
                  const s = new Set(prev);
                  s.delete(selectedFolder.id);
                  return s;
                });
              }}
              onOpenBrief={(brief) => {
                setSelectedFolder(null);
                setSelectedBrief(brief);
                setPanelState({ activeTab: 'details' });
                setSelectedIds(new Set([brief.id]));
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {contextMenu &&
          (() => {
            const closeMenu = () => setContextMenu(null);
            if (contextMenu.type === 'canvas') {
              return (
                <ContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  onClose={closeMenu}
                  items={
                    firstPodId
                      ? getCanvasContextMenuItems(
                          { createFolder, updateFolderName, deleteFolder, moveBriefToFolder },
                          firstPodId,
                          { newFolder: () => {}, closeMenu, refresh: refetchSilent }
                        )
                      : [{ label: 'Refresh', onClick: () => { refetchSilent(); closeMenu(); } }]
                  }
                />
              );
            }
            if (contextMenu.type === 'folder' && contextMenu.id) {
              const folder = folders.find((f) => f.id === contextMenu.id);
              if (!folder) {
                closeMenu();
                return null;
              }
              return (
                <ContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  onClose={closeMenu}
                  items={getFolderContextMenuItems(
                    folder,
                    { createFolder, updateFolderName, deleteFolder, moveBriefToFolder },
                    folder.podId,
                    {
                      openFolder: () => {
                        setSelectedBrief(null);
                        setSelectedFolder(folder);
                        setSelectedIds(new Set([folder.id]));
                      },
                      newFolder: () => {},
                      moveBriefsHere: () => {
                        Array.from(selectedIds).forEach((id) => moveBriefToFolder(id, contextMenu.id!));
                      },
                      closeMenu,
                      renameFolder: (f) => {
                        const name = window.prompt('Rename folder', f.name);
                        if (name != null && name.trim()) updateFolderName(f.id, name.trim());
                      },
                    },
                    Array.from(selectedIds)
                  )}
                />
              );
            }
            if (contextMenu.type === 'brief' && contextMenu.id) {
              const brief = briefs.find((b) => b.id === contextMenu.id);
              if (!brief) {
                closeMenu();
                return null;
              }
              return (
                <ContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  onClose={closeMenu}
                  items={getBriefContextMenuItems(
                    brief,
                    {
                      assignBrief,
                      updateBriefStatus,
                      addMessage: actions.addMessage,
                      addDeliverable: actions.addDeliverable,
                      updateBriefMeta,
                      updateBriefTitle,
                      moveBriefToFolder,
                      deleteBrief,
                    },
                    { currentUser: currentUser!, checkPermission },
                    {
                      openDetails: () => {
                        setSelectedBrief(brief);
                        setPanelState({ activeTab: 'details' });
                        setSelectedIds(new Set([brief.id]));
                      },
                      openMessagesClient: () => {
                        setSelectedBrief(brief);
                        setPanelState({ activeTab: 'messages', messageFilter: 'client' });
                        setSelectedIds(new Set([brief.id]));
                      },
                      openMessagesPod: () => {
                        setSelectedBrief(brief);
                        setPanelState({ activeTab: 'messages', messageFilter: 'internal' });
                        setSelectedIds(new Set([brief.id]));
                      },
                      openProperties: () => {
                        setSelectedBrief(brief);
                        setPanelState({ activeTab: 'details' });
                        setSelectedIds(new Set([brief.id]));
                        setPanelFocusMeta(true);
                      },
                      openDelivery: () => {
                        setSelectedBrief(brief);
                        setPanelState({ activeTab: 'details' });
                        setSelectedIds(new Set([brief.id]));
                      },
                      closeMenu,
                    }
                  )}
                />
              );
            }
            return null;
          })()}
      </AnimatePresence>
    </div>
  );
};
