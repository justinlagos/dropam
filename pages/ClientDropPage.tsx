import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BriefIcon } from '../components/BriefIcon';
import { SidePanel } from '../components/SidePanel';
import { FileUpload } from '../components/FileUpload';
import { ClientFolderIcon } from '../components/ClientFolderIcon';
import { ClientFolderSidePanel } from '../components/ClientFolderSidePanel';
import {
  verifyBrandAccess,
  getClientBriefs,
  createClientBrief,
  sendClientMessage,
  getStoredAccessKey,
  setStoredAccessKey,
  clearStoredAccessKey,
  type ClientBrief,
} from '../services/clientApi';
import { Brief, Brand } from '../types';
import { getClientFolders, setClientFolders, generateFolderId, type ClientFolder } from '../utils/clientFolders';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { ContextMenu } from '../components/ContextMenu';

/** Get all files from a dropped directory (Chrome/Edge). */
async function getFilesFromDirectoryEntry(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = dirEntry.createReader();
  const readEntries = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));
  let entries = await readEntries();
  while (entries.length > 0) {
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
        files.push(file);
      } else if (entry.isDirectory) {
        const subFiles = await getFilesFromDirectoryEntry(entry as FileSystemDirectoryEntry);
        files.push(...subFiles);
      }
    }
    entries = await readEntries();
  }
  return files;
}

const clientBriefToBrief = (b: ClientBrief, brandId: string): Brief => ({
  id: b.id,
  brandId,
  podId: b.podId,
  title: b.title,
  status: b.status as Brief['status'],
  priority: 'normal',
  ownerId: undefined,
  ownerName: undefined,
  submittedAt: b.submittedAt,
  deadline: null,
  files: b.files.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type as 'brief' | 'attachment' | 'deliverable',
    url: f.url,
    uploadedAt: f.uploadedAt,
    visibleToClient: f.visibleToClient,
  })),
  messages: b.messages.map((m) => ({
    id: m.id,
    briefId: b.id,
    authorName: m.authorName,
    text: m.text,
    visibility: m.visibility as 'internal' | 'client',
    createdAt: m.createdAt,
  })),
  position: { x: 0, y: 0 },
});

