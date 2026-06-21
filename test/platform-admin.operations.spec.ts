import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from '@jest/globals';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import {
  PLATFORM_ADMIN_LEVELS_KEY,
  PlatformAdminLevelValue
} from '../src/platform-admin/decorators/require-platform-admin-levels.decorator';
import { PlatformAdminController } from '../src/platform-admin/platform-admin.controller';
import { PlatformAdminGuard } from '../src/platform-admin/guards/platform-admin.guard';

const guardedSiteAdminRoutes = [
  ['platformSearch', 'search'],
  ['workflowAutomationOverview', 'automation/overview'],
  ['listSiteWorkflows', 'automation/workflows'],
  ['listSiteWorkflowRuns', 'automation/runs'],
  ['retrySiteWorkflowRun', 'automation/runs/:runId/retry'],
  ['cancelSiteWorkflowRun', 'automation/runs/:runId/cancel'],
  ['listSiteApprovalDefinitions', 'automation/approval-definitions'],
  ['listSiteApprovals', 'automation/approvals'],
  ['listSiteWorkflowRunLogs', 'automation/run-logs'],
  ['aiOperationsOverview', 'ai/overview'],
  ['listSiteAiSettings', 'ai/settings'],
  ['listSiteAiAgents', 'ai/agents'],
  ['listSiteAiConversations', 'ai/conversations'],
  ['listSiteAiActions', 'ai/actions'],
  ['listSiteAiUsage', 'ai/usage'],
  ['reportingAnalyticsOverview', 'reporting/overview'],
  ['listSiteDashboards', 'reporting/dashboards'],
  ['listSiteReports', 'reporting/reports'],
  ['listSiteReportExecutions', 'reporting/executions'],
  ['listSiteReportExports', 'reporting/exports'],
  ['hardeningQaOverview', 'hardening/overview'],
  ['listBillingPlans', 'billing/plans'],
  ['createBillingPlan', 'billing/plans'],
  ['updateBillingPlan', 'billing/plans/:planId'],
  ['archiveBillingPlan', 'billing/plans/:planId/archive'],
  ['restoreBillingPlan', 'billing/plans/:planId/restore'],
  ['replaceBillingPlanFeatures', 'billing/plans/:planId/features'],
  ['assignBillingPlanFeature', 'billing/plans/:planId/features'],
  ['updateBillingPlanFeature', 'billing/plans/:planId/features/:featureId'],
  ['removeBillingPlanFeature', 'billing/plans/:planId/features/:featureId'],
  ['listBillingFeatures', 'billing/features'],
  ['createBillingFeature', 'billing/features'],
  ['updateBillingFeature', 'billing/features/:featureId'],
  ['disableBillingFeature', 'billing/features/:featureId/disable'],
  ['enableBillingFeature', 'billing/features/:featureId/enable']
] as const;

function handler(methodName: string) {
  return PlatformAdminController.prototype[methodName as keyof PlatformAdminController] as unknown as (...args: unknown[]) => unknown;
}

describe('PlatformAdminController operation boundaries', () => {
  it.each(guardedSiteAdminRoutes)('%s is exposed under /site-admin/%s and guarded by JWT plus PlatformAdminGuard', (methodName, path) => {
    const routeHandler = handler(methodName);
    const guards = Reflect.getMetadata(GUARDS_METADATA, routeHandler) as unknown[];

    expect(Reflect.getMetadata(PATH_METADATA, routeHandler)).toBe(path);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(PlatformAdminGuard);
  });

  it.each([
    ['retrySiteWorkflowRun', ['OWNER', 'ADMIN', 'SUPPORT']],
    ['cancelSiteWorkflowRun', ['OWNER', 'ADMIN', 'SUPPORT']],
    ['createBillingPlan', ['OWNER', 'ADMIN']],
    ['updateBillingPlan', ['OWNER', 'ADMIN']],
    ['archiveBillingPlan', ['OWNER', 'ADMIN']],
    ['restoreBillingPlan', ['OWNER', 'ADMIN']],
    ['replaceBillingPlanFeatures', ['OWNER', 'ADMIN']],
    ['assignBillingPlanFeature', ['OWNER', 'ADMIN']],
    ['updateBillingPlanFeature', ['OWNER', 'ADMIN']],
    ['removeBillingPlanFeature', ['OWNER', 'ADMIN']],
    ['createBillingFeature', ['OWNER', 'ADMIN']],
    ['updateBillingFeature', ['OWNER', 'ADMIN']],
    ['disableBillingFeature', ['OWNER', 'ADMIN']],
    ['enableBillingFeature', ['OWNER', 'ADMIN']]
  ] as Array<[string, PlatformAdminLevelValue[]]>)('%s requires an operator-level platform admin grant', (methodName, levels) => {
    expect(Reflect.getMetadata(PLATFORM_ADMIN_LEVELS_KEY, handler(methodName))).toEqual(levels);
  });
});
