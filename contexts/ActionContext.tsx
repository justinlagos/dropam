import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Brief, BriefStatus, Priority } from '../types';
import { useData } from './DataContext';
import { useUser } from './UserContext';
import { supabase } from '../services/supabaseClient';

interface ActionContextType {
  addBrief: (brandId: string, file: File, position?: { x: number; y: number }, status?: BriefStatus) => void;
  updateBriefStatus: (briefId: string, status: BriefStatus) => void;
  assignBrief: (briefId: string, userId: string, userName: string) => void;
  updateBriefMeta: (briefId: string, meta: { deadline?: Date | null; priority?: Priority }) => void;
  addMessage: (briefId: string, text: string, visibility: 'internal' | 'client') => void;
  addDeliverable: (briefId: string, file: File) => void;
  deleteFile: (briefId: string, fileId: string) => void;
  updateGuidance: (briefId: string, text: string) => void;
  updateBriefPosition: (briefId: string, position: { x: number; y: number }) => void;
  updateFolderPosition: (folderId: string, position: { x: number; y: number }) => void;
  createFolder: (podId: string, name: string, position: { x: number; y: number }) => void;
  moveBriefToFolder: (briefId: string, folderId: string | undefined) => void;
  deleteBrief: (briefId: string) => void;
  deleteFolder: (folderId: string) => void;
  stackBriefs: (targetBriefId: string, sourceBriefId: string) => void;
  unstackBrief: (briefId: string, newPosition: { x: number; y: number }) => void;
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

export const ActionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { brands, setBriefs, setFolders, briefs } = useData();
  const { currentUser } = useUser();

  const uploadFileToStorage = async (file: File) => {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage
          .from('brief-assets')
          .upload(fileName, file);
      
      if (error) {
          console.error("Upload failed", error);
          return null;
      }

      const { data: { publicUrl } } = supabase.storage
          .from('brief-assets')
          .getPublicUrl(fileName);
      
      return publicUrl;
  };

  const addBrief = useCallback(async (brandId: string, file: File, position?: { x: number; y: number }, status: BriefStatus = 'new') => {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;

    const url = await uploadFileToStorage(file);
    if (!url) return;

    const { data: briefData, error: briefError } = await supabase
        .from('briefs')
        .insert({
            brand_id: brandId,
            pod_id: brand.podId,
            title: file.name,
            status: status,
            position_x: position?.x || (Math.random() * 200 + 100),
            position_y: position?.y || (Math.random() * 200 + 100)
        })
        .select()
        .single();
    
    if (briefError || !briefData) return;

    await supabase.from('brief_files').insert({
        brief_id: briefData.id,
        name: file.name,
        type: 'brief',
        url: url
    });
  }, [brands]);

  const updateBriefStatus = useCallback(async (briefId: string, status: BriefStatus) => {
    await supabase.from('briefs').update({ status }).eq('id', briefId);
  }, []);

