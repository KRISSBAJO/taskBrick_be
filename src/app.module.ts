import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AccessControlModule } from './access-control/access-control.module';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { AgileModule } from './agile/agile.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DocumentsModule } from './documents/documents.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { IdentitySecurityModule } from './identity-security/identity-security.module';
import { InternalMailModule } from './internal-mail/internal-mail.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MeetingsModule } from './meetings/meetings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ObservabilityModule } from './observability/observability.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { QaModule } from './qa/qa.module';
import { ReportingModule } from './reporting/reporting.module';
import { SearchModule } from './search/search.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { TenantsModule } from './tenants/tenants.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { UsersModule } from './users/users.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validationSchema: envValidationSchema
    }),
    ScheduleModule.forRoot(),
    ObservabilityModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('rateLimit.ttlSeconds', 60) * 1000,
          limit: configService.get<number>('rateLimit.max', 300)
        }
      ]
    }),
    PrismaModule,
    HealthModule,
    AdminModule,
    PlatformAdminModule,
    IdentitySecurityModule,
    AuthModule,
    AccountModule,
    AccessControlModule,
    TenantsModule,
    UsersModule,
    WorkspacesModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    CollaborationModule,
    AgileModule,
    InternalMailModule,
    MeetingsModule,
    NotificationsModule,
    DocumentsModule,
    FilesModule,
    TimeTrackingModule,
    WorkflowsModule,
    BillingModule,
    IntegrationsModule,
    AiModule,
    QaModule,
    ReportingModule,
    SearchModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ]
})
export class AppModule {}
