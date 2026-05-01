import React, { useState } from 'react';
import { Search, Send, Trash2, Plus, Copy, ExternalLink } from 'lucide-react';

type RouteInfo = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: string;
};

const MOCK_ROUTES: RouteInfo[] = [
  { method: 'GET', path: '/api/v2/claude-code/projects', category: 'projects' },
  { method: 'DELETE', path: '/api/projects/:projectName', category: 'projects' },
  { method: 'PUT', path: '/api/projects/:projectName', category: 'projects' },
  { method: 'DELETE', path: '/api/projects/:projectName/sessions', category: 'sessions' },
  { method: 'GET', path: '/api/projects', category: 'projects' },
  { method: 'GET', path: '/api/plugins/:id', category: 'plugins' },
  { method: 'GET', path: '/api/plugins', category: 'plugins' },
  { method: 'PUT', path: '/api/plugins/skills/update', category: 'skills' },
];

export function ServerRoutesPane() {
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(MOCK_ROUTES[0]);

  const filteredRoutes = MOCK_ROUTES.filter((r) =>
    r.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full text-gray-300">
      {/* Route List Pane */}
      <div className="w-64 border-r border-border flex flex-col bg-[#131316]">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-[#0c0c10] border border-border rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">{filteredRoutes.length} routes in total</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredRoutes.map((route, i) => (
            <button
              key={i}
              onClick={() => setSelectedRoute(route)}
              className={`w-full text-left px-3 py-2 text-sm flex gap-2 items-center hover:bg-[#1a1a1f] transition-colors ${
                selectedRoute?.path === route.path ? 'bg-[#1a1a1f]' : ''
              }`}
            >
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  route.method === 'GET'
                    ? 'text-emerald-400 bg-emerald-400/10'
                    : route.method === 'POST'
                    ? 'text-blue-400 bg-blue-400/10'
                    : route.method === 'PUT'
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-rose-400 bg-rose-400/10'
                }`}
              >
                {route.method}
              </span>
              <span className="truncate font-mono">{route.path}</span>
            </button>
          ))}
        </div>
      </div>

      {/* API Tester Pane */}
      <div className="flex-1 flex flex-col bg-[#09090b]">
        {selectedRoute ? (
          <>
            {/* Top Bar */}
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <div
                className={`text-xs font-bold px-2 py-1 rounded ${
                  selectedRoute.method === 'GET'
                    ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                    : selectedRoute.method === 'POST'
                    ? 'text-blue-400 bg-blue-400/10 border border-blue-400/20'
                    : selectedRoute.method === 'PUT'
                    ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                    : 'text-rose-400 bg-rose-400/10 border border-rose-400/20'
                }`}
              >
                {selectedRoute.method}
              </div>
              <div className="flex-1 bg-[#131316] border border-border rounded-md px-3 py-1.5 font-mono text-sm text-white">
                {selectedRoute.path}
              </div>
              <button title="Copy Route" className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a1a1f] rounded transition-colors">
                <Copy size={16} />
              </button>
              <button title="Open in New Tab" className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a1a1f] rounded transition-colors">
                <ExternalLink size={16} />
              </button>
              <button title="Execute Request" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors ml-2">
                <Send size={14} />
                Send
              </button>
            </div>

            {/* Request Config Tabs */}
            <div className="flex gap-4 px-4 pt-4 border-b border-border">
              <button className="pb-2 text-sm text-emerald-400 border-b-2 border-emerald-400 font-medium">
                Query (1)
              </button>
              <button className="pb-2 text-sm text-gray-500 hover:text-gray-300">Headers (1)</button>
              <button className="pb-2 text-sm text-gray-500 hover:text-gray-300">Cookies (0)</button>
              <button className="pb-2 text-sm text-gray-500 hover:text-gray-300">{"</> Snippets"}</button>
            </div>

            {/* Request Body Area */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <select title="Select Client" className="bg-[#131316] border border-border rounded text-xs px-2 py-1 text-gray-300">
                  <option>App</option>
                  <option>Client</option>
                </select>
                <button title="Clear All Parameters" className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                  <Trash2 size={12} />
                  Remove All
                </button>
              </div>

              {/* Mock Query Params param */}
              <div className="flex gap-2 items-center mb-2">
                <input title="Enable Parameter" type="checkbox" defaultChecked className="accent-emerald-500" />
                <input
                  title="Parameter Name"
                  type="text"
                  placeholder="key"
                  className="flex-1 bg-[#131316] border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                />
                <input
                  title="Parameter Value"
                  type="text"
                  placeholder="Value"
                  className="flex-1 bg-[#131316] border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                />
                <select title="Parameter Type" className="bg-[#131316] border border-border rounded px-2 py-1.5 text-sm w-24">
                  <option>string</option>
                  <option>number</option>
                </select>
                <button title="Remove Parameter" className="p-1.5 text-gray-500 hover:text-rose-400 rounded transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <button title="Add New Parameter" className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mt-4 border border-border border-dashed rounded px-3 py-1">
                <Plus size={14} /> Add
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a route to test
          </div>
        )}
      </div>
    </div>
  );
}
