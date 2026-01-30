
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { useActions } from '../contexts/ActionContext';
import { BriefIcon } from '../components/BriefIcon';
import { FolderIcon } from '../components/FolderIcon';
import { SidePanel } from '../components/SidePanel';
import { SpatialCanvas } from '../components/SpatialCanvas';
import { Brief } from '../types';
import { Search, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ContextMenu, MenuItem } from '../components/ContextMenu';

export const PodCanvasPage: React.FC = () => {
  const { podSlug } = useParams<{ podSlug: string }>();
  const { pods, briefs, brands, folders, loading } = useData();
  const { currentUser, checkPermission } = useUser();
  const { updateBriefPosition, updateFolderPosition, moveBriefToFolder, stackBriefs, createFolder, updateBriefStatus, deleteBrief, assignBrief, updateBriefMeta } = useActions();
  
  const pod = pods.find(p => p.slug === podSlug);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [panelState, setPanelState] = useState<{ activeTab?: 'details' | 'messages', messageFilter?: 'internal' | 'client' }>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'brief' | 'folder' | 'canvas', id?: string } | null>(null);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!pod) return <div>Pod not found</div>;

  const podBriefs = briefs.filter(b => b.podId === pod.id);
  const podFolders = folders.filter(f => f.podId === pod.id);

  const filteredBriefs = useMemo(() => {
    if (!searchQuery.trim()) return podBriefs;
    const q = searchQuery.toLowerCase();
    return podBriefs.filter(b => b.title.toLowerCase().includes(q) || (b.ownerName?.toLowerCase().includes(q)));
  }, [podBriefs, searchQuery]);

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
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-[#111111] tracking-tight">{pod.name}</h1>
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
      </div>

      {/* Canvas + Side Panel */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 relative">
          <SpatialCanvas
            onLassoSelect={handleLassoSelect}
            onCanvasClick={() => setSelectedIds(new Set())}
            onCanvasContextMenu={(e) => openContextMenu(e, 'canvas')}
          >
            {podFolders.map(folder => {
              const count = podBriefs.filter(b => b.folderId === folder.id).length;
              return (
                <FolderIcon
                  key={folder.id}
                  folder={folder}
                  itemCount={count}
                  selected={selectedIds.has(folder.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedBrief(null); setSelectedIds(new Set([folder.id])); }}
                  onContextMenu={(e) => openContextMenu(e, 'folder', folder.id)}
                  onDragEnd={(_, info) => updateFolderPosition(folder.id, { x: (folder.position?.x ?? 0) + info.offset.x, y: (folder.position?.y ?? 0) + info.offset.y })}
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
                  onClick={(e) => { e.stopPropagation(); setSelectedBrief(brief); setPanelState({ activeTab: 'details' }); setSelectedIds(prev => new Set(prev).add(brief.id)); }}
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
              onClose={() => { setSelectedBrief(null); setSelectedIds(prev => { const s = new Set(prev); s.delete(selectedBrief.id); return s; }); }}
              activeTab={panelState.activeTab}
              messageFilter={panelState.messageFilter}
              viewType="internal"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              ...(contextMenu.type === 'canvas' ? [
                { label: 'New folder', onClick: () => createFolder(pod.id, 'New folder', { x: 200, y: 200 }) }
              ] : []),
              ...(contextMenu.type === 'folder' && contextMenu.id ? [
                { label: 'Move briefs here', onClick: () => selectedIds.forEach(id => moveBriefToFolder(id, contextMenu.id)), disabled: selectedIds.size === 0 },
                { label: 'Delete folder', onClick: () => deleteFolder(contextMenu.id!), danger: true }
              ] : []),
              ...(contextMenu.type === 'brief' && contextMenu.id ? [
                { label: 'Remove from folder', onClick: () => moveBriefToFolder(contextMenu.id!, undefined) },
                { label: 'Delete brief', onClick: () => deleteBrief(contextMenu.id!), danger: true }
              ] : [])
            ].filter(Boolean) as MenuItem[]}
          />
        )}
      </AnimatePresence>
    </div>
  );
};