import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  BarChart3,
  Shield,
  Users,
  Bell,
  User,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import type { PermissionKey } from './permissions'

/**
 * NavItem — แต่ละรายการใน Sidebar
 *
 * permission: ถ้าระบุ — จะแสดงเฉพาะ role ที่มี permission นั้น
 *             ถ้าไม่ระบุ — แสดงให้ทุก role ที่ authenticated
 * matchPrefix: ใช้สำหรับ highlight active state เมื่อ pathname เริ่มต้นด้วยค่านี้
 */
export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  permission?: PermissionKey
  matchPrefix?: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'หน้าหลัก',
    href: '/evaluator',
    matchPrefix: '/evaluator',
  },
  {
    icon: ClipboardList,
    label: 'จัดการ Form',
    href: '/forms',
    permission: 'form.create',
    matchPrefix: '/forms',
  },
  {
    icon: ClipboardCheck,
    label: 'รายการประเมิน',
    href: '/evaluator',
    permission: 'evaluate.assigned',
  },
  {
    icon: BarChart3,
    label: 'สรุปผล / Export',
    href: '/reports',
    permission: 'report.export_pdf',
    matchPrefix: '/reports',
  },
  {
    icon: Shield,
    label: 'ตรวจสอบ Audit Log',
    href: '/admin/audit',
    permission: 'audit.view',
    matchPrefix: '/admin/audit',
  },
  {
    icon: Users,
    label: 'จัดการ PDPA',
    href: '/admin/pdpa',
    permission: 'user.manage',
    matchPrefix: '/admin/pdpa',
  },
  {
    icon: Bell,
    label: 'การแจ้งเตือน',
    href: '/notifications',
    matchPrefix: '/notifications',
  },
  {
    icon: User,
    label: 'โปรไฟล์',
    href: '/profile',
    matchPrefix: '/profile',
  },
]
