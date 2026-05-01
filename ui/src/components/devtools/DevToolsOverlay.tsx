import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Zap, Database, Clock, LayoutGrid, Settings, X } from 'lucide-react';
import { ServerRoutesPane } from './ServerRoutesPane';

type DevToolsTab = 'ServerRoutes' | 'Timeline' | 'Payload' | 'Plugins' | 'Settings';

export function DevToolsOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DevToolsTab>('ServerRoutes');

  // Listen for Shift + Alt + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // altKey (Windows/Linux) or Mac option key
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tabs = [
    { id: 'ServerRoutes', label: 'Server Routes', icon: <Server size={14} /> },
    { id: 'Timeline', label: 'Timeline', icon: <Clock size={14} /> },
    { id: 'Payload', label: 'Payload', icon: <Database size={14} /> },
    { id: 'Plugins', label: 'Plugins', icon: <Zap size={14} /> },
    { id: 'Settings', label: 'Settings', icon: <Settings size={14} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col bg-[#0c0c10] border-t border-border shadow-2xl h-[450px]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#131316] border-b border-border">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white tracking-wide">Paperclip DevTools</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              title="Close DevTools"
              className="p-1 hover:bg-[#222228] rounded text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-56 bg-[#09090b] border-r border-border overflow-y-auto py-2">
              <nav className="flex flex-col gap-1 px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    title={tab.label}
                    onClick={() => setActiveTab(tab.id as DevToolsTab)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-[#1a1a1f]'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Content Pane */}
            <div className="flex-1 bg-[#131316] overflow-y-auto">
              {activeTab === 'ServerRoutes' && <ServerRoutesPane />}
              {activeTab === 'Timeline' && (
                <div className="p-6 text-gray-400 flex items-center justify-center h-full">Timeline coming soon...</div>
              )}
              {activeTab === 'Payload' && (
                <div className="p-6 text-gray-400 flex items-center justify-center h-full">Zustand Payload Explorer coming soon...</div>
              )}
              {activeTab === 'Plugins' && (
                <div className="p-6 text-gray-400 flex items-center justify-center h-full">Installed Plugins...</div>
              )}
              {activeTab === 'Settings' && (
                <div className="p-6 text-gray-400 flex items-center justify-center h-full">DevTools Settings</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
