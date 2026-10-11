import { createContext, useContext } from "react";

export interface LocationState {
  pathname: string;
  search: string;
  hash: string;
}

export type NavigateFunction = (to: string, options?: { replace?: boolean }) => void;

export interface RouterContextType {
  location: LocationState;
  navigate: NavigateFunction;
  params: Record<string, string>;
  setParams: (params: Record<string, string>) => void;
}

export const RouterContext = createContext<RouterContextType | null>(null);

/**
 * Normalizes location from standard pathname or hash fallback (#/route)
 */
export function getCurrentLocation(): LocationState {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "", hash: "" };
  }

  // Check if hash-based routing is used as fallback (e.g. #/dashboard)
  if (window.location.hash.startsWith("#/")) {
    const hashWithoutHash = window.location.hash.slice(1);
    const [pathWithQuery, inPageHash] = hashWithoutHash.split("#");
    const [path, query] = pathWithQuery.split("?");
    return {
      pathname: path || "/",
      search: query ? `?${query}` : "",
      hash: inPageHash ? `#${inPageHash}` : "",
    };
  }

  return {
    pathname: window.location.pathname || "/",
    search: window.location.search || "",
    hash: window.location.hash || "",
  };
}

export function useLocation(): LocationState {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useLocation must be used within a Router");
  }
  return context.location;
}

export function useNavigate(): NavigateFunction {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useNavigate must be used within a Router");
  }
  return context.navigate;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useParams must be used within a Router");
  }
  return context.params as T;
}

/**
 * Match a pattern like "/audits/:id" against "/audits/123"
 */
export function matchPath(pattern: string, pathname: string): { matched: boolean; params: Record<string, string> } {
  if (pattern === "*") return { matched: true, params: {} };
  if (pattern === pathname) return { matched: true, params: {} };

  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pPart = patternParts[i];
    const pathPart = pathParts[i];

    if (pPart.startsWith(":")) {
      const paramName = pPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (pPart !== pathPart) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

