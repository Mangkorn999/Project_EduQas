'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiPost } from '@/lib/api';
import { Shield, ShieldAlert, Briefcase, GraduationCap, Users, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'super_admin', label: 'Super Admin', icon: ShieldAlert, color: 'bg-red-100 text-red-700' },
  { id: 'admin', label: 'Faculty Admin', icon: Shield, color: 'bg-orange-100 text-orange-700' },
  { id: 'executive', label: 'Executive', icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
  { id: 'teacher', label: 'Teacher', icon: GraduationCap, color: 'bg-blue-100 text-blue-700' },
  { id: 'staff', label: 'Staff', icon: Users, color: 'bg-teal-100 text-teal-700' },
  { id: 'student', label: 'Student', icon: UserCircle, color: 'bg-green-100 text-green-700' },
];

export default function RoleSelectorPage() {
  const router = useRouter();
  const { user, setUserRole } = useAuthStore();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleSelectRole = async (role: string) => {
    try {
      setLoadingRole(role);
      await setUserRole(role as any);
      
      // Route appropriately
      if (['super_admin', 'admin', 'executive'].includes(role)) {
        router.push('/dashboard');
      } else {
        router.push('/evaluator');
      }
    } catch (err) {
      console.error('Failed to set role', err);
      alert('Failed to change role');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 md:p-12 text-center bg-psu-navy text-white">
          <h1 className="text-3xl font-bold mb-2">Development Mode</h1>
          <p className="text-blue-200">เลือก Role ที่ต้องการทดสอบ (สำหรับ Dev เท่านั้น)</p>
          {user && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
              Current Role: <span className="font-bold text-psu-gold uppercase">{user.role}</span>
            </div>
          )}
        </div>
        
        <div className="p-8 md:p-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                disabled={loadingRole !== null}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 transition-all text-left",
                  user?.role === role.id 
                    ? "border-psu-navy bg-blue-50 shadow-md" 
                    : "border-gray-100 hover:border-psu-navy/30 hover:bg-gray-50 hover:shadow-sm",
                  loadingRole === role.id ? "opacity-70 cursor-wait" : ""
                )}
              >
                <div className={cn("p-4 rounded-full", role.color)}>
                  <role.icon className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-gray-900">{role.label}</h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{role.id}</p>
                </div>
                {loadingRole === role.id && (
                  <div className="absolute inset-0 bg-white/50 rounded-2xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-psu-navy border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center gap-4">
            <button 
              onClick={() => {
                if (['super_admin', 'admin', 'executive'].includes(user?.role || '')) {
                  router.push('/dashboard');
                } else {
                  router.push('/evaluator');
                }
              }}
              className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Skip (Use Current Role)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
