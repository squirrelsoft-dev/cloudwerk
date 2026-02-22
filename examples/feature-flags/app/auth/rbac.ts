// app/auth/rbac.ts
import { defineRBAC } from '@cloudwerk/auth/convention'

export default defineRBAC({
  roles: [
    {
      id: 'owner',
      name: 'Owner',
      permissions: ['*'],
      description: 'Full access including billing and danger zone operations',
    },
    {
      id: 'admin',
      name: 'Administrator',
      permissions: [
        'flags:*',
        'environments:*',
        'members:*',
        'api-keys:*',
        'webhooks:*',
        'audit:read',
        'analytics:read',
        'settings:read',
        'settings:update',
      ],
      description: 'Full operational access, cannot delete project or manage billing',
    },
    {
      id: 'developer',
      name: 'Developer',
      permissions: [
        'flags:create',
        'flags:read',
        'flags:update',
        'flags:delete:own',
        'flags:toggle:staging',
        'flags:toggle:development',
        'environments:read',
        'api-keys:read',
        'api-keys:create:development',
        'webhooks:read',
        'audit:read',
        'analytics:read',
      ],
      description: 'Can manage flags and toggle in non-production environments',
    },
    {
      id: 'operator',
      name: 'Operator',
      permissions: [
        'flags:read',
        'flags:toggle:*',
        'flags:update:rollout',
        'environments:read',
        'audit:read',
        'analytics:read',
      ],
      description: 'Can toggle flags and adjust rollouts in all environments including production',
    },
    {
      id: 'viewer',
      name: 'Viewer',
      permissions: [
        'flags:read',
        'environments:read',
        'audit:read',
        'analytics:read',
      ],
      description: 'Read-only access to flags and analytics',
    },
    {
      id: 'sdk',
      name: 'SDK Client',
      permissions: [
        'flags:evaluate',
      ],
      description: 'Programmatic flag evaluation only (for SDK/API access)',
    },
  ],
  defaultRole: 'viewer',
  hierarchy: {
    admin: ['developer', 'operator'],
    developer: ['viewer'],
    operator: ['viewer'],
  },
})
