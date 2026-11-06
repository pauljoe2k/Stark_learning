import { matchPath } from 'react-router-dom';

export function sharedPlaceTokenFromPath(pathname: string): string {
  return matchPath('/shared/:token', pathname)?.params.token ?? '';
}
