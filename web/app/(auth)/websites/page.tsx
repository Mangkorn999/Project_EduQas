'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {ExternalLink, Pencil, Plus, Search, Trash2, Upload, X} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {apiDelete, apiGet, apiPatch, apiPost} from '@/lib/api';
import {cn} from '@/lib/utils';
import {PermissionGate} from '@/components/auth/PermissionGate';

type Website = {
  id: string;
  name: string;
  url: string;
  ownerFacultyId: string | null;
};

type Faculty = {id: string; nameTh: string};

const websiteSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อเว็บไซต์'),
  url: z.string().url('URL ไม่ถูกต้อง'),
  ownerFacultyId: z.string().optional().transform((v) => (v === '' ? undefined : v)),
});

type WebsiteFormValues = z.infer<typeof websiteSchema>;

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Website | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const facultyMap = useMemo(
    () => new Map(faculties.map((f) => [f.id, f.nameTh])),
    [faculties]
  );

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/api/v1/websites');
      setWebsites(res.data ?? []);
    } catch {
      // empty state shown in UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
    apiGet('/api/v1/faculties').then((res) => setFaculties(res.data ?? [])).catch(() => {});
  }, []);

  const filteredWebsites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return websites;
    return websites.filter((w) =>
      w.name.toLowerCase().includes(q) || w.url.toLowerCase().includes(q)
    );
  }, [websites, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบเว็บไซต์นี้?')) return;
    try {
      setDeletingId(id);
      await apiDelete(`/api/v1/websites/${id}`);
      setWebsites((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${baseUrl}/api/v1/websites/import`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? {Authorization: `Bearer ${token}`} : {},
        body: formData,
      });
      await fetchWebsites();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'นำเข้าไม่สำเร็จ');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <motion.div initial={{x: -20, opacity: 0}} animate={{x: 0, opacity: 1}}>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">เว็บไซต์</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">จัดการรายการเว็บไซต์หน่วยงาน</p>
        </motion.div>

        <div className="flex items-center gap-2">
          <PermissionGate permission="website_target.manage.global">
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Upload className="h-4 w-4" />
                นำเข้า XLSX
              </button>
            </>
          </PermissionGate>
          <PermissionGate permission="website_target.manage.faculty">
            <motion.button
              initial={{x: 20, opacity: 0}}
              animate={{x: 0, opacity: 1}}
              onClick={() => { setEditTarget(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-[#1C1917] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-stone-700"
            >
              <Plus className="h-5 w-5" />
              เพิ่มเว็บไซต์
            </motion.button>
          </PermissionGate>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
        <div className="border-b border-[var(--border)] p-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือ URL..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>
          ) : filteredWebsites.length === 0 ? (
            <div className="p-20 text-center text-[var(--text-muted)]">ไม่พบเว็บไซต์</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">ชื่อเว็บไซต์</th>
                  <th className="px-6 py-4 font-semibold">URL</th>
                  <th className="px-6 py-4 font-semibold">คณะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredWebsites.map((website) => (
                  <tr key={website.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">{website.name}</td>
                    <td className="px-6 py-4">
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-[#CA8A04] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[200px] truncate">{website.url}</span>
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{website.ownerFacultyId ? (facultyMap.get(website.ownerFacultyId) ?? '—') : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <PermissionGate permission="website_target.manage.faculty">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditTarget(website); setIsModalOpen(true); }}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(website.id)}
                            disabled={deletingId === website.id}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <WebsiteModal
          website={editTarget}
          faculties={faculties}
          onClose={() => setIsModalOpen(false)}
          onSaved={async () => { setIsModalOpen(false); await fetchWebsites(); }}
        />
      )}
    </div>
  );
}

function WebsiteModal({
  website,
  faculties,
  onClose,
  onSaved,
}: {
  website: Website | null;
  faculties: Faculty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = website !== null;
  const {register, handleSubmit, formState: {errors}, reset} = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteSchema),
  });

  useEffect(() => {
    reset(isEdit ? {name: website.name, url: website.url, ownerFacultyId: website.ownerFacultyId ?? undefined} : {name: '', url: '', ownerFacultyId: undefined});
  }, [website, isEdit, reset]);

  const onSubmit = async (data: WebsiteFormValues) => {
    try {
      // ลบ ownerFacultyId ที่เป็นค่าว่างออกก่อนส่ง API เพื่อไม่ให้ backend ได้รับค่า ""
      const payload = {
        name: data.name,
        url: data.url,
        ...(data.ownerFacultyId ? { ownerFacultyId: data.ownerFacultyId } : {}),
      };
      if (isEdit && website) {
        await apiPatch(`/api/v1/websites/${website.id}`, payload);
      } else {
        await apiPost('/api/v1/websites', payload);
      }
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{scale: 0.9, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{isEdit ? 'แก้ไขเว็บไซต์' : 'เพิ่มเว็บไซต์ใหม่'}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[80vh] overflow-y-auto p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">ชื่อเว็บไซต์</label>
            <input {...register('name')} type="text" placeholder="เช่น คณะวิศวกรรมศาสตร์ มอ."
              className={cn('w-full rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2',
                errors.name ? 'border-red-300 focus:ring-red-100' : 'border-[var(--border)] focus:ring-[#CA8A04]/20')} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">URL</label>
            <input {...register('url')} type="url" placeholder="https://example.psu.ac.th"
              className={cn('w-full rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2',
                errors.url ? 'border-red-300 focus:ring-red-100' : 'border-[var(--border)] focus:ring-[#CA8A04]/20')} />
            {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">คณะ/หน่วยงาน (ถ้ามี)</label>
            <select {...register('ownerFacultyId')}
              className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20">
              <option value="">— ไม่ระบุ —</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.nameTh}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl px-4 py-3 font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]">ยกเลิก</button>
            <button type="submit"
              className="flex-1 rounded-xl bg-[#CA8A04] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#A16207]">
              {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มเว็บไซต์'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
