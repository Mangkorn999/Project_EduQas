import type { UserRole } from './AuthContext';

export function getPostLoginPath(role?: UserRole | null) {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    case 'executive':
      return '/executive';
    case 'user':
      return '/user';
    default:
      return '/login';
  }
}

export function isRoleRouteAllowed(pathname: string, role?: UserRole | null) {
  if (pathname === '/login' || pathname === '/callback') return true;
  if (!role) return false;

  if (pathname.startsWith('/super-admin')) return role === 'super_admin';
  if (pathname.startsWith('/admin')) return role === 'admin';
  if (pathname.startsWith('/executive')) return role === 'executive';
  if (pathname.startsWith('/user')) return role === 'user';

  return true;
}