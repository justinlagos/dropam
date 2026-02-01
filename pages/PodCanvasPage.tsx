
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { useActions } from '../contexts/ActionContext';
import { BriefIcon } from '../components/BriefIcon';
import { FolderIcon } from '../components/FolderIcon';
import { SidePanel } from '../components/SidePanel';
import { SpatialCanvas } from '../components/SpatialCanvas';
import { Brief, Folder } from '../types';
import { Search, Loader2, ShieldAlert, ChevronRight, Folder as FolderLucide } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ContextMenu } from '../components/ContextMenu';
import { getBriefContextMenuItems } from '../actions/briefActions';
import { getFolderContextMenuItems, getCanvasContextMenuItems } from '../actions/folderActions';

export const PodCanvasPage: React.FC = () => {
  const { podSlug } = useParams<{ podSlug: string }>();
  const { pods, briefs, brands, folders, loading } = useData();
  const { currentUser, checkPermission, hasPodAccess } = useUser();
  const actions = useActions();
  const navigate = useNavigate();
  const { updateBriefPosition, updateFolderPosition, moveBriefToFolder, createFolder, updateBriefStatus, deleteBrief, deleteFolder, assignBrief, updateBriefMeta, updateBriefTitle, updateFolderName } = actions;

  const pod = pods.find(p => p.slug === podSlug);

  // Security: Check if user has access to this pod via memberships
  const hasAccess = useMemo(() => {
    if (!currentUser || !pod) return false;
    // Use membership-based access check
    return hasPodAccess(pod.id);
  }, [currentUser, pod, hasPodAccess]);

  // Redirect unauthorized users
  useEffect(() => {
    if (!loading && pod && currentUser && !hasAccess) {
      navigate('/no-access', { replace: true });
    }
  }, [loading, pod, currentUser, hasAccess, navigate]);

  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [panelState, setPanelState] = useState<{ activeTab?: 'details' | 'messages', messageFilter?: 'internal' | 'client' }>({});
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'brief' | 'folder' | 'canvas'; id?: string } | null>(null);
  const [panelFocusMeta, setPanelFocusMeta] = useState(false);

  // Folder open state - when set, canvas shows only briefs in that folder
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const openFolder = useMemo(() => openFolderId ? folders.find(f => f.id === openFolderId) : null, [openFolderId, folders]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!pod) return <div className="h-screen flex items-center justify-center text-gray-500">Pod not found</div>;

  // Show access denied briefly before redirect
  if (!hasAccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F5F5F7] text-[#111111] gap-4">
        <ShieldAlert size={32} className="text-gray-400" />
        <p className="text-sm text-gray-500">You don't have access to this pod.</p>
      </div>
    );
  }

  const podBriefs = briefs.filter(b => b.podId === pod.id);
  const podFolders = folders.filter(f => f.podId === pod.id);

  // Filter briefs based on whether a folder is open
  const visibleBriefs = useMemo(() => {
    if (openFolderId) {
      // Inside a folder: show only briefs in this folder
      return podBriefs.filter(b => b.folderId === openFolderId);
    }
    // Root level: show briefs not in any folder
    return podBriefs.filter(b => !b.folderId);
  }, [podBriefs, openFolderId]);

  const filteredBriefs = useMemo(() => {
    if (!searchQuery.trim()) return visibleBriefs;
    const q = searchQuery.toLowerCase();
    return visibleBriefs.filter(b => b.title.toLowerCase().includes(q) || (b.ownerName?.toLowerCase().includes(q)));
  }, [visibleBriefs, searchQuery]);

  const handleLassoSelect = (rect: { x: number; y: number; width: number; height: number }) => {
    if (rect.width < 5 && rect.height < 5) {
      setSelectedIds(new Set());
      return;
    }
    const inRect = filteredBriefs.filter(b => {
      const pos = b.position || { x: 0, y: 0 };
      return pos.x >= rect.x && pos.x <= rect.x + rect.width && pos.y >= rect.y && pos.y <= rect.y + rect.height;
    });
    setSelectedIds(new Set(inRect.map(b => b.id)));
  };

  const openContextMenu = (e: React.MouseEvent, type: 'brief' | 'folder' | 'canvas', id?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F5F5F7] overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenFolderId(null)}
                className={`text-lg font-bold tracking-tight transition-colors ${openFolderId ? 'text-gray-400 hover:text-[#111111]' : 'text-[#111111]'}`}
              >
                {pod.name}
              </button>
              {openFolder && (
                <>
                  <ChevronRight size={16} className="text-gray-300" />
                  <div className="flex items-center gap-2">
                    <FolderLucide size={16} className="text-yellow-500" />
                    <span className="text-lg font-bold text-[#111111] tracking-tight">{openFolder.name}</span>
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={openFolder ? "Search in folder..." : "Search briefs..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 text-sm bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-gray-200"
              />
            </div>
          </div>
          <Link to="/settings" className="text-xs font-medium text-gray-500 hover:text-[#111111]">Settings</Link>
        </div>
      </div>

      {/* Canvas + Side Panel */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 relative">
          <SpatialCanvas
            onLassoSelect={handleLassoSelect}
            onCanvasClick={() => {
              // Clicking empty canvas clears selection AND closes panel
              setSelectedIds(new Set());
              setSelectedBrief(null);
            }}
            onCanvasContextMenu={(e) => openContextMenu(e, 'canvas')}
          >
            {/* Only show folders at root level (not inside a folder) */}
            {!openFolderId && podFolders.map(folder => {
              const count = podBriefs.filter(b => b.folderId === folder.id).length;
              return (
                <FolderIcon
                  key={folder.id}
                  folder={folder}
                  itemCount={count}
                  selected={selectedIds.has(folder.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedBrief(null); setSelectedIds(new Set([folder.id])); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setOpenFolderId(folder.id); setSelectedIds(new Set()); }}
                  onContextMenu={(e) => openContextMenu(e, 'folder', folder.id)}
                  onDragEnd={(_, info) => updateFolderPosition(folder.id, { x: (folder.position?.x ?? 0) + info.offset.x, y: (folder.position?.y ?? 0) + info.offset.y })}
                  onBriefDrop={(briefId) => moveBriefToFolder(briefId, folder.id)}
                  style={{ left: folder.position?.x ?? 0, top: folder.position?.y ?? 0, position: 'absolute' }}
                />
              );
            })}
            {filteredBriefs.map(brief => {
              const brand = brands.find(b => b.id === brief.brandId);
              return (
                <BriefIcon
                  key={brief.id}
                  brief={brief}
                  brandName={brand?.name}
                  showMeta
                  selected={selectedIds.has(brief.id)}
                  draggableForFolder={!openFolderId} // Only allow drag-to-folder at root level
                  onClick={(e) => {
                    // Single click: select only (highlight)
                    e.stopPropagation();
                    setSelectedIds(new Set([brief.id]));
                  }}
                  onDoubleClick={(e) => {
                    // Double click: open side panel
                    e.stopPropagation();
                    setSelectedBrief(brief);
                    setPanelState({ activeTab: 'details' });
                    setSelectedIds(new Set([brief.id]));
                  }}
                  onContextMenu={(e) => openContextMenu(e, 'brief', brief.id)}
                  onDragEnd={(_, info) => {
                    const pos = brief.position || { x: 0, y: 0 };
                    updateBriefPosition(brief.id, { x: pos.x + info.offset.x, y: pos.y + info.offset.y });
                  }}
                  style={{ left: brief.position?.x ?? 0, top: brief.position?.y ?? 0, position: 'absolute' }}
                />
              );
            })}
          </SpatialCanvas>
        </div>

        <AnimatePresence>
          {selectedBrief && (
            <SidePanel
              brief={selectedBrief}
              brand={brands.find(b => b.id === selectedBrief.brandId)!}
              onClose={() => { setSelectedBrief(null); setSelectedIds(prev => { const s = new Set(prev); s.delete(selectedBrief.id); return s; }); setPanelFocusMeta(false); }}
              activeTab={panelState.activeTab}
              messageFilter={panelState.messageFilter}
              viewType="internal"
              focusMeta={panelFocusMeta}
              onMetaBlur={() => setPanelFocusMeta(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Context menu: same handlers as side panel (actions/briefActions, actions/folderActions) */}
      <AnimatePresence>
        {contextMenu && (() => {
          const closeMenu = () => setContextMenu(null);
          if (contextMenu.type === 'canvas') {
            return (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeMenu}
                items={getCanvasContextMenuItems(
                  { createFolder, updateFolderName, deleteFolder, moveBriefToFolder },
                  pod.id,
                  { newFolder: () => {}, closeMenu }
                )}
              />
            );
          }
          if (contextMenu.type === 'folder' && contextMenu.id) {
            const folder = folders.find(f => f.id === contextMenu.id)!;
            return (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeMenu}
                items={getFolderContextMenuItems(
                  folder,
                  { createFolder, updateFolderName, deleteFolder, moveBriefToFolder },
                  pod.id,
                  {
                    openFolder: () => { setOpenFolderId(folder.id); setSelectedBrief(null); setSelectedIds(new Set()); },
                    newFolder: () => {},
                    moveBriefsHere: () => { Array.from(selectedIds).forEach(id => moveBriefToFolder(id, contextMenu.id!)); },
                    closeMenu,
                  },
                  Array.from(selectedIds)
                )}
              />
            );
          }
          if (contextMenu.type === 'brief' && contextMenu.id) {
            const brief = briefs.find(b => b.id === contextMenu.id)!;
            return (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeMenu}
                items={getBriefContextMenuItems(
                  brief,
                  { assignBrief, updateBriefStatus, addMessage: actions.addMessage, addDeliverable: actions.addDeliverable, updateBriefMeta, updateBriefTitle, moveBriefToFolder, deleteBrief },
                  { currentUser, checkPermission },
                  {
                    openDetails: () => { setSelectedBrief(brief); setPanelState({ activeTab: 'details' }); setSelectedIds(new Set([brief.id])); },
                    openMessagesClient: () => { setSelectedBrief(brief); setPanelState({ activeTab: 'messages', messageFilter: 'client' }); setSelectedIds(new Set([brief.id])); },
                    openMessagesPod: () => { setSelectedBrief(brief); setPanelState({ activeTab: 'messages', messageFilter: 'internal' }); setSelectedIds(new Set([brief.id])); },
                    openProperties: () => { setSelectedBrief(brief); setPanelState({ activeTab: 'details' }); setSelectedIds(new Set([brief.id])); setPanelFocusMeta(true); },
                    openDelivery: () => { setSelectedBrief(brief); setPanelState({ activeTab: 'details' }); setSelectedIds(new Set([brief.id])); },
                    closeMenu,
                  },
                  podFolders
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