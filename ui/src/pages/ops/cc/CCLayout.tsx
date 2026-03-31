// CCLayout — Wrapper cho các trang Content Center
// Bao gồm .cc-scope với light/dark mode toggle
// Dùng cho CC pages trong Phase 3 (scripts, calendar, jobs, ...)

import { useState } from "react";
import { Outlet } from "@/lib/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function CCLayout() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div
        className={`cc-scope min-h-screen${darkMode ? " dark" : ""}`}
        style={{ background: darkMode ? "#0a0a20" : "transparent" }}
      >
        {/* Nút chuyển chế độ sáng/tối — góc phải trên */}
        <div className="flex justify-end px-4 pt-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg border hover:bg-gray-100 transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-3)",
            }}
            title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
            aria-label={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {darkMode ? (
              <Sun className="w-4 h-4" style={{ color: "var(--gold)" }} />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>

        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
