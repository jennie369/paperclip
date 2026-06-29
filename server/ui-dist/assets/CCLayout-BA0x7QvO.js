import { r as reactExports, j as jsxRuntimeExports, Q as QueryClientProvider, a as QueryClient, S as Sun, M as Moon, O as Outlet, T as ToastContainer } from './index-CvPgjxWl.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 6e4, refetchOnWindowFocus: false }
  }
});
function CCLayout() {
  const [darkMode, setDarkMode] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `cc-scope${darkMode ? " dark" : ""}`,
      style: {
        background: darkMode ? "#0a0a20" : "transparent",
        minHeight: "100%",
        color: darkMode ? "#e8e8f0" : "#111827"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end px-4 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setDarkMode(!darkMode),
            className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${darkMode ? "border-purple-500/30 text-purple-300 hover:bg-purple-500/10" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`,
            children: [
              darkMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { className: "w-3.5 h-3.5" }),
              darkMode ? "Chế độ sáng" : "Chế độ tối"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ToastContainer, { position: "bottom-right" })
      ]
    }
  ) });
}

export { CCLayout as default };
