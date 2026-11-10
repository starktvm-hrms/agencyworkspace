import { useEffect, useState } from 'react';

const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

/** Minimal hash router: #/projects/prj_1 -> ['projects', 'prj_1'] */
export function useRoute() {
  const [route, setRoute] = useState<string[]>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const navigate = (path: string) => {
  window.location.hash = '/' + path.replace(/^\//, '');
};
