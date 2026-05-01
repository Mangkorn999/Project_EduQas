'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { hasPermission, hasAnyPermission, type PermissionKey, type UserRole } from '@/lib/permissions'

interface PermissionGateProps {
  /**
   * ระบุ permission เดียว — แสดง children ถ้า role มีสิทธิ์นี้
   */
  permission?: PermissionKey
  /**
   * ระบุหลาย permissions — แสดง children ถ้า role มีสิทธิ์ใดสิทธิ์หนึ่ง (OR logic)
   */
  anyOf?: PermissionKey[]
  /**
   * แสดงเมื่อไม่มีสิทธิ์ (optional fallback)
   */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * PermissionGate — Wrapper component สำหรับซ่อน UI element ตาม role
 *
 * ถ้าไม่มีสิทธิ์ → ไม่ render children เลย (ไม่ใช่ CSS hide)
 *
 * เหตุผลที่ใช้ component แทนการ check ตรงๆ:
 * 1. ป้องกัน role-check กระจายไปทุกไฟล์
 * 2. เปลี่ยน permission logic ได้จากจุดเดียว
 * 3. อ่าน JSX ง่ายขึ้น
 *
 * Usage:
 *   <PermissionGate permission="form.create">
 *     <button>สร้าง Form ใหม่</button>
 *   </PermissionGate>
 *
 *   <PermissionGate anyOf={['form.create', 'audit.view']}>
 *     <AdminPanel />
 *   </PermissionGate>
 */
export function PermissionGate({ permission, anyOf, fallback = null, children }: PermissionGateProps) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <>{fallback}</>

  const role = user.role as UserRole

  let allowed = false

  if (permission) {
    allowed = hasPermission(role, permission)
  } else if (anyOf && anyOf.length > 0) {
    allowed = hasAnyPermission(role, anyOf)
  } else {
    // ไม่ได้ระบุ permission ใดๆ → แสดงเสมอ (backward compat)
    allowed = true
  }

  if (!allowed) return <>{fallback}</>

  return <>{children}</>
}
