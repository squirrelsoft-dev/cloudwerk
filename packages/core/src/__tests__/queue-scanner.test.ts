import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isQueueFile,
  fileNameToQueueName,
  queueNameToBindingName,
  queueNameToCloudflareQueueName,
  scanQueuesSync,
} from '../queue-scanner.js'

describe('queue-scanner', () => {
  describe('isQueueFile', () => {
    it('should return true for valid TypeScript files', () => {
      expect(isQueueFile('email.ts')).toBe(true)
      expect(isQueueFile('image-processing.ts')).toBe(true)
      expect(isQueueFile('notifications.tsx')).toBe(true)
    })

    it('should return true for valid JavaScript files', () => {
      expect(isQueueFile('email.js')).toBe(true)
      expect(isQueueFile('queue.jsx')).toBe(true)
    })

    it('should return false for test files', () => {
      expect(isQueueFile('email.test.ts')).toBe(false)
      expect(isQueueFile('email.spec.ts')).toBe(false)
    })

    it('should return false for type definition files', () => {
      expect(isQueueFile('email.d.ts')).toBe(false)
      expect(isQueueFile('types.d.ts')).toBe(false)
    })

    it('should return false for unsupported extensions', () => {
      expect(isQueueFile('email.md')).toBe(false)
      expect(isQueueFile('email.json')).toBe(false)
      expect(isQueueFile('email.css')).toBe(false)
    })
  })

  describe('fileNameToQueueName', () => {
    it('should convert single-word names', () => {
      expect(fileNameToQueueName('email')).toBe('email')
      expect(fileNameToQueueName('notifications')).toBe('notifications')
    })

    it('should convert kebab-case to camelCase', () => {
      expect(fileNameToQueueName('image-processing')).toBe('imageProcessing')
      expect(fileNameToQueueName('send-notifications')).toBe('sendNotifications')
      expect(fileNameToQueueName('my-long-queue-name')).toBe('myLongQueueName')
    })

    it('should handle names without hyphens', () => {
      expect(fileNameToQueueName('emailqueue')).toBe('emailqueue')
    })
  })

  describe('queueNameToBindingName', () => {
    it('should convert simple names to SCREAMING_SNAKE_CASE_QUEUE', () => {
      expect(queueNameToBindingName('email')).toBe('EMAIL_QUEUE')
      expect(queueNameToBindingName('notifications')).toBe('NOTIFICATIONS_QUEUE')
    })

    it('should convert camelCase names', () => {
      expect(queueNameToBindingName('imageProcessing')).toBe('IMAGE_PROCESSING_QUEUE')
      expect(queueNameToBindingName('sendNotifications')).toBe('SEND_NOTIFICATIONS_QUEUE')
    })
  })

  describe('queueNameToCloudflareQueueName', () => {
    it('should convert simple names with cloudwerk prefix', () => {
      expect(queueNameToCloudflareQueueName('email')).toBe('cloudwerk-email')
      expect(queueNameToCloudflareQueueName('notifications')).toBe('cloudwerk-notifications')
    })

    it('should convert camelCase to kebab-case', () => {
      expect(queueNameToCloudflareQueueName('imageProcessing')).toBe('cloudwerk-image-processing')
      expect(queueNameToCloudflareQueueName('sendNotifications')).toBe('cloudwerk-send-notifications')
    })

    it('should use custom app name', () => {
      expect(queueNameToCloudflareQueueName('email', 'myapp')).toBe('myapp-email')
      expect(queueNameToCloudflareQueueName('imageProcessing', 'myapp')).toBe('myapp-image-processing')
    })
  })

  describe('scanQueuesSync', () => {
    let tempDir: string

    beforeAll(() => {
      // Create temporary directory structure
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-test-'))
      const queuesDir = path.join(tempDir, 'queues')
      fs.mkdirSync(queuesDir)

      // Create test queue files
      fs.writeFileSync(
        path.join(queuesDir, 'email.ts'),
        'export default defineQueue({ process: () => {} })'
      )
      fs.writeFileSync(
        path.join(queuesDir, 'image-processing.ts'),
        'export default defineQueue({ process: () => {} })'
      )
      fs.writeFileSync(
        path.join(queuesDir, 'notifications.tsx'),
        'export default defineQueue({ process: () => {} })'
      )

      // Create files that should be ignored
      fs.writeFileSync(
        path.join(queuesDir, 'email.test.ts'),
        'test file'
      )
      fs.writeFileSync(
        path.join(queuesDir, 'types.d.ts'),
        'type file'
      )
    })

    afterAll(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true })
    })

    it('should scan queue files from the queues directory', () => {
      const result = scanQueuesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.queues).toHaveLength(3)

      const queueNames = result.queues.map((q) => q.name).sort()
      expect(queueNames).toEqual(['email', 'image-processing', 'notifications'])
    })

    it('should return absolute paths', () => {
      const result = scanQueuesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      for (const queue of result.queues) {
        expect(path.isAbsolute(queue.absolutePath)).toBe(true)
        expect(fs.existsSync(queue.absolutePath)).toBe(true)
      }
    })

    it('should return relative paths from queues directory', () => {
      const result = scanQueuesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      for (const queue of result.queues) {
        expect(queue.relativePath).not.toContain(tempDir)
        expect(queue.relativePath).toMatch(/^[a-z-]+\.(ts|tsx)$/)
      }
    })

    it('should return correct extensions', () => {
      const result = scanQueuesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      const extensions = result.queues.map((q) => q.extension)
      expect(extensions).toContain('.ts')
      expect(extensions).toContain('.tsx')
    })

    it('should not include test files', () => {
      const result = scanQueuesSync(tempDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      const hasTestFile = result.queues.some((q) => q.name.includes('test'))
      expect(hasTestFile).toBe(false)
    })

    it('should return empty array when queues directory does not exist', () => {
      const nonExistentDir = path.join(tempDir, 'non-existent')

      const result = scanQueuesSync(nonExistentDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.queues).toHaveLength(0)
    })
  })
})
