import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * Tiny hash-based router (no external dependency).
 * Routes look like  #/menu  #/orders  #/order/ORD-1234
 */
const current = () => window.location.hash.replace(/^#/, '') || '/';

export function navigate(to: string) {
  if (current() === to) return;
  window.location.hash = to;
}

export function useRoute() {
  const [path, setPath] = useState(current());
  useEffect(() => {
    let lastPathname = current().split('?')[0];
    const onChange = () => {
      const next = current();
      setPath(next);
      const pathname = next.split('?')[0];
      if (pathname !== lastPathname) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      lastPathname = pathname;
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const [pathname, query = ''] = path.split('?');
  return { path: pathname, query: new URLSearchParams(query) };
}

/** Matches "/order/:id" style patterns. Returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = path.split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={`#${to}`} onClick={handle} {...rest} />;
}
