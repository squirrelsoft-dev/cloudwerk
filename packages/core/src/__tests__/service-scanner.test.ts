import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isServiceFile,
  directoryNameToServiceName,
  serviceNameToBindingName,
  serviceNameToWorkerName,
  serviceNameToEntrypointClass,
  scanServicesSync,
} from '../service-scanner.js'

describe('service-scanner', () => {
  describe('isServiceFile', () => {
    it('should return true for valid service.ts files', () => {
      expect(isServiceFile('service.ts')).toBe(true)
      expect(isServiceFile('service.tsx')).toBe(true)
    })

    it('should return true for valid JavaScript files', () => {
      expect(isServiceFile('service.js')).toBe(true)
      expect(isServiceFile('service.jsx')).toBe(true)
    })

    it('should return false for non-service files', () => {
      expect(isServiceFile('index.ts')).toBe(false)
      expect(isServiceFile('email.ts')).toBe(false)
      expect(isServiceFile('utils.ts')).toBe(false)
    })

    it('should return false for test files', () => {
      expect(isServiceFile('service.test.ts')).toBe(false)
      expect(isServiceFile('service.spec.ts')).toBe(false)
    })

    it('should return false for type definition files', () => {
      expect(isServiceFile('service.d.ts')).toBe(false)
    })

    it('should return false for unsupported extensions', () => {
      expect(isServiceFile('service.md')).toBe(false)
      expect(isServiceFile('service.json')).toBe(false)
      expect(isServiceFile('service.css')).toBe(false)
    })
  })

  describe('directoryNameToServiceName', () => {
    it('should convert single-word names', () => {
      expect(directoryNameToServiceName('email')).toBe('email')
      expect(directoryNameToServiceName('payments')).toBe('payments')
    })

    it('should convert kebab-case to camelCase', () => {
      expect(directoryNameToServiceName('user-management')).toBe('userManagement')
      expect(directoryNameToServiceName('send-emails')).toBe('sendEmails')
      expect(directoryNameToServiceName('my-long-service-name')).toBe('myLongServiceName')
    })

    it('should handle names without hyphens', () => {
      expect(directoryNameToServiceName('emailservice')).toBe('emailservice')
    })
  })

  describe('serviceNameToBindingName', () => {
    it('should convert simple names to SCREAMING_SNAKE_CASE_SERVICE', () => {
      expect(serviceNameToBindingName('email')).toBe('EMAIL_SERVICE')
      expect(serviceNameToBindingName('payments')).toBe('PAYMENTS_SERVICE')
    })

    it('should convert camelCase names', () => {
      expect(serviceNameToBindingName('userManagement')).toBe('USER_MANAGEMENT_SERVICE')
      expect(serviceNameToBindingName('sendEmails')).toBe('SEND_EMAILS_SERVICE')
    })
  })

  describe('serviceNameToWorkerName', () => {
    it('should convert simple names with -service suffix', () => {
      expect(serviceNameToWorkerName('email')).toBe('email-service')
      expect(serviceNameToWorkerName('payments')).toBe('payments-service')
    })

    it('should convert camelCase to kebab-case', () => {
      expect(serviceNameToWorkerName('userManagement')).toBe('user-management-service')
      expect(serviceNameToWorkerName('sendEmails')).toBe('send-emails-service')
    })
  })

  describe('serviceNameToEntrypointClass', () => {
    it('should convert simple names to PascalCase with Service suffix', () => {
      expect(serviceNameToEntrypointClass('email')).toBe('EmailService')
      expect(serviceNameToEntrypointClass('payments')).toBe('PaymentsService')
    })

    it('should preserve camelCase and add Service suffix', () => {
      expect(serviceNameToEntrypointClass('userManagement')).toBe('UserManagementService')
      expect(serviceNameToEntrypointClass('sendEmails')).toBe('SendEmailsService')
    })
  })

  describe('scanServicesSync', () => {
    let tempDir: string

    beforeAll(() => {
      // Create temporary directory structure
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-service-test-'))
      const servicesDir = path.join(tempDir, 'services')
      fs.mkdirSync(servicesDir)

      // Create test service directories
      const emailDir = path.join(servicesDir, 'email')
      fs.mkdirSync(emailDir)
      fs.writeFileSync(
        path.join(emailDir, 'service.ts'),
        'export default defineService({ methods: {} })'
      )

      const paymentsDir = path.join(servicesDir, 'payments')
      fs.mkdirSync(paymentsDir)
      fs.writeFileSync(
        path.join(paymentsDir, 'service.ts'),
        'export default defineService({ methods: {} })'
      )

      const userMgmtDir = path.join(servicesDir, 'user-management')
      fs.mkdirSync(userMgmtDir)
      fs.writeFileSync(
        path.join(userMgmtDir, 'service.tsx'),
        'export default defineService({ methods: {} })'
      )

      // Create files that should be ignored
      fs.writeFileSync(
        path.join(emailDir, 'utils.ts'),
        'helper file'
      )
      fs.writeFileSync(
        path.join(emailDir, 'service.test.ts'),
        'test file'
      )

      // Create a service without service.ts (should be ignored)
      const emptyDir = path.join(servicesDir, 'empty')
      fs.mkdirSync(emptyDir)
      fs.writeFileSync(
        path.join(emptyDir, 'index.ts'),
        'not a service'
      )
    })

    afterAll(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true })
    })

    it('should scan service files from the services directory', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.services).toHaveLength(3)

      const serviceNames = result.services.map((s) => s.name).sort()
      expect(serviceNames).toEqual(['email', 'payments', 'userManagement'])
    })

    it('should return absolute paths', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      for (const service of result.services) {
        expect(path.isAbsolute(service.absolutePath)).toBe(true)
        expect(fs.existsSync(service.absolutePath)).toBe(true)
      }
    })

    it('should return relative paths from services directory', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      for (const service of result.services) {
        expect(service.relativePath).not.toContain(tempDir)
        expect(service.relativePath).toMatch(/^[a-z-]+\/service\.(ts|tsx)$/)
      }
    })

    it('should return directory names', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      const dirNames = result.services.map((s) => s.directoryName).sort()
      expect(dirNames).toEqual(['email', 'payments', 'user-management'])
    })

    it('should convert directory names to camelCase service names', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      const userMgmtService = result.services.find(
        (s) => s.directoryName === 'user-management'
      )
      expect(userMgmtService).toBeDefined()
      expect(userMgmtService!.name).toBe('userManagement')
    })

    it('should return correct extensions', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      const extensions = result.services.map((s) => s.extension)
      expect(extensions).toContain('.ts')
      expect(extensions).toContain('.tsx')
    })

    it('should not include directories without service.ts', () => {
      const result = scanServicesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      const hasEmptyService = result.services.some(
        (s) => s.directoryName === 'empty'
      )
      expect(hasEmptyService).toBe(false)
    })

    it('should return empty array when services directory does not exist', () => {
      const nonExistentDir = path.join(tempDir, 'non-existent')

      const result = scanServicesSync(nonExistentDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.services).toHaveLength(0)
    })
  })
})
