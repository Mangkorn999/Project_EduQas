import type { PermissionKey } from '@/lib/permissions'

/**
 * Route → Permission mapping
 *
 * เหตุผล: ใช้ใน ProtectedLayout เพื่อตรวจสอบว่า user มีสิทธิ์เข้าหน้านั้นหรือไม่
 * ถ้า pathname match กับ key ใดก็ตาม จะต้องมี permission ที่ระบุถึงจะเข้าได้
 *
 * หน้าที่ไม่อยู่ในรายการนี้ = ทุก authenticated user เข้าได้
 */
export const ROUTE_PERMISSIONS: { prefix: string; permission: PermissionKey }[] = [
  { prefix: '/admin/audit', permission: 'audit.view' },
  { prefix: '/admin/pdpa', permission: 'user.manage' },
  { prefix: '/forms', permission: 'form.create' },
  { prefix: '/reports', permission: 'report.export_pdf' },
]

/**
 * ตรวจสอบว่า pathname ต้องการ permission ใดหรือไม่
 * คืนค่า PermissionKey ถ้าต้องการ, null ถ้าไม่ต้องการ (เข้าได้เสมอ)
 */
export function getRoutePermission(pathname: string): PermissionKey | null {
  for (const route of ROUTE_PERMISSIONS) {
    if (pathname === route.prefix || pathname.startsWith(route.prefix + '/')) {
      return route.permission
    }
  }
  return null
}