  const updateBriefPosition = useCallback(async (briefId: string, position: { x: number; y: number }) => {
    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, position } : b));
    await supabase.from('briefs').update({ 
        position_x: position.x, 
        position_y: position.y 
    }).eq('id', briefId);
  }, [setBriefs]);

  const updateFolderPosition = useCallback(async (folderId: string, position: { x: number; y: number }) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, position } : f));
    await supabase.from('folders').update({ 
        position_x: position.x, 
        position_y: position.y 
    }).eq('id', folderId);
  }, [setFolders]);

  const assignBrief = useCallback(async (briefId: string, userId: string, userName: string) => {
    await supabase.from('briefs').update({ 
        owner_id: userId, 
        owner_name: userName, 
        status: 'in_progress' 
    }).eq('id', briefId);
  }, []);

  const updateBriefMeta = useCallback(async (briefId: string, meta: { deadline?: Date | null; priority?: Priority }) => {
    const updates: any = {};
    if (meta.priority) updates.priority = meta.priority;
    if (meta.deadline !== undefined) updates.deadline = meta.deadline ? meta.deadline.toISOString() : null;
    
    await supabase.from('briefs').update(updates).eq('id', briefId);
  }, []);

  const addMessage = useCallback(async (briefId: string, text: string, visibility: 'internal' | 'client') => {
    if (!currentUser) return;
    await supabase.from('messages').insert({
        brief_id: briefId,
        author_name: currentUser.role === 'client' ? 'Client' : currentUser.name,
        text,
        visibility
    });
  }, [currentUser]);

  const addDeliverable = useCallback(async (briefId: string, file: File) => {
    const url = await uploadFileToStorage(file);
    if (!url) return;

    await supabase.from('brief_files').insert({
        brief_id: briefId,
        name: file.name,
        type: 'deliverable',
        url: url
    });
  }, []);

  const deleteFile = useCallback(async (briefId: string, fileId: string) => {
    await supabase.from('brief_files').delete().eq('id', fileId);
    setBriefs(prev => prev.map(b => {
      if (b.id === briefId) {
        return { ...b, files: b.files.filter(f => f.id !== fileId) };
      }
      return b;
    }));
  }, [setBriefs]);

  const updateGuidance = useCallback(async (briefId: string, text: string) => {
    await supabase.from('briefs').update({ guidance: text }).eq('id', briefId);
  }, []);

  const createFolder = useCallback(async (podId: string, name: string, position: { x: number; y: number }) => {
    await supabase.from('folders').insert({
        pod_id: podId,
        name,
        position_x: position.x,
        position_y: position.y
    });
  }, []);

  const moveBriefToFolder = useCallback(async (briefId: string, folderId: string | undefined) => {
    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, folderId, stackId: undefined } : b));
    await supabase.from('briefs').update({ folder_id: folderId, stack_id: null }).eq('id', briefId);
  }, [setBriefs]);

  const deleteBrief = useCallback(async (briefId: string) => {
      setBriefs(prev => prev.filter(b => b.id !== briefId));
      await supabase.from('briefs').delete().eq('id', briefId);
  }, [setBriefs]);
  
  const deleteFolder = useCallback(async (folderId: string) => {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setBriefs(prev => prev.map(b => b.folderId === folderId ? { ...b, folderId: undefined } : b));
      await supabase.from('briefs').update({ folder_id: null }).eq('folder_id', folderId);
      await supabase.from('folders').delete().eq('id', folderId);
  }, [setFolders, setBriefs]);

  const stackBriefs = useCallback(async (targetBriefId: string, sourceBriefId: string) => {
    const { data: target } = await supabase.from('briefs').select('stack_id, position_x, position_y').eq('id', targetBriefId).single();
    if (!target) return;

    const newStackId = target.stack_id || `stack-${Date.now()}`;

    const updates = [
        supabase.from('briefs').update({ stack_id: newStackId }).eq('id', targetBriefId),
        supabase.from('briefs').update({ 
            stack_id: newStackId, 
            position_x: target.position_x, 
            position_y: target.position_y 
        }).eq('id', sourceBriefId)
    ];

    await Promise.all(updates);
  }, []);

  const unstackBrief = useCallback(async (briefId: string, newPosition: { x: number; y: number }) => {
      await supabase.from('briefs').update({ 
          stack_id: null, 
          position_x: newPosition.x, 
          position_y: newPosition.y 
      }).eq('id', briefId);
  }, []);

  return (
    <ActionContext.Provider value={{
      addBrief,
      updateBriefStatus,
      assignBrief,
      updateBriefMeta,
      addMessage,
      addDeliverable,
      deleteFile,
      updateGuidance,
      updateBriefPosition,
      updateFolderPosition,
      createFolder,
      moveBriefToFolder,
      deleteBrief,
      deleteFolder,
      stackBriefs,
      unstackBrief
    }}>
      {children}
    </ActionContext.Provider>
  );
};

export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions must be used within a ActionProvider');
  }
  return context;
};