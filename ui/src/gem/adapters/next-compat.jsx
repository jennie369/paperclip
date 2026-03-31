// ============================================================================
// Next.js → React Router Compatibility Adapter
// Maps Next.js navigation APIs to React Router equivalents
// ============================================================================

import { useNavigate, useLocation, useSearchParams as useRRSearchParams, Link as RRLink } from 'react-router-dom';

// Content Center pages live under /admin/cc in Gemral
const CC_BASE = '/admin/cc';

// Content Center internal routes that need prefixing
// These are paths that CC pages use (Next.js style) that map to /admin/cc/*
const CC_ROUTES = [
  '/dashboard',
  '/ai-gen',
  '/scripts',
  '/calendar',
  '/repurpose',
  '/analytics',
  '/image-gen',
  '/video-reels',
  '/brand',
  '/funnels',
  '/optim',
  '/settings',
];

/**
 * Rewrite CC-internal paths to Gemral routes
 * e.g. /scripts/123 → /admin/cc/scripts/123
 *      /ai-gen → /admin/cc/ai-gen
 *      /forum → /forum (not a CC route, no prefix)
 */
function rewritePath(path) {
  if (!path || typeof path !== 'string') return path;
  // Already has the prefix — no double-prefix
  if (path.startsWith(CC_BASE)) return path;
  // Check if it matches a CC route
  for (const route of CC_ROUTES) {
    if (path === route || path.startsWith(route + '/') || path.startsWith(route + '?')) {
      return CC_BASE + path;
    }
  }
  // Not a CC route — pass through as-is (e.g. /forum, /admin/users, external)
  return path;
}

/**
 * Drop-in replacement for Next.js useRouter()
 * Maps router.push(), router.replace(), router.back() to React Router navigate()
 */
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  return {
    push: (path) => navigate(rewritePath(path)),
    replace: (path) => navigate(rewritePath(path), { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    pathname: location.pathname,
    query: Object.fromEntries(new URLSearchParams(location.search)),
  };
}

/**
 * Drop-in replacement for Next.js usePathname()
 */
export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

/**
 * Drop-in replacement for Next.js useSearchParams()
 * Next.js returns ReadonlyURLSearchParams, React Router returns [searchParams, setSearchParams]
 * We return just the searchParams to match Next.js API
 */
export function useSearchParams() {
  const [searchParams] = useRRSearchParams();
  return searchParams;
}

/**
 * Drop-in replacement for Next.js useParams()
 */
export { useParams } from 'react-router-dom';

/**
 * Drop-in replacement for next/link
 * Maps href → to for React Router, with CC path rewriting
 */
export function Link({ href, children, ...props }) {
  return <RRLink to={rewritePath(href) || '#'} {...props}>{children}</RRLink>;
}
Link.displayName = 'Link';

// Default export for `import Link from 'next/link'`
export default Link;
