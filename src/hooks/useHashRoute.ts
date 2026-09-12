import { useEffect, useState } from 'react';

export type Route = 'home' | 'trip' | 'history' | 'settings';

const VALID_ROUTES: Route[] = ['home', 'trip', 'history', 'settings'];

function parseHash(): Route {
  const raw = window.location.hash.replace('#/', '') as Route;
  return VALID_ROUTES.includes(raw) ? raw : 'home';
}

/**
 * A four-route app doesn't need a routing library — this just syncs a piece
 * of state with window.location.hash so back/forward and reloads behave
 * sensibly without adding a dependency.
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = `/${next}`;
    setRoute(next);
  };

  return [route, navigate];
}
