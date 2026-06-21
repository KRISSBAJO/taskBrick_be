import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';

type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
type OperationWithSecurity = {
  security?: Array<Record<string, unknown>>;
};

interface RequiredEndpoint {
  method: HttpMethod;
  path: string;
  workflow: string;
  auth: 'public' | 'bearer';
}

interface FrontendClientCheck {
  helper: string;
  routeSnippets: string[];
  workflow: string;
}

const coreApiRequiredEndpoints: RequiredEndpoint[] = [
  { method: 'post', path: '/api/v1/auth/verify-email', workflow: 'email verification', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/resend-verification', workflow: 'resend email verification', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/accept-invite', workflow: 'accept invite', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/mfa/verify-login', workflow: 'MFA login verification', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/logout', workflow: 'session logout', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/forgot-password', workflow: 'forgot password', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/reset-password', workflow: 'reset password', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/change-password', workflow: 'change password', auth: 'bearer' },
  { method: 'get', path: '/api/v1/auth/sso/discovery', workflow: 'SSO discovery', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/sso/start', workflow: 'SSO start', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/sso/callback', workflow: 'SSO callback', auth: 'public' },
  { method: 'get', path: '/api/v1/identity-security/overview', workflow: 'identity security overview', auth: 'bearer' },
  { method: 'post', path: '/api/v1/identity-security/mfa/totp/setup', workflow: 'TOTP setup', auth: 'bearer' },
  { method: 'post', path: '/api/v1/identity-security/mfa/totp/enable', workflow: 'TOTP enable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/identity-security/mfa/disable', workflow: 'MFA disable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/identity-security/mfa/backup-codes/regenerate', workflow: 'backup code regeneration', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/identity-security/trusted-devices/{deviceId}', workflow: 'trusted device revoke', auth: 'bearer' },
  { method: 'get', path: '/api/v1/identity-security/sso-providers', workflow: 'SSO provider list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/identity-security/sso-providers', workflow: 'SSO provider upsert', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/identity-security/login-policy', workflow: 'tenant login policy update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/sessions', workflow: 'tenant session list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/sessions/{sessionId}/revoke', workflow: 'tenant session revoke', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/users/{userId}/sessions/revoke', workflow: 'user sessions revoke', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/users/me/profile', workflow: 'profile update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/users', workflow: 'tenant user list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/users/invite', workflow: 'tenant user invite', auth: 'bearer' },
  { method: 'post', path: '/api/v1/users/bulk-invite', workflow: 'tenant user bulk invite', auth: 'bearer' },
  { method: 'post', path: '/api/v1/teams', workflow: 'team create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/teams/{teamId}/members', workflow: 'team member list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/teams/{teamId}/members', workflow: 'team member add', auth: 'bearer' },
  { method: 'post', path: '/api/v1/teams/{teamId}/invite', workflow: 'team member invite', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/teams/{teamId}/members/{userId}', workflow: 'team member remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/health/ready', workflow: 'backend readiness probe', auth: 'public' },
  { method: 'get', path: '/api/v1/search', workflow: 'command center global search', auth: 'bearer' },
  { method: 'get', path: '/api/v1/permissions', workflow: 'tenant permission list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/roles', workflow: 'tenant role list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/roles', workflow: 'tenant role create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/roles/{roleId}', workflow: 'tenant role update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/roles/{roleId}', workflow: 'tenant role delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/roles/assignments', workflow: 'tenant role assignment', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/roles/{roleId}/users/{userId}', workflow: 'tenant role removal', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tenants/current', workflow: 'current tenant load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tenants/current', workflow: 'current tenant update', auth: 'bearer' }
];

const coreApiFrontendChecks: FrontendClientCheck[] = [
  { helper: 'login', routeSnippets: ['/api/v1/auth/login'], workflow: 'workspace login' },
  { helper: 'verifyMfaLogin', routeSnippets: ['/api/v1/auth/mfa/verify-login'], workflow: 'MFA login verification' },
  { helper: 'register', routeSnippets: ['/api/v1/auth/register'], workflow: 'workspace signup' },
  { helper: 'verifyEmail', routeSnippets: ['/api/v1/auth/verify-email'], workflow: 'email verification' },
  { helper: 'resendVerification', routeSnippets: ['/api/v1/auth/resend-verification'], workflow: 'resend email verification' },
  { helper: 'acceptInvite', routeSnippets: ['/api/v1/auth/accept-invite'], workflow: 'accept invite' },
  { helper: 'forgotPassword', routeSnippets: ['/api/v1/auth/forgot-password'], workflow: 'forgot password' },
  { helper: 'resetPassword', routeSnippets: ['/api/v1/auth/reset-password'], workflow: 'reset password' },
  { helper: 'changePassword', routeSnippets: ['/api/v1/auth/change-password'], workflow: 'change password' },
  { helper: 'refreshSession', routeSnippets: ['/api/v1/auth/refresh'], workflow: 'session refresh' },
  { helper: 'logoutSession', routeSnippets: ['/api/v1/auth/logout'], workflow: 'session logout' },
  { helper: 'getMe', routeSnippets: ['/api/v1/auth/me'], workflow: 'current user bootstrap' },
  { helper: 'discoverSso', routeSnippets: ['/api/v1/auth/sso/discovery'], workflow: 'SSO discovery' },
  { helper: 'startSso', routeSnippets: ['/api/v1/auth/sso/start'], workflow: 'SSO start' },
  { helper: 'completeSso', routeSnippets: ['/api/v1/auth/sso/callback'], workflow: 'SSO callback' },
  { helper: 'getIdentitySecurityOverview', routeSnippets: ['/api/v1/identity-security/overview'], workflow: 'identity security overview' },
  { helper: 'setupTotp', routeSnippets: ['/api/v1/identity-security/mfa/totp/setup'], workflow: 'TOTP setup' },
  { helper: 'enableTotp', routeSnippets: ['/api/v1/identity-security/mfa/totp/enable'], workflow: 'TOTP enable' },
  { helper: 'disableMfa', routeSnippets: ['/api/v1/identity-security/mfa/disable'], workflow: 'MFA disable' },
  { helper: 'regenerateBackupCodes', routeSnippets: ['/api/v1/identity-security/mfa/backup-codes/regenerate'], workflow: 'backup code regeneration' },
  { helper: 'revokeTrustedDevice', routeSnippets: ['/api/v1/identity-security/trusted-devices/{deviceId}'], workflow: 'trusted device revoke' },
  { helper: 'listSsoProviders', routeSnippets: ['/api/v1/identity-security/sso-providers'], workflow: 'SSO provider list' },
  { helper: 'upsertSsoProvider', routeSnippets: ['/api/v1/identity-security/sso-providers'], workflow: 'SSO provider upsert' },
  { helper: 'updateTenantLoginPolicy', routeSnippets: ['/api/v1/identity-security/login-policy'], workflow: 'tenant login policy update' },
  { helper: 'listSessions', routeSnippets: ['/api/v1/admin/sessions'], workflow: 'tenant session list' },
  { helper: 'revokeSession', routeSnippets: ['/api/v1/admin/sessions/{sessionId}/revoke'], workflow: 'tenant session revoke' },
  { helper: 'revokeUserSessions', routeSnippets: ['/api/v1/admin/users/{userId}/sessions/revoke'], workflow: 'user sessions revoke' },
  { helper: 'updateMyProfile', routeSnippets: ['/api/v1/users/me/profile'], workflow: 'profile update' },
  { helper: 'listUsers', routeSnippets: ['/api/v1/users'], workflow: 'tenant user list' },
  { helper: 'inviteTenantUser', routeSnippets: ['/api/v1/users/invite'], workflow: 'tenant user invite' },
  { helper: 'bulkInviteTenantUsers', routeSnippets: ['/api/v1/users/bulk-invite'], workflow: 'tenant user bulk invite' },
  { helper: 'listWorkspaces', routeSnippets: ['/api/v1/workspaces'], workflow: 'workspace switcher and create project form' },
  { helper: 'listTeams', routeSnippets: ['/api/v1/teams'], workflow: 'team selector and capacity views' },
  { helper: 'createTeam', routeSnippets: ['/api/v1/teams'], workflow: 'team create' },
  { helper: 'listTeamMembers', routeSnippets: ['/api/v1/teams/{teamId}/members'], workflow: 'team member list' },
  { helper: 'addTeamMember', routeSnippets: ['/api/v1/teams/{teamId}/members'], workflow: 'team member add' },
  { helper: 'updateTeamMemberRole', routeSnippets: ['/api/v1/teams/{teamId}/members'], workflow: 'team member role update' },
  { helper: 'removeTeamMember', routeSnippets: ['/api/v1/teams/{teamId}/members/{userId}'], workflow: 'team member remove' },
  { helper: 'inviteTeamMember', routeSnippets: ['/api/v1/teams/{teamId}/invite'], workflow: 'team member invite' },
  { helper: 'healthReady', routeSnippets: ['/api/v1/health/ready'], workflow: 'backend readiness probe' },
  { helper: 'globalSearch', routeSnippets: ['/api/v1/search'], workflow: 'command center global search' },
  { helper: 'listPermissions', routeSnippets: ['/api/v1/permissions'], workflow: 'tenant permission list' },
  { helper: 'listRoles', routeSnippets: ['/api/v1/roles'], workflow: 'tenant role list' },
  { helper: 'createRole', routeSnippets: ['/api/v1/roles'], workflow: 'tenant role create' },
  { helper: 'updateRole', routeSnippets: ['/api/v1/roles/{roleId}'], workflow: 'tenant role update' },
  { helper: 'deleteRole', routeSnippets: ['/api/v1/roles/{roleId}'], workflow: 'tenant role delete' },
  { helper: 'assignRole', routeSnippets: ['/api/v1/roles/assignments'], workflow: 'tenant role assignment' },
  { helper: 'removeRoleFromUser', routeSnippets: ['/api/v1/roles/{roleId}/users/{userId}'], workflow: 'tenant role removal' },
  { helper: 'getCurrentTenant', routeSnippets: ['/api/v1/tenants/current'], workflow: 'current tenant load' },
  { helper: 'updateCurrentTenant', routeSnippets: ['/api/v1/tenants/current'], workflow: 'current tenant update' }
];

const workspaceResourceRequiredEndpoints: RequiredEndpoint[] = [
  { method: 'get', path: '/api/v1/document-folders', workflow: 'document folder list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/document-folders/tree', workflow: 'document folder tree', auth: 'bearer' },
  { method: 'post', path: '/api/v1/document-folders', workflow: 'document folder create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/document-folders/{folderId}', workflow: 'document folder update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/document-folders/{folderId}/archive', workflow: 'document folder archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/document-folders/{folderId}/restore', workflow: 'document folder restore', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/document-folders/{folderId}', workflow: 'document folder delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/documents', workflow: 'document list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/documents', workflow: 'document create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/documents/{documentId}', workflow: 'document detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/documents/{documentId}', workflow: 'document update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/documents/{documentId}/publish', workflow: 'document publish', auth: 'bearer' },
  { method: 'post', path: '/api/v1/documents/{documentId}/archive', workflow: 'document archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/documents/{documentId}/restore', workflow: 'document restore', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/documents/{documentId}/hard-delete', workflow: 'document hard delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/documents/{documentId}/versions', workflow: 'document version list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/documents/{documentId}/versions/{version}/restore', workflow: 'document version restore', auth: 'bearer' },
  { method: 'post', path: '/api/v1/files/upload-intents', workflow: 'file upload intent create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/files', workflow: 'file asset list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/files', workflow: 'file asset create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/files/{fileId}/archive', workflow: 'file asset archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/files/{fileId}/restore', workflow: 'file asset restore', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/files/{fileId}', workflow: 'file asset delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/notifications', workflow: 'notification list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/notifications/unread-count', workflow: 'notification unread count', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/notifications/{notificationId}/read', workflow: 'notification mark read', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/notifications/{notificationId}/unread', workflow: 'notification mark unread', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/notifications/read-all', workflow: 'notification mark all read', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/notifications/{notificationId}', workflow: 'notification delete', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/notifications/read', workflow: 'read notification cleanup', auth: 'bearer' },
  { method: 'get', path: '/api/v1/notification-preferences', workflow: 'notification preference list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/notification-preferences', workflow: 'notification preference update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/internal-mail/folders', workflow: 'internal mail folder summary', auth: 'bearer' },
  { method: 'get', path: '/api/v1/internal-mail/mailboxes', workflow: 'internal mailbox search', auth: 'bearer' },
  { method: 'post', path: '/api/v1/internal-mail/mailboxes', workflow: 'internal mailbox create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/mailboxes/{mailboxId}', workflow: 'internal mailbox update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/internal-mail/mailboxes/{mailboxId}/aliases', workflow: 'internal mailbox alias create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/internal-mail/mailboxes/{mailboxId}/members', workflow: 'internal mailbox member upsert', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/internal-mail/mailboxes/{mailboxId}/members/{userId}', workflow: 'internal mailbox member remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/internal-mail/threads', workflow: 'internal mail thread list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/internal-mail/threads', workflow: 'internal mail thread create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/internal-mail/threads/{threadId}', workflow: 'internal mail thread detail', auth: 'bearer' },
  { method: 'post', path: '/api/v1/internal-mail/threads/{threadId}/reply', workflow: 'internal mail reply', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/read', workflow: 'internal mail mark read', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/unread', workflow: 'internal mail mark unread', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/star', workflow: 'internal mail star', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/flag', workflow: 'internal mail flag', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/pin', workflow: 'internal mail pin', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/snooze', workflow: 'internal mail snooze', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/move', workflow: 'internal mail move', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/archive', workflow: 'internal mail archive', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/internal-mail/threads/{threadId}/restore', workflow: 'internal mail restore', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/internal-mail/threads/{threadId}', workflow: 'internal mail delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/integrations', workflow: 'integration list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/integrations', workflow: 'integration create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/integrations/{integrationId}', workflow: 'integration update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/integrations/{integrationId}', workflow: 'integration delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/integrations/{integrationId}/enable', workflow: 'integration enable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/integrations/{integrationId}/disable', workflow: 'integration disable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/integrations/{integrationId}/rotate-secret', workflow: 'integration secret rotate', auth: 'bearer' },
  { method: 'post', path: '/api/v1/integrations/{integrationId}/sync', workflow: 'integration sync', auth: 'bearer' },
  { method: 'post', path: '/api/v1/integrations/omoflow/events', workflow: 'OmoFlow runtime event', auth: 'bearer' },
  { method: 'get', path: '/api/v1/integrations/{integrationId}/logs', workflow: 'integration log list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/webhooks', workflow: 'webhook list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/webhooks', workflow: 'webhook create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/webhooks/{webhookId}', workflow: 'webhook update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/webhooks/{webhookId}', workflow: 'webhook delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/webhooks/{webhookId}/enable', workflow: 'webhook enable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/webhooks/{webhookId}/disable', workflow: 'webhook disable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/webhooks/{webhookId}/rotate-secret', workflow: 'webhook secret rotate', auth: 'bearer' },
  { method: 'post', path: '/api/v1/webhook-events', workflow: 'webhook test event trigger', auth: 'bearer' },
  { method: 'get', path: '/api/v1/webhook-deliveries', workflow: 'webhook delivery list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/webhook-deliveries/{deliveryId}/retry', workflow: 'webhook delivery retry', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workflows', workflow: 'workflow list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflows', workflow: 'workflow create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/workflows/{workflowId}', workflow: 'workflow update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflows/{workflowId}/archive', workflow: 'workflow archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflows/{workflowId}/restore', workflow: 'workflow restore', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/workflows/{workflowId}', workflow: 'workflow delete', auth: 'bearer' },
  { method: 'put', path: '/api/v1/workflows/{workflowId}/nodes', workflow: 'workflow node replacement', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflows/{workflowId}/run', workflow: 'workflow manual run', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workflow-runs', workflow: 'workflow run list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workflow-runs/dead-letter', workflow: 'workflow dead-letter run list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workflow-runs/{runId}/logs', workflow: 'workflow run log list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflow-runs/{runId}/retry', workflow: 'workflow run retry', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflow-runs/{runId}/requeue', workflow: 'workflow run requeue', auth: 'bearer' },
  { method: 'post', path: '/api/v1/workflow-runs/{runId}/cancel', workflow: 'workflow run cancel', auth: 'bearer' }
];

const workspaceResourceFrontendChecks: FrontendClientCheck[] = [
  { helper: 'listDocumentFolders', routeSnippets: ['/api/v1/document-folders'], workflow: 'document folder list' },
  { helper: 'getDocumentFolderTree', routeSnippets: ['/api/v1/document-folders/tree'], workflow: 'document folder tree' },
  { helper: 'createDocumentFolder', routeSnippets: ['/api/v1/document-folders'], workflow: 'document folder create' },
  { helper: 'updateDocumentFolder', routeSnippets: ['/api/v1/document-folders/{folderId}'], workflow: 'document folder update' },
  { helper: 'archiveDocumentFolder', routeSnippets: ['/api/v1/document-folders/{folderId}/archive'], workflow: 'document folder archive' },
  { helper: 'restoreDocumentFolder', routeSnippets: ['/api/v1/document-folders/{folderId}/restore'], workflow: 'document folder restore' },
  { helper: 'deleteDocumentFolder', routeSnippets: ['/api/v1/document-folders/{folderId}'], workflow: 'document folder delete' },
  { helper: 'listDocuments', routeSnippets: ['/api/v1/documents'], workflow: 'document list' },
  { helper: 'createDocument', routeSnippets: ['/api/v1/documents'], workflow: 'document create' },
  { helper: 'getDocument', routeSnippets: ['/api/v1/documents/{documentId}'], workflow: 'document detail load' },
  { helper: 'updateDocument', routeSnippets: ['/api/v1/documents/{documentId}'], workflow: 'document update' },
  { helper: 'publishDocument', routeSnippets: ['/api/v1/documents/{documentId}/publish'], workflow: 'document publish' },
  { helper: 'archiveDocument', routeSnippets: ['/api/v1/documents/{documentId}/archive'], workflow: 'document archive' },
  { helper: 'restoreDocument', routeSnippets: ['/api/v1/documents/{documentId}/restore'], workflow: 'document restore' },
  { helper: 'hardDeleteDocument', routeSnippets: ['/api/v1/documents/{documentId}/hard-delete'], workflow: 'document hard delete' },
  { helper: 'listDocumentVersions', routeSnippets: ['/api/v1/documents/{documentId}/versions'], workflow: 'document version list' },
  { helper: 'restoreDocumentVersion', routeSnippets: ['/api/v1/documents/{documentId}/versions/{version}/restore'], workflow: 'document version restore' },
  { helper: 'createUploadIntent', routeSnippets: ['/api/v1/files/upload-intents'], workflow: 'file upload intent create' },
  { helper: 'listFileAssets', routeSnippets: ['/api/v1/files'], workflow: 'file asset list' },
  { helper: 'createFileAsset', routeSnippets: ['/api/v1/files'], workflow: 'file asset create' },
  { helper: 'archiveFileAsset', routeSnippets: ['/api/v1/files/{fileId}/archive'], workflow: 'file asset archive' },
  { helper: 'restoreFileAsset', routeSnippets: ['/api/v1/files/{fileId}/restore'], workflow: 'file asset restore' },
  { helper: 'deleteFileAsset', routeSnippets: ['/api/v1/files/{fileId}'], workflow: 'file asset delete' },
  { helper: 'listNotifications', routeSnippets: ['/api/v1/notifications'], workflow: 'notification list' },
  { helper: 'getUnreadNotificationCount', routeSnippets: ['/api/v1/notifications/unread-count'], workflow: 'notification unread count' },
  { helper: 'markNotificationRead', routeSnippets: ['/api/v1/notifications/{notificationId}/read'], workflow: 'notification mark read' },
  { helper: 'markNotificationUnread', routeSnippets: ['/api/v1/notifications/{notificationId}/unread'], workflow: 'notification mark unread' },
  { helper: 'markAllNotificationsRead', routeSnippets: ['/api/v1/notifications/read-all'], workflow: 'notification mark all read' },
  { helper: 'deleteNotification', routeSnippets: ['/api/v1/notifications/{notificationId}'], workflow: 'notification delete' },
  { helper: 'deleteReadNotifications', routeSnippets: ['/api/v1/notifications/read'], workflow: 'read notification cleanup' },
  { helper: 'listNotificationPreferences', routeSnippets: ['/api/v1/notification-preferences'], workflow: 'notification preference list' },
  { helper: 'updateNotificationPreferences', routeSnippets: ['/api/v1/notification-preferences'], workflow: 'notification preference update' },
  { helper: 'getInternalMailFolders', routeSnippets: ['/api/v1/internal-mail/folders'], workflow: 'internal mail folder summary' },
  { helper: 'searchInternalMailboxes', routeSnippets: ['/api/v1/internal-mail/mailboxes'], workflow: 'internal mailbox search' },
  { helper: 'createInternalMailbox', routeSnippets: ['/api/v1/internal-mail/mailboxes'], workflow: 'internal mailbox create' },
  { helper: 'updateInternalMailbox', routeSnippets: ['/api/v1/internal-mail/mailboxes/{mailboxId}'], workflow: 'internal mailbox update' },
  { helper: 'createInternalMailboxAlias', routeSnippets: ['/api/v1/internal-mail/mailboxes/{mailboxId}/aliases'], workflow: 'internal mailbox alias create' },
  { helper: 'upsertInternalMailboxMember', routeSnippets: ['/api/v1/internal-mail/mailboxes/{mailboxId}/members'], workflow: 'internal mailbox member upsert' },
  { helper: 'removeInternalMailboxMember', routeSnippets: ['/api/v1/internal-mail/mailboxes/{mailboxId}/members/{userId}'], workflow: 'internal mailbox member remove' },
  { helper: 'listInternalMailThreads', routeSnippets: ['/api/v1/internal-mail/threads'], workflow: 'internal mail thread list' },
  { helper: 'createInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads'], workflow: 'internal mail thread create' },
  { helper: 'getInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}'], workflow: 'internal mail thread detail' },
  { helper: 'replyInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/reply'], workflow: 'internal mail reply' },
  { helper: 'markInternalMailRead', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/read'], workflow: 'internal mail mark read' },
  { helper: 'markInternalMailUnread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/unread'], workflow: 'internal mail mark unread' },
  { helper: 'setInternalMailStar', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/star'], workflow: 'internal mail star' },
  { helper: 'setInternalMailFlag', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/flag'], workflow: 'internal mail flag' },
  { helper: 'setInternalMailPin', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/pin'], workflow: 'internal mail pin' },
  { helper: 'snoozeInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/snooze'], workflow: 'internal mail snooze' },
  { helper: 'moveInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/move'], workflow: 'internal mail move' },
  { helper: 'archiveInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/archive'], workflow: 'internal mail archive' },
  { helper: 'restoreInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}/restore'], workflow: 'internal mail restore' },
  { helper: 'deleteInternalMailThread', routeSnippets: ['/api/v1/internal-mail/threads/{threadId}'], workflow: 'internal mail delete' },
  { helper: 'listIntegrations', routeSnippets: ['/api/v1/integrations'], workflow: 'integration list' },
  { helper: 'createIntegration', routeSnippets: ['/api/v1/integrations'], workflow: 'integration create' },
  { helper: 'updateIntegration', routeSnippets: ['/api/v1/integrations/{integrationId}'], workflow: 'integration update' },
  { helper: 'deleteIntegration', routeSnippets: ['/api/v1/integrations/{integrationId}'], workflow: 'integration delete' },
  { helper: 'enableIntegration', routeSnippets: ['/api/v1/integrations/{integrationId}/enable'], workflow: 'integration enable' },
  { helper: 'disableIntegration', routeSnippets: ['/api/v1/integrations/{integrationId}/disable'], workflow: 'integration disable' },
  { helper: 'rotateIntegrationSecret', routeSnippets: ['/api/v1/integrations/{integrationId}/rotate-secret'], workflow: 'integration secret rotate' },
  { helper: 'syncIntegration', routeSnippets: ['/api/v1/integrations/{integrationId}/sync'], workflow: 'integration sync' },
  { helper: 'processOmoFlowEvent', routeSnippets: ['/api/v1/integrations/omoflow/events'], workflow: 'OmoFlow runtime event' },
  { helper: 'listIntegrationLogs', routeSnippets: ['/api/v1/integrations/{integrationId}/logs'], workflow: 'integration log list' },
  { helper: 'listWebhooks', routeSnippets: ['/api/v1/webhooks'], workflow: 'webhook list' },
  { helper: 'createWebhook', routeSnippets: ['/api/v1/webhooks'], workflow: 'webhook create' },
  { helper: 'updateWebhook', routeSnippets: ['/api/v1/webhooks/{webhookId}'], workflow: 'webhook update' },
  { helper: 'deleteWebhook', routeSnippets: ['/api/v1/webhooks/{webhookId}'], workflow: 'webhook delete' },
  { helper: 'enableWebhook', routeSnippets: ['/api/v1/webhooks/{webhookId}/enable'], workflow: 'webhook enable' },
  { helper: 'disableWebhook', routeSnippets: ['/api/v1/webhooks/{webhookId}/disable'], workflow: 'webhook disable' },
  { helper: 'rotateWebhookSecret', routeSnippets: ['/api/v1/webhooks/{webhookId}/rotate-secret'], workflow: 'webhook secret rotate' },
  { helper: 'triggerWebhookEvent', routeSnippets: ['/api/v1/webhook-events'], workflow: 'webhook test event trigger' },
  { helper: 'listWebhookDeliveries', routeSnippets: ['/api/v1/webhook-deliveries'], workflow: 'webhook delivery list' },
  { helper: 'retryWebhookDelivery', routeSnippets: ['/api/v1/webhook-deliveries/{deliveryId}/retry'], workflow: 'webhook delivery retry' },
  { helper: 'listWorkflows', routeSnippets: ['/api/v1/workflows'], workflow: 'workflow list' },
  { helper: 'createWorkflow', routeSnippets: ['/api/v1/workflows'], workflow: 'workflow create' },
  { helper: 'updateWorkflow', routeSnippets: ['/api/v1/workflows/{workflowId}'], workflow: 'workflow update' },
  { helper: 'archiveWorkflow', routeSnippets: ['/api/v1/workflows/{workflowId}/archive'], workflow: 'workflow archive' },
  { helper: 'restoreWorkflow', routeSnippets: ['/api/v1/workflows/{workflowId}/restore'], workflow: 'workflow restore' },
  { helper: 'deleteWorkflow', routeSnippets: ['/api/v1/workflows/{workflowId}'], workflow: 'workflow delete' },
  { helper: 'replaceWorkflowNodes', routeSnippets: ['/api/v1/workflows/{workflowId}/nodes'], workflow: 'workflow node replacement' },
  { helper: 'runWorkflow', routeSnippets: ['/api/v1/workflows/{workflowId}/run'], workflow: 'workflow manual run' },
  { helper: 'listWorkflowRuns', routeSnippets: ['/api/v1/workflow-runs'], workflow: 'workflow run list' },
  { helper: 'listDeadLetterWorkflowRuns', routeSnippets: ['/api/v1/workflow-runs/dead-letter'], workflow: 'workflow dead-letter run list' },
  { helper: 'listWorkflowRunLogs', routeSnippets: ['/api/v1/workflow-runs/{runId}/logs'], workflow: 'workflow run log list' },
  { helper: 'retryWorkflowRun', routeSnippets: ['/api/v1/workflow-runs/{runId}/retry'], workflow: 'workflow run retry' },
  { helper: 'requeueWorkflowRun', routeSnippets: ['/api/v1/workflow-runs/{runId}/requeue'], workflow: 'workflow run requeue' },
  { helper: 'cancelWorkflowRun', routeSnippets: ['/api/v1/workflow-runs/{runId}/cancel'], workflow: 'workflow run cancel' }
];

const adminPlatformRequiredEndpoints: RequiredEndpoint[] = [
  { method: 'get', path: '/api/v1/projects/{projectId}/permissions', workflow: 'project permission matrix', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}', workflow: 'project delete flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/ai/settings', workflow: 'AI settings load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/ai/settings', workflow: 'AI settings update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/ai/agents', workflow: 'AI agent list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/ai/agents', workflow: 'AI agent create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/ai/agents/{agentId}', workflow: 'AI agent update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/ai/agents/{agentId}/archive', workflow: 'AI agent archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/ai/agents/{agentId}/restore', workflow: 'AI agent restore', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/ai/agents/{agentId}', workflow: 'AI agent delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/billing/account', workflow: 'tenant billing account status', auth: 'bearer' },
  { method: 'get', path: '/api/v1/plans', workflow: 'tenant billing plan list', auth: 'public' },
  { method: 'get', path: '/api/v1/subscriptions/current', workflow: 'current tenant subscription', auth: 'bearer' },
  { method: 'post', path: '/api/v1/billing/trial', workflow: 'tenant billing trial start', auth: 'bearer' },
  { method: 'post', path: '/api/v1/billing/checkout', workflow: 'billing checkout create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/billing/portal', workflow: 'billing portal create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/subscriptions/{subscriptionId}/change-plan', workflow: 'tenant subscription plan change', auth: 'bearer' },
  { method: 'post', path: '/api/v1/subscriptions/{subscriptionId}/cancel', workflow: 'tenant subscription cancel', auth: 'bearer' },
  { method: 'post', path: '/api/v1/subscriptions/{subscriptionId}/resume', workflow: 'tenant subscription resume', auth: 'bearer' },
  { method: 'get', path: '/api/v1/invoices', workflow: 'tenant invoice list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/entitlements', workflow: 'tenant entitlement list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/usage-records', workflow: 'tenant usage record list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/usage-records/summary', workflow: 'tenant usage summary', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/audit-logs', workflow: 'tenant audit log search', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/security-checks', workflow: 'tenant security check load', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/security-policy', workflow: 'tenant security policy load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/admin/security-policy', workflow: 'tenant security policy update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/security-events', workflow: 'tenant security event list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/admin/security-events/{eventId}', workflow: 'tenant security event update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/compliance-jobs', workflow: 'tenant compliance job list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/compliance-jobs', workflow: 'tenant compliance job create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/compliance-jobs/{jobId}/approve', workflow: 'tenant compliance job approve', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/compliance-jobs/{jobId}/reject', workflow: 'tenant compliance job reject', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/compliance-jobs/{jobId}/run', workflow: 'tenant compliance job run', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/compliance-jobs/{jobId}/cancel', workflow: 'tenant compliance job cancel', auth: 'bearer' },
  { method: 'get', path: '/api/v1/admin/api-keys', workflow: 'tenant API key list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/api-keys', workflow: 'tenant API key create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/admin/api-keys/{apiKeyId}/revoke', workflow: 'tenant API key revoke', auth: 'bearer' },
  { method: 'get', path: '/api/v1/conversations', workflow: 'conversation list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/conversations', workflow: 'conversation create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/conversations/{conversationId}', workflow: 'conversation detail', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/conversations/{conversationId}', workflow: 'conversation update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/conversations/{conversationId}', workflow: 'conversation delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/conversations/{conversationId}/members', workflow: 'conversation member list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/conversations/{conversationId}/members', workflow: 'conversation member add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/conversations/{conversationId}/members/{userId}', workflow: 'conversation member remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/conversations/{conversationId}/messages', workflow: 'conversation message list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/conversations/{conversationId}/messages', workflow: 'conversation message send', auth: 'bearer' },
  { method: 'get', path: '/api/v1/conversations/{conversationId}/messages/pinned', workflow: 'conversation pinned message list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/messages/{messageId}', workflow: 'message update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/messages/{messageId}', workflow: 'message delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/messages/{messageId}/pin', workflow: 'message pin', auth: 'bearer' },
  { method: 'post', path: '/api/v1/messages/{messageId}/unpin', workflow: 'message unpin', auth: 'bearer' },
  { method: 'post', path: '/api/v1/messages/{messageId}/forward', workflow: 'message forward', auth: 'bearer' },
  { method: 'post', path: '/api/v1/messages/{messageId}/reactions', workflow: 'message reaction add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/messages/{messageId}/reactions/{emoji}', workflow: 'message reaction remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/messages/{messageId}/read-receipts', workflow: 'message read receipt list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/messages/{messageId}/read-receipts', workflow: 'message mark read', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/reports', workflow: 'report list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/reporting/reports', workflow: 'report create', auth: 'bearer' },
  { method: 'post', path: '/api/v1/reporting/reports/run', workflow: 'ad hoc report run', auth: 'bearer' },
  { method: 'post', path: '/api/v1/reporting/reports/{reportId}/run', workflow: 'saved report run', auth: 'bearer' },
  { method: 'post', path: '/api/v1/reporting/reports/{reportId}/exports', workflow: 'saved report export', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/executions', workflow: 'report execution list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/exports', workflow: 'report export list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/project-health', workflow: 'project health analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/team-performance', workflow: 'team performance analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/cycle-time', workflow: 'cycle time analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/velocity', workflow: 'velocity analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/budget', workflow: 'budget analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/sla', workflow: 'SLA analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/me', workflow: 'site admin profile', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/overview', workflow: 'site admin overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/identity-security/overview', workflow: 'site identity overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/identity-security/login-history', workflow: 'site login history', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/identity-security/trusted-devices', workflow: 'site trusted device list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/identity-security/trusted-devices/{deviceId}/revoke', workflow: 'site trusted device revoke', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/identity-security/sso-providers', workflow: 'site SSO provider list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/identity-security/policies', workflow: 'site security policy list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/identity-security/users/{userId}/password-reset', workflow: 'site admin password reset', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/sessions', workflow: 'site session list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/sessions/{sessionId}/revoke', workflow: 'site session revoke', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/overview', workflow: 'site billing overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/plans', workflow: 'site billing plan list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/plans', workflow: 'site billing plan create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/billing/plans/{planId}', workflow: 'site billing plan update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/plans/{planId}/archive', workflow: 'site billing plan archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/plans/{planId}/restore', workflow: 'site billing plan restore', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/plans/{planId}/sync/stripe', workflow: 'site billing plan Stripe sync', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/plans/{planId}/features', workflow: 'site billing plan feature assign', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/billing/plans/{planId}/features/{featureId}', workflow: 'site billing plan feature update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/site-admin/billing/plans/{planId}/features/{featureId}', workflow: 'site billing plan feature remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/features', workflow: 'site billing feature list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/features', workflow: 'site billing feature create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/billing/features/{featureId}', workflow: 'site billing feature update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/features/{featureId}/enable', workflow: 'site billing feature enable', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/features/{featureId}/disable', workflow: 'site billing feature disable', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/subscriptions', workflow: 'site subscription list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/billing/subscriptions/{subscriptionId}', workflow: 'site subscription update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/subscriptions/{subscriptionId}/change-plan', workflow: 'site subscription plan change', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/subscriptions/{subscriptionId}/cancel', workflow: 'site subscription cancel', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/subscriptions/{subscriptionId}/resume', workflow: 'site subscription resume', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/billing/tenants/{tenantId}/start-trial', workflow: 'site tenant trial start', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/invoices', workflow: 'site invoice list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/usage-records', workflow: 'site usage record list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/events', workflow: 'site billing event list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/billing/entitlements', workflow: 'site entitlement list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/search', workflow: 'site platform search', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/automation/overview', workflow: 'site automation overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/automation/workflows', workflow: 'site workflow list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/automation/runs', workflow: 'site workflow run list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/automation/runs/{runId}/retry', workflow: 'site workflow run retry', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/automation/runs/{runId}/cancel', workflow: 'site workflow run cancel', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/automation/approval-definitions', workflow: 'site approval definition list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/automation/approvals', workflow: 'site approval list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/automation/run-logs', workflow: 'site workflow run log list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/ai/overview', workflow: 'site AI overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/ai/settings', workflow: 'site AI setting list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/ai/agents', workflow: 'site AI agent list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/ai/conversations', workflow: 'site AI conversation list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/ai/actions', workflow: 'site AI action list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/ai/usage', workflow: 'site AI usage list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/reporting/overview', workflow: 'site reporting overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/reporting/dashboards', workflow: 'site dashboard list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/reporting/reports', workflow: 'site report list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/reporting/executions', workflow: 'site report execution list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/reporting/exports', workflow: 'site report export list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/hardening/overview', workflow: 'site hardening overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/integrations/overview', workflow: 'site integration overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/integrations', workflow: 'site integration list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/integrations/{integrationId}/rotate-secret', workflow: 'site integration secret rotate', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/webhooks', workflow: 'site webhook list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/webhook-deliveries', workflow: 'site webhook delivery list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/webhook-deliveries/{deliveryId}/retry', workflow: 'site webhook delivery retry', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/webhooks/{webhookId}/rotate-secret', workflow: 'site webhook secret rotate', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/observability/overview', workflow: 'site observability overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/realtime/overview', workflow: 'site realtime overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/realtime/conversations', workflow: 'site realtime conversation list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/realtime/message-activity', workflow: 'site message activity list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/meetings/overview', workflow: 'site meeting overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/meetings/tenants', workflow: 'site meeting tenant list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/meetings/reminder-logs', workflow: 'site meeting reminder log list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/compliance/overview', workflow: 'site compliance overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/compliance/jobs', workflow: 'site compliance job list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/compliance/jobs/{jobId}/approve', workflow: 'site compliance job approve', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/compliance/jobs/{jobId}/reject', workflow: 'site compliance job reject', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/compliance/jobs/{jobId}/run', workflow: 'site compliance job run', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/compliance/jobs/{jobId}/cancel', workflow: 'site compliance job cancel', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants', workflow: 'site tenant list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/users', workflow: 'site user list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/users/{userId}', workflow: 'site user detail', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/users/{userId}/status', workflow: 'site user status update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/users/{userId}/sessions/revoke', workflow: 'site user sessions revoke', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/users/{userId}/resend-verification', workflow: 'site user verification resend', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}', workflow: 'site tenant detail', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/tenants/{tenantId}/status', workflow: 'site tenant status update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/users', workflow: 'site tenant users', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/projects', workflow: 'site tenant projects', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/workspaces', workflow: 'site tenant workspaces', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/teams', workflow: 'site tenant teams', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/sessions', workflow: 'site tenant sessions', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/security', workflow: 'site tenant security', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/billing', workflow: 'site tenant billing', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/integrations', workflow: 'site tenant integrations', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/files', workflow: 'site tenant files', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/ai', workflow: 'site tenant AI', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/reports', workflow: 'site tenant reports', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/tenants/{tenantId}/activity', workflow: 'site tenant activity', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/security-events', workflow: 'site security event list', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/security-events/{eventId}', workflow: 'site security event update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/audit-logs', workflow: 'platform audit log list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/site-admin/platform-admins', workflow: 'platform admin grant list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/site-admin/platform-admins', workflow: 'platform admin grant create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/site-admin/platform-admins/{platformAdminId}/revoke', workflow: 'platform admin revoke', auth: 'bearer' }
];

const adminPlatformFrontendChecks: FrontendClientCheck[] = [
  { helper: 'getProjectPermissions', routeSnippets: ['/api/v1/projects/{projectId}/permissions'], workflow: 'project permission matrix' },
  { helper: 'deleteProject', routeSnippets: ['/api/v1/projects/{projectId}'], workflow: 'project delete flow' },
  { helper: 'getAiSettings', routeSnippets: ['/api/v1/ai/settings'], workflow: 'AI settings load' },
  { helper: 'updateAiSettings', routeSnippets: ['/api/v1/ai/settings'], workflow: 'AI settings update' },
  { helper: 'listAiAgents', routeSnippets: ['/api/v1/ai/agents'], workflow: 'AI agent list' },
  { helper: 'createAiAgent', routeSnippets: ['/api/v1/ai/agents'], workflow: 'AI agent create' },
  { helper: 'updateAiAgent', routeSnippets: ['/api/v1/ai/agents/{agentId}'], workflow: 'AI agent update' },
  { helper: 'archiveAiAgent', routeSnippets: ['/api/v1/ai/agents/{agentId}/archive'], workflow: 'AI agent archive' },
  { helper: 'restoreAiAgent', routeSnippets: ['/api/v1/ai/agents/{agentId}/restore'], workflow: 'AI agent restore' },
  { helper: 'deleteAiAgent', routeSnippets: ['/api/v1/ai/agents/{agentId}'], workflow: 'AI agent delete' },
  { helper: 'getBillingAccountStatus', routeSnippets: ['/api/v1/billing/account'], workflow: 'tenant billing account status' },
  { helper: 'listBillingPlans', routeSnippets: ['/api/v1/plans'], workflow: 'tenant billing plan list' },
  { helper: 'getCurrentTenantSubscription', routeSnippets: ['/api/v1/subscriptions/current'], workflow: 'current tenant subscription' },
  { helper: 'startTenantBillingTrial', routeSnippets: ['/api/v1/billing/trial'], workflow: 'tenant billing trial start' },
  { helper: 'createBillingCheckout', routeSnippets: ['/api/v1/billing/checkout'], workflow: 'billing checkout create' },
  { helper: 'createBillingPortal', routeSnippets: ['/api/v1/billing/portal'], workflow: 'billing portal create' },
  { helper: 'changeTenantSubscriptionPlan', routeSnippets: ['/api/v1/subscriptions/{subscriptionId}/change-plan'], workflow: 'tenant subscription plan change' },
  { helper: 'cancelTenantSubscription', routeSnippets: ['/api/v1/subscriptions/{subscriptionId}/cancel'], workflow: 'tenant subscription cancel' },
  { helper: 'resumeTenantSubscription', routeSnippets: ['/api/v1/subscriptions/{subscriptionId}/resume'], workflow: 'tenant subscription resume' },
  { helper: 'listTenantInvoices', routeSnippets: ['/api/v1/invoices'], workflow: 'tenant invoice list' },
  { helper: 'getTenantEntitlements', routeSnippets: ['/api/v1/entitlements'], workflow: 'tenant entitlement list' },
  { helper: 'listTenantUsageRecords', routeSnippets: ['/api/v1/usage-records'], workflow: 'tenant usage record list' },
  { helper: 'getTenantUsageSummary', routeSnippets: ['/api/v1/usage-records/summary'], workflow: 'tenant usage summary' },
  { helper: 'listAuditLogs', routeSnippets: ['/api/v1/admin/audit-logs'], workflow: 'tenant audit log search' },
  { helper: 'getAdminOverview', routeSnippets: ['/api/v1/admin/overview'], workflow: 'admin console overview' },
  { helper: 'getSecurityChecks', routeSnippets: ['/api/v1/admin/security-checks'], workflow: 'tenant security check load' },
  { helper: 'getSecurityPolicy', routeSnippets: ['/api/v1/admin/security-policy'], workflow: 'tenant security policy load' },
  { helper: 'updateSecurityPolicy', routeSnippets: ['/api/v1/admin/security-policy'], workflow: 'tenant security policy update' },
  { helper: 'listSecurityEvents', routeSnippets: ['/api/v1/admin/security-events'], workflow: 'tenant security event list' },
  { helper: 'updateSecurityEvent', routeSnippets: ['/api/v1/admin/security-events/{eventId}'], workflow: 'tenant security event update' },
  { helper: 'listComplianceJobs', routeSnippets: ['/api/v1/admin/compliance-jobs'], workflow: 'tenant compliance job list' },
  { helper: 'createComplianceJob', routeSnippets: ['/api/v1/admin/compliance-jobs'], workflow: 'tenant compliance job create' },
  { helper: 'approveComplianceJob', routeSnippets: ['/api/v1/admin/compliance-jobs/{jobId}/approve'], workflow: 'tenant compliance job approve' },
  { helper: 'rejectComplianceJob', routeSnippets: ['/api/v1/admin/compliance-jobs/{jobId}/reject'], workflow: 'tenant compliance job reject' },
  { helper: 'runComplianceJob', routeSnippets: ['/api/v1/admin/compliance-jobs/{jobId}/run'], workflow: 'tenant compliance job run' },
  { helper: 'cancelComplianceJob', routeSnippets: ['/api/v1/admin/compliance-jobs/{jobId}/cancel'], workflow: 'tenant compliance job cancel' },
  { helper: 'listApiKeys', routeSnippets: ['/api/v1/admin/api-keys'], workflow: 'tenant API key list' },
  { helper: 'createApiKey', routeSnippets: ['/api/v1/admin/api-keys'], workflow: 'tenant API key create' },
  { helper: 'revokeApiKey', routeSnippets: ['/api/v1/admin/api-keys/{apiKeyId}/revoke'], workflow: 'tenant API key revoke' },
  { helper: 'listConversations', routeSnippets: ['/api/v1/conversations'], workflow: 'conversation list' },
  { helper: 'createConversation', routeSnippets: ['/api/v1/conversations'], workflow: 'conversation create' },
  { helper: 'getConversation', routeSnippets: ['/api/v1/conversations/{conversationId}'], workflow: 'conversation detail' },
  { helper: 'updateConversation', routeSnippets: ['/api/v1/conversations/{conversationId}'], workflow: 'conversation update' },
  { helper: 'deleteConversation', routeSnippets: ['/api/v1/conversations/{conversationId}'], workflow: 'conversation delete' },
  { helper: 'listConversationMembers', routeSnippets: ['/api/v1/conversations/{conversationId}/members'], workflow: 'conversation member list' },
  { helper: 'addConversationMember', routeSnippets: ['/api/v1/conversations/{conversationId}/members'], workflow: 'conversation member add' },
  { helper: 'removeConversationMember', routeSnippets: ['/api/v1/conversations/{conversationId}/members/{userId}'], workflow: 'conversation member remove' },
  { helper: 'listMessages', routeSnippets: ['/api/v1/conversations/{conversationId}/messages'], workflow: 'conversation message list' },
  { helper: 'sendMessage', routeSnippets: ['/api/v1/conversations/{conversationId}/messages'], workflow: 'conversation message send' },
  { helper: 'listPinnedMessages', routeSnippets: ['/api/v1/conversations/{conversationId}/messages/pinned'], workflow: 'conversation pinned message list' },
  { helper: 'updateMessage', routeSnippets: ['/api/v1/messages/{messageId}'], workflow: 'message update' },
  { helper: 'deleteMessage', routeSnippets: ['/api/v1/messages/{messageId}'], workflow: 'message delete' },
  { helper: 'pinMessage', routeSnippets: ['/api/v1/messages/{messageId}/pin'], workflow: 'message pin' },
  { helper: 'unpinMessage', routeSnippets: ['/api/v1/messages/{messageId}/unpin'], workflow: 'message unpin' },
  { helper: 'forwardMessage', routeSnippets: ['/api/v1/messages/{messageId}/forward'], workflow: 'message forward' },
  { helper: 'addMessageReaction', routeSnippets: ['/api/v1/messages/{messageId}/reactions'], workflow: 'message reaction add' },
  { helper: 'removeMessageReaction', routeSnippets: ['/api/v1/messages/{messageId}/reactions/{emoji}'], workflow: 'message reaction remove' },
  { helper: 'listMessageReadReceipts', routeSnippets: ['/api/v1/messages/{messageId}/read-receipts'], workflow: 'message read receipt list' },
  { helper: 'markMessageRead', routeSnippets: ['/api/v1/messages/{messageId}/read-receipts'], workflow: 'message mark read' },
  { helper: 'listReports', routeSnippets: ['/api/v1/reporting/reports'], workflow: 'report list' },
  { helper: 'createReport', routeSnippets: ['/api/v1/reporting/reports'], workflow: 'report create' },
  { helper: 'runAdHocReport', routeSnippets: ['/api/v1/reporting/reports/run'], workflow: 'ad hoc report run' },
  { helper: 'runSavedReport', routeSnippets: ['/api/v1/reporting/reports/{reportId}/run'], workflow: 'saved report run' },
  { helper: 'exportSavedReport', routeSnippets: ['/api/v1/reporting/reports/{reportId}/exports'], workflow: 'saved report export' },
  { helper: 'listReportExecutions', routeSnippets: ['/api/v1/reporting/executions'], workflow: 'report execution list' },
  { helper: 'listReportExports', routeSnippets: ['/api/v1/reporting/exports'], workflow: 'report export list' },
  { helper: 'getAnalyticsOverview', routeSnippets: ['/api/v1/reporting/analytics/overview'], workflow: 'executive metrics' },
  { helper: 'getProjectHealthAnalytics', routeSnippets: ['/api/v1/reporting/analytics/project-health'], workflow: 'project health analytics' },
  { helper: 'getTeamPerformanceAnalytics', routeSnippets: ['/api/v1/reporting/analytics/team-performance'], workflow: 'team performance analytics' },
  { helper: 'getCycleTimeAnalytics', routeSnippets: ['/api/v1/reporting/analytics/cycle-time'], workflow: 'cycle time analytics' },
  { helper: 'getVelocityAnalytics', routeSnippets: ['/api/v1/reporting/analytics/velocity'], workflow: 'velocity analytics' },
  { helper: 'getBudgetAnalytics', routeSnippets: ['/api/v1/reporting/analytics/budget'], workflow: 'budget analytics' },
  { helper: 'getSlaAnalytics', routeSnippets: ['/api/v1/reporting/analytics/sla'], workflow: 'SLA analytics' },
  { helper: 'getSiteAdminProfile', routeSnippets: ['/api/v1/site-admin/me'], workflow: 'site admin profile' },
  { helper: 'getSiteAdminOverview', routeSnippets: ['/api/v1/site-admin/overview'], workflow: 'site admin overview' },
  { helper: 'getSiteIdentitySecurityOverview', routeSnippets: ['/api/v1/site-admin/identity-security/overview'], workflow: 'site identity overview' },
  { helper: 'listSiteLoginHistory', routeSnippets: ['/api/v1/site-admin/identity-security/login-history'], workflow: 'site login history' },
  { helper: 'listSiteTrustedDevices', routeSnippets: ['/api/v1/site-admin/identity-security/trusted-devices'], workflow: 'site trusted device list' },
  { helper: 'revokeSiteTrustedDevice', routeSnippets: ['/api/v1/site-admin/identity-security/trusted-devices/{deviceId}/revoke'], workflow: 'site trusted device revoke' },
  { helper: 'listSiteSsoProviders', routeSnippets: ['/api/v1/site-admin/identity-security/sso-providers'], workflow: 'site SSO provider list' },
  { helper: 'listSiteSecurityPolicies', routeSnippets: ['/api/v1/site-admin/identity-security/policies'], workflow: 'site security policy list' },
  { helper: 'sendSiteAdminPasswordReset', routeSnippets: ['/api/v1/site-admin/identity-security/users/{userId}/password-reset'], workflow: 'site admin password reset' },
  { helper: 'listSiteSessions', routeSnippets: ['/api/v1/site-admin/sessions'], workflow: 'site session list' },
  { helper: 'revokeSiteSession', routeSnippets: ['/api/v1/site-admin/sessions/{sessionId}/revoke'], workflow: 'site session revoke' },
  { helper: 'getSiteBillingOverview', routeSnippets: ['/api/v1/site-admin/billing/overview'], workflow: 'site billing overview' },
  { helper: 'listSiteBillingPlans', routeSnippets: ['/api/v1/site-admin/billing/plans'], workflow: 'site billing plan list' },
  { helper: 'createSiteBillingPlan', routeSnippets: ['/api/v1/site-admin/billing/plans'], workflow: 'site billing plan create' },
  { helper: 'updateSiteBillingPlan', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}'], workflow: 'site billing plan update' },
  { helper: 'archiveSiteBillingPlan', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}/archive'], workflow: 'site billing plan archive' },
  { helper: 'restoreSiteBillingPlan', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}/restore'], workflow: 'site billing plan restore' },
  { helper: 'syncSiteBillingPlanToStripe', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}/sync/stripe'], workflow: 'site billing plan Stripe sync' },
  { helper: 'assignSiteBillingPlanFeature', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}/features'], workflow: 'site billing plan feature assign' },
  { helper: 'updateSiteBillingPlanFeature', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}/features/{featureId}'], workflow: 'site billing plan feature update' },
  { helper: 'removeSiteBillingPlanFeature', routeSnippets: ['/api/v1/site-admin/billing/plans/{planId}/features/{featureId}'], workflow: 'site billing plan feature remove' },
  { helper: 'listSiteBillingFeatures', routeSnippets: ['/api/v1/site-admin/billing/features'], workflow: 'site billing feature list' },
  { helper: 'createSiteBillingFeature', routeSnippets: ['/api/v1/site-admin/billing/features'], workflow: 'site billing feature create' },
  { helper: 'updateSiteBillingFeature', routeSnippets: ['/api/v1/site-admin/billing/features/{featureId}'], workflow: 'site billing feature update' },
  { helper: 'setSiteBillingFeatureActive', routeSnippets: ['/api/v1/site-admin/billing/features/{featureId}/enable'], workflow: 'site billing feature enable' },
  { helper: 'setSiteBillingFeatureActive', routeSnippets: ['/api/v1/site-admin/billing/features/{featureId}/disable'], workflow: 'site billing feature disable' },
  { helper: 'listSiteBillingSubscriptions', routeSnippets: ['/api/v1/site-admin/billing/subscriptions'], workflow: 'site subscription list' },
  { helper: 'updateSiteSubscription', routeSnippets: ['/api/v1/site-admin/billing/subscriptions/{subscriptionId}'], workflow: 'site subscription update' },
  { helper: 'changeSiteSubscriptionPlan', routeSnippets: ['/api/v1/site-admin/billing/subscriptions/{subscriptionId}/change-plan'], workflow: 'site subscription plan change' },
  { helper: 'cancelSiteSubscription', routeSnippets: ['/api/v1/site-admin/billing/subscriptions/{subscriptionId}/cancel'], workflow: 'site subscription cancel' },
  { helper: 'resumeSiteSubscription', routeSnippets: ['/api/v1/site-admin/billing/subscriptions/{subscriptionId}/resume'], workflow: 'site subscription resume' },
  { helper: 'startSiteTenantTrial', routeSnippets: ['/api/v1/site-admin/billing/tenants/{tenantId}/start-trial'], workflow: 'site tenant trial start' },
  { helper: 'listSiteBillingInvoices', routeSnippets: ['/api/v1/site-admin/billing/invoices'], workflow: 'site invoice list' },
  { helper: 'listSiteBillingUsageRecords', routeSnippets: ['/api/v1/site-admin/billing/usage-records'], workflow: 'site usage record list' },
  { helper: 'listSiteBillingEvents', routeSnippets: ['/api/v1/site-admin/billing/events'], workflow: 'site billing event list' },
  { helper: 'listSiteBillingEntitlements', routeSnippets: ['/api/v1/site-admin/billing/entitlements'], workflow: 'site entitlement list' },
  { helper: 'sitePlatformSearch', routeSnippets: ['/api/v1/site-admin/search'], workflow: 'site platform search' },
  { helper: 'getSiteAutomationOverview', routeSnippets: ['/api/v1/site-admin/automation/overview'], workflow: 'site automation overview' },
  { helper: 'listSiteWorkflows', routeSnippets: ['/api/v1/site-admin/automation/workflows'], workflow: 'site workflow list' },
  { helper: 'listSiteWorkflowRuns', routeSnippets: ['/api/v1/site-admin/automation/runs'], workflow: 'site workflow run list' },
  { helper: 'retrySiteWorkflowRun', routeSnippets: ['/api/v1/site-admin/automation/runs/{runId}/retry'], workflow: 'site workflow run retry' },
  { helper: 'cancelSiteWorkflowRun', routeSnippets: ['/api/v1/site-admin/automation/runs/{runId}/cancel'], workflow: 'site workflow run cancel' },
  { helper: 'listSiteApprovalDefinitions', routeSnippets: ['/api/v1/site-admin/automation/approval-definitions'], workflow: 'site approval definition list' },
  { helper: 'listSiteApprovals', routeSnippets: ['/api/v1/site-admin/automation/approvals'], workflow: 'site approval list' },
  { helper: 'listSiteWorkflowRunLogs', routeSnippets: ['/api/v1/site-admin/automation/run-logs'], workflow: 'site workflow run log list' },
  { helper: 'getSiteAiOverview', routeSnippets: ['/api/v1/site-admin/ai/overview'], workflow: 'site AI overview' },
  { helper: 'listSiteAiSettings', routeSnippets: ['/api/v1/site-admin/ai/settings'], workflow: 'site AI setting list' },
  { helper: 'listSiteAiAgents', routeSnippets: ['/api/v1/site-admin/ai/agents'], workflow: 'site AI agent list' },
  { helper: 'listSiteAiConversations', routeSnippets: ['/api/v1/site-admin/ai/conversations'], workflow: 'site AI conversation list' },
  { helper: 'listSiteAiActions', routeSnippets: ['/api/v1/site-admin/ai/actions'], workflow: 'site AI action list' },
  { helper: 'listSiteAiUsage', routeSnippets: ['/api/v1/site-admin/ai/usage'], workflow: 'site AI usage list' },
  { helper: 'getSiteReportingOverview', routeSnippets: ['/api/v1/site-admin/reporting/overview'], workflow: 'site reporting overview' },
  { helper: 'listSiteDashboards', routeSnippets: ['/api/v1/site-admin/reporting/dashboards'], workflow: 'site dashboard list' },
  { helper: 'listSiteReports', routeSnippets: ['/api/v1/site-admin/reporting/reports'], workflow: 'site report list' },
  { helper: 'listSiteReportExecutions', routeSnippets: ['/api/v1/site-admin/reporting/executions'], workflow: 'site report execution list' },
  { helper: 'listSiteReportExports', routeSnippets: ['/api/v1/site-admin/reporting/exports'], workflow: 'site report export list' },
  { helper: 'getSiteHardeningOverview', routeSnippets: ['/api/v1/site-admin/hardening/overview'], workflow: 'site hardening overview' },
  { helper: 'getSiteIntegrationsOverview', routeSnippets: ['/api/v1/site-admin/integrations/overview'], workflow: 'site integration overview' },
  { helper: 'listSiteIntegrations', routeSnippets: ['/api/v1/site-admin/integrations'], workflow: 'site integration list' },
  { helper: 'rotateSiteIntegrationSecret', routeSnippets: ['/api/v1/site-admin/integrations/{integrationId}/rotate-secret'], workflow: 'site integration secret rotate' },
  { helper: 'listSiteWebhooks', routeSnippets: ['/api/v1/site-admin/webhooks'], workflow: 'site webhook list' },
  { helper: 'listSiteWebhookDeliveries', routeSnippets: ['/api/v1/site-admin/webhook-deliveries'], workflow: 'site webhook delivery list' },
  { helper: 'retrySiteWebhookDelivery', routeSnippets: ['/api/v1/site-admin/webhook-deliveries/{deliveryId}/retry'], workflow: 'site webhook delivery retry' },
  { helper: 'rotateSiteWebhookSecret', routeSnippets: ['/api/v1/site-admin/webhooks/{webhookId}/rotate-secret'], workflow: 'site webhook secret rotate' },
  { helper: 'getSiteObservabilityOverview', routeSnippets: ['/api/v1/site-admin/observability/overview'], workflow: 'site observability overview' },
  { helper: 'getSiteRealtimeOverview', routeSnippets: ['/api/v1/site-admin/realtime/overview'], workflow: 'site realtime overview' },
  { helper: 'listSiteConversations', routeSnippets: ['/api/v1/site-admin/realtime/conversations'], workflow: 'site realtime conversation list' },
  { helper: 'listSiteMessageActivity', routeSnippets: ['/api/v1/site-admin/realtime/message-activity'], workflow: 'site message activity list' },
  { helper: 'getSiteMeetingOverview', routeSnippets: ['/api/v1/site-admin/meetings/overview'], workflow: 'site meeting overview' },
  { helper: 'listSiteMeetingTenants', routeSnippets: ['/api/v1/site-admin/meetings/tenants'], workflow: 'site meeting tenant list' },
  { helper: 'listSiteMeetingReminderLogs', routeSnippets: ['/api/v1/site-admin/meetings/reminder-logs'], workflow: 'site meeting reminder log list' },
  { helper: 'getSiteComplianceOverview', routeSnippets: ['/api/v1/site-admin/compliance/overview'], workflow: 'site compliance overview' },
  { helper: 'listSiteComplianceJobs', routeSnippets: ['/api/v1/site-admin/compliance/jobs'], workflow: 'site compliance job list' },
  { helper: 'approveSiteComplianceJob', routeSnippets: ['/api/v1/site-admin/compliance/jobs/{jobId}/approve'], workflow: 'site compliance job approve' },
  { helper: 'rejectSiteComplianceJob', routeSnippets: ['/api/v1/site-admin/compliance/jobs/{jobId}/reject'], workflow: 'site compliance job reject' },
  { helper: 'runSiteComplianceJob', routeSnippets: ['/api/v1/site-admin/compliance/jobs/{jobId}/run'], workflow: 'site compliance job run' },
  { helper: 'cancelSiteComplianceJob', routeSnippets: ['/api/v1/site-admin/compliance/jobs/{jobId}/cancel'], workflow: 'site compliance job cancel' },
  { helper: 'listSiteTenants', routeSnippets: ['/api/v1/site-admin/tenants'], workflow: 'site tenant list' },
  { helper: 'listSiteUsers', routeSnippets: ['/api/v1/site-admin/users'], workflow: 'site user list' },
  { helper: 'getSiteUser', routeSnippets: ['/api/v1/site-admin/users/{userId}'], workflow: 'site user detail' },
  { helper: 'updateSiteUserStatus', routeSnippets: ['/api/v1/site-admin/users/{userId}/status'], workflow: 'site user status update' },
  { helper: 'revokeSiteUserSessions', routeSnippets: ['/api/v1/site-admin/users/{userId}/sessions/revoke'], workflow: 'site user sessions revoke' },
  { helper: 'resendSiteUserVerification', routeSnippets: ['/api/v1/site-admin/users/{userId}/resend-verification'], workflow: 'site user verification resend' },
  { helper: 'getSiteTenant', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}'], workflow: 'site tenant detail' },
  { helper: 'updateSiteTenantStatus', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/status'], workflow: 'site tenant status update' },
  { helper: 'listSiteTenantUsers', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/users'], workflow: 'site tenant users' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/projects'], workflow: 'site tenant projects' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/workspaces'], workflow: 'site tenant workspaces' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/teams'], workflow: 'site tenant teams' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/sessions'], workflow: 'site tenant sessions' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/security'], workflow: 'site tenant security' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/billing'], workflow: 'site tenant billing' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/integrations'], workflow: 'site tenant integrations' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/files'], workflow: 'site tenant files' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/ai'], workflow: 'site tenant AI' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/reports'], workflow: 'site tenant reports' },
  { helper: 'listSiteTenantResource', routeSnippets: ['/api/v1/site-admin/tenants/{tenantId}/activity'], workflow: 'site tenant activity' },
  { helper: 'listSiteSecurityEvents', routeSnippets: ['/api/v1/site-admin/security-events'], workflow: 'site security event list' },
  { helper: 'updateSiteSecurityEvent', routeSnippets: ['/api/v1/site-admin/security-events/{eventId}'], workflow: 'site security event update' },
  { helper: 'listPlatformAuditLogs', routeSnippets: ['/api/v1/site-admin/audit-logs'], workflow: 'platform audit log list' },
  { helper: 'listPlatformAdmins', routeSnippets: ['/api/v1/site-admin/platform-admins'], workflow: 'platform admin grant list' },
  { helper: 'grantPlatformAdmin', routeSnippets: ['/api/v1/site-admin/platform-admins'], workflow: 'platform admin grant create' },
  { helper: 'revokePlatformAdmin', routeSnippets: ['/api/v1/site-admin/platform-admins/{platformAdminId}/revoke'], workflow: 'platform admin revoke' }
];

const meetingBookingRequiredEndpoints: RequiredEndpoint[] = [
  { method: 'get', path: '/api/v1/meetings/types', workflow: 'meeting type list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/types', workflow: 'meeting type create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/types/{typeId}', workflow: 'meeting type update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings', workflow: 'meeting list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings', workflow: 'meeting create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/{meetingId}', workflow: 'meeting detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}', workflow: 'meeting update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/cancel', workflow: 'meeting cancel', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/complete', workflow: 'meeting complete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/start', workflow: 'meeting start', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/archive', workflow: 'meeting archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/restore', workflow: 'meeting restore', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/integrations/status', workflow: 'meeting integration status', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/integrations/settings', workflow: 'meeting integration settings', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/integrations/settings', workflow: 'meeting integration settings update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/admin/overview', workflow: 'meeting admin overview', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/admin/policy', workflow: 'meeting admin policy', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/admin/policy', workflow: 'meeting admin policy update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/admin/analytics', workflow: 'meeting admin analytics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/admin/reminder-logs', workflow: 'meeting admin reminder logs', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/conference', workflow: 'meeting conference create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/reminder-jobs', workflow: 'meeting reminder job list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/reminder-jobs/process', workflow: 'meeting reminder jobs process', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/reminder-jobs/{jobId}/retry', workflow: 'meeting reminder job retry', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/{meetingId}/ai', workflow: 'meeting AI state', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/ai/links', workflow: 'meeting AI context link', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/agenda', workflow: 'meeting AI agenda', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/preparation-brief', workflow: 'meeting AI preparation brief', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/suggest-attendees', workflow: 'meeting AI attendee suggestions', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/risk-detection', workflow: 'meeting AI risk detection', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/notes', workflow: 'meeting AI notes', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/follow-up', workflow: 'meeting AI follow-up', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/role-summary', workflow: 'meeting AI role summary', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/effectiveness-score', workflow: 'meeting AI effectiveness score', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/missed-decisions', workflow: 'meeting AI missed decisions', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/action-items/convert-tasks', workflow: 'meeting AI action item conversion', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/ai/action-items/follow-up-reminders', workflow: 'meeting AI follow-up reminders', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/availability', workflow: 'meeting availability list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/availability/windows', workflow: 'meeting availability window create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/meetings/availability/windows/{windowId}', workflow: 'meeting availability window delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/booking/pages', workflow: 'booking page list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/booking/pages', workflow: 'booking page create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/booking/pages/{pageId}', workflow: 'booking page update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/booking/pages/{pageId}/fields', workflow: 'booking form field create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/booking/pages/{pageId}/fields/{fieldId}', workflow: 'booking form field update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/meetings/booking/pages/{pageId}/fields/{fieldId}', workflow: 'booking form field delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/booking/requests', workflow: 'booking request list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/booking/public/{tenantSlug}/page', workflow: 'public booking page resolve', auth: 'public' },
  { method: 'get', path: '/api/v1/booking/public/{tenantSlug}/slots', workflow: 'public booking slot list', auth: 'public' },
  { method: 'post', path: '/api/v1/booking/public/{tenantSlug}/book', workflow: 'public booking create', auth: 'public' },
  { method: 'post', path: '/api/v1/booking/public/cancel/{token}', workflow: 'public booking cancel', auth: 'public' },
  { method: 'post', path: '/api/v1/booking/public/reschedule/{token}', workflow: 'public booking reschedule', auth: 'public' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/attendees', workflow: 'meeting attendee add', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/attendees/{attendeeId}', workflow: 'meeting attendee update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/agenda', workflow: 'meeting agenda item create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/agenda/{itemId}', workflow: 'meeting agenda item update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/reminders', workflow: 'meeting reminder create', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/{meetingId}/activity', workflow: 'meeting activity list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/meetings/{meetingId}/workspace', workflow: 'meeting workspace load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/live-notes', workflow: 'meeting live notes update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/comments', workflow: 'meeting comment create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/comments/{commentId}', workflow: 'meeting comment update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/meetings/{meetingId}/comments/{commentId}', workflow: 'meeting comment delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/decisions', workflow: 'meeting decision create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/decisions/{decisionId}', workflow: 'meeting decision update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/meetings/{meetingId}/decisions/{decisionId}', workflow: 'meeting decision delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/checklist', workflow: 'meeting checklist item create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/checklist/{itemId}', workflow: 'meeting checklist item update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/meetings/{meetingId}/checklist/{itemId}', workflow: 'meeting checklist item delete', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/meetings/{meetingId}/attendance/{attendeeId}', workflow: 'meeting attendance update', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/no-show', workflow: 'meeting no-show mark', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/action-items/assign', workflow: 'meeting action item assign', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/follow-up', workflow: 'meeting follow-up send', auth: 'bearer' },
  { method: 'post', path: '/api/v1/meetings/{meetingId}/omoflow/sync', workflow: 'meeting runtime sync', auth: 'bearer' }
];

const meetingBookingFrontendChecks: FrontendClientCheck[] = [
  { helper: 'listMeetingTypes', routeSnippets: ['/api/v1/meetings/types'], workflow: 'meeting type list' },
  { helper: 'createMeetingType', routeSnippets: ['/api/v1/meetings/types'], workflow: 'meeting type create' },
  { helper: 'updateMeetingType', routeSnippets: ['/api/v1/meetings/types/{typeId}'], workflow: 'meeting type update' },
  { helper: 'listMeetings', routeSnippets: ['/api/v1/meetings'], workflow: 'meeting list' },
  { helper: 'getMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}'], workflow: 'meeting detail load' },
  { helper: 'createMeeting', routeSnippets: ['/api/v1/meetings'], workflow: 'meeting create' },
  { helper: 'updateMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}'], workflow: 'meeting update' },
  { helper: 'cancelMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}/cancel'], workflow: 'meeting cancel' },
  { helper: 'completeMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}/complete'], workflow: 'meeting complete' },
  { helper: 'startMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}/start'], workflow: 'meeting start' },
  { helper: 'archiveMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}/archive'], workflow: 'meeting archive' },
  { helper: 'restoreMeeting', routeSnippets: ['/api/v1/meetings/{meetingId}/restore'], workflow: 'meeting restore' },
  { helper: 'getMeetingIntegrationStatus', routeSnippets: ['/api/v1/meetings/integrations/status'], workflow: 'meeting integration status' },
  { helper: 'getMeetingIntegrationSettings', routeSnippets: ['/api/v1/meetings/integrations/settings'], workflow: 'meeting integration settings' },
  { helper: 'updateMeetingIntegrationSettings', routeSnippets: ['/api/v1/meetings/integrations/settings'], workflow: 'meeting integration settings update' },
  { helper: 'getMeetingAdminOverview', routeSnippets: ['/api/v1/meetings/admin/overview'], workflow: 'meeting admin overview' },
  { helper: 'getMeetingPolicy', routeSnippets: ['/api/v1/meetings/admin/policy'], workflow: 'meeting admin policy' },
  { helper: 'updateMeetingPolicy', routeSnippets: ['/api/v1/meetings/admin/policy'], workflow: 'meeting admin policy update' },
  { helper: 'getMeetingAdminAnalytics', routeSnippets: ['/api/v1/meetings/admin/analytics'], workflow: 'meeting admin analytics' },
  { helper: 'listMeetingAdminReminderLogs', routeSnippets: ['/api/v1/meetings/admin/reminder-logs'], workflow: 'meeting admin reminder logs' },
  { helper: 'createMeetingConference', routeSnippets: ['/api/v1/meetings/{meetingId}/conference'], workflow: 'meeting conference create' },
  { helper: 'listMeetingReminderJobs', routeSnippets: ['/api/v1/meetings/reminder-jobs'], workflow: 'meeting reminder job list' },
  { helper: 'processMeetingReminderJobs', routeSnippets: ['/api/v1/meetings/reminder-jobs/process'], workflow: 'meeting reminder jobs process' },
  { helper: 'retryMeetingReminderJob', routeSnippets: ['/api/v1/meetings/reminder-jobs/{jobId}/retry'], workflow: 'meeting reminder job retry' },
  { helper: 'getMeetingAiState', routeSnippets: ['/api/v1/meetings/{meetingId}/ai'], workflow: 'meeting AI state' },
  { helper: 'linkMeetingAiContext', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/links'], workflow: 'meeting AI context link' },
  { helper: 'generateMeetingAiAgenda', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/agenda'], workflow: 'meeting AI agenda' },
  { helper: 'generateMeetingAiPreparationBrief', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/preparation-brief'], workflow: 'meeting AI preparation brief' },
  { helper: 'suggestMeetingAiAttendees', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/suggest-attendees'], workflow: 'meeting AI attendee suggestions' },
  { helper: 'detectMeetingAiRisks', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/risk-detection'], workflow: 'meeting AI risk detection' },
  { helper: 'generateMeetingAiNotes', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/notes'], workflow: 'meeting AI notes' },
  { helper: 'generateMeetingAiFollowUp', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/follow-up'], workflow: 'meeting AI follow-up' },
  { helper: 'generateMeetingAiRoleSummary', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/role-summary'], workflow: 'meeting AI role summary' },
  { helper: 'scoreMeetingAiEffectiveness', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/effectiveness-score'], workflow: 'meeting AI effectiveness score' },
  { helper: 'detectMeetingAiMissedDecisions', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/missed-decisions'], workflow: 'meeting AI missed decisions' },
  { helper: 'convertMeetingAiActionItems', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/action-items/convert-tasks'], workflow: 'meeting AI action item conversion' },
  { helper: 'scheduleMeetingAiFollowUpReminders', routeSnippets: ['/api/v1/meetings/{meetingId}/ai/action-items/follow-up-reminders'], workflow: 'meeting AI follow-up reminders' },
  { helper: 'listMeetingAvailability', routeSnippets: ['/api/v1/meetings/availability'], workflow: 'meeting availability list' },
  { helper: 'createMeetingAvailabilityWindow', routeSnippets: ['/api/v1/meetings/availability/windows'], workflow: 'meeting availability window create' },
  { helper: 'deleteMeetingAvailabilityWindow', routeSnippets: ['/api/v1/meetings/availability/windows/{windowId}'], workflow: 'meeting availability window delete' },
  { helper: 'listBookingPages', routeSnippets: ['/api/v1/meetings/booking/pages'], workflow: 'booking page list' },
  { helper: 'createBookingPage', routeSnippets: ['/api/v1/meetings/booking/pages'], workflow: 'booking page create' },
  { helper: 'updateBookingPage', routeSnippets: ['/api/v1/meetings/booking/pages/{pageId}'], workflow: 'booking page update' },
  { helper: 'createBookingFormField', routeSnippets: ['/api/v1/meetings/booking/pages/{pageId}/fields'], workflow: 'booking form field create' },
  { helper: 'updateBookingFormField', routeSnippets: ['/api/v1/meetings/booking/pages/{pageId}/fields/{fieldId}'], workflow: 'booking form field update' },
  { helper: 'deleteBookingFormField', routeSnippets: ['/api/v1/meetings/booking/pages/{pageId}/fields/{fieldId}'], workflow: 'booking form field delete' },
  { helper: 'listBookingRequests', routeSnippets: ['/api/v1/meetings/booking/requests'], workflow: 'booking request list' },
  { helper: 'resolvePublicBookingPage', routeSnippets: ['/api/v1/booking/public/{tenantSlug}/page'], workflow: 'public booking page resolve' },
  { helper: 'listPublicBookingSlots', routeSnippets: ['/api/v1/booking/public/{tenantSlug}/slots'], workflow: 'public booking slot list' },
  { helper: 'createPublicBooking', routeSnippets: ['/api/v1/booking/public/{tenantSlug}/book'], workflow: 'public booking create' },
  { helper: 'cancelPublicBooking', routeSnippets: ['/api/v1/booking/public/cancel/{token}'], workflow: 'public booking cancel' },
  { helper: 'reschedulePublicBooking', routeSnippets: ['/api/v1/booking/public/reschedule/{token}'], workflow: 'public booking reschedule' },
  { helper: 'addMeetingAttendee', routeSnippets: ['/api/v1/meetings/{meetingId}/attendees'], workflow: 'meeting attendee add' },
  { helper: 'updateMeetingAttendee', routeSnippets: ['/api/v1/meetings/{meetingId}/attendees/{attendeeId}'], workflow: 'meeting attendee update' },
  { helper: 'createMeetingAgendaItem', routeSnippets: ['/api/v1/meetings/{meetingId}/agenda'], workflow: 'meeting agenda item create' },
  { helper: 'updateMeetingAgendaItem', routeSnippets: ['/api/v1/meetings/{meetingId}/agenda/{itemId}'], workflow: 'meeting agenda item update' },
  { helper: 'createMeetingReminder', routeSnippets: ['/api/v1/meetings/{meetingId}/reminders'], workflow: 'meeting reminder create' },
  { helper: 'listMeetingActivity', routeSnippets: ['/api/v1/meetings/{meetingId}/activity'], workflow: 'meeting activity list' },
  { helper: 'getMeetingWorkspace', routeSnippets: ['/api/v1/meetings/{meetingId}/workspace'], workflow: 'meeting workspace load' },
  { helper: 'updateLiveMeetingNotes', routeSnippets: ['/api/v1/meetings/{meetingId}/live-notes'], workflow: 'meeting live notes update' },
  { helper: 'createMeetingComment', routeSnippets: ['/api/v1/meetings/{meetingId}/comments'], workflow: 'meeting comment create' },
  { helper: 'updateMeetingComment', routeSnippets: ['/api/v1/meetings/{meetingId}/comments/{commentId}'], workflow: 'meeting comment update' },
  { helper: 'deleteMeetingComment', routeSnippets: ['/api/v1/meetings/{meetingId}/comments/{commentId}'], workflow: 'meeting comment delete' },
  { helper: 'createMeetingDecision', routeSnippets: ['/api/v1/meetings/{meetingId}/decisions'], workflow: 'meeting decision create' },
  { helper: 'updateMeetingDecision', routeSnippets: ['/api/v1/meetings/{meetingId}/decisions/{decisionId}'], workflow: 'meeting decision update' },
  { helper: 'deleteMeetingDecision', routeSnippets: ['/api/v1/meetings/{meetingId}/decisions/{decisionId}'], workflow: 'meeting decision delete' },
  { helper: 'createMeetingChecklistItem', routeSnippets: ['/api/v1/meetings/{meetingId}/checklist'], workflow: 'meeting checklist item create' },
  { helper: 'updateMeetingChecklistItem', routeSnippets: ['/api/v1/meetings/{meetingId}/checklist/{itemId}'], workflow: 'meeting checklist item update' },
  { helper: 'deleteMeetingChecklistItem', routeSnippets: ['/api/v1/meetings/{meetingId}/checklist/{itemId}'], workflow: 'meeting checklist item delete' },
  { helper: 'updateMeetingAttendance', routeSnippets: ['/api/v1/meetings/{meetingId}/attendance/{attendeeId}'], workflow: 'meeting attendance update' },
  { helper: 'markMeetingNoShow', routeSnippets: ['/api/v1/meetings/{meetingId}/no-show'], workflow: 'meeting no-show mark' },
  { helper: 'assignMeetingActionItem', routeSnippets: ['/api/v1/meetings/{meetingId}/action-items/assign'], workflow: 'meeting action item assign' },
  { helper: 'sendMeetingFollowUp', routeSnippets: ['/api/v1/meetings/{meetingId}/follow-up'], workflow: 'meeting follow-up send' },
  { helper: 'syncMeetingOmoFlowRuntime', routeSnippets: ['/api/v1/meetings/{meetingId}/omoflow/sync'], workflow: 'meeting runtime sync' }
];

const requiredEndpoints: RequiredEndpoint[] = [
  { method: 'get', path: '/api/v1/health/ready', workflow: 'frontend readiness gate', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/status', workflow: 'login screen API status', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/register', workflow: 'workspace signup', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/login', workflow: 'workspace login', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/refresh', workflow: 'session refresh', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/me', workflow: 'current user bootstrap', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workspaces', workflow: 'workspace switcher and create project form', auth: 'bearer' },
  { method: 'get', path: '/api/v1/teams', workflow: 'team selector and capacity views', auth: 'bearer' },
  ...coreApiRequiredEndpoints,
  ...workspaceResourceRequiredEndpoints,
  ...adminPlatformRequiredEndpoints,
  { method: 'get', path: '/api/v1/projects', workflow: 'project portfolio list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects', workflow: 'create project flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}', workflow: 'project detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}', workflow: 'update project flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/members', workflow: 'project member list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/members', workflow: 'project member upsert', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/members/{userId}', workflow: 'project member removal', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/milestones', workflow: 'project milestone list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/milestones', workflow: 'project milestone create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/milestones/{milestoneId}', workflow: 'project milestone update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/milestones/{milestoneId}', workflow: 'project milestone delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/risks', workflow: 'project risk list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/risks', workflow: 'project risk create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/risks/{riskId}', workflow: 'project risk update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/risks/{riskId}', workflow: 'project risk delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/budgets', workflow: 'project budget list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/budgets', workflow: 'project budget create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/budgets/{budgetId}', workflow: 'project budget update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/budgets/{budgetId}', workflow: 'project budget delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/stakeholders', workflow: 'project stakeholder list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/stakeholders', workflow: 'project stakeholder create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/stakeholders/{stakeholderId}', workflow: 'project stakeholder update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/stakeholders/{stakeholderId}', workflow: 'project stakeholder delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/dependencies', workflow: 'project dependency list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/dependencies', workflow: 'project dependency create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/dependencies/{dependencyId}', workflow: 'project dependency update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/dependencies/{dependencyId}', workflow: 'project dependency delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/decisions', workflow: 'project decision list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/decisions', workflow: 'project decision create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/decisions/{decisionId}', workflow: 'project decision update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/decisions/{decisionId}', workflow: 'project decision delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/change-requests', workflow: 'project change request list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/change-requests', workflow: 'project change request create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/change-requests/{changeRequestId}', workflow: 'project change request update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/change-requests/{changeRequestId}', workflow: 'project change request delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks', workflow: 'task list and board hydration', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks', workflow: 'create task flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}', workflow: 'task detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/{taskId}', workflow: 'update task flow', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}', workflow: 'task delete flow', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/archive', workflow: 'task archive flow', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/restore', workflow: 'task restore flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/labels', workflow: 'task label list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/labels', workflow: 'task label create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/labels/{labelId}', workflow: 'task label update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/labels/{labelId}', workflow: 'task label delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/taxonomy', workflow: 'task taxonomy load', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/custom-fields', workflow: 'custom field list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/custom-fields', workflow: 'custom field create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/custom-fields/{customFieldId}', workflow: 'custom field update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/custom-fields/{customFieldId}', workflow: 'custom field delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/custom-fields/{customFieldId}/archive', workflow: 'custom field archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/custom-fields/{customFieldId}/restore', workflow: 'custom field restore', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/saved-views', workflow: 'task saved view list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/saved-views', workflow: 'task saved view create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/saved-views/{viewId}', workflow: 'task saved view update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/saved-views/{viewId}', workflow: 'task saved view delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/bulk', workflow: 'bulk task operation', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/assignees', workflow: 'task assignee list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/assignees', workflow: 'task assignee add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/assignees/{userId}', workflow: 'task assignee remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/watchers', workflow: 'task watcher list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/watchers', workflow: 'task watcher add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/watchers/{userId}', workflow: 'task watcher remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/comments', workflow: 'task comment list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/comments', workflow: 'task comment create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/comments/{commentId}', workflow: 'task comment delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/attachments', workflow: 'task attachment list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/attachments', workflow: 'task attachment create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/attachments/{attachmentId}', workflow: 'task attachment delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/checklists', workflow: 'task checklist list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/checklists', workflow: 'task checklist create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}', workflow: 'task checklist delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}/items', workflow: 'task checklist item create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}', workflow: 'task checklist item update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}', workflow: 'task checklist item delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/labels', workflow: 'task label assignment list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/labels', workflow: 'task label assignment add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/labels/{labelId}', workflow: 'task label assignment remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/dependencies', workflow: 'task dependency list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/dependencies', workflow: 'task dependency create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/dependencies/{dependencyId}', workflow: 'task dependency delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/activities', workflow: 'task activity list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/agile/sprints', workflow: 'sprint list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints', workflow: 'sprint create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/sprints/{sprintId}', workflow: 'sprint update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/agile/sprints/{sprintId}', workflow: 'sprint delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints/{sprintId}/start', workflow: 'sprint start', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints/{sprintId}/complete', workflow: 'sprint complete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints/{sprintId}/tasks', workflow: 'sprint task add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/agile/sprints/{sprintId}/tasks/{taskId}', workflow: 'sprint task remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/agile/projects/{projectId}/board', workflow: 'kanban board hydration', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/tasks/{taskId}/order', workflow: 'drag task board order update', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/tasks/{taskId}/status', workflow: 'drag task status update', auth: 'bearer' },
  ...meetingBookingRequiredEndpoints,
  { method: 'get', path: '/api/v1/reporting/dashboards', workflow: 'dashboard list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/overview', workflow: 'executive metrics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/ai/status', workflow: 'AI availability badge', auth: 'public' },
  { method: 'get', path: '/api/v1/admin/overview', workflow: 'admin console overview', auth: 'bearer' }
];

const frontendClientChecks: FrontendClientCheck[] = [
  ...coreApiFrontendChecks,
  ...workspaceResourceFrontendChecks,
  ...adminPlatformFrontendChecks,
  {
    helper: 'listProjects',
    routeSnippets: ['/projects?${params.toString()}', '/api/v1/projects'],
    workflow: 'project portfolio list'
  },
  {
    helper: 'getProject',
    routeSnippets: ['/projects/${projectId}', '/api/v1/projects/{projectId}'],
    workflow: 'project detail load'
  },
  {
    helper: 'createProject',
    routeSnippets: ['"/projects"', '/api/v1/projects'],
    workflow: 'create project flow'
  },
  {
    helper: 'updateProject',
    routeSnippets: ['/projects/${projectId}', '/api/v1/projects/{projectId}'],
    workflow: 'update project flow'
  },
  {
    helper: 'listProjectMembers',
    routeSnippets: ['/api/v1/projects/{projectId}/members'],
    workflow: 'project member list'
  },
  {
    helper: 'upsertProjectMember',
    routeSnippets: ['/api/v1/projects/{projectId}/members'],
    workflow: 'project member upsert'
  },
  {
    helper: 'removeProjectMember',
    routeSnippets: ['/api/v1/projects/{projectId}/members/{userId}'],
    workflow: 'project member removal'
  },
  {
    helper: 'listProjectMilestones',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones'],
    workflow: 'project milestone list'
  },
  {
    helper: 'createProjectMilestone',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones'],
    workflow: 'project milestone create'
  },
  {
    helper: 'updateProjectMilestone',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones/{milestoneId}'],
    workflow: 'project milestone update'
  },
  {
    helper: 'deleteProjectMilestone',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones/{milestoneId}'],
    workflow: 'project milestone delete'
  },
  {
    helper: 'listProjectRisks',
    routeSnippets: ['/api/v1/projects/{projectId}/risks'],
    workflow: 'project risk list'
  },
  {
    helper: 'createProjectRisk',
    routeSnippets: ['/api/v1/projects/{projectId}/risks'],
    workflow: 'project risk create'
  },
  {
    helper: 'updateProjectRisk',
    routeSnippets: ['/api/v1/projects/{projectId}/risks/{riskId}'],
    workflow: 'project risk update'
  },
  {
    helper: 'deleteProjectRisk',
    routeSnippets: ['/api/v1/projects/{projectId}/risks/{riskId}'],
    workflow: 'project risk delete'
  },
  {
    helper: 'listProjectBudgets',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets'],
    workflow: 'project budget list'
  },
  {
    helper: 'createProjectBudget',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets'],
    workflow: 'project budget create'
  },
  {
    helper: 'updateProjectBudget',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets/{budgetId}'],
    workflow: 'project budget update'
  },
  {
    helper: 'deleteProjectBudget',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets/{budgetId}'],
    workflow: 'project budget delete'
  },
  {
    helper: 'listProjectStakeholders',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders'],
    workflow: 'project stakeholder list'
  },
  {
    helper: 'createProjectStakeholder',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders'],
    workflow: 'project stakeholder create'
  },
  {
    helper: 'updateProjectStakeholder',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders/{stakeholderId}'],
    workflow: 'project stakeholder update'
  },
  {
    helper: 'deleteProjectStakeholder',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders/{stakeholderId}'],
    workflow: 'project stakeholder delete'
  },
  {
    helper: 'listProjectDependencies',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies'],
    workflow: 'project dependency list'
  },
  {
    helper: 'createProjectDependency',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies'],
    workflow: 'project dependency create'
  },
  {
    helper: 'updateProjectDependency',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies/{dependencyId}'],
    workflow: 'project dependency update'
  },
  {
    helper: 'deleteProjectDependency',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies/{dependencyId}'],
    workflow: 'project dependency delete'
  },
  {
    helper: 'listProjectDecisions',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions'],
    workflow: 'project decision list'
  },
  {
    helper: 'createProjectDecision',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions'],
    workflow: 'project decision create'
  },
  {
    helper: 'updateProjectDecision',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions/{decisionId}'],
    workflow: 'project decision update'
  },
  {
    helper: 'deleteProjectDecision',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions/{decisionId}'],
    workflow: 'project decision delete'
  },
  {
    helper: 'listProjectChangeRequests',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests'],
    workflow: 'project change request list'
  },
  {
    helper: 'createProjectChangeRequest',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests'],
    workflow: 'project change request create'
  },
  {
    helper: 'updateProjectChangeRequest',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests/{changeRequestId}'],
    workflow: 'project change request update'
  },
  {
    helper: 'deleteProjectChangeRequest',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests/{changeRequestId}'],
    workflow: 'project change request delete'
  },
  {
    helper: 'listTasks',
    routeSnippets: ['/tasks?${params.toString()}', '/api/v1/tasks'],
    workflow: 'task list and board hydration'
  },
  {
    helper: 'getTask',
    routeSnippets: ['/tasks/${taskId}', '/api/v1/tasks/{taskId}'],
    workflow: 'task detail load'
  },
  {
    helper: 'createTask',
    routeSnippets: ['"/tasks"', '/api/v1/tasks'],
    workflow: 'create task flow'
  },
  {
    helper: 'updateTask',
    routeSnippets: ['/tasks/${taskId}', '/api/v1/tasks/{taskId}'],
    workflow: 'update task flow'
  },
  {
    helper: 'deleteTask',
    routeSnippets: ['/api/v1/tasks/{taskId}'],
    workflow: 'task delete flow'
  },
  {
    helper: 'archiveTask',
    routeSnippets: ['/api/v1/tasks/{taskId}/archive'],
    workflow: 'task archive flow'
  },
  {
    helper: 'restoreTask',
    routeSnippets: ['/api/v1/tasks/{taskId}/restore'],
    workflow: 'task restore flow'
  },
  {
    helper: 'listTaskComments',
    routeSnippets: ['/api/v1/tasks/{taskId}/comments'],
    workflow: 'task comment list'
  },
  {
    helper: 'createTaskComment',
    routeSnippets: ['/api/v1/tasks/{taskId}/comments'],
    workflow: 'task comment create'
  },
  {
    helper: 'deleteTaskComment',
    routeSnippets: ['/api/v1/tasks/{taskId}/comments/{commentId}'],
    workflow: 'task comment delete'
  },
  {
    helper: 'listTaskChecklists',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists'],
    workflow: 'task checklist list'
  },
  {
    helper: 'createTaskChecklist',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists'],
    workflow: 'task checklist create'
  },
  {
    helper: 'deleteTaskChecklist',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}'],
    workflow: 'task checklist delete'
  },
  {
    helper: 'createTaskChecklistItem',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}/items'],
    workflow: 'task checklist item create'
  },
  {
    helper: 'updateTaskChecklistItem',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}'],
    workflow: 'task checklist item update'
  },
  {
    helper: 'deleteTaskChecklistItem',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}'],
    workflow: 'task checklist item delete'
  },
  {
    helper: 'listTaskActivities',
    routeSnippets: ['/api/v1/tasks/{taskId}/activities'],
    workflow: 'task activity list'
  },
  {
    helper: 'listTaskAttachments',
    routeSnippets: ['/api/v1/tasks/{taskId}/attachments'],
    workflow: 'task attachment list'
  },
  {
    helper: 'createTaskAttachment',
    routeSnippets: ['/api/v1/tasks/{taskId}/attachments'],
    workflow: 'task attachment create'
  },
  {
    helper: 'deleteTaskAttachment',
    routeSnippets: ['/api/v1/tasks/{taskId}/attachments/{attachmentId}'],
    workflow: 'task attachment delete'
  },
  {
    helper: 'listTaskDependencies',
    routeSnippets: ['/api/v1/tasks/{taskId}/dependencies'],
    workflow: 'task dependency list'
  },
  {
    helper: 'createTaskDependency',
    routeSnippets: ['/api/v1/tasks/{taskId}/dependencies'],
    workflow: 'task dependency create'
  },
  {
    helper: 'deleteTaskDependency',
    routeSnippets: ['/api/v1/tasks/{taskId}/dependencies/{dependencyId}'],
    workflow: 'task dependency delete'
  },
  {
    helper: 'getTaskTaxonomy',
    routeSnippets: ['/api/v1/tasks/taxonomy'],
    workflow: 'task taxonomy load'
  },
  {
    helper: 'listCustomFields',
    routeSnippets: ['/api/v1/tasks/custom-fields'],
    workflow: 'custom field list'
  },
  {
    helper: 'createCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields'],
    workflow: 'custom field create'
  },
  {
    helper: 'updateCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}'],
    workflow: 'custom field update'
  },
  {
    helper: 'archiveCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}/archive'],
    workflow: 'custom field archive'
  },
  {
    helper: 'restoreCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}/restore'],
    workflow: 'custom field restore'
  },
  {
    helper: 'deleteCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}'],
    workflow: 'custom field delete'
  },
  {
    helper: 'listTaskSavedViews',
    routeSnippets: ['/api/v1/tasks/saved-views'],
    workflow: 'task saved view list'
  },
  {
    helper: 'createTaskSavedView',
    routeSnippets: ['/api/v1/tasks/saved-views'],
    workflow: 'task saved view create'
  },
  {
    helper: 'updateTaskSavedView',
    routeSnippets: ['/api/v1/tasks/saved-views/{viewId}'],
    workflow: 'task saved view update'
  },
  {
    helper: 'deleteTaskSavedView',
    routeSnippets: ['/api/v1/tasks/saved-views/{viewId}'],
    workflow: 'task saved view delete'
  },
  {
    helper: 'bulkTaskOperation',
    routeSnippets: ['/api/v1/tasks/bulk'],
    workflow: 'bulk task operation'
  },
  {
    helper: 'listLabels',
    routeSnippets: ['/api/v1/tasks/labels'],
    workflow: 'task label list'
  },
  {
    helper: 'createLabel',
    routeSnippets: ['/api/v1/tasks/labels'],
    workflow: 'task label create'
  },
  {
    helper: 'updateLabel',
    routeSnippets: ['/api/v1/tasks/labels/{labelId}'],
    workflow: 'task label update'
  },
  {
    helper: 'deleteLabel',
    routeSnippets: ['/api/v1/tasks/labels/{labelId}'],
    workflow: 'task label delete'
  },
  {
    helper: 'listTaskLabels',
    routeSnippets: ['/api/v1/tasks/{taskId}/labels'],
    workflow: 'task label assignment list'
  },
  {
    helper: 'assignTaskLabel',
    routeSnippets: ['/api/v1/tasks/{taskId}/labels'],
    workflow: 'task label assignment add'
  },
  {
    helper: 'removeTaskLabel',
    routeSnippets: ['/api/v1/tasks/{taskId}/labels/{labelId}'],
    workflow: 'task label assignment remove'
  },
  {
    helper: 'listTaskAssignees',
    routeSnippets: ['/api/v1/tasks/{taskId}/assignees'],
    workflow: 'task assignee list'
  },
  {
    helper: 'addTaskAssignee',
    routeSnippets: ['/api/v1/tasks/{taskId}/assignees'],
    workflow: 'task assignee add'
  },
  {
    helper: 'removeTaskAssignee',
    routeSnippets: ['/api/v1/tasks/{taskId}/assignees/{userId}'],
    workflow: 'task assignee remove'
  },
  {
    helper: 'listTaskWatchers',
    routeSnippets: ['/api/v1/tasks/{taskId}/watchers'],
    workflow: 'task watcher list'
  },
  {
    helper: 'addTaskWatcher',
    routeSnippets: ['/api/v1/tasks/{taskId}/watchers'],
    workflow: 'task watcher add'
  },
  {
    helper: 'removeTaskWatcher',
    routeSnippets: ['/api/v1/tasks/{taskId}/watchers/{userId}'],
    workflow: 'task watcher remove'
  },
  {
    helper: 'listSprints',
    routeSnippets: ['/api/v1/agile/sprints'],
    workflow: 'sprint list'
  },
  {
    helper: 'createSprint',
    routeSnippets: ['/api/v1/agile/sprints'],
    workflow: 'sprint create'
  },
  {
    helper: 'updateSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}'],
    workflow: 'sprint update'
  },
  {
    helper: 'startSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/start'],
    workflow: 'sprint start'
  },
  {
    helper: 'completeSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/complete'],
    workflow: 'sprint complete'
  },
  {
    helper: 'deleteSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}'],
    workflow: 'sprint delete'
  },
  {
    helper: 'addSprintTasks',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/tasks'],
    workflow: 'sprint task add'
  },
  {
    helper: 'removeSprintTask',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/tasks/{taskId}'],
    workflow: 'sprint task remove'
  },
  {
    helper: 'getProjectBoard',
    routeSnippets: ['/agile/projects/${projectId}/board', '/api/v1/agile/projects/{projectId}/board'],
    workflow: 'kanban board hydration'
  },
  {
    helper: 'updateTaskBoardOrder',
    routeSnippets: ['/agile/tasks/${taskId}/order', '/api/v1/agile/tasks/{taskId}/order'],
    workflow: 'drag task board order update'
  },
  {
    helper: 'updateTaskStatus',
    routeSnippets: ['/agile/tasks/${taskId}/status', '/api/v1/agile/tasks/{taskId}/status'],
    workflow: 'direct task status update'
  },
  ...meetingBookingFrontendChecks
];

function readOpenApiContract(): OpenAPIObject {
  const contractPath = join(process.cwd(), 'docs', 'api', 'openapi.json');
  return JSON.parse(readFileSync(contractPath, 'utf8')) as OpenAPIObject;
}

function getOperation(document: OpenAPIObject, endpoint: RequiredEndpoint) {
  return document.paths[endpoint.path]?.[endpoint.method] as OperationWithSecurity | undefined;
}

function operationHasBearerAuth(operation: OperationWithSecurity | undefined) {
  if (!operation?.security) return false;

  return operation.security.some((requirement) => Object.keys(requirement).includes('bearer'));
}

function readFrontendClient() {
  const frontendClientPath = resolve(process.cwd(), '..', 'taskbricks-fe', 'src', 'lib', 'api.ts');
  const frontendApiDir = resolve(process.cwd(), '..', 'taskbricks-fe', 'src', 'lib', 'api');
  const moduleSources = readdirSync(frontendApiDir)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => readFileSync(join(frontendApiDir, entry), 'utf8'));

  return [readFileSync(frontendClientPath, 'utf8'), ...moduleSources].join('\n');
}

function findMissingFrontendClientChecks(frontendClient: string) {
  return frontendClientChecks.filter((check) => {
    const helperMatch = new RegExp(`(?:export\\s+)?function\\s+${check.helper}(?:<[^\\n(]+>)?\\s*\\(`).exec(frontendClient);
    if (!helperMatch) return true;

    const helperIndex = helperMatch.index;

    const nextFunctionIndex = frontendClient.indexOf('\nexport function ', helperIndex + 1);
    const helperSource =
      nextFunctionIndex === -1
        ? frontendClient.slice(helperIndex)
        : frontendClient.slice(helperIndex, nextFunctionIndex);

    return !check.routeSnippets.some((routeSnippet) => helperSource.includes(routeSnippet));
  });
}

function main() {
  const document = readOpenApiContract();
  const missing = requiredEndpoints.filter((endpoint) => !getOperation(document, endpoint));
  const unsecured = requiredEndpoints.filter(
    (endpoint) =>
      endpoint.auth === 'bearer' && !operationHasBearerAuth(getOperation(document, endpoint))
  );
  const unversioned = Object.keys(document.paths).filter((path) => !path.startsWith('/api/v1/'));
  const bearerScheme = document.components?.securitySchemes?.bearer;
  const missingFrontendClientChecks = findMissingFrontendClientChecks(readFrontendClient());

  if (missing.length || unsecured.length || unversioned.length || !bearerScheme || missingFrontendClientChecks.length) {
    if (missing.length) {
      console.error('Missing frontend contract endpoints:');
      missing.forEach((endpoint) =>
        console.error(`- ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.workflow})`)
      );
    }

    if (unsecured.length) {
      console.error('Bearer endpoints without OpenAPI bearer metadata:');
      unsecured.forEach((endpoint) =>
        console.error(`- ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.workflow})`)
      );
    }

    if (unversioned.length) {
      console.error('Unversioned paths found:');
      unversioned.forEach((path) => console.error(`- ${path}`));
    }

    if (!bearerScheme) {
      console.error('Missing bearer security scheme.');
    }

    if (missingFrontendClientChecks.length) {
      console.error('Frontend client helper route checks failed:');
      missingFrontendClientChecks.forEach((check) =>
        console.error(`- ${check.helper} must call one of ${check.routeSnippets.join(', ')} (${check.workflow})`)
      );
    }

    process.exit(1);
  }

  console.log(`Frontend contract verified against ${Object.keys(document.paths).length} paths.`);
  console.log(`Required workflows covered: ${requiredEndpoints.length}`);
  console.log(`Frontend client helpers covered: ${frontendClientChecks.length}`);
}

main();
