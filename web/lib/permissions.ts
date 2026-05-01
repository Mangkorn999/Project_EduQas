/**
 * Frontend Permission Map — mirrors backend/api/src/lib/permissions.ts
 *
 * เหตุผล: ใช้เป็น single source of truth ฝั่ง frontend เพื่อตัดสินใจว่า
 * UI element ใดควรแสดงผลให้ role ใด โดยไม่ต้อง scatter role-check ไปทุกไฟล์
 *
 * ⚠️ นี่คือ UX layer เท่านั้น — backend ยังเป็น enforcement จริง
 */

export const PERMISSIONS = {
  'website_target.manage.global': ['super_admin'],
  'website_target.manage.faculty': ['super_admin', 'admin'],
  'round.create.university': ['super_admin'],
  'round.create.faculty': ['super_admin', 'admin'],
  'form.create': ['super_admin', 'admin'],
  'form.create.university_scope': ['super_admin'],
  'template.manage.global': ['super_admin'],
  'template.manage.faculty': ['super_admin', 'admin'],
  'evaluate.assigned': ['teacher', 'staff', 'student'],
  'dashboard.cross_faculty': ['super_admin', 'executive'],
  'dashboard.faculty': ['super_admin', 'admin'],
  'report.export_pdf': ['super_admin', 'admin', 'executive'],
  'user.manage': ['super_admin'],
  'audit.view': ['super_admin'],
} as const

export type PermissionKey = keyof typeof PERMISSIONS
export type UserRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'

/**
 * ตรวจสอบว่า role มี permission ที่ระบุหรือไม่
 */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[]
  return allowedRoles.includes(role)
}

/**
 * ตรวจสอบว่า role มี permission ใดๆ ในรายการที่ระบุหรือไม่
 * ใช้เมื่อ UI element ต้องการ OR logic (แสดงถ้ามีสิทธิ์ใดสิทธิ์หนึ่ง)
 */
export function hasAnyPermission(role: UserRole, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * ตรวจสอบว่า user สามารถเข้าถึงข้อมูลของคณะเป้าหมายได้หรือไม่
 * super_admin → true เสมอ
 * admin → เฉพาะ facultyId ตรงกันเท่านั้น
 * อื่นๆ → false
 */
export function canAccessFaculty(
  role: UserRole,
  userFacultyId: string | null,
  targetFacultyId: string | null
): boolean {
  if (role === 'super_admin') return true
  if (role === 'admin') {
    if (!userFacultyId || !targetFacultyId) return false
    return userFacultyId === targetFacultyId
  }
  return false
}
