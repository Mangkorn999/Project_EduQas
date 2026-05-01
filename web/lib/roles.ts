import type {UserRole} from '@/lib/permissions';

export const ALL_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'executive',
  'teacher',
  'staff',
  'student',
];

export const ROLE_LABELS = {
  th: {
    super_admin: 'ผู้ดูแลระบบกลาง',
    admin: 'ผู้ดูแลคณะ',
    executive: 'ผู้บริหาร',
    teacher: 'อาจารย์',
    staff: 'บุคลากร',
    student: 'นักศึกษา',
  },
  en: {
    super_admin: 'System Admin',
    admin: 'Faculty Admin',
    executive: 'Executive',
    teacher: 'Lecturer',
    staff: 'Staff',
    student: 'Student',
  },
} as const;

export function getRoleLabel(role: UserRole, locale: string) {
  return ROLE_LABELS[locale === 'en' ? 'en' : 'th'][role];
}

export function getAvailableRoles(roles?: UserRole[]) {
  return roles && roles.length > 0 ? roles : ALL_ROLES;
}
