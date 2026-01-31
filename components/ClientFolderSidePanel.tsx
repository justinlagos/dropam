/**
 * Side panel for a client folder. Shows folder name, briefs inside, rename, delete.
 */
import React, { useState, useEffect } from 'react';
import { X, Folder as FolderIconSvg, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Brief } from '../types';
import type { ClientFolder } from '../utils/clientFolders';

interface ClientFolderSidePanelProps {
  folder: ClientFolder;
  briefsInFolder: Brief[];
  onClose: () => void;
  onOpenBrief: (brief: Brief) => void;
  onRename: (folderId: string, name: string) => void;
  onDelete: (folderId: string) => void;
  onRemoveBrief: (briefId: string) => void;
}

export const ClientFolderSidePanel: React.FC<ClientFolderSidePanelProps> = ({
  folder,
  briefsInFolder,
  onClose,
  onOpenBrief,
  onRename,
  onDelete,
  onRemoveBrief,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(folder.name);

  useEffect(() => {
    setNameInput(folder.name);
  }, [folder.name]);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.id, trimmed);
    }
    setEditingName(false);
  };

  return (
    <motion.div
      layout
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="h-full bg-[#FAFAFA] border-l border-gray-200/80 flex flex-col z-30 shrink-0 overflow-hidden"
    >
      <div className="w-[400px] p-6 h-full flex flex-col overflow-y-auto no-scrollbar">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Folder</span>
            <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full text-[#111111] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <FolderIconSvg size={28} className="text-gray-500" />
            </div>
            {editingName ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 px-3 py-2 text-lg font-semibold border border-gray-200 rounded-lg outline-none focus:border-gray-300"
                  autoFocus
                />
              </div>
            ) : (
              <h2
                className="text-xl font-semibold text-[#111111] leading-snug tracking-tight cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
                onClick={() => setEditingName(true)}
              >
                {folder.name}
              </h2>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {briefsInFolder.length} {briefsInFolder.length === 1 ? 'brief' : 'briefs'} in folder
          </p>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <button
            onClick={() => setEditingName(true)}
            className="h-10 w-full border border-gray-200 bg-white/50 text-[#111111] text-sm font-medium rounded-xl hover:bg-white transition-colors"
          >
            Rename folder
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete folder "${folder.name}"? Briefs inside will stay on the canvas.`)) {
                onDelete(folder.id);
                onClose();
              }
            }}
            className="h-10 w-full border border-red-200 bg-red-50/50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
          >
            Delete folder
          </button>
        </div>

        <div className="w-full h-px bg-black/5 mb-4" />

        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Briefs in this folder</h3>
          {briefsInFolder.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">Drag briefs from the canvas into this folder.</p>
          ) : (
            <div className="space-y-2">
              {briefsInFolder.map((brief) => (
                <div
                  key={brief.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <FileText size={18} className="text-gray-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onOpenBrief(brief)}
                    className="flex-1 text-sm font-medium text-[#111111] truncate block text-left hover:underline"
                  >
                    {brief.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBrief(brief.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-[#111111] px-2 py-1 rounded hover:bg-gray-200 transition-all"
                    title="Remove from folder"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
