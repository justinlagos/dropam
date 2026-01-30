import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Brand, Pod, Brief, Folder, FileAttachment, Message } from '../types';
import { supabase } from '../services/supabaseClient';

interface DataContextType {
  brands: Brand[];
  pods: Pod[];
  briefs: Brief[];
  folders: Folder[];
  setBriefs: React.Dispatch<React.SetStateAction<Brief[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: podsData, error: podsError } = await supabase.from('pods').select('*');
        if (podsError) throw podsError;

        const { data: brandsData } = await supabase.from('brands').select('*');
        const { data: foldersData } = await supabase.from('folders').select('*');
        
        // Fetch Briefs with nested relations
        const { data: briefsData, error: briefsError } = await supabase
          .from('briefs')
          .select(`
            *,
            brief_files (*),
            messages (*)
          `);
        
        if (briefsError) {
            console.warn("Could not fetch briefs. Check if tables exist.", briefsError);
        }

        if (podsData) setPods(podsData.map(p => ({ 
            id: p.id, name: p.name, slug: p.slug, leadName: p.lead_name 
        })));
        
        if (brandsData) setBrands(brandsData.map(b => ({
            id: b.id, name: b.name, slug: b.slug, podId: b.pod_id
        })));

        if (foldersData) setFolders(foldersData.map(f => ({
            id: f.id, 
            podId: f.pod_id, 
            name: f.name, 
            position: { x: Number(f.position_x), y: Number(f.position_y) },
            createdAt: f.created_at
        })));

        if (briefsData) {
            const formattedBriefs: Brief[] = briefsData.map(b => ({
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
                // Handle potential missing relations if naming differs
                files: (b.brief_files || []).map((f: any) => ({
                    id: f.id, name: f.name, type: f.type, url: f.url, uploadedAt: f.uploaded_at
                })),
                messages: (b.messages || []).map((m: any) => ({
                    id: m.id, briefId: m.brief_id, authorName: m.author_name, text: m.text, visibility: m.visibility, createdAt: m.created_at
                }))
            }));
            setBriefs(formattedBriefs);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Realtime Subscriptions
  useEffect(() => {
    // Subscribe to Brief changes (Position updates, status changes)
    const briefsChannel = supabase.channel('public:briefs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'briefs' }, (payload) => {
            if (payload.eventType === 'UPDATE') {
                const updated = payload.new;
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
               // We could fetch the full brief here to get relations, 
               // but for V1 we rely on refresh or just the basic data.
               // Optimally: trigger a fetch for this specific ID.
            }
        })
        .subscribe();

    const foldersChannel = supabase.channel('public:folders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
            if (payload.eventType === 'UPDATE') {
                const updated = payload.new;
                setFolders(prev => prev.map(f => f.id === updated.id ? {
                    ...f,
                    position: { x: Number(updated.position_x), y: Number(updated.position_y) }
                } : f));
            } else if (payload.eventType === 'INSERT') {
                const newFolder = payload.new;
                setFolders(prev => [...prev, {
                    id: newFolder.id,
                    podId: newFolder.pod_id,
                    name: newFolder.name,
                    position: { x: Number(newFolder.position_x), y: Number(newFolder.position_y) },
                    createdAt: newFolder.created_at
                }]);
            }
        })
        .subscribe();
    
    // Subscribe to new Files
    const filesChannel = supabase.channel('public:brief_files')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'brief_files' }, (payload) => {
             const newFile = payload.new;
             setBriefs(prev => prev.map(b => {
                 if (b.id === newFile.brief_id) {
                     return {
                         ...b,
                         files: [...b.files, {
                             id: newFile.id,
                             name: newFile.name,
                             type: newFile.type,
                             url: newFile.url,
                             uploadedAt: newFile.uploaded_at
                         }]
                     }
                 }
                 return b;
             }))
        })
        .subscribe();

    // Subscribe to new Messages
    const messagesChannel = supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
             const newMsg = payload.new;
             setBriefs(prev => prev.map(b => {
                 if (b.id === newMsg.brief_id) {
                     return {
                         ...b,
                         messages: [...b.messages, {
                             id: newMsg.id,
                             briefId: newMsg.brief_id,
                             authorName: newMsg.author_name,
                             text: newMsg.text,
                             visibility: newMsg.visibility,
                             createdAt: newMsg.created_at
                         }]
                     }
                 }
                 return b;
             }))
        })
        .subscribe();

    return () => {
        supabase.removeChannel(briefsChannel);
        supabase.removeChannel(foldersChannel);
        supabase.removeChannel(filesChannel);
        supabase.removeChannel(messagesChannel);
    };
  }, []);

  return (
    <DataContext.Provider value={{ brands, pods, briefs, setBriefs, folders, setFolders, loading }}>
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