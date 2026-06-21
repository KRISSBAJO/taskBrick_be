import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthSsoController, IdentitySecurityController } from './identity-security.controller';
import { IdentitySecurityService } from './identity-security.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [IdentitySecurityController, AuthSsoController],
  providers: [IdentitySecurityService],
  exports: [IdentitySecurityService]
})
export class IdentitySecurityModule {}
