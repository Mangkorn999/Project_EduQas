export const PERMISSIONS = {
  'website_target.manage.global': ['super_admin'],
  'website_target.manage.faculty': ['super_admin', 'admin'],
  'round.create.university': ['super_admin'],
  'round.create.faculty': ['super_admin', 'admin'],
  'form.create': ['super_admin', 'admin'],
  'form.create.university_scope': ['super_admin'],
  'form.reopen': ['super_admin'],
  'template.manage.global': ['super_admin'],
  'template.manage.faculty': ['super_admin', 'admin'],
  'evaluate.assigned': ['teacher', 'staff', 'student'],
  'dashboard.cross_faculty': ['super_admin', 'executive'],
  'dashboard.faculty': ['super_admin', 'admin', 'executive'],
  'report.export_pdf': ['super_admin', 'admin', 'executive'],
  'user.manage': ['super_admin'],
  'audit.view': ['super_admin'],
} as const

export type PermissionKey = keyof typeof PERMISSIONS

/**
 * Checks if a role has a specific permission
 */
export function hasPermission(role: string, permission: PermissionKey): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[]
  return allowedRoles.includes(role)
}

/**
 * Checks if a user has access to a target faculty based on their role and facultyId
 * super_admin -> true always
 * admin -> only if userFacultyId === targetFacultyId
 * others -> false
 */
export function canAccessFaculty(
  role: string,
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
