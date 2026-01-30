import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Briefcase, User, CheckCircle, Settings, Users, Shield } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { brands, pods } = useData();
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] px-4 font-sans">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={() => setOpen(false)} 
      />
      
      <div className="relative w-full max-w-2xl bg-white/70 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command
            filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                return 0;
            }}
            className="w-full"
        >
          <div className="flex items-center px-4 border-b border-gray-200/50">
            <Search className="w-5 h-5 text-gray-500 mr-3" />
            <Command.Input 
                autoFocus 
                placeholder="Where to?" 
                className="w-full h-14 bg-transparent outline-none text-lg text-[#111111] placeholder:text-gray-400"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-py-2">
            <Command.Empty className="p-4 text-sm text-gray-500 text-center">No results found.</Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-semibold text-gray-400 mb-2 px-2">
                {pods.map(pod => (
                    <Command.Item 
                        key={pod.id}
                        value={`Go to ${pod.name}`}
                        onSelect={() => { navigate(`/pod/${pod.slug}`); setOpen(false); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                    >
                        <Briefcase size={16} className="text-gray-500" />
                        <span>Go to {pod.name}</span>
                    </Command.Item>
                ))}
            </Command.Group>

            <Command.Group heading="Brands" className="text-xs font-semibold text-gray-400 mb-2 px-2 mt-2">
                {brands.map(brand => (
                    <Command.Item 
                        key={brand.id}
                        value={`Brand ${brand.name}`}
                        onSelect={() => { 
                             const pod = pods.find(p => p.id === brand.podId);
                             if (pod) navigate(`/pod/${pod.slug}`);
                             setOpen(false); 
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                    >
                        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-gray-200 to-gray-400" />
                        <span>{brand.name}</span>
                    </Command.Item>
                ))}
            </Command.Group>

            {isAdmin && (
              <Command.Group heading="Admin" className="text-xs font-semibold text-gray-400 mb-2 px-2 mt-2">
                <Command.Item 
                  value="Manage People"
                  onSelect={() => { navigate('/settings'); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                >
                  <Users size={16} className="text-gray-500" />
                  <span>Manage People</span>
                </Command.Item>
                <Command.Item 
                  value="Manage Pods Assign Pod Lead"
                  onSelect={() => { navigate('/settings'); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                >
                  <Shield size={16} className="text-gray-500" />
                  <span>Assign Pod Lead</span>
                </Command.Item>
                <Command.Item 
                  value="Settings"
                  onSelect={() => { navigate('/settings'); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                >
                  <Settings size={16} className="text-gray-500" />
                  <span>Settings</span>
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Actions" className="text-xs font-semibold text-gray-400 mb-2 px-2 mt-2">
                <Command.Item 
                    value="Filter Urgent"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                >
                    <div className="w-4 h-4 rounded-full border border-red-500 bg-red-50" />
                    <span>Filter: Urgent</span>
                </Command.Item>
                <Command.Item 
                    value="Assign to me"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                >
                    <User size={16} className="text-gray-500" />
                    <span>Assign selected to me</span>
                </Command.Item>
                <Command.Item 
                    value="Deliver"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[#111111] hover:bg-black/5 cursor-pointer aria-selected:bg-black/5 transition-colors"
                >
                    <CheckCircle size={16} className="text-gray-500" />
                    <span>Change status to Delivered</span>
                </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200/50 bg-gray-50/50 text-[10px] text-gray-400">
             <span className="flex items-center gap-1">
                 Use <kbd className="bg-white border border-gray-200 rounded px-1 py-0.5 shadow-sm font-sans">↑</kbd> <kbd className="bg-white border border-gray-200 rounded px-1 py-0.5 shadow-sm font-sans">↓</kbd> to navigate
             </span>
             <span className="flex items-center gap-1">
                 <kbd className="bg-white border border-gray-200 rounded px-1 py-0.5 shadow-sm font-sans">↵</kbd> to select
             </span>
          </div>
        </Command>
      </div>
    </div>
  );
};