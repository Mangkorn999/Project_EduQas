/**
 * Standardized Error Response Helper
 *
 * ทุก non-2xx response ต้องมี requestId เพื่อ traceability
 * ตาม api-contracts.md §1.2
 *
 * Format: { error: { code, message, requestId, details? } }
 */

import { FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'

export interface ErrorPayload {
  code: string
  message: string
  requestId: string
  details?: { field: string; reason: string }[]
}

/**
 * ส่ง error response มาตรฐาน พร้อม requestId อัตโนมัติ
 * ใช้แทน reply.code(xxx).send({ error: {...} }) ทุกจุด
 * เพื่อให้ frontend สามารถแสดง requestId สำหรับ support ได้
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: { field: string; reason: string }[]
): void {
  const payload: ErrorPayload = {
    code,
    message,
    requestId: randomUUID(),
    ...(details && { details }),
  }
  reply.code(statusCode).send({ error: payload })
}

/**
 * สร้าง error object โดยไม่ส่ง reply (สำหรับ return ตรงๆ)
 */
export function buildError(
  code: string,
  message: string,
  details?: { field: string; reason: string }[]
): { error: ErrorPayload } {
  return {
    error: {
      code,
      message,
      requestId: randomUUID(),
      ...(details && { details }),
    },
  }
}
