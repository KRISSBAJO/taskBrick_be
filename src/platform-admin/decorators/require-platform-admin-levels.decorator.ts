import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_LEVELS_KEY = 'platformAdminLevels';

export type PlatformAdminLevelValue = 'OWNER' | 'ADMIN' | 'SUPPORT' | 'AUDITOR';

export const RequirePlatformAdminLevels = (...levels: PlatformAdminLevelValue[]) =>
  SetMetadata(PLATFORM_ADMIN_LEVELS_KEY, levels);
