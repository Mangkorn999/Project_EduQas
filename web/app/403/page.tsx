'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ShieldOff, ArrowLeft, Home } from 'lucide-react'

/**
 * 403 Forbidden Page
 *
 * แสดงเมื่อ user พยายามเข้าหน้าที่ไม่มีสิทธิ์เข้าถึง
 * ProtectedLayout จะ redirect มาที่นี่เมื่อ route permission check ไม่ผ่าน
 */
export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#f8f9ff]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="mx-auto w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <ShieldOff className="h-10 w-10 text-red-400" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-gray-500 mb-8">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </button>
          <Link
            href="/evaluator"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-psu-navy hover:bg-psu-navy/90 transition-all shadow-md"
          >
            <Home className="h-4 w-4" />
            กลับหน้าหลัก
          </Link>
        </div>
      </motion.div>
    </main>
  )
}
