import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BriefIcon } from '../components/BriefIcon';
import { FolderIcon } from '../components/FolderIcon';
import { SidePanel } from '../components/SidePanel';
import { FileUpload } from '../components/FileUpload';
import { SpatialCanvas } from '../components/SpatialCanvas';
import { ClientFolderSidePanel } from '../components/ClientFolderSidePanel';
import {
  verifyBrandAccess,
  getClientBriefs,
  createClientBrief,
  sendClientMessage,
  type ClientBrief,
} from '../services/clientApi';
import { Brief, Brand } from '../types';
import { getClientFolders, setClientFolders, getClientBriefPositions, setClientBriefPositions, generateFolderId, type ClientFolder } from '../utils/clientFolders';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { ContextMenu } from '../components/ContextMenu';

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
    window.open(url, '_blank');
  }
}

// Download all visible files from a brief
async function downloadBriefFiles(brief: Brief) {
  // For clients, only download visible deliverables
  const files = brief.files.filter(f => f.visibleToClient || f.type === 'brief');
  if (files.length === 0) {
    alert('No files available for download');
    return;
  }
  for (let i = 0; i < files.length; i++) {
    await downloadFile(files[i].url, files[i].name);
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

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
  const { shareToken } = useParams<{ shareToken: string }>();
  const [verified, setVerified] = useState(false);
  const [brandSlug, setBrandSlug] = useState('');
  const [briefs, setBriefs] = useState<ClientBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ClientFolder | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'brief' | 'folder'; brief?: Brief; folder?: ClientFolder } | null>(null);
  const [briefPositions, setBriefPositions] = useState<Record<string, { x: number; y: number }>>({});

  const brandName = brandSlug ? brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1) : '';

  useEffect(() => {
    if (!shareToken?.trim()) {
      setAuthChecking(false);
      setVerified(false);
      return;
    }
    verifyBrandAccess(shareToken.trim()).then(({ ok, slug, error }) => {
      setAuthChecking(false);
      if (ok) {
        setVerified(true);
        setBrandSlug(slug ?? '');
      } else {
        setVerified(false);
      }
    });
  }, [shareToken]);

  useEffect(() => {
    if (!shareToken || !verified) return;
    setLoading(true);
    getClientBriefs(shareToken).then(({ briefs: list }) => {
      setBriefs(list);
      setLoading(false);
    });
  }, [shareToken, verified]);

  // Realtime: poll frequently so client sees status/deliverables without manual refresh
  useEffect(() => {
    if (!shareToken || !verified) return;
    let interval: ReturnType<typeof setInterval>;
    const poll = () => {
      if (document.visibilityState === 'visible') {
        getClientBriefs(shareToken).then(({ briefs: list }) => setBriefs(list));
      }
    };
    interval = setInterval(poll, 1500);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [shareToken, verified]);

  useEffect(() => {
    if (selectedBrief) {
      const updated = briefs.find(b => b.id === selectedBrief.id);
      if (updated) {
        const updatedAsBrief = clientBriefToBrief(updated, '');
        if (JSON.stringify(updatedAsBrief) !== JSON.stringify(selectedBrief)) {
          setSelectedBrief(updatedAsBrief);
        }
      }
    }
  }, [briefs, selectedBrief]);

  useEffect(() => {
    if (!shareToken || !verified) return;
    setFolders(getClientFolders(shareToken));
  }, [shareToken, verified]);

  useEffect(() => {
    if (!shareToken || !verified) return;
    setBriefPositions(getClientBriefPositions(shareToken));
  }, [shareToken, verified]);

  useEffect(() => {
    if (!shareToken || !verified) return;
    setClientFolders(shareToken, folders);
  }, [shareToken, verified, folders]);

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

  const updateFolderPosition = useCallback((folderId: string, position: { x: number; y: number }) => {
    setFolders((prev) => {
      const next = prev.map((f) => (f.id === folderId ? { ...f, position } : f));
      if (shareToken) setClientFolders(shareToken, next);
      return next;
    });
  }, [shareToken]);

  const updateBriefPosition = useCallback((briefId: string, position: { x: number; y: number }) => {
    setBriefPositions((prev) => {
      const next = { ...prev, [briefId]: position };
      if (shareToken) setClientBriefPositions(shareToken, next);
      return next;
    });
  }, [shareToken]);

  const uploadSingleFile = useCallback(
    (file: File): Promise<ClientBrief | null> =>
      new Promise((resolve) => {
        createClientBrief(shareToken!, file).then(({ brief }) => {
          if (brief) {
            setBriefs((prev) => [brief, ...prev]);
            resolve(brief);
          } else resolve(null);
        });
      }),
    [shareToken]
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length || !shareToken || !verified) return;

      const file = files[0];
      setUploadError(null);
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate progress while upload happens
      let progress = 0;
      const interval = setInterval(() => {
        progress += 3;
        if (progress < 90) {
          setUploadProgress(progress);
        }
      }, 50);

      try {
        const { brief, error } = await createClientBrief(shareToken, file);

        clearInterval(interval);
        setUploadProgress(100);

        // Brief delay to show 100%
        await new Promise(r => setTimeout(r, 200));
        setUploadProgress(null);
        setIsUploading(false);

        if (error) {
          setUploadError(error);
          setTimeout(() => setUploadError(null), 6000);
          return;
        }

        if (brief) {
          setBriefs((prev) => [brief, ...prev]);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 4000);
        } else {
          setUploadError('Upload failed. Please try again.');
          setTimeout(() => setUploadError(null), 6000);
        }
      } catch (err: any) {
        clearInterval(interval);
        setUploadProgress(null);
        setIsUploading(false);
        setUploadError(err.message || 'Upload failed. Please check your connection and try again.');
        setTimeout(() => setUploadError(null), 6000);
      }
    },
    [shareToken, verified]
  );

  const handleDrop = useCallback(
    async (files: File[], e: React.DragEvent) => {
      if (!files.length || !shareToken || !verified) return;
      const item = e?.dataTransfer?.items?.[0];
      const entry = item && typeof (item as any).webkitGetAsEntry === 'function' ? (item as any).webkitGetAsEntry() : null;
      if (entry?.isDirectory) {
        try {
          const dirFiles = await getFilesFromDirectoryEntry(entry as FileSystemDirectoryEntry);
          if (!dirFiles.length) {
            setUploadError('The folder appears to be empty.');
            setTimeout(() => setUploadError(null), 6000);
            return;
          }
          const folderName = entry.name || 'New folder';
          const newFolder: ClientFolder = { id: generateFolderId(), name: folderName, briefIds: [], position: { x: 120, y: 120 } };
          setFolders((prev) => [...prev, newFolder]);
          setIsUploading(true);
          setUploadProgress(0);
          setUploadError(null);

          const total = dirFiles.length;
          let done = 0;
          let failedCount = 0;

          for (const file of dirFiles) {
            const brief = await uploadSingleFile(file);
            if (brief) {
              setFolders((prev) =>
                prev.map((f) => (f.id === newFolder.id ? { ...f, briefIds: [...f.briefIds, brief.id] } : f))
              );
            } else {
              failedCount++;
            }
            done += 1;
            setUploadProgress(Math.round((done / total) * 100));
          }

          setUploadProgress(null);
          setIsUploading(false);

          if (failedCount === total) {
            setUploadError('All uploads failed. Please try again.');
            setTimeout(() => setUploadError(null), 6000);
          } else if (failedCount > 0) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
            // Show partial success warning
            setTimeout(() => {
              setUploadError(`${failedCount} of ${total} files failed to upload.`);
              setTimeout(() => setUploadError(null), 6000);
            }, 4000);
          } else {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
          }
        } catch (err: any) {
          setUploadProgress(null);
          setIsUploading(false);
          setUploadError(err.message || 'Failed to process folder. Please try again.');
          setTimeout(() => setUploadError(null), 6000);
        }
      } else {
        handleUpload(files);
      }
    },
    [shareToken, verified, handleUpload, uploadSingleFile]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files?.length && shareToken && verified) {
        handleUpload(Array.from(e.clipboardData.files));
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [shareToken, verified, handleUpload]);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="animate-spin text-[#111111]" size={32} />
      </div>
    );
  }

  if (!shareToken) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#111111]">
        Invalid link.
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <h1 className="text-lg font-bold text-[#111111] mb-2">This link is invalid or expired</h1>
          <p className="text-sm text-gray-500">Ask your team for a new link to access this area.</p>
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
      <div className="absolute top-0 left-0 p-6 z-20 pointer-events-none">
        <p className="text-[11px] font-medium text-[#111111]">Dropam</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{brand.name}</p>
      </div>

      <div className="flex-1 relative z-10 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#111111]" size={28} />
          </div>
        ) : (
          <SpatialCanvas
            onCanvasClick={() => { setSelectedBrief(null); setSelectedFolder(null); setContextMenu(null); }}
          >
            {folders.map((folder) => {
              const folderWithPosition = {
                id: folder.id,
                podId: '',
                name: folder.name,
                position: folder.position ?? { x: 0, y: 0 },
                createdAt: '',
              };
              return (
                <FolderIcon
                  key={folder.id}
                  folder={folderWithPosition as any}
                  itemCount={folder.briefIds.length}
                  selected={selectedFolder?.id === folder.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedBrief(null); setSelectedFolder(folder); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setSelectedBrief(null); setSelectedFolder(folder); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folder });
                  }}
                  onCommitPosition={(pos) => updateFolderPosition(folder.id, pos)}
                  onBriefDrop={(briefId) => moveBriefToFolder(briefId, folder.id)}
                  style={{ left: folderWithPosition.position.x, top: folderWithPosition.position.y, position: 'absolute' }}
                />
              );
            })}
            {rootBriefs.map((brief, i) => {
              const pos = briefPositions[brief.id] ?? { x: 80 + (i % 4) * 140, y: 80 + Math.floor(i / 4) * 160 };
              const briefWithPosition = { ...brief, position: pos };
              return (
                <BriefIcon
                  key={brief.id}
                  brief={briefWithPosition}
                  onClick={(e) => { e.stopPropagation(); setSelectedFolder(null); setSelectedBrief(brief); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setSelectedFolder(null); setSelectedBrief(brief); }}
                  draggableForFolder={true}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'brief', brief });
                  }}
                  onCommitPosition={(position) => updateBriefPosition(brief.id, position)}
                  style={{ left: pos.x, top: pos.y, position: 'absolute' }}
                />
              );
            })}
            {rootBriefs.length === 0 && folders.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[#111111] text-lg font-medium tracking-tight">Drop your brief here</p>
                <p className="text-gray-400 text-sm mt-2">Drag a file or folder onto this page</p>
              </div>
            )}
          </SpatialCanvas>
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
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-red-600 text-white px-8 py-4 rounded-2xl text-sm font-medium shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <XCircle size={14} className="text-white" />
              </div>
              <span>{uploadError}</span>
              <button
                onClick={() => setUploadError(null)}
                className="ml-2 text-white/70 hover:text-white transition-colors"
              >
                <XCircle size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-[#111111] text-white px-8 py-4 rounded-2xl text-sm font-medium shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" />
              <span>Uploading... {uploadProgress}%</span>
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
                await sendClientMessage(shareToken!, briefId, text);
                getClientBriefs(shareToken!).then(({ briefs: list }) => setBriefs(list));
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
                    ...(contextMenu.brief.files && contextMenu.brief.files.length > 0
                      ? [{ label: 'Download files', onClick: () => { downloadBriefFiles(contextMenu.brief!); setContextMenu(null); } }]
                      : []),
                    { label: 'Send message', onClick: () => { setSelectedBrief(contextMenu.brief!); setContextMenu(null); } },
                    { label: 'Refresh', onClick: () => { getClientBriefs(shareToken!).then(({ briefs: list }) => setBriefs(list)); setContextMenu(null); } },
                  ]
                : []
            }
          />
        )}
      </AnimatePresence>
    </FileUpload>
  );
};
