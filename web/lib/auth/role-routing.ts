import type { UserRole } from '@/lib/permissions';

type BackendRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student';

/**
 * กำหนด default path หลัง login ตาม role
 * เหตุผล: แต่ละ role มี landing page ที่เหมาะสมต่างกัน
 * admin/super_admin → หน้าจัดการ, อื่นๆ → หน้า evaluator
 */
export function getPostLoginPath(role?: UserRole | BackendRole | null) {
  switch (role) {
    case 'super_admin':
      return '/admin/audit';
    case 'admin':
      return '/forms';
    case 'executive':
      return '/reports';
    case 'teacher':
    case 'staff':
    case 'student':
    default:
      return '/evaluator';
  }
}