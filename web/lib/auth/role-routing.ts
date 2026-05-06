import type { UserRole } from '@/lib/permissions';

type BackendRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student';

/**
 * กำหนด default path หลัง login ตาม role
 * เหตุผล: แต่ละ role มี landing page ที่เหมาะสมต่างกัน
 * admin/super_admin → หน้าจัดการ, อื่นๆ → หน้า evaluator
 */
export function getPostLoginPath(role?: UserRole | BackendRole | null) {
  // All roles now redirect to the unified dashboard
  return '/dashboard';
}