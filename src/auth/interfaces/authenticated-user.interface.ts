export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  timezone?: string | null;
  locale?: string | null;
  status: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  isPlatformAdmin?: boolean;
  platformAdminLevel?: string | null;
  platformAdminScopes?: string[];
}
