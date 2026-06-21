import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectAccessPolicyService } from './project-access-policy.service';

@Module({
  imports: [PrismaModule],
  providers: [ProjectAccessPolicyService],
  exports: [ProjectAccessPolicyService]
})
export class AccessPolicyModule {}
