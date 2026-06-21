export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
}
