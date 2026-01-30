import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useActions } from '../contexts/ActionContext';
import { BriefIcon } from '../components/BriefIcon';
import { SidePanel } from '../components/SidePanel';
import { FileUpload } from '../components/FileUpload';
import { Brief } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Plus, CheckCircle2 } from 'lucide-react';

export const ClientDropPage: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const { brands, briefs, loading } = useData();
  const { addBrief } = useActions();
  
  const brand = brands.find(b => b.slug === brandSlug);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
      const handlePaste = (e: ClipboardEvent) => {
          if (e.clipboardData && e.clipboardData.files.length > 0) {
              const files = Array.from(e.clipboardData.files);
              handleUpload(files);
          }
      };
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
  }, [brand]);

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
            <Loader2 className="animate-spin text-[#111111]" size={32} />
        </div>
      );
  }

  if (!brand) return <div className="min-h-screen flex items-center justify-center text-[#111111]">Brand not found.</div>;

  const brandBriefs = briefs.filter(b => b.brandId === brand.id);

  const getBrandColor = (str: string) => {
      const colors = ['#5E5CE6', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A'];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
  };

  const handleUpload = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        setUploadProgress(progress);
        if (progress >= 100) {
            clearInterval(interval);
            addBrief(brand.id, file);
            setUploadProgress(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
        }
    }, 20);
  };

  const brandColor = getBrandColor(brand.name);

  return (
    <FileUpload
      className="h-screen w-screen bg-[#F5F5F7] relative flex flex-col overflow-hidden"
      fullscreen={true}
      onDrop={handleUpload}
      progress={uploadProgress}
      overlayText="Drop to deliver"
    >
      {/* Immersive Brand Background */}
      <div 
        className="absolute top-[-40%] left-[-20%] w-[120vw] h-[120vw] rounded-full blur-[180px] opacity-[0.15] pointer-events-none mix-blend-multiply transition-colors duration-1000"
        style={{ backgroundColor: brandColor }}
      />
      <div 
        className="absolute bottom-[-30%] right-[-10%] w-[80vw] h-[80vw] rounded-full blur-[150px] opacity-[0.1] pointer-events-none mix-blend-multiply transition-colors duration-1000"
        style={{ backgroundColor: brandColor }}
      />

      {/* Navigation / Header */}
      <div className="absolute top-0 left-0 right-0 p-10 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-black/5">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: brandColor }} />
            </div>
            <div>
                <h1 className="text-xs font-bold text-[#111111] uppercase tracking-[0.2em]">{brand.name}</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Brand Drop Portal</p>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative z-10 overflow-y-auto px-12 pt-40 pb-20 no-scrollbar">
        {brandBriefs.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/40 backdrop-blur-2xl p-16 rounded-[3rem] border border-white/50 shadow-2xl max-w-md w-full"
             >
                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-lg border border-black/5 mx-auto mb-8 flex items-center justify-center">
                    <Plus size={32} className="text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold text-[#111111] mb-3 tracking-tight">Drop your first brief</h2>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                    Simply drag your files here or press <kbd className="bg-white px-2 py-0.5 rounded shadow-sm font-sans font-bold">CMD+V</kbd> to upload.
                </p>
                <div className="flex items-center justify-center gap-2 text-indigo-500 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles size={12} />
                    Magic Analysis Enabled
                </div>
             </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-6 gap-y-12 max-w-[1600px] mx-auto">
             {brandBriefs.map(brief => (
               <BriefIcon 
                  key={brief.id} 
                  brief={brief} 
                  onClick={() => setSelectedBrief(brief)}
                  style={{ position: 'relative' }} // Overriding the absolute position for grid
               />
             ))}
          </div>
        )}
      </div>

      {/* Magic Success Indicator */}
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
                    <span>Magic brief received! Our team is on it.</span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Side Panel Overlay */}
      <AnimatePresence>
        {selectedBrief && (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setSelectedBrief(null)} />
                <SidePanel 
                    brief={selectedBrief} 
                    brand={brand} 
                    onClose={() => setSelectedBrief(null)}
                    viewType="client"
                />
            </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="absolute bottom-10 left-12 right-12 flex justify-between items-center pointer-events-none opacity-40">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Dropam OS v1.0</span>
        <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">System Live</span>
        </div>
      </div>
    </FileUpload>
  );
};