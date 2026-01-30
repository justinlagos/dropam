import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Brand, Pod, Brief, Folder } from '../types';
import { supabase } from '../services/supabaseClient';

interface DataContextType {
  brands: Brand[];
  pods: Pod[];
  briefs: Brief[];
  folders: Folder[];
  setBriefs: React.Dispatch<React.SetStateAction<Brief[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setPods: React.Dispatch<React.SetStateAction<Pod[]>>;
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  loading: boolean;
  refetchSilent: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function mapBriefRow(b: any): Brief {
  return {
    id: b.id,
    brandId: b.brand_id,
    podId: b.pod_id,
    title: b.title,
    status: b.status,
    priority: b.priority,
    ownerId: b.owner_id,
    ownerName: b.owner_name,
    submittedAt: b.submitted_at,
    deadline: b.deadline,
    guidance: b.guidance,
    position: { x: Number(b.position_x), y: Number(b.position_y) },
    folderId: b.folder_id,
    stackId: b.stack_id,
    files: (b.brief_files || []).map((f: any) => ({
      id: f.id, name: f.name, type: f.type, url: f.url, uploadedAt: f.uploaded_at, visibleToClient: f.visible_to_client
    })),
    messages: (b.messages || []).map((m: any) => ({
      id: m.id, briefId: m.brief_id, authorName: m.author_name, text: m.text, visibility: m.visibility, authorType: m.author_type, createdAt: m.created_at
    }))
  };
}

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: podsData, error: podsError } = await supabase.from('pods').select('*');
      if (podsError) throw podsError;

      const { data: brandsData } = await supabase.from('brands').select('*');
      const { data: foldersData } = await supabase.from('folders').select('*');
      const { data: briefsData, error: briefsError } = await supabase
        .from('briefs')
        .select(`*, brief_files (*), messages (*)`);

      if (briefsError) console.warn("Could not fetch briefs.", briefsError);

      if (podsData) setPods(podsData.map((p: any) => ({
        id: p.id, name: p.name, slug: p.slug, description: p.description, leadName: p.lead_name, leadId: p.lead_id, archivedAt: p.archived_at
      })));
      if (brandsData) setBrands(brandsData.map((b: any) => ({
        id: b.id, name: b.name, slug: b.slug, podId: b.pod_id, isActive: b.is_active, notificationEmail: b.notification_email, archivedAt: b.archived_at, createdAt: b.created_at, updatedAt: b.updated_at
      })));
      if (foldersData) setFolders(foldersData.map((f: any) => ({
        id: f.id, podId: f.pod_id, name: f.name, position: { x: Number(f.position_x), y: Number(f.position_y) }, createdAt: f.created_at
      })));
      if (briefsData) setBriefs(briefsData.map(mapBriefRow));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refetchSilent = useCallback(() => fetchData(true), [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: patch state on INSERT/UPDATE/DELETE. On disconnect, refetch once then resubscribe.
  useEffect(() => {
    let briefsChannel: ReturnType<typeof supabase.channel>;
    let foldersChannel: ReturnType<typeof supabase.channel>;
    let filesChannel: ReturnType<typeof supabase.channel>;
    let messagesChannel: ReturnType<typeof supabase.channel>;
    let podsChannel: ReturnType<typeof supabase.channel>;

    const setupSubscriptions = () => {
      briefsChannel = supabase.channel('public:briefs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'briefs' }, async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setBriefs(prev => prev.map(b => b.id === updated.id ? {
              ...b,
              status: updated.status,
              priority: updated.priority,
              position: { x: Number(updated.position_x), y: Number(updated.position_y) },
              folderId: updated.folder_id,
              stackId: updated.stack_id,
              ownerId: updated.owner_id,
              ownerName: updated.owner_name,
              guidance: updated.guidance,
              deadline: updated.deadline
            } : b));
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as any;
            const { data: full } = await supabase.from('briefs').select('*, brief_files (*), messages (*)').eq('id', inserted.id).single();
            if (full) setBriefs(prev => [...prev, mapBriefRow(full)]);
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as any;
            setBriefs(prev => prev.filter(b => b.id !== old.id));
          }
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' && !loadingRef.current) {
            loadingRef.current = true;
            fetchData(true).finally(() => { loadingRef.current = false; });
          }
        });

      foldersChannel = supabase.channel('public:folders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setFolders(prev => prev.map(f => f.id === updated.id ? { ...f, position: { x: Number(updated.position_x), y: Number(updated.position_y) } } : f));
          } else if (payload.eventType === 'INSERT') {
            const newFolder = payload.new as any;
            setFolders(prev => [...prev, { id: newFolder.id, podId: newFolder.pod_id, name: newFolder.name, position: { x: Number(newFolder.position_x), y: Number(newFolder.position_y) }, createdAt: newFolder.created_at }]);
          } else if (payload.eventType === 'DELETE') {
            setFolders(prev => prev.filter(f => f.id !== (payload.old as any).id));
          }
        })
        .subscribe();

      filesChannel = supabase.channel('public:brief_files')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'brief_files' }, (payload) => {
          const row = payload.new || payload.old;
          const briefId = row?.brief_id;
          if (!briefId) return;
          if (payload.eventType === 'INSERT') {
            setBriefs(prev => prev.map(b => b.id === briefId ? {
              ...b,
              files: [...b.files, { id: row.id, name: row.name, type: row.type, url: row.url, uploadedAt: row.uploaded_at, visibleToClient: row.visible_to_client }]
            } : b));
          } else if (payload.eventType === 'UPDATE') {
            setBriefs(prev => prev.map(b => b.id === briefId ? {
              ...b,
              files: b.files.map(f => f.id === row.id ? { ...f, visibleToClient: row.visible_to_client } : f)
            } : b));
          } else if (payload.eventType === 'DELETE') {
            setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, files: b.files.filter(f => f.id !== row.id) } : b));
          }
        })
        .subscribe();

      messagesChannel = supabase.channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            setBriefs(prev => prev.map(b => b.id === newMsg.brief_id ? {
              ...b,
              messages: [...b.messages, { id: newMsg.id, briefId: newMsg.brief_id, authorName: newMsg.author_name, text: newMsg.text, visibility: newMsg.visibility, authorType: newMsg.author_type, createdAt: newMsg.created_at }]
            } : b));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as any;
            setBriefs(prev => prev.map(b => b.id === old.brief_id ? { ...b, messages: b.messages.filter(m => m.id !== old.id) } : b));
          }
        })
        .subscribe();

      podsChannel = supabase.channel('public:pods')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pods' }, (payload) => {
          const updated = payload.new as any;
          setPods(prev => prev.map(p => p.id === updated.id ? { ...p, leadName: updated.lead_name, leadId: updated.lead_id } : p));
        })
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      supabase.removeChannel(briefsChannel!);
      supabase.removeChannel(foldersChannel!);
      supabase.removeChannel(filesChannel!);
      supabase.removeChannel(messagesChannel!);
      supabase.removeChannel(podsChannel!);
    };
  }, [fetchData]);

  return (
    <DataContext.Provider value={{ brands, pods, briefs, setBriefs, folders, setFolders, setPods, setBrands, loading, refetchSilent }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};