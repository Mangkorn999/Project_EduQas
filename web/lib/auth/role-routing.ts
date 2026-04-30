import type { UserRole } from '@/lib/stores/authStore';

type BackendRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student';

export function getPostLoginPath(role?: UserRole | BackendRole | null) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin/audit';
    case 'executive':
    case 'teacher':
    case 'staff':
    case 'student':
    case 'user':
    default:
      return '/evaluator';
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