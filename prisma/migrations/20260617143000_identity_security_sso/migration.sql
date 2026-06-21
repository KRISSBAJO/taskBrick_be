CREATE TYPE "MfaFactorType" AS ENUM ('TOTP');
CREATE TYPE "MfaFactorStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');
CREATE TYPE "TrustedDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "AuthLoginMethod" AS ENUM ('PASSWORD', 'GOOGLE', 'MICROSOFT', 'OIDC', 'SAML');
CREATE TYPE "LoginAttemptStatus" AS ENUM ('SUCCESS', 'FAILED', 'MFA_REQUIRED', 'MFA_FAILED', 'BLOCKED');
CREATE TYPE "SsoProviderType" AS ENUM ('GOOGLE', 'MICROSOFT', 'OIDC', 'SAML');
CREATE TYPE "SsoProviderStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TABLE "AuthSession"
  ADD COLUMN "authMethod" "AuthLoginMethod" NOT NULL DEFAULT 'PASSWORD',
  ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "trustedDeviceId" TEXT,
  ADD COLUMN "deviceFingerprint" TEXT,
  ADD COLUMN "deviceName" TEXT;

ALTER TABLE "SecurityPolicy"
  ADD COLUMN "allowedLoginMethods" "AuthLoginMethod"[] NOT NULL DEFAULT ARRAY['PASSWORD']::"AuthLoginMethod"[],
  ADD COLUMN "ssoRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "domainDiscoveryEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "trustedDeviceTtlDays" INTEGER NOT NULL DEFAULT 30;

CREATE TABLE "UserMfaFactor" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MfaFactorType" NOT NULL DEFAULT 'TOTP',
  "status" "MfaFactorStatus" NOT NULL DEFAULT 'PENDING',
  "label" TEXT,
  "secretEncrypted" JSONB,
  "lastUsedAt" TIMESTAMP(3),
  "enabledAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserMfaFactor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBackupCode" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBackupCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustedDevice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "TrustedDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
  "name" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaChallenge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginHistory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT,
  "tenantSlug" TEXT,
  "email" TEXT NOT NULL,
  "method" "AuthLoginMethod" NOT NULL DEFAULT 'PASSWORD',
  "status" "LoginAttemptStatus" NOT NULL,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "deviceFingerprint" TEXT,
  "suspicious" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SsoProvider" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "SsoProviderType" NOT NULL,
  "status" "SsoProviderStatus" NOT NULL DEFAULT 'DISABLED',
  "name" TEXT NOT NULL,
  "issuerUrl" TEXT,
  "authorizationUrl" TEXT,
  "tokenUrl" TEXT,
  "userInfoUrl" TEXT,
  "redirectUri" TEXT,
  "clientId" TEXT,
  "clientSecretEncrypted" JSONB,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "buttonLabel" TEXT,
  "metadata" JSONB,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SsoProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSsoAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "providerType" "SsoProviderType" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "metadata" JSONB,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSsoAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SsoLoginState" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "providerId" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "codeVerifier" TEXT,
  "redirectUri" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SsoLoginState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBackupCode_codeHash_key" ON "UserBackupCode"("codeHash");
CREATE UNIQUE INDEX "TrustedDevice_tokenHash_key" ON "TrustedDevice"("tokenHash");
CREATE UNIQUE INDEX "MfaChallenge_tokenHash_key" ON "MfaChallenge"("tokenHash");
CREATE UNIQUE INDEX "SsoProvider_tenantId_type_name_key" ON "SsoProvider"("tenantId", "type", "name");
CREATE UNIQUE INDEX "UserSsoAccount_tenantId_providerId_providerUserId_key" ON "UserSsoAccount"("tenantId", "providerId", "providerUserId");
CREATE UNIQUE INDEX "SsoLoginState_stateHash_key" ON "SsoLoginState"("stateHash");

CREATE INDEX "AuthSession_tenantId_authMethod_createdAt_idx" ON "AuthSession"("tenantId", "authMethod", "createdAt");
CREATE INDEX "AuthSession_trustedDeviceId_idx" ON "AuthSession"("trustedDeviceId");
CREATE INDEX "UserMfaFactor_tenantId_userId_status_idx" ON "UserMfaFactor"("tenantId", "userId", "status");
CREATE INDEX "UserMfaFactor_userId_type_status_idx" ON "UserMfaFactor"("userId", "type", "status");
CREATE INDEX "UserBackupCode_tenantId_userId_usedAt_idx" ON "UserBackupCode"("tenantId", "userId", "usedAt");
CREATE INDEX "TrustedDevice_tenantId_userId_status_idx" ON "TrustedDevice"("tenantId", "userId", "status");
CREATE INDEX "TrustedDevice_expiresAt_idx" ON "TrustedDevice"("expiresAt");
CREATE INDEX "MfaChallenge_tenantId_userId_idx" ON "MfaChallenge"("tenantId", "userId");
CREATE INDEX "MfaChallenge_expiresAt_idx" ON "MfaChallenge"("expiresAt");
CREATE INDEX "LoginHistory_tenantId_userId_createdAt_idx" ON "LoginHistory"("tenantId", "userId", "createdAt");
CREATE INDEX "LoginHistory_tenantSlug_email_createdAt_idx" ON "LoginHistory"("tenantSlug", "email", "createdAt");
CREATE INDEX "LoginHistory_status_suspicious_createdAt_idx" ON "LoginHistory"("status", "suspicious", "createdAt");
CREATE INDEX "SsoProvider_tenantId_type_status_idx" ON "SsoProvider"("tenantId", "type", "status");
CREATE INDEX "UserSsoAccount_tenantId_userId_idx" ON "UserSsoAccount"("tenantId", "userId");
CREATE INDEX "UserSsoAccount_tenantId_email_idx" ON "UserSsoAccount"("tenantId", "email");
CREATE INDEX "SsoLoginState_tenantId_providerId_idx" ON "SsoLoginState"("tenantId", "providerId");
CREATE INDEX "SsoLoginState_expiresAt_idx" ON "SsoLoginState"("expiresAt");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_trustedDeviceId_fkey" FOREIGN KEY ("trustedDeviceId") REFERENCES "TrustedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserMfaFactor" ADD CONSTRAINT "UserMfaFactor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMfaFactor" ADD CONSTRAINT "UserMfaFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBackupCode" ADD CONSTRAINT "UserBackupCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBackupCode" ADD CONSTRAINT "UserBackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SsoProvider" ADD CONSTRAINT "SsoProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSsoAccount" ADD CONSTRAINT "UserSsoAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSsoAccount" ADD CONSTRAINT "UserSsoAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSsoAccount" ADD CONSTRAINT "UserSsoAccount_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "SsoProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsoLoginState" ADD CONSTRAINT "SsoLoginState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsoLoginState" ADD CONSTRAINT "SsoLoginState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SsoLoginState" ADD CONSTRAINT "SsoLoginState_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "SsoProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
