import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Brief, BriefStatus, Priority, BriefFile, Folder } from '../types';
import { useData } from './DataContext';
import { useUser } from './UserContext';
import { useToast } from './ToastContext';
import { supabase } from '../services/supabaseClient';

interface ActionContextType {
  addBrief: (brandId: string, file: File, position?: { x: number; y: number }, status?: BriefStatus) => Promise<Brief | null>;
  updateBriefStatus: (briefId: string, status: BriefStatus) => Promise<boolean>;
  assignBrief: (briefId: string, userId: string, userName: string) => Promise<boolean>;
  updateBriefMeta: (briefId: string, meta: { deadline?: Date | null; priority?: Priority }) => Promise<boolean>;
  addMessage: (briefId: string, text: string, visibility: 'internal' | 'client') => Promise<boolean>;
  addDeliverable: (briefId: string, file: File) => Promise<BriefFile | null>;
  deleteFile: (briefId: string, fileId: string) => Promise<boolean>;
  updateGuidance: (briefId: string, text: string) => Promise<boolean>;
  updateBriefPosition: (briefId: string, position: { x: number; y: number }) => Promise<boolean>;
  updateFolderPosition: (folderId: string, position: { x: number; y: number }) => Promise<boolean>;
  createFolder: (podId: string, name: string, position: { x: number; y: number }) => Promise<Folder | null>;
  moveBriefToFolder: (briefId: string, folderId: string | undefined) => Promise<boolean>;
  deleteBrief: (briefId: string) => Promise<boolean>;
  deleteFolder: (folderId: string) => Promise<boolean>;
  stackBriefs: (targetBriefId: string, sourceBriefId: string) => Promise<boolean>;
  unstackBrief: (briefId: string, newPosition: { x: number; y: number }) => Promise<boolean>;
  updateBriefTitle: (briefId: string, title: string) => Promise<boolean>;
  updateFolderName: (folderId: string, name: string) => Promise<boolean>;
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

export const ActionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { brands, setBriefs, setFolders, briefs, folders } = useData();
  const { currentUser } = useUser();
  const toast = useToast();

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error } = await supabase.storage
      .from('brief-assets')
      .upload(fileName, file);

    if (error) {
      console.error('Upload failed', error);
      toast.error(`File upload failed: ${error.message}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('brief-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const addBrief = useCallback(async (
    brandId: string,
    file: File,
    position?: { x: number; y: number },
    status: BriefStatus = 'new'
  ): Promise<Brief | null> => {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) {
      toast.error('Brand not found');
      return null;
    }

    const url = await uploadFileToStorage(file);
    if (!url) return null;

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

    if (briefError || !briefData) {
      toast.error(`Failed to create brief: ${briefError?.message || 'Unknown error'}`);
      return null;
    }

    const { error: fileError } = await supabase.from('brief_files').insert({
      brief_id: briefData.id,
      name: file.name,
      type: 'brief',
      url: url
    });

    if (fileError) {
      toast.warning('Brief created but file attachment failed');
    }

    toast.success('Brief created successfully');
    return briefData as Brief;
  }, [brands, toast]);

  const updateBriefStatus = useCallback(async (briefId: string, status: BriefStatus): Promise<boolean> => {
    // Capture previous state for rollback
    const previousBriefs = [...briefs];
    const brief = briefs.find(b => b.id === briefId);
    if (!brief) {
      toast.error('Brief not found');
      return false;
    }

    // Optimistic update
    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, status } : b));

    const { error } = await supabase.from('briefs').update({ status }).eq('id', briefId);

    if (error) {
      // Rollback
      setBriefs(previousBriefs);
      toast.error(`Failed to update status: ${error.message}`);
      return false;
    }

    // If delivered, make deliverables visible to client
    if (status === 'delivered') {
      const { error: filesError } = await supabase
        .from('brief_files')
        .update({ visible_to_client: true })
        .eq('brief_id', briefId)
        .eq('type', 'deliverable');

      if (filesError) {
        toast.warning('Status updated but deliverable visibility failed');
      } else {
        setBriefs(prev => prev.map(b =>
          b.id === briefId
            ? { ...b, status, files: b.files.map(f => f.type === 'deliverable' ? { ...f, visibleToClient: true } : f) }
            : b
        ));
      }
    }

    toast.success(`Brief marked as ${status.replace('_', ' ')}`);
    return true;
  }, [briefs, setBriefs, toast]);

  const updateBriefPosition = useCallback(async (briefId: string, position: { x: number; y: number }): Promise<boolean> => {
    const previousBriefs = [...briefs];

    // Optimistic update (no toast for position changes - too noisy)
    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, position } : b));

    const { error } = await supabase.from('briefs').update({
      position_x: position.x,
      position_y: position.y
    }).eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      // Silent failure for position - would be too disruptive during drag
      console.error('Position update failed:', error);
      return false;
    }

    return true;
  }, [briefs, setBriefs]);

  const updateFolderPosition = useCallback(async (folderId: string, position: { x: number; y: number }): Promise<boolean> => {
    const previousFolders = [...folders];

    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, position } : f));

    const { error } = await supabase.from('folders').update({
      position_x: position.x,
      position_y: position.y
    }).eq('id', folderId);

    if (error) {
      setFolders(previousFolders);
      console.error('Folder position update failed:', error);
      return false;
    }

    return true;
  }, [folders, setFolders]);

  const assignBrief = useCallback(async (briefId: string, userId: string, userName: string): Promise<boolean> => {
    const previousBriefs = [...briefs];

    setBriefs(prev => prev.map(b =>
      b.id === briefId
        ? { ...b, ownerId: userId, ownerName: userName, status: 'in_progress' as BriefStatus }
        : b
    ));

    const { error } = await supabase.from('briefs').update({
      owner_id: userId,
      owner_name: userName,
      status: 'in_progress'
    }).eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to assign brief: ${error.message}`);
      return false;
    }

    toast.success(`Brief assigned to ${userName}`);
    return true;
  }, [briefs, setBriefs, toast]);

  const updateBriefMeta = useCallback(async (briefId: string, meta: { deadline?: Date | null; priority?: Priority }): Promise<boolean> => {
    const previousBriefs = [...briefs];
    const updates: Record<string, unknown> = {};

    if (meta.priority) updates.priority = meta.priority;
    if (meta.deadline !== undefined) {
      updates.deadline = meta.deadline ? meta.deadline.toISOString() : null;
    }

    setBriefs(prev => prev.map(b =>
      b.id === briefId ? { ...b, ...meta } : b
    ));

    const { error } = await supabase.from('briefs').update(updates).eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to update brief: ${error.message}`);
      return false;
    }

    toast.success('Brief updated');
    return true;
  }, [briefs, setBriefs, toast]);

  const addMessage = useCallback(async (briefId: string, text: string, visibility: 'internal' | 'client'): Promise<boolean> => {
    if (!currentUser) {
      toast.error('You must be logged in to send messages');
      return false;
    }

    const { error } = await supabase.from('messages').insert({
      brief_id: briefId,
      author_id: currentUser.id,
      author_name: currentUser.name,
      author_type: 'user',
      text,
      visibility
    });

    if (error) {
      toast.error(`Failed to send message: ${error.message}`);
      return false;
    }

    toast.success('Message sent');
    return true;
  }, [currentUser, toast]);

  const addDeliverable = useCallback(async (briefId: string, file: File): Promise<BriefFile | null> => {
    const url = await uploadFileToStorage(file);
    if (!url) return null;

    const { data, error } = await supabase.from('brief_files').insert({
      brief_id: briefId,
      name: file.name,
      type: 'deliverable',
      url: url
    }).select().single();

    if (error || !data) {
      toast.error(`Failed to add deliverable: ${error?.message || 'Unknown error'}`);
      return null;
    }

    // Update local state
    setBriefs(prev => prev.map(b => {
      if (b.id === briefId) {
        return {
          ...b,
          files: [...b.files, {
            id: data.id,
            name: file.name,
            type: 'deliverable',
            url: url,
            visibleToClient: false,
            uploadedAt: new Date().toISOString()
          }]
        };
      }
      return b;
    }));

    toast.success('Deliverable uploaded');
    return data as BriefFile;
  }, [setBriefs, toast]);

  const deleteFile = useCallback(async (briefId: string, fileId: string): Promise<boolean> => {
    const previousBriefs = [...briefs];

    // Optimistic update
    setBriefs(prev => prev.map(b => {
      if (b.id === briefId) {
        return { ...b, files: b.files.filter(f => f.id !== fileId) };
      }
      return b;
    }));

    const { error } = await supabase.from('brief_files').delete().eq('id', fileId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to delete file: ${error.message}`);
      return false;
    }

    toast.success('File deleted');
    return true;
  }, [briefs, setBriefs, toast]);

  const updateGuidance = useCallback(async (briefId: string, text: string): Promise<boolean> => {
    const previousBriefs = [...briefs];

    setBriefs(prev => prev.map(b =>
      b.id === briefId ? { ...b, guidance: text } : b
    ));

    const { error } = await supabase.from('briefs').update({ guidance: text }).eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to update guidance: ${error.message}`);
      return false;
    }

    return true;
  }, [briefs, setBriefs, toast]);

  const createFolder = useCallback(async (podId: string, name: string, position: { x: number; y: number }): Promise<Folder | null> => {
    const { data, error } = await supabase.from('folders').insert({
      pod_id: podId,
      name,
      position_x: position.x,
      position_y: position.y
    }).select().single();

    if (error || !data) {
      toast.error(`Failed to create folder: ${error?.message || 'Unknown error'}`);
      return null;
    }

    toast.success('Folder created');
    return {
      id: data.id,
      podId: data.pod_id,
      name: data.name,
      position: { x: data.position_x, y: data.position_y },
      createdAt: data.created_at
    };
  }, [toast]);

  const moveBriefToFolder = useCallback(async (briefId: string, folderId: string | undefined): Promise<boolean> => {
    const previousBriefs = [...briefs];

    setBriefs(prev => prev.map(b =>
      b.id === briefId ? { ...b, folderId, stackId: undefined } : b
    ));

    const { error } = await supabase.from('briefs').update({
      folder_id: folderId || null,
      stack_id: null
    }).eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to move brief: ${error.message}`);
      return false;
    }

    return true;
  }, [briefs, setBriefs, toast]);

  const deleteBrief = useCallback(async (briefId: string): Promise<boolean> => {
    const previousBriefs = [...briefs];

    setBriefs(prev => prev.filter(b => b.id !== briefId));

    const { error } = await supabase.from('briefs').delete().eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to delete brief: ${error.message}`);
      return false;
    }

    toast.success('Brief deleted');
    return true;
  }, [briefs, setBriefs, toast]);

  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    const previousFolders = [...folders];
    const previousBriefs = [...briefs];

    setFolders(prev => prev.filter(f => f.id !== folderId));
    setBriefs(prev => prev.map(b => b.folderId === folderId ? { ...b, folderId: undefined } : b));

    // First update briefs to remove folder reference
    const { error: briefsError } = await supabase.from('briefs')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    if (briefsError) {
      setFolders(previousFolders);
      setBriefs(previousBriefs);
      toast.error(`Failed to delete folder: ${briefsError.message}`);
      return false;
    }

    const { error } = await supabase.from('folders').delete().eq('id', folderId);

    if (error) {
      setFolders(previousFolders);
      setBriefs(previousBriefs);
      toast.error(`Failed to delete folder: ${error.message}`);
      return false;
    }

    toast.success('Folder deleted');
    return true;
  }, [folders, briefs, setFolders, setBriefs, toast]);

  const stackBriefs = useCallback(async (targetBriefId: string, sourceBriefId: string): Promise<boolean> => {
    const { data: target, error: fetchError } = await supabase
      .from('briefs')
      .select('stack_id, position_x, position_y')
      .eq('id', targetBriefId)
      .single();

    if (fetchError || !target) {
      toast.error('Failed to stack briefs');
      return false;
    }

    const newStackId = target.stack_id || `stack-${Date.now()}`;

    const [result1, result2] = await Promise.all([
      supabase.from('briefs').update({ stack_id: newStackId }).eq('id', targetBriefId),
      supabase.from('briefs').update({
        stack_id: newStackId,
        position_x: target.position_x,
        position_y: target.position_y
      }).eq('id', sourceBriefId)
    ]);

    if (result1.error || result2.error) {
      toast.error('Failed to stack briefs');
      return false;
    }

    return true;
  }, [toast]);

  const unstackBrief = useCallback(async (briefId: string, newPosition: { x: number; y: number }): Promise<boolean> => {
    const { error } = await supabase.from('briefs').update({
      stack_id: null,
      position_x: newPosition.x,
      position_y: newPosition.y
    }).eq('id', briefId);

    if (error) {
      toast.error('Failed to unstack brief');
      return false;
    }

    return true;
  }, [toast]);

  const updateBriefTitle = useCallback(async (briefId: string, title: string): Promise<boolean> => {
    const previousBriefs = [...briefs];

    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, title } : b));

    const { error } = await supabase.from('briefs').update({ title }).eq('id', briefId);

    if (error) {
      setBriefs(previousBriefs);
      toast.error(`Failed to update title: ${error.message}`);
      return false;
    }

    return true;
  }, [briefs, setBriefs, toast]);

  const updateFolderName = useCallback(async (folderId: string, name: string): Promise<boolean> => {
    const previousFolders = [...folders];

    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name } : f));

    const { error } = await supabase.from('folders').update({ name }).eq('id', folderId);

    if (error) {
      setFolders(previousFolders);
      toast.error(`Failed to rename folder: ${error.message}`);
      return false;
    }

    return true;
  }, [folders, setFolders, toast]);

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
      unstackBrief,
      updateBriefTitle,
      updateFolderName
    }}>
      {children}
    </ActionContext.Provider>
  );
};

export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions must be used within an ActionProvider');
  }
  return context;
};
