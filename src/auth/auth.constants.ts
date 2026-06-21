export const DEFAULT_PERMISSIONS = [
  { action: 'manage', subject: 'all', description: 'Full access to all tenant resources' },
  { action: 'manage', subject: 'tenant', description: 'Manage tenant settings' },
  { action: 'manage', subject: 'users', description: 'Invite and manage users' },
  { action: 'manage', subject: 'roles', description: 'Manage roles and permissions' },
  { action: 'manage', subject: 'workspaces', description: 'Manage workspaces' },
  { action: 'manage', subject: 'teams', description: 'Manage teams' },
  { action: 'manage', subject: 'projects', description: 'Manage projects' },
  { action: 'read', subject: 'projects', description: 'View projects' },
  { action: 'manage', subject: 'tasks', description: 'Manage tasks' },
  { action: 'read', subject: 'tasks', description: 'View tasks' },
  { action: 'comment', subject: 'tasks', description: 'Comment on tasks' },
  { action: 'manage', subject: 'meetings', description: 'Create, update, cancel, and manage tenant meetings' },
  { action: 'read', subject: 'meetings', description: 'View tenant meetings and meeting details' },
  { action: 'manage', subject: 'reports', description: 'Manage reports and dashboards' },
  { action: 'read', subject: 'reports', description: 'View reports and dashboards' },
  { action: 'manage', subject: 'ai', description: 'Manage AI assistants and tenant AI controls' },
  { action: 'read', subject: 'ai', description: 'Use AI assistants and view AI conversations' },
  { action: 'manage', subject: 'billing', description: 'Manage billing and subscriptions' },
  { action: 'manage', subject: 'integrations', description: 'Manage integrations and webhooks' },
  { action: 'read', subject: 'audit_logs', description: 'View audit logs' },
  { action: 'manage', subject: 'security', description: 'Manage security policies, sessions, events, and API keys' },
  { action: 'read', subject: 'security', description: 'View security posture, sessions, events, and API keys' },
  { action: 'manage', subject: 'compliance', description: 'Manage compliance workflows and retention policies' },
  { action: 'read', subject: 'compliance', description: 'View compliance workflows and retention status' }
] as const;

export const DEFAULT_ROLES = [
  {
    name: 'Owner',
    description: 'Tenant owner with full administrative access',
    permissions: ['manage:all']
  },
  {
    name: 'Admin',
    description: 'Organization administrator',
    permissions: [
      'manage:tenant',
      'manage:users',
      'manage:roles',
      'manage:workspaces',
      'manage:teams',
      'manage:projects',
      'manage:tasks',
      'manage:meetings',
      'manage:reports',
      'manage:ai',
      'manage:integrations',
      'read:audit_logs',
      'manage:security',
      'manage:compliance'
    ]
  },
  {
    name: 'Project Manager',
    description: 'Project delivery owner',
    permissions: ['manage:projects', 'manage:tasks', 'manage:meetings', 'read:reports', 'read:ai']
  },
  {
    name: 'Team Lead',
    description: 'Team-level work manager',
    permissions: ['read:projects', 'manage:tasks', 'manage:meetings', 'comment:tasks', 'read:reports', 'read:ai']
  },
  {
    name: 'Member',
    description: 'Standard contributor',
    permissions: ['read:projects', 'read:tasks', 'read:meetings', 'comment:tasks']
  },
  {
    name: 'Client',
    description: 'External project stakeholder',
    permissions: ['read:projects', 'read:tasks', 'read:meetings', 'comment:tasks']
  },
  {
    name: 'Guest',
    description: 'Limited read-only collaborator',
    permissions: ['read:projects', 'read:tasks', 'read:meetings']
  }
] as const;

export const permissionKey = (permission: { action: string; subject: string }) =>
  `${permission.action}:${permission.subject}`;

export const AUTH_REFRESH_COOKIE = 'taskbricks.refresh';
export const AUTH_TRUSTED_DEVICE_COOKIE = 'taskbricks.trusted_device';
