import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import {
  RouterContext,
  getCurrentLocation,
  matchPath,
  type LocationState,
  type NavigateFunction,
} from "./router-context";

export const Router: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationState>(getCurrentLocation);
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleLocationChange = () => {
      setLocation(getCurrentLocation());
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigate: NavigateFunction = useCallback((to, options = {}) => {
    if (typeof window === "undefined") return;

    if (to.startsWith("#") && !to.startsWith("#/")) {
      window.location.hash = to;
      return;
    }

    if (options.replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }

    setLocation(getCurrentLocation());

    if (!to.includes("#")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const value = useMemo(
    () => ({ location, navigate, params, setParams }),
    [location, navigate, params]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({
  to,
  replace = false,
  children,
  onClick,
  ...props
}) => {
  const { navigate } = useContext(RouterContext) || {};

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);

    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      if (navigate) {
        navigate(to, { replace });
      } else {
        window.location.href = to;
      }
    }
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

export interface RouteProps {
  path: string;
  element: React.ReactNode;
}

export const Route: React.FC<RouteProps> = () => null;

export const Routes: React.FC<{ children: React.ReactElement<RouteProps>[] | React.ReactElement<RouteProps> }> = ({ children }) => {
  const { location, setParams } = useContext(RouterContext)!;
  const childArray = React.Children.toArray(children) as React.ReactElement<RouteProps>[];

  let matchedElement: React.ReactNode = null;
  let matchedParams: Record<string, string> = {};

  for (const child of childArray) {
    const { path, element } = child.props;
    const match = matchPath(path, location.pathname);
    if (match.matched) {
      matchedElement = element;
      matchedParams = match.params;
      break;
    }
  }

  const paramsKey = JSON.stringify(matchedParams);
  useEffect(() => {
    setParams(JSON.parse(paramsKey));
  }, [paramsKey, setParams]);

  return <>{matchedElement}</>;
};