export const ClientDropPage: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [briefs, setBriefs] = useState<ClientBrief[]>([]);
  const [brandName, setBrandName] = useState(brandSlug ? brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1) : '');
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ClientFolder | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'brief' | 'folder'; brief?: Brief; folder?: ClientFolder } | null>(null);

  const loadKeyFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('key') || params.get('accessKey');
  }, []);

  useEffect(() => {
    if (!brandSlug) return;
    const urlKey = loadKeyFromUrl();
    const stored = getStoredAccessKey(brandSlug);
    const key = urlKey || stored;
    if (!key) {
      setAuthChecking(false);
      setAccessKey(null);
      return;
    }
    verifyBrandAccess(brandSlug, key).then(({ ok, error }) => {
      setAuthChecking(false);
      if (ok) {
        setStoredAccessKey(brandSlug, key);
        setAccessKey(key);
      } else {
        setAccessKey(null);
        if (stored) clearStoredAccessKey(brandSlug);
      }
    });
  }, [brandSlug, loadKeyFromUrl]);

  useEffect(() => {
    if (!brandSlug || !accessKey) return;
    setLoading(true);
    getClientBriefs(brandSlug, accessKey).then(({ briefs: list }) => {
      setBriefs(list);
      setLoading(false);
    });
  }, [brandSlug, accessKey]);

  // Realtime: poll frequently so client sees status/deliverables without manual refresh
  useEffect(() => {
    if (!brandSlug || !accessKey) return;
    let interval: ReturnType<typeof setInterval>;
    const poll = () => {
      if (document.visibilityState === 'visible') {
        getClientBriefs(brandSlug, accessKey).then(({ briefs: list }) => setBriefs(list));
      }
    };
    // Poll every 1.5 seconds for near-instant updates
    interval = setInterval(poll, 1500);
    // Also poll on visibility change (when tab becomes active)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [brandSlug, accessKey]);

  // Keep selectedBrief in sync with briefs array (for realtime updates)
  useEffect(() => {
    if (selectedBrief) {
      const updated = briefs.find(b => b.id === selectedBrief.id);
      if (updated) {
        const updatedAsBrief = clientBriefToBrief(updated, '');
        // Only update if something changed
        if (JSON.stringify(updatedAsBrief) !== JSON.stringify(selectedBrief)) {
          setSelectedBrief(updatedAsBrief);
        }
      }
    }
  }, [briefs, selectedBrief]);

  // Client folders: load from sessionStorage when we have brand + key
  useEffect(() => {
    if (!brandSlug || !accessKey) return;
    setFolders(getClientFolders(brandSlug));
  }, [brandSlug, accessKey]);

  useEffect(() => {
    if (!brandSlug || !accessKey) return;
    setClientFolders(brandSlug, folders);
  }, [brandSlug, accessKey, folders]);

  const moveBriefToFolder = useCallback((briefId: string, folderId: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, briefIds: [...f.briefIds, briefId] } : { ...f, briefIds: f.briefIds.filter((id) => id !== briefId) }
      )
    );
  }, []);

  const removeBriefFromFolder = useCallback((briefId: string) => {
    setFolders((prev) => prev.map((f) => ({ ...f, briefIds: f.briefIds.filter((id) => id !== briefId) })));
  }, []);

  const renameFolder = useCallback((folderId: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolder?.id === folderId) setSelectedFolder(null);
  }, [selectedFolder?.id]);

  const handlePasscodeSubmit = async () => {
    const key = passcodeInput.trim();
    if (!key || !brandSlug) return;
    setPasscodeError('');
    const { ok, error } = await verifyBrandAccess(brandSlug, key);
    if (ok) {
      setStoredAccessKey(brandSlug, key);
      setAccessKey(key);
      setPasscodeInput('');
      getClientBriefs(brandSlug, key).then(({ briefs: list }) => setBriefs(list));
    } else {
      setPasscodeError(error ?? 'Invalid access key');
    }
  };

  const uploadSingleFile = useCallback(
    (file: File): Promise<ClientBrief | null> =>
      new Promise((resolve) => {
        createClientBrief(brandSlug!, accessKey!, file).then(({ brief }) => {
          if (brief) {
            setBriefs((prev) => [brief, ...prev]);
            resolve(brief);
          } else resolve(null);
        });
      }),
    [brandSlug, accessKey]
  );

  const handleUpload = useCallback(
    (files: File[]) => {
      if (!files.length || !brandSlug || !accessKey) return;
      const file = files[0];
      setUploadProgress(0);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          createClientBrief(brandSlug, accessKey, file).then(({ brief }) => {
            setUploadProgress(null);
            if (brief) {
              setBriefs((prev) => [brief, ...prev]);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 4000);
            }
          });
        }
      }, 20);
    },
    [brandSlug, accessKey]
  );

  const handleDrop = useCallback(
    async (files: File[], e: React.DragEvent) => {
      if (!files.length || !brandSlug || !accessKey) return;
      const item = e?.dataTransfer?.items?.[0];
      const entry = item && typeof (item as any).webkitGetAsEntry === 'function' ? (item as any).webkitGetAsEntry() : null;
      if (entry?.isDirectory) {
        try {
          const dirFiles = await getFilesFromDirectoryEntry(entry as FileSystemDirectoryEntry);
          if (!dirFiles.length) return;
          const folderName = entry.name || 'New folder';
          const newFolder: ClientFolder = { id: generateFolderId(), name: folderName, briefIds: [] };
          setFolders((prev) => [...prev, newFolder]);
          setUploadProgress(0);
          const total = dirFiles.length;
          let done = 0;
          for (const file of dirFiles) {
            const brief = await uploadSingleFile(file);
            if (brief) {
              setFolders((prev) =>
                prev.map((f) => (f.id === newFolder.id ? { ...f, briefIds: [...f.briefIds, brief.id] } : f))
              );
            }
            done += 1;
            setUploadProgress(Math.round((done / total) * 100));
          }
          setUploadProgress(null);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 4000);
        } catch (err) {
          setUploadProgress(null);
          handleUpload(files);
        }
      } else {
        handleUpload(files);
      }
    },
    [brandSlug, accessKey, handleUpload, uploadSingleFile]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files?.length && brandSlug && accessKey) {
        handleUpload(Array.from(e.clipboardData.files));
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [brandSlug, accessKey, handleUpload]);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="animate-spin text-[#111111]" size={32} />
      </div>
    );
  }

  if (!brandSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#111111]">
        Brand not found.
      </div>
    );
  }

  if (!accessKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-lg font-bold text-[#111111] mb-1">Enter access key</h1>
          <p className="text-sm text-gray-500 mb-6">Use the key shared by your team to access this drop portal.</p>
          <input
            type="text"
            placeholder="Access key"
            value={passcodeInput}
            onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#111111] mb-4"
          />
          {passcodeError && <p className="text-xs text-red-600 mb-2">{passcodeError}</p>}
          <button
            type="button"
            onClick={handlePasscodeSubmit}
            className="w-full py-3 bg-[#111111] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const brand: Brand = { id: '', name: brandName, slug: brandSlug, podId: '' };
  const brandBriefsAsBriefs = briefs.map((b) => clientBriefToBrief(b, ''));
  const briefIdsInFolders = new Set(folders.flatMap((f) => f.briefIds));
  const rootBriefs = brandBriefsAsBriefs.filter((b) => !briefIdsInFolders.has(b.id));

  return (
    <FileUpload
      className="h-screen w-screen bg-white relative flex flex-col overflow-hidden"
      fullscreen={true}
      onDrop={(files, e) => handleDrop(files, e)}
      progress={uploadProgress}
      overlayText="Drop to deliver"
    >
      {/* Top left: product name + brand name only */}
      <div className="absolute top-0 left-0 p-6 z-20 pointer-events-none">
        <p className="text-[11px] font-medium text-[#111111]">Dropam</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{brand.name}</p>
      </div>

      <div
        className="flex-1 relative z-10 overflow-y-auto flex flex-col min-h-full px-6 no-scrollbar"
        onClick={() => { setSelectedBrief(null); setSelectedFolder(null); setContextMenu(null); }}
      >
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="animate-spin text-[#111111]" size={28} />
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="w-full max-w-[1600px] mx-auto pt-8 pb-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
                {folders.map((folder) => (
                  <div key={folder.id} onClick={(e) => e.stopPropagation()}>
                    <ClientFolderIcon
                      folderId={folder.id}
                      name={folder.name}
                      count={folder.briefIds.length}
                      selected={selectedFolder?.id === folder.id}
                      onClick={() => { setSelectedBrief(null); setSelectedFolder(folder); }}
                      onDoubleClick={() => { setSelectedBrief(null); setSelectedFolder(folder); }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folder });
                      }}
                      onBriefDrop={(briefId) => moveBriefToFolder(briefId, folder.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            {rootBriefs.length === 0 && folders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-[#111111] text-lg font-medium tracking-tight">Drop your brief here</p>
                <p className="text-gray-400 text-sm mt-2">Drag a file or folder onto this page</p>
              </div>
            ) : (
              <div className="w-full max-w-[1600px] mx-auto py-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-6 gap-y-10">
                {rootBriefs.map((brief) => (
                  <div key={brief.id} onClick={(e) => e.stopPropagation()}>
                    <BriefIcon
                      brief={brief}
                      onClick={() => { setSelectedFolder(null); setSelectedBrief(brief); }}
                      onDoubleClick={() => { setSelectedFolder(null); setSelectedBrief(brief); }}
                      draggableForFolder={true}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: 'brief', brief });
                      }}
                      style={{ position: 'relative' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-[#111111] text-white px-8 py-4 rounded-2xl text-sm font-medium shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
              <span>Brief received! Our team is on it.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBrief && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setSelectedBrief(null)} />
            <SidePanel
              brief={selectedBrief}
              brand={brand}
              onClose={() => setSelectedBrief(null)}
              viewType="client"
              onClientSendMessage={async (briefId, text) => {
                await sendClientMessage(brandSlug, accessKey, briefId, text);
                getClientBriefs(brandSlug, accessKey).then(({ briefs: list }) => setBriefs(list));
              }}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFolder && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setSelectedFolder(null)} />
            <ClientFolderSidePanel
              folder={selectedFolder}
              briefsInFolder={selectedFolder.briefIds
                .map((id) => brandBriefsAsBriefs.find((b) => b.id === id))
                .filter((b): b is Brief => !!b)}
              onClose={() => setSelectedFolder(null)}
              onOpenBrief={(brief) => { setSelectedFolder(null); setSelectedBrief(brief); }}
              onRename={renameFolder}
              onDelete={deleteFolder}
              onRemoveBrief={removeBriefFromFolder}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={
              contextMenu.type === 'folder' && contextMenu.folder
                ? [
                    { label: 'Open folder', onClick: () => { setSelectedFolder(contextMenu.folder!); setContextMenu(null); } },
                    { label: 'Rename', onClick: () => { setSelectedFolder(contextMenu.folder!); setContextMenu(null); } },
                    { label: 'Delete folder', onClick: () => { deleteFolder(contextMenu.folder!.id); setContextMenu(null); }, danger: true },
                  ]
                : contextMenu.brief
                ? [
                    { label: 'View', onClick: () => { setSelectedBrief(contextMenu.brief!); setContextMenu(null); } },
                    { label: 'Send message', onClick: () => { setSelectedBrief(contextMenu.brief!); setContextMenu(null); } },
                    { label: 'Refresh', onClick: () => { getClientBriefs(brandSlug, accessKey).then(({ briefs: list }) => setBriefs(list)); setContextMenu(null); } },
                  ]
                : []
            }
          />
        )}
      </AnimatePresence>
    </FileUpload>
  );
};

