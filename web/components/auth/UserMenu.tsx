'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { ChevronDown, LogOut, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student';

const roleLabels: Record<Role, string> = {
  super_admin: 'ผู้ดูแลระบบกลาง',
  admin: 'ผู้ดูแลคณะ',
  executive: 'ผู้บริหาร',
  teacher: 'อาจารย์',
  staff: 'บุคลากร',
  student: 'นักศึกษา',
};

const roleColors: Record<Role, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  executive: 'bg-amber-100 text-amber-700 border-amber-200',
  teacher: 'bg-green-100 text-green-700 border-green-200',
  staff: 'bg-gray-100 text-gray-700 border-gray-200',
  student: 'bg-sky-100 text-sky-700 border-sky-200',
};

interface UserMenuProps {
  onRoleChange?: (role: Role) => void;
}

export function UserMenu({ onRoleChange }: UserMenuProps) {
  const router = useRouter();
  const { user, logout, setUserRole } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSelect = async (role: Role) => {
    console.log('[UserMenu] Role button clicked:', role);
    console.log('[UserMenu] Current user:', user);

    try {
      await setUserRole(role);
      console.log('[UserMenu] Role changed successfully:', role);
      onRoleChange?.(role);
      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('[UserMenu] Role change exception:', err);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนบทบาท');
    }
  };

  const handleLogout = async () => {
    console.log('[UserMenu] Logout clicked');
    await logout();
    console.log('[UserMenu] Logout completed');
    setIsOpen(false);
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-4 border-l border-gray-100 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-all"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-900 leading-none">{user.name}</p>
          <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider">
            {user.faculty || 'ไม่มีคณะ'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-psu-navy flex items-center justify-center border-2 border-psu-gold shadow-sm">
          <User className="h-5 w-5 text-white" />
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-[9999] pointer-events-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email || user.faculty}</p>
          </div>

          {/* Role Switcher */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">สลับบทบาท</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  'super_admin',
                  'admin',
                  'executive',
                  'teacher',
                  'staff',
                  'student',
                ] as Role[]
              ).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    'px-2.5 py-2 text-xs font-medium rounded-lg border transition-all text-left',
                    roleColors[role],
                    user.role === role && 'ring-2 ring-offset-1 ring-psu-navy'
                  )}
                >
                  {roleLabels[role]}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
