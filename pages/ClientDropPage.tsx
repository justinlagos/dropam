import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BriefIcon } from '../components/BriefIcon';
import { SidePanel } from '../components/SidePanel';
import { FileUpload } from '../components/FileUpload';
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
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { ContextMenu } from '../components/ContextMenu';

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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; brief: Brief } | null>(null);

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

  // Realtime: poll when tab is visible so client sees status/deliverables without manual refresh
  useEffect(() => {
    if (!brandSlug || !accessKey) return;
    let interval: ReturnType<typeof setInterval>;
    const poll = () => {
      if (document.visibilityState === 'visible') {
        getClientBriefs(brandSlug, accessKey).then(({ briefs: list }) => setBriefs(list));
      }
    };
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [brandSlug, accessKey]);

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
          createClientBrief(brandSlug, accessKey, file).then(({ brief, error }) => {
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

  return (
    <FileUpload
      className="h-screen w-screen bg-white relative flex flex-col overflow-hidden"
      fullscreen={true}
      onDrop={handleUpload}
      progress={uploadProgress}
      overlayText="Drop to deliver"
    >
      {/* Top left: product name + brand name only */}
      <div className="absolute top-0 left-0 p-6 z-20 pointer-events-none">
        <p className="text-[11px] font-medium text-[#111111]">Dropam</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{brand.name}</p>
      </div>

      <div className="flex-1 relative z-10 overflow-y-auto flex flex-col items-center justify-center min-h-full px-6 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-[#111111]" size={28} />
          </div>
        ) : brandBriefsAsBriefs.length === 0 ? (
          <>
            <p className="text-[#111111] text-lg font-medium tracking-tight">Drop your brief here</p>
            <p className="text-gray-400 text-sm mt-2">Drag a file onto this page</p>
          </>
        ) : (
          <div className="w-full max-w-[1600px] mx-auto py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-6 gap-y-10">
            {brandBriefsAsBriefs.map((brief) => (
              <BriefIcon
                key={brief.id}
                brief={brief}
                onClick={() => setSelectedBrief(brief)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, brief });
                }}
                style={{ position: 'relative' }}
              />
            ))}
          </div>
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
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              { label: 'View', onClick: () => { setSelectedBrief(contextMenu.brief); setContextMenu(null); } },
              { label: 'Send message', onClick: () => { setSelectedBrief(contextMenu.brief); setContextMenu(null); } },
              { label: 'Refresh', onClick: () => { getClientBriefs(brandSlug, accessKey).then(({ briefs: list }) => setBriefs(list)); setContextMenu(null); } },
            ]}
          />
        )}
      </AnimatePresence>
    </FileUpload>
  );
};

