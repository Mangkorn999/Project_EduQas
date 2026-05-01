import { describe, it, expect } from 'vitest'
import { hasPermission, canAccessFaculty } from '../lib/permissions'

describe('RBAC Permission System', () => {
  describe('hasPermission', () => {
    it('should allow super_admin to manage users', () => {
      expect(hasPermission('super_admin', 'user.manage')).toBe(true)
    })

    it('should NOT allow admin to manage users', () => {
      expect(hasPermission('admin', 'user.manage')).toBe(false)
    })

    it('should allow teacher to evaluate assigned forms', () => {
      expect(hasPermission('teacher', 'evaluate.assigned')).toBe(true)
    })

    it('should NOT allow student to create forms', () => {
      expect(hasPermission('student', 'form.create')).toBe(false)
    })
  })

  describe('canAccessFaculty', () => {
    it('should allow super_admin to access any faculty', () => {
      expect(canAccessFaculty('super_admin', null, 'fac-001')).toBe(true)
    })

    it('should allow admin to access their own faculty', () => {
      expect(canAccessFaculty('admin', 'fac-001', 'fac-001')).toBe(true)
    })

    it('should NOT allow admin to access other faculty', () => {
      expect(canAccessFaculty('admin', 'fac-001', 'fac-002')).toBe(false)
    })

    it('should NOT allow other roles to access faculty', () => {
      expect(canAccessFaculty('teacher', 'fac-001', 'fac-001')).toBe(false)
      expect(canAccessFaculty('student', 'fac-001', 'fac-001')).toBe(false)
    })
  })
})
