import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingEventStatus,
  BillingStatus,
  Prisma,
  TenantStatus,
  UsageRecordSource
} from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { buildPublicUrl } from '../common/url/public-url.util';
import { PrismaService } from '../prisma/prisma.service';
import { BillingEventQueryDto } from './dto/billing-event-query.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CheckoutConfirmDto } from './dto/checkout-confirm.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { FeatureQueryDto } from './dto/feature-query.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { PlanFeatureDto } from './dto/plan-feature.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { PortalDto } from './dto/portal.dto';
import { ReplacePlanFeaturesDto } from './dto/replace-plan-features.dto';
import { StartTenantTrialDto } from './dto/start-tenant-trial.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface StripeObject {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  quantity?: number;
  amount_due?: number;
  amount_paid?: number;
  amount_remaining?: number;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  number?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  due_date?: number;
  paid_at?: number;
  created?: number;
  current_period_start?: number;
  current_period_end?: number;
  trial_end?: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number;
  metadata?: Record<string, unknown>;
  items?: {
    data?: Array<{
      quantity?: number;
      price?: {
        id?: string;
        unit_amount?: number;
        currency?: string;
        recurring?: { interval?: string };
      };
    }>;
  };
}

interface StripeCheckoutSessionObject {
  id?: string;
  amount_subtotal?: number;
  amount_total?: number;
  client_reference_id?: string;
  currency?: string;
  customer?: string | Record<string, unknown>;
  invoice?: string | StripeObject;
  metadata?: Record<string, unknown>;
  payment_status?: string;
  status?: string;
  subscription?: string | StripeObject;
}

interface PaystackObject {
  id?: number | string;
  reference?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  paid_at?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
  customer?: {
    id?: number | string;
    customer_code?: string;
    email?: string;
  };
  plan?: {
    id?: number | string;
    plan_code?: string;
    name?: string;
  };
  subscription?: {
    subscription_code?: string;
    email_token?: string;
  };
  authorization?: {
    authorization_code?: string;
  };
}

type ProrationBehavior = NonNullable<ChangePlanDto['prorationBehavior']>;
type PlanChangeTiming = NonNullable<ChangePlanDto['changeTiming']>;

interface PlanChangeProration {
  behavior: ProrationBehavior;
  currency: string;
  creditAmount: number;
  invoiceAmount: number;
  oldPeriodAmount: number;
  newPeriodAmount: number;
  remainingRatio: number;
  unsupportedCurrencyChange: boolean;
}

const featureSummarySelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  category: true,
  unit: true,
  defaultLimit: true,
  metered: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.FeatureSelect;

const planFeatureSelect = {
  id: true,
  planId: true,
  featureId: true,
  limit: true,
  enabled: true,
  config: true,
  createdAt: true,
  updatedAt: true,
  feature: {
    select: featureSummarySelect
  }
} satisfies Prisma.PlanFeatureSelect;

const planSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  currency: true,
  interval: true,
  isActive: true,
  trialDays: true,
  seatLimit: true,
  providerPriceId: true,
  metadata: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  features: {
    select: planFeatureSelect,
    orderBy: [{ feature: { key: 'asc' as const } }]
  },
  _count: {
    select: {
      subscriptions: true
    }
  }
} satisfies Prisma.PlanSelect;

const featureSelect = {
  ...featureSummarySelect,
  plans: {
    select: {
      id: true,
      planId: true,
      limit: true,
      enabled: true,
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          archivedAt: true
        }
      }
    },
    orderBy: [{ plan: { name: 'asc' as const } }]
  },
  _count: {
    select: {
      usageRecords: true
    }
  }
} satisfies Prisma.FeatureSelect;

const subscriptionSelect = {
  id: true,
  tenantId: true,
  planId: true,
  status: true,
  provider: true,
  providerCustomerId: true,
  providerSubscriptionId: true,
  seatCount: true,
  cancelAtPeriodEnd: true,
  trialEndsAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  canceledAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true
    }
  },
  plan: {
    select: planSelect
  },
  _count: {
    select: {
      invoices: true,
      usageRecords: true
    }
  }
} satisfies Prisma.SubscriptionSelect;

const invoiceSelect = {
  id: true,
  tenantId: true,
  subscriptionId: true,
  provider: true,
  providerInvoiceId: true,
  number: true,
  amount: true,
  currency: true,
  status: true,
  subtotal: true,
  tax: true,
  total: true,
  periodStart: true,
  periodEnd: true,
  dueDate: true,
  paidAt: true,
  hostedInvoiceUrl: true,
  invoicePdfUrl: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  subscription: {
    select: {
      id: true,
      tenantId: true,
      status: true,
      plan: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.InvoiceSelect;

const usageRecordSelect = {
  id: true,
  tenantId: true,
  subscriptionId: true,
  featureId: true,
  featureKey: true,
  quantity: true,
  unit: true,
  source: true,
  idempotencyKey: true,
  metadata: true,
  periodStart: true,
  periodEnd: true,
  createdById: true,
  createdAt: true,
  feature: {
    select: featureSummarySelect
  },
  subscription: {
    select: {
      id: true,
      status: true,
      plan: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  }
} satisfies Prisma.UsageRecordSelect;

const billingEventSelect = {
  id: true,
  tenantId: true,
  provider: true,
  eventId: true,
  type: true,
  status: true,
  payload: true,
  processedAt: true,
  error: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BillingEventSelect;

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  status() {
    const provider = this.configService.get<string>('billing.provider', 'none');
    return {
      module: 'billing',
      status: 'ready',
      provider,
      enabled: this.configService.get<boolean>('billing.enabled', false),
      providerConfigured: this.isBillingProviderConfigured(provider)
    };
  }

  async accountStatus(user: AuthenticatedUser) {
    const [subscription, seatsUsed] = await this.prisma.$transaction([
      this.prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
        select: subscriptionSelect
      }),
      this.prisma.user.count({
        where: {
          tenantId: user.tenantId
        }
      })
    ]);

    const entitlements = await this.resolveEntitlements(user.tenantId);

    return {
      tenantId: user.tenantId,
      subscription,
      seats: {
        used: seatsUsed,
        limit: subscription?.plan.seatLimit ?? null,
        remaining:
          subscription?.plan.seatLimit === null || subscription?.plan.seatLimit === undefined
            ? null
            : Math.max(subscription.plan.seatLimit - seatsUsed, 0),
        withinLimit:
          subscription?.plan.seatLimit === null || subscription?.plan.seatLimit === undefined
            ? true
            : seatsUsed <= subscription.plan.seatLimit
      },
      entitlements
    };
  }

  async listPlans(query: PlanQueryDto) {
    const where: Prisma.PlanWhereInput = {
      isActive: query.includeInactive ? undefined : true,
      archivedAt: query.includeArchived ? undefined : null,
      interval: query.interval,
      currency: query.currency ? this.normalizeCurrency(query.currency) : undefined,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        select: planSelect,
        orderBy: [{ price: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.plan.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createPlan(user: AuthenticatedUser, dto: CreatePlanDto, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const slug = this.normalizeSlug(dto.slug);

    try {
      const plan = await this.prisma.plan.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description,
          price: dto.price ?? 0,
          currency: this.normalizeCurrency(dto.currency),
          interval: dto.interval ?? 'month',
          isActive: dto.isActive ?? true,
          trialDays: dto.trialDays,
          seatLimit: dto.seatLimit,
          providerPriceId: dto.providerPriceId,
          metadata: this.toJson(dto.metadata)
        },
        select: planSelect
      });

      await this.recordAudit(user, 'billing.plan_create', 'Plan', plan.id, undefined, {
        name: plan.name,
        slug: plan.slug,
        price: plan.price.toString()
      }, meta);

      return plan;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Plan slug or provider price id already exists');
      }
      throw error;
    }
  }

  async getPlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: planSelect
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async updatePlan(user: AuthenticatedUser, planId: string, dto: UpdatePlanDto, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const before = await this.getPlan(planId);

    try {
      const plan = await this.prisma.plan.update({
        where: { id: planId },
        data: {
          name: dto.name?.trim(),
          slug: dto.slug ? this.normalizeSlug(dto.slug) : undefined,
          description: dto.description,
          price: dto.price,
          currency: dto.currency ? this.normalizeCurrency(dto.currency) : undefined,
          interval: dto.interval,
          isActive: dto.isActive,
          trialDays: dto.trialDays,
          seatLimit: dto.seatLimit,
          providerPriceId: dto.providerPriceId,
          metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
        },
        select: planSelect
      });

      await this.recordAudit(user, 'billing.plan_update', 'Plan', plan.id, {
        name: before.name,
        slug: before.slug,
        isActive: before.isActive
      }, {
        name: plan.name,
        slug: plan.slug,
        isActive: plan.isActive
      }, meta);

      return plan;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Plan slug or provider price id already exists');
      }
      throw error;
    }
  }

  async archivePlan(user: AuthenticatedUser, planId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const before = await this.getPlan(planId);
    const plan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        archivedAt: new Date(),
        isActive: false
      },
      select: planSelect
    });
    await this.recordAudit(user, 'billing.plan_archive', 'Plan', planId, {
      archivedAt: before.archivedAt,
      isActive: before.isActive
    }, {
      archivedAt: plan.archivedAt,
      isActive: plan.isActive
    }, meta);
    return plan;
  }

  async restorePlan(user: AuthenticatedUser, planId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const before = await this.getPlan(planId);
    const plan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        archivedAt: null,
        isActive: true
      },
      select: planSelect
    });
    await this.recordAudit(user, 'billing.plan_restore', 'Plan', planId, {
      archivedAt: before.archivedAt,
      isActive: before.isActive
    }, {
      archivedAt: plan.archivedAt,
      isActive: plan.isActive
    }, meta);
    return plan;
  }

  async deletePlan(user: AuthenticatedUser, planId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const plan = await this.getPlan(planId);
    if (plan._count.subscriptions > 0) {
      return this.archivePlan(user, planId, meta);
    }
    await this.prisma.plan.delete({ where: { id: planId } });
    await this.recordAudit(user, 'billing.plan_delete', 'Plan', planId, {
      name: plan.name,
      slug: plan.slug
    }, undefined, meta);
    return { success: true };
  }

  async listFeatures(query: FeatureQueryDto) {
    const where: Prisma.FeatureWhereInput = {
      category: query.category,
      isActive: query.includeInactive ? undefined : true,
      ...(query.search
        ? {
            OR: [
              { key: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feature.findMany({
        where,
        select: featureSelect,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.feature.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createFeature(user: AuthenticatedUser, dto: CreateFeatureDto, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    try {
      const feature = await this.prisma.feature.create({
        data: {
          key: this.normalizeFeatureKey(dto.key),
          name: dto.name.trim(),
          description: dto.description,
          category: dto.category,
          unit: dto.unit,
          defaultLimit: dto.defaultLimit,
          metered: dto.metered ?? false,
          isActive: dto.isActive ?? true
        },
        select: featureSelect
      });

      await this.recordAudit(user, 'billing.feature_create', 'Feature', feature.id, undefined, {
        key: feature.key,
        name: feature.name
      }, meta);

      return feature;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Feature key already exists');
      }
      throw error;
    }
  }

  async getFeature(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: featureSelect
    });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  async updateFeature(
    user: AuthenticatedUser,
    featureId: string,
    dto: UpdateFeatureDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const before = await this.getFeature(featureId);
    try {
      const feature = await this.prisma.feature.update({
        where: { id: featureId },
        data: {
          key: dto.key ? this.normalizeFeatureKey(dto.key) : undefined,
          name: dto.name?.trim(),
          description: dto.description,
          category: dto.category,
          unit: dto.unit,
          defaultLimit: dto.defaultLimit,
          metered: dto.metered,
          isActive: dto.isActive
        },
        select: featureSelect
      });

      await this.recordAudit(user, 'billing.feature_update', 'Feature', feature.id, {
        key: before.key,
        name: before.name,
        isActive: before.isActive
      }, {
        key: feature.key,
        name: feature.name,
        isActive: feature.isActive
      }, meta);

      return feature;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Feature key already exists');
      }
      throw error;
    }
  }

  async deleteFeature(user: AuthenticatedUser, featureId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const feature = await this.getFeature(featureId);
    if (feature.plans.length > 0 || feature._count.usageRecords > 0) {
      const updated = await this.prisma.feature.update({
        where: { id: featureId },
        data: { isActive: false },
        select: featureSelect
      });
      await this.recordAudit(user, 'billing.feature_disable', 'Feature', featureId, {
        isActive: feature.isActive
      }, {
        isActive: updated.isActive
      }, meta);
      return updated;
    }
    await this.prisma.feature.delete({ where: { id: featureId } });
    await this.recordAudit(user, 'billing.feature_delete', 'Feature', featureId, {
      key: feature.key,
      name: feature.name
    }, undefined, meta);
    return { success: true };
  }

  async assignPlanFeature(
    user: AuthenticatedUser,
    planId: string,
    dto: PlanFeatureDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    await this.getPlan(planId);
    await this.getFeature(dto.featureId);

    const planFeature = await this.prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId,
          featureId: dto.featureId
        }
      },
      update: {
        limit: dto.limit,
        enabled: dto.enabled ?? true,
        config: dto.config === undefined ? undefined : this.toJson(dto.config)
      },
      create: {
        planId,
        featureId: dto.featureId,
        limit: dto.limit,
        enabled: dto.enabled ?? true,
        config: this.toJson(dto.config)
      },
      select: planFeatureSelect
    });

    await this.recordAudit(user, 'billing.plan_feature_upsert', 'PlanFeature', planFeature.id, undefined, {
      planId,
      featureId: dto.featureId,
      enabled: planFeature.enabled,
      limit: planFeature.limit
    }, meta);

    return planFeature;
  }

  async replacePlanFeatures(
    user: AuthenticatedUser,
    planId: string,
    dto: ReplacePlanFeaturesDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    await this.getPlan(planId);
    const featureIds = dto.features.map((feature) => feature.featureId);
    if (new Set(featureIds).size !== featureIds.length) {
      throw new BadRequestException('Feature ids must be unique');
    }
    await this.assertFeaturesExist(featureIds);

    const features = await this.prisma.$transaction(async (tx) => {
      await tx.planFeature.deleteMany({ where: { planId } });
      await tx.planFeature.createMany({
        data: dto.features.map((feature) => ({
          planId,
          featureId: feature.featureId,
          limit: feature.limit,
          enabled: feature.enabled ?? true,
          config: this.toJson(feature.config)
        }))
      });
      return tx.planFeature.findMany({
        where: { planId },
        select: planFeatureSelect,
        orderBy: [{ feature: { key: 'asc' } }]
      });
    });

    await this.recordAudit(user, 'billing.plan_features_replace', 'Plan', planId, undefined, {
      count: features.length
    }, meta);

    return features;
  }

  async updatePlanFeature(
    user: AuthenticatedUser,
    planId: string,
    featureId: string,
    dto: UpdatePlanFeatureDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const before = await this.getPlanFeatureOrThrow(planId, featureId);
    const updated = await this.prisma.planFeature.update({
      where: {
        planId_featureId: {
          planId,
          featureId
        }
      },
      data: {
        limit: dto.limit,
        enabled: dto.enabled,
        config: dto.config === undefined ? undefined : this.toJson(dto.config)
      },
      select: planFeatureSelect
    });
    await this.recordAudit(user, 'billing.plan_feature_update', 'PlanFeature', updated.id, {
      enabled: before.enabled,
      limit: before.limit
    }, {
      enabled: updated.enabled,
      limit: updated.limit
    }, meta);
    return updated;
  }

  async removePlanFeature(
    user: AuthenticatedUser,
    planId: string,
    featureId: string,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const before = await this.getPlanFeatureOrThrow(planId, featureId);
    await this.prisma.planFeature.delete({
      where: {
        planId_featureId: {
          planId,
          featureId
        }
      }
    });
    await this.recordAudit(user, 'billing.plan_feature_delete', 'PlanFeature', before.id, {
      planId,
      featureId
    }, undefined, meta);
    return { success: true };
  }

  async listSubscriptions(user: AuthenticatedUser, query: SubscriptionQueryDto) {
    this.assertTenantFilter(user, query.tenantId);
    const where: Prisma.SubscriptionWhereInput = {
      tenantId: user.tenantId,
      status: query.status,
      provider: query.provider
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        select: subscriptionSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.subscription.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getCurrentSubscription(user: AuthenticatedUser) {
    return this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
      select: subscriptionSelect
    });
  }

  async createSubscription(
    user: AuthenticatedUser,
    dto: CreateSubscriptionDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const tenantId = dto.tenantId ?? user.tenantId;
    this.assertTenantFilter(user, tenantId);
    const plan = await this.getPlan(dto.planId);
    if (!plan.isActive || plan.archivedAt) {
      throw new BadRequestException('Plan is not active');
    }

    const periodStart = dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : new Date();
    const periodEnd = dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : this.addPlanInterval(periodStart, plan.interval);
    const status = dto.status ?? (dto.trialEndsAt || plan.trialDays ? BillingStatus.TRIALING : BillingStatus.ACTIVE);
    const trialEndsAt = dto.trialEndsAt
      ? new Date(dto.trialEndsAt)
      : plan.trialDays
        ? new Date(periodStart.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
        : undefined;

    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId: dto.planId,
          status,
          provider: dto.provider ?? 'manual',
          providerCustomerId: dto.providerCustomerId,
          providerSubscriptionId: dto.providerSubscriptionId,
          seatCount: dto.seatCount ?? 1,
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? false,
          trialEndsAt,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          metadata: this.toJson(dto.metadata)
        },
        select: subscriptionSelect
      });

      await this.updateTenantStatusFromBilling(tenantId, status);
      await this.recordAudit(user, 'billing.subscription_create', 'Subscription', subscription.id, undefined, {
        tenantId,
        planId: dto.planId,
        status
      }, meta);

      return subscription;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Tenant already has a subscription');
      }
      throw error;
    }
  }

  async getSubscription(user: AuthenticatedUser, subscriptionId: string) {
    return this.getTenantSubscriptionOrThrow(user.tenantId, subscriptionId);
  }

  async updateSubscription(
    user: AuthenticatedUser,
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const before = await this.getTenantSubscriptionOrThrow(user.tenantId, subscriptionId);
    if (dto.planId) {
      const plan = await this.getPlan(dto.planId);
      if (!plan.isActive || plan.archivedAt) {
        throw new BadRequestException('Plan is not active');
      }
    }

    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: dto.planId,
        status: dto.status,
        seatCount: dto.seatCount,
        providerCustomerId: dto.providerCustomerId,
        providerSubscriptionId: dto.providerSubscriptionId,
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
        currentPeriodStart: dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : undefined,
        currentPeriodEnd: dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : undefined,
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
        canceledAt: dto.status === BillingStatus.CANCELLED ? new Date() : undefined,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: subscriptionSelect
    });

    if (dto.status) {
      await this.updateTenantStatusFromBilling(subscription.tenantId, dto.status);
    }

    await this.recordAudit(user, 'billing.subscription_update', 'Subscription', subscription.id, {
      planId: before.planId,
      status: before.status,
      seatCount: before.seatCount
    }, {
      planId: subscription.planId,
      status: subscription.status,
      seatCount: subscription.seatCount
    }, meta);

    return subscription;
  }

  async changePlan(
    user: AuthenticatedUser,
    subscriptionId: string,
    dto: ChangePlanDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const before = await this.getTenantSubscriptionOrThrow(user.tenantId, subscriptionId);
    const plan = await this.getPlan(dto.planId);
    if (!plan.isActive || plan.archivedAt) {
      throw new BadRequestException('Plan is not active');
    }

    const now = new Date();
    const changeTiming: PlanChangeTiming = dto.changeTiming ?? 'immediate';
    const prorationBehavior: ProrationBehavior =
      dto.prorationBehavior ?? (dto.prorate === false ? 'none' : 'create_proration_invoice');

    if (changeTiming === 'period_end') {
      const subscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          metadata: this.mergeJson(before.metadata, {
            pendingPlanChange: {
              planId: dto.planId,
              requestedAt: now.toISOString(),
              effectiveAt: before.currentPeriodEnd?.toISOString() ?? null,
              prorationBehavior
            }
          })
        },
        select: subscriptionSelect
      });

      await this.recordAudit(user, 'billing.subscription_schedule_plan_change', 'Subscription', subscription.id, {
        planId: before.planId
      }, {
        planId: dto.planId,
        effectiveAt: before.currentPeriodEnd?.toISOString() ?? null,
        prorationBehavior
      }, meta);

      return subscription;
    }

    const proration = this.calculatePlanChangeProration(before, plan, now, prorationBehavior);
    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: dto.planId,
        status: before.status === BillingStatus.CANCELLED ? BillingStatus.ACTIVE : undefined,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: this.addPlanInterval(now, plan.interval),
        metadata: this.mergeJson(before.metadata, {
          lastPlanChangeAt: now.toISOString(),
          previousPlanId: before.planId,
          changeTiming,
          prorate: dto.prorate,
          prorationBehavior,
          proration
        })
      },
      select: subscriptionSelect
    });

    if (proration.invoiceAmount > 0) {
      await this.createPlanChangeAdjustmentInvoice(subscription, before.planId, plan.id, proration, now);
    }

    await this.updateTenantStatusFromBilling(subscription.tenantId, subscription.status);
    await this.recordAudit(user, 'billing.subscription_change_plan', 'Subscription', subscription.id, {
      planId: before.planId
    }, {
      planId: subscription.planId,
      proration: { ...proration }
    }, meta);

    return subscription;
  }

  async cancelSubscription(user: AuthenticatedUser, subscriptionId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const before = await this.getTenantSubscriptionOrThrow(user.tenantId, subscriptionId);
    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: BillingStatus.CANCELLED,
        cancelAtPeriodEnd: false,
        canceledAt: new Date()
      },
      select: subscriptionSelect
    });

    await this.updateTenantStatusFromBilling(subscription.tenantId, BillingStatus.CANCELLED);
    await this.recordAudit(user, 'billing.subscription_cancel', 'Subscription', subscription.id, {
      status: before.status
    }, {
      status: subscription.status
    }, meta);

    return subscription;
  }

  async resumeSubscription(user: AuthenticatedUser, subscriptionId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const before = await this.getTenantSubscriptionOrThrow(user.tenantId, subscriptionId);
    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: BillingStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        canceledAt: null
      },
      select: subscriptionSelect
    });

    await this.updateTenantStatusFromBilling(subscription.tenantId, BillingStatus.ACTIVE);
    await this.recordAudit(user, 'billing.subscription_resume', 'Subscription', subscription.id, {
      status: before.status
    }, {
      status: subscription.status
    }, meta);

    return subscription;
  }

  async startTrial(user: AuthenticatedUser, subscriptionId: string, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const before = await this.getTenantSubscriptionOrThrow(user.tenantId, subscriptionId);
    const trialEndsAt = new Date(Date.now() + (before.plan.trialDays ?? 14) * 24 * 60 * 60 * 1000);
    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: BillingStatus.TRIALING,
        trialEndsAt,
        canceledAt: null
      },
      select: subscriptionSelect
    });

    await this.updateTenantStatusFromBilling(subscription.tenantId, BillingStatus.TRIALING);
    await this.recordAudit(user, 'billing.subscription_start_trial', 'Subscription', subscription.id, {
      status: before.status
    }, {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt?.toISOString()
    }, meta);

    return subscription;
  }

  async startTenantTrial(user: AuthenticatedUser, dto: StartTenantTrialDto, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const plan = await this.getPlan(dto.planId);
    if (!plan.isActive || plan.archivedAt) {
      throw new BadRequestException('Plan is not active');
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + (plan.trialDays ?? 14) * 24 * 60 * 60 * 1000);
    const seatCount = dto.seatCount ?? 1;
    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId: user.tenantId },
      update: {
        planId: plan.id,
        status: BillingStatus.TRIALING,
        seatCount,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        metadata: this.mergeJson(undefined, {
          trialStartedById: user.id,
          trialStartedAt: now.toISOString(),
          source: 'tenant_owner'
        })
      },
      create: {
        tenantId: user.tenantId,
        planId: plan.id,
        status: BillingStatus.TRIALING,
        provider: 'manual',
        seatCount,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        metadata: this.toJson({
          trialStartedById: user.id,
          trialStartedAt: now.toISOString(),
          source: 'tenant_owner'
        })
      },
      select: subscriptionSelect
    });

    await this.updateTenantStatusFromBilling(user.tenantId, BillingStatus.TRIALING);
    await this.recordAudit(user, 'billing.tenant_trial_start', 'Subscription', subscription.id, undefined, {
      planId: plan.id,
      seatCount,
      trialEndsAt: subscription.trialEndsAt?.toISOString()
    }, meta);

    return subscription;
  }

  async listInvoices(user: AuthenticatedUser, query: InvoiceQueryDto) {
    this.assertTenantFilter(user, query.tenantId);
    const where: Prisma.InvoiceWhereInput = {
      subscriptionId: query.subscriptionId,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      OR: [
        { tenantId: user.tenantId },
        {
          subscription: {
            tenantId: user.tenantId
          }
        }
      ]
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        select: invoiceSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.invoice.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createInvoice(user: AuthenticatedUser, dto: CreateInvoiceDto, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const subscription = await this.getTenantSubscriptionOrThrow(user.tenantId, dto.subscriptionId);
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        provider: 'manual',
        amount: dto.amount,
        subtotal: dto.amount,
        total: dto.amount,
        currency: this.normalizeCurrency(dto.currency),
        status: dto.status ?? 'open',
        number: dto.number,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : subscription.currentPeriodStart,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : subscription.currentPeriodEnd,
        metadata: this.toJson(dto.metadata)
      },
      select: invoiceSelect
    });

    await this.recordAudit(user, 'billing.invoice_create', 'Invoice', invoice.id, undefined, {
      subscriptionId: subscription.id,
      amount: invoice.amount.toString(),
      status: invoice.status
    }, meta);

    return invoice;
  }

  async getInvoice(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        OR: [
          { tenantId: user.tenantId },
          {
            subscription: {
              tenantId: user.tenantId
            }
          }
        ]
      },
      select: invoiceSelect
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateInvoiceStatus(
    user: AuthenticatedUser,
    invoiceId: string,
    dto: UpdateInvoiceStatusDto,
    meta: RequestMeta
  ) {
    this.assertCanManageBilling(user);
    const before = await this.getInvoice(user, invoiceId);
    const normalizedStatus = dto.status.trim().toLowerCase();
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: normalizedStatus,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : normalizedStatus === 'paid' ? new Date() : undefined
      },
      select: invoiceSelect
    });
    await this.recordAudit(user, 'billing.invoice_update_status', 'Invoice', invoice.id, {
      status: before.status
    }, {
      status: invoice.status
    }, meta);
    return invoice;
  }

  async getEntitlements(user: AuthenticatedUser) {
    return this.resolveEntitlements(user.tenantId);
  }

  async getEntitlement(user: AuthenticatedUser, featureKey: string) {
    const entitlements = await this.resolveEntitlements(user.tenantId);
    const normalizedKey = this.normalizeFeatureKey(featureKey);
    const entitlement = entitlements.features.find((feature) => feature.key === normalizedKey);
    if (!entitlement) {
      return {
        key: normalizedKey,
        allowed: false,
        enabled: false,
        limit: null,
        used: 0,
        remaining: 0,
        reason: 'Feature is not included in the current plan'
      };
    }
    return entitlement;
  }

  async assertFeatureLimitAvailable(
    tenantId: string,
    featureKey: string,
    currentUsage: number,
    requestedQuantity = 1
  ) {
    const normalizedKey = this.normalizeFeatureKey(featureKey);
    const featureExists = await this.prisma.feature.findUnique({
      where: { key: normalizedKey },
      select: { key: true, name: true, isActive: true }
    });

    if (!featureExists) {
      return {
        enforced: false,
        allowed: true,
        key: normalizedKey,
        limit: null,
        used: currentUsage,
        remaining: null
      };
    }

    const entitlements = await this.resolveEntitlements(tenantId);
    const entitlement = entitlements.features.find((feature) => feature.key === normalizedKey);
    if (!entitlement || !entitlement.enabled || !entitlement.allowed) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        featureKey: normalizedKey,
        featureName: featureExists.name,
        message: `${featureExists.name} is not included in the current plan`
      });
    }

    const limit = entitlement.limit;
    if (limit === null || limit === undefined) {
      return {
        enforced: true,
        allowed: true,
        key: normalizedKey,
        limit: null,
        used: currentUsage,
        remaining: null
      };
    }

    const nextUsage = currentUsage + requestedQuantity;
    if (nextUsage > limit) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_LIMIT_REACHED',
        featureKey: normalizedKey,
        featureName: featureExists.name,
        limit,
        used: currentUsage,
        requested: requestedQuantity,
        remaining: Math.max(limit - currentUsage, 0),
        message: `${featureExists.name} limit reached for the current plan`
      });
    }

    return {
      enforced: true,
      allowed: true,
      key: normalizedKey,
      limit,
      used: currentUsage,
      remaining: Math.max(limit - nextUsage, 0)
    };
  }

  async createUsageRecord(
    user: AuthenticatedUser,
    dto: CreateUsageRecordDto,
    meta: RequestMeta
  ) {
    const featureKey = this.normalizeFeatureKey(dto.featureKey);
    if (new Date(dto.periodStart) > new Date(dto.periodEnd)) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.usageRecord.findFirst({
        where: {
          tenantId: user.tenantId,
          featureKey,
          idempotencyKey: dto.idempotencyKey
        },
        select: usageRecordSelect
      });
      if (existing) return existing;
    }

    const [feature, subscription] = await this.prisma.$transaction([
      this.prisma.feature.findUnique({
        where: { key: featureKey },
        select: featureSummarySelect
      }),
      this.prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
        select: {
          id: true
        }
      })
    ]);

    const usageRecord = await this.prisma.usageRecord.create({
      data: {
        tenantId: user.tenantId,
        subscriptionId: subscription?.id,
        featureId: feature?.id,
        featureKey,
        quantity: dto.quantity,
        unit: dto.unit ?? feature?.unit,
        source: dto.source ?? UsageRecordSource.API,
        idempotencyKey: dto.idempotencyKey,
        metadata: this.toJson(dto.metadata),
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        createdById: user.id
      },
      select: usageRecordSelect
    });

    await this.recordAudit(user, 'billing.usage_record_create', 'UsageRecord', usageRecord.id, undefined, {
      featureKey,
      quantity: dto.quantity,
      source: usageRecord.source
    }, meta);

    return usageRecord;
  }

  async listUsageRecords(user: AuthenticatedUser, query: UsageQueryDto) {
    this.assertTenantFilter(user, query.tenantId);
    const where: Prisma.UsageRecordWhereInput = {
      tenantId: user.tenantId,
      featureKey: query.featureKey ? this.normalizeFeatureKey(query.featureKey) : undefined,
      periodStart: this.dateFilter(query.from, undefined),
      periodEnd: this.dateFilter(undefined, query.to),
      ...(query.search
        ? {
            OR: [
              { featureKey: { contains: query.search, mode: 'insensitive' } },
              { unit: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.usageRecord.findMany({
        where,
        select: usageRecordSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.usageRecord.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async usageSummary(user: AuthenticatedUser, query: UsageQueryDto) {
    this.assertTenantFilter(user, query.tenantId);
    const where: Prisma.UsageRecordWhereInput = {
      tenantId: user.tenantId,
      featureKey: query.featureKey ? this.normalizeFeatureKey(query.featureKey) : undefined,
      periodStart: this.dateFilter(query.from, undefined),
      periodEnd: this.dateFilter(undefined, query.to)
    };

    const [groups, totalQuantity] = await this.prisma.$transaction([
      this.prisma.usageRecord.groupBy({
        by: ['featureKey'],
        where,
        _sum: {
          quantity: true
        },
        _count: {
          _all: true
        },
        orderBy: {
          featureKey: 'asc'
        }
      }),
      this.prisma.usageRecord.aggregate({
        where,
        _sum: {
          quantity: true
        },
        _count: {
          _all: true
        }
      })
    ]);

    return {
      data: groups.map((group) => ({
        featureKey: group.featureKey,
        quantity: group._sum.quantity ?? 0,
        records: group._count._all
      })),
      totalQuantity: totalQuantity._sum.quantity ?? 0,
      totalRecords: totalQuantity._count._all
    };
  }

  async createCheckoutSession(user: AuthenticatedUser, dto: CheckoutDto, meta: RequestMeta) {
    this.assertCanManageBilling(user);
    const plan = dto.planId ? await this.getPlan(dto.planId) : null;
    if (plan && (!plan.isActive || plan.archivedAt)) {
      throw new BadRequestException('Plan is not active');
    }

    const provider = this.resolveCheckoutProvider(dto.provider, plan?.currency);
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const successUrl = dto.successUrl ?? buildPublicUrl(frontendUrl, '/settings/billing', { checkout: 'success' });
    const cancelUrl = dto.cancelUrl ?? buildPublicUrl(frontendUrl, '/settings/billing', { checkout: 'cancelled' });
    const seatCount = dto.seatCount ?? 1;

    if (provider === 'stripe' && this.configService.get<string>('billing.stripeSecretKey')) {
      if (!plan) throw new BadRequestException('planId is required for Stripe checkout');
      if (plan.currency.toUpperCase() === 'NGN') {
        throw new BadRequestException('NGN plans must be checked out through Paystack');
      }
      await this.recordAudit(user, 'billing.checkout_start', 'Plan', plan.id, undefined, {
        provider,
        seatCount
      }, meta);
      return this.createStripeCheckoutSession(user, plan, seatCount, successUrl, cancelUrl);
    }

    if (provider === 'paystack' && this.configService.get<string>('billing.paystackSecretKey')) {
      if (!plan) throw new BadRequestException('planId is required for Paystack checkout');
      if (plan.currency.toUpperCase() !== 'NGN') {
        throw new BadRequestException('Paystack checkout is reserved for NGN plans in this workspace');
      }
      await this.recordAudit(user, 'billing.checkout_start', 'Plan', plan.id, undefined, {
        provider,
        seatCount
      }, meta);
      return this.createPaystackCheckoutSession(user, plan, seatCount, successUrl, cancelUrl);
    }

    return {
      provider,
      mode: 'local',
      url: successUrl,
      planId: plan?.id ?? null,
      seatCount,
      message: 'Billing provider is not enabled; returning a local checkout continuation URL'
    };
  }

  async confirmCheckoutSession(
    user: AuthenticatedUser,
    dto: CheckoutConfirmDto,
    meta: RequestMeta
  ) {
    const provider =
      dto.provider ??
      (dto.sessionId ? 'stripe' : dto.reference ? 'paystack' : undefined);
    if (!provider) {
      throw new BadRequestException('Checkout provider is required');
    }

    const result =
      provider === 'stripe'
        ? await this.confirmStripeCheckoutSession(user, dto.sessionId)
        : await this.confirmPaystackCheckoutSession(user, dto.reference);

    await this.recordAudit(user, 'billing.checkout_confirm', 'Tenant', user.tenantId, undefined, {
      provider,
      status: result.status,
      subscriptionId: result.subscription?.id ?? null,
      invoiceId: result.invoice?.id ?? null
    }, meta);

    return result;
  }

  async createPortalSession(user: AuthenticatedUser, dto: PortalDto) {
    const subscription = await this.getCurrentSubscription(user);
    const provider = subscription?.provider ?? this.configService.get<string>('billing.provider', 'none');
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const returnUrl =
      dto.returnUrl ??
      this.configService.get<string>('billing.stripePortalReturnUrl') ??
      buildPublicUrl(frontendUrl, '/settings/billing');

    if (
      provider === 'stripe' &&
      this.configService.get<string>('billing.stripeSecretKey') &&
      subscription?.providerCustomerId
    ) {
      return this.createStripePortalSession(subscription.providerCustomerId, returnUrl);
    }

    if (provider === 'paystack') {
      return {
        provider,
        mode: 'local',
        url: this.configService.get<string>('billing.paystackPortalUrl') ?? returnUrl,
        subscriptionId: subscription?.id ?? null,
        message: 'Paystack customer self-service is handled inside TaskBricks unless PAYSTACK_PORTAL_URL is configured'
      };
    }

    return {
      provider,
      mode: 'local',
      url: returnUrl,
      subscriptionId: subscription?.id ?? null,
      message: 'Billing provider portal is not enabled; returning local billing settings URL'
    };
  }

  async processStripeWebhook(payload: unknown, rawBody?: Buffer, signature?: string) {
    this.verifyStripeSignature(payload, rawBody, signature);
    const event = this.asRecord(payload);
    const eventId = this.stringValue(event.id) ?? randomUUID();
    const type = this.stringValue(event.type);
    if (!type) throw new BadRequestException('Stripe event type is required');

    const object = this.asRecord(this.asRecord(event.data).object) as StripeObject;
    const tenantId = await this.resolveStripeTenantId(object);

    try {
      const billingEvent = await this.prisma.billingEvent.create({
        data: {
          tenantId,
          provider: 'stripe',
          eventId,
          type,
          status: BillingEventStatus.RECEIVED,
          payload: this.toJson(payload)
        },
        select: billingEventSelect
      });

      try {
        const status = await this.applyStripeEvent(type, object, tenantId);
        const processed = await this.prisma.billingEvent.update({
          where: { id: billingEvent.id },
          data: {
            status,
            processedAt: new Date()
          },
          select: billingEventSelect
        });
        return {
          received: true,
          duplicate: false,
          event: processed
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stripe event processing failed';
        const failed = await this.prisma.billingEvent.update({
          where: { id: billingEvent.id },
          data: {
            status: BillingEventStatus.FAILED,
            processedAt: new Date(),
            error: message
          },
          select: billingEventSelect
        });
        return {
          received: true,
          duplicate: false,
          event: failed
        };
      }
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const existing = await this.prisma.billingEvent.findUnique({
        where: {
          provider_eventId: {
            provider: 'stripe',
            eventId
          }
        },
        select: billingEventSelect
      });
      return {
        received: true,
        duplicate: true,
        event: existing
      };
    }
  }

  async processPaystackWebhook(payload: unknown, rawBody?: Buffer, signature?: string) {
    this.verifyPaystackSignature(payload, rawBody, signature);
    const event = this.asRecord(payload);
    const type = this.stringValue(event.event) ?? this.stringValue(event.type);
    if (!type) throw new BadRequestException('Paystack event type is required');

    const object = this.asRecord(event.data) as PaystackObject;
    const eventId = this.paystackEventId(type, object);
    const tenantId = await this.resolvePaystackTenantId(object);

    try {
      const billingEvent = await this.prisma.billingEvent.create({
        data: {
          tenantId,
          provider: 'paystack',
          eventId,
          type,
          status: BillingEventStatus.RECEIVED,
          payload: this.toJson(payload)
        },
        select: billingEventSelect
      });

      try {
        const status = await this.applyPaystackEvent(type, object, tenantId);
        const processed = await this.prisma.billingEvent.update({
          where: { id: billingEvent.id },
          data: {
            status,
            processedAt: new Date()
          },
          select: billingEventSelect
        });
        return {
          received: true,
          duplicate: false,
          event: processed
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Paystack event processing failed';
        const failed = await this.prisma.billingEvent.update({
          where: { id: billingEvent.id },
          data: {
            status: BillingEventStatus.FAILED,
            processedAt: new Date(),
            error: message
          },
          select: billingEventSelect
        });
        return {
          received: true,
          duplicate: false,
          event: failed
        };
      }
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const existing = await this.prisma.billingEvent.findUnique({
        where: {
          provider_eventId: {
            provider: 'paystack',
            eventId
          }
        },
        select: billingEventSelect
      });
      return {
        received: true,
        duplicate: true,
        event: existing
      };
    }
  }

  async listBillingEvents(user: AuthenticatedUser, query: BillingEventQueryDto) {
    this.assertCanManageBilling(user);
    const where: Prisma.BillingEventWhereInput = {
      tenantId: user.tenantId,
      provider: query.provider,
      type: query.type,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { eventId: { contains: query.search, mode: 'insensitive' } },
              { type: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.billingEvent.findMany({
        where,
        select: billingEventSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.billingEvent.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getBillingEvent(user: AuthenticatedUser, eventId: string) {
    this.assertCanManageBilling(user);
    const event = await this.prisma.billingEvent.findFirst({
      where: {
        id: eventId,
        tenantId: user.tenantId
      },
      select: billingEventSelect
    });
    if (!event) throw new NotFoundException('Billing event not found');
    return event;
  }

  private async resolveEntitlements(tenantId: string) {
    const [subscription, seatsUsed] = await this.prisma.$transaction([
      this.prisma.subscription.findUnique({
        where: { tenantId },
        select: subscriptionSelect
      }),
      this.prisma.user.count({
        where: { tenantId }
      })
    ]);

    if (!subscription) {
      return {
        subscription: null,
        plan: null,
        seats: {
          used: seatsUsed,
          limit: null,
          remaining: null,
          allowed: true
        },
        features: []
      };
    }

    const periodStart = subscription.currentPeriodStart ?? new Date(0);
    const periodEnd = subscription.currentPeriodEnd ?? new Date('2999-12-31T23:59:59.999Z');
    const usage = await this.prisma.usageRecord.groupBy({
      by: ['featureKey'],
      where: {
        tenantId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd }
      },
      _sum: {
        quantity: true
      }
    });
    const usedByFeature = new Map(usage.map((item) => [item.featureKey, item._sum.quantity ?? 0]));

    const features = subscription.plan.features.map((planFeature) => {
      const limit = planFeature.limit ?? planFeature.feature.defaultLimit;
      const used = usedByFeature.get(planFeature.feature.key) ?? 0;
      const remaining = limit === null || limit === undefined ? null : Math.max(limit - used, 0);
      const allowed =
        Boolean(planFeature.enabled && planFeature.feature.isActive) &&
        (limit === null || limit === undefined || used < limit);

      return {
        key: planFeature.feature.key,
        name: planFeature.feature.name,
        category: planFeature.feature.category,
        unit: planFeature.feature.unit,
        metered: planFeature.feature.metered,
        enabled: planFeature.enabled,
        allowed,
        limit,
        used,
        remaining,
        config: planFeature.config
      };
    });

    const seatLimit = subscription.plan.seatLimit;
    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt
      },
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        interval: subscription.plan.interval
      },
      seats: {
        used: seatsUsed,
        limit: seatLimit ?? null,
        remaining: seatLimit === null || seatLimit === undefined ? null : Math.max(seatLimit - seatsUsed, 0),
        allowed: seatLimit === null || seatLimit === undefined || seatsUsed <= seatLimit
      },
      features
    };
  }

  private async getTenantSubscriptionOrThrow(tenantId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId
      },
      select: subscriptionSelect
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  private async getPlanFeatureOrThrow(planId: string, featureId: string) {
    const planFeature = await this.prisma.planFeature.findUnique({
      where: {
        planId_featureId: {
          planId,
          featureId
        }
      },
      select: planFeatureSelect
    });
    if (!planFeature) throw new NotFoundException('Plan feature not found');
    return planFeature;
  }

  private async assertFeaturesExist(featureIds: string[]) {
    const count = await this.prisma.feature.count({
      where: {
        id: {
          in: featureIds
        }
      }
    });
    if (count !== featureIds.length) {
      throw new BadRequestException('One or more features do not exist');
    }
  }

  private async updateTenantStatusFromBilling(tenantId: string, status: BillingStatus) {
    const tenantStatus =
      status === BillingStatus.ACTIVE
        ? TenantStatus.ACTIVE
        : status === BillingStatus.TRIALING
          ? TenantStatus.TRIAL
          : status === BillingStatus.CANCELLED || status === BillingStatus.EXPIRED
            ? TenantStatus.CANCELLED
            : TenantStatus.SUSPENDED;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: tenantStatus }
    });
  }

  private async applyStripeEvent(type: string, object: StripeObject, tenantId: string | null) {
    if (type.startsWith('customer.subscription.')) {
      await this.applyStripeSubscriptionEvent(type, object, tenantId);
      return tenantId ? BillingEventStatus.PROCESSED : BillingEventStatus.IGNORED;
    }

    if (type.startsWith('invoice.') || type.startsWith('payment_intent.')) {
      const processed = await this.applyStripeInvoiceEvent(type, object, tenantId);
      return processed ? BillingEventStatus.PROCESSED : BillingEventStatus.IGNORED;
    }

    return BillingEventStatus.IGNORED;
  }

  private async applyStripeSubscriptionEvent(
    type: string,
    object: StripeObject,
    tenantId: string | null
  ) {
    const providerSubscriptionId = object.id;
    if (!providerSubscriptionId) return;

    const existing = await this.prisma.subscription.findFirst({
      where: {
        provider: 'stripe',
        providerSubscriptionId
      },
      select: {
        id: true,
        tenantId: true,
        planId: true
      }
    });
    const resolvedTenantId = tenantId ?? existing?.tenantId;
    if (!resolvedTenantId) return;

    const priceId = object.items?.data?.[0]?.price?.id;
    const metadataPlanId = this.stringValue(object.metadata?.planId);
    const plan = metadataPlanId
      ? await this.prisma.plan.findUnique({ where: { id: metadataPlanId }, select: { id: true, interval: true } })
      : priceId
        ? await this.prisma.plan.findFirst({ where: { providerPriceId: priceId }, select: { id: true, interval: true } })
        : existing?.planId
          ? await this.prisma.plan.findUnique({ where: { id: existing.planId }, select: { id: true, interval: true } })
          : null;
    if (!plan) return;

    const status =
      type === 'customer.subscription.deleted'
        ? BillingStatus.CANCELLED
        : this.mapStripeBillingStatus(object.status);
    const now = new Date();
    const periodStart = this.fromUnixSeconds(object.current_period_start) ?? now;
    const periodEnd = this.fromUnixSeconds(object.current_period_end) ?? this.addPlanInterval(periodStart, plan.interval);
    const seatCount = object.quantity ?? object.items?.data?.[0]?.quantity ?? this.numberValue(object.metadata?.seatCount) ?? 1;

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          tenantId: resolvedTenantId,
          planId: plan.id,
          status,
          providerCustomerId: this.stringValue(object.customer),
          seatCount,
          cancelAtPeriodEnd: object.cancel_at_period_end ?? false,
          trialEndsAt: this.fromUnixSeconds(object.trial_end),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt:
            status === BillingStatus.CANCELLED
              ? this.fromUnixSeconds(object.canceled_at) ?? now
              : null,
          metadata: this.toJson({
            stripeStatus: object.status,
            priceId,
            lastStripeEventType: type
          })
        }
      });
    } else {
      await this.prisma.subscription.upsert({
        where: { tenantId: resolvedTenantId },
        update: {
          planId: plan.id,
          status,
          provider: 'stripe',
          providerCustomerId: this.stringValue(object.customer),
          providerSubscriptionId,
          seatCount,
          cancelAtPeriodEnd: object.cancel_at_period_end ?? false,
          trialEndsAt: this.fromUnixSeconds(object.trial_end),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt:
            status === BillingStatus.CANCELLED
              ? this.fromUnixSeconds(object.canceled_at) ?? now
              : null,
          metadata: this.toJson({
            stripeStatus: object.status,
            priceId,
            lastStripeEventType: type
          })
        },
        create: {
          tenantId: resolvedTenantId,
          planId: plan.id,
          status,
          provider: 'stripe',
          providerCustomerId: this.stringValue(object.customer),
          providerSubscriptionId,
          seatCount,
          cancelAtPeriodEnd: object.cancel_at_period_end ?? false,
          trialEndsAt: this.fromUnixSeconds(object.trial_end),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt:
            status === BillingStatus.CANCELLED
              ? this.fromUnixSeconds(object.canceled_at) ?? now
              : undefined,
          metadata: this.toJson({
            stripeStatus: object.status,
            priceId,
            lastStripeEventType: type
          })
        }
      });
    }

    await this.updateTenantStatusFromBilling(resolvedTenantId, status);
  }

  private async applyStripeInvoiceEvent(
    type: string,
    object: StripeObject,
    tenantId: string | null
  ) {
    const providerInvoiceId = object.id;
    if (!providerInvoiceId) return false;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          {
            provider: 'stripe',
            providerSubscriptionId: this.stringValue(object.subscription)
          },
          {
            tenantId: tenantId ?? undefined,
            providerCustomerId: this.stringValue(object.customer)
          }
        ]
      },
      select: {
        id: true,
        tenantId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true
      }
    });
    if (!subscription) return false;

    const status = this.mapStripeInvoiceStatus(type, object.status);
    const amount = this.centsToMoney(
      object.amount_due ?? object.amount_paid ?? object.total ?? object.subtotal ?? 0
    );

    await this.prisma.invoice.upsert({
      where: {
        provider_providerInvoiceId: {
          provider: 'stripe',
          providerInvoiceId
        }
      },
      update: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        number: object.number,
        amount,
        subtotal: object.subtotal === undefined ? undefined : this.centsToMoney(object.subtotal),
        tax: object.tax === undefined ? undefined : this.centsToMoney(object.tax),
        total: object.total === undefined ? undefined : this.centsToMoney(object.total),
        currency: this.normalizeCurrency(object.currency),
        status,
        dueDate: this.fromUnixSeconds(object.due_date),
        paidAt: status === 'paid' ? this.fromUnixSeconds(object.paid_at ?? object.created) ?? new Date() : undefined,
        hostedInvoiceUrl: object.hosted_invoice_url,
        invoicePdfUrl: object.invoice_pdf,
        metadata: this.toJson({
          stripeStatus: object.status,
          lastStripeEventType: type
        })
      },
      create: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        provider: 'stripe',
        providerInvoiceId,
        number: object.number,
        amount,
        subtotal: object.subtotal === undefined ? undefined : this.centsToMoney(object.subtotal),
        tax: object.tax === undefined ? undefined : this.centsToMoney(object.tax),
        total: object.total === undefined ? undefined : this.centsToMoney(object.total),
        currency: this.normalizeCurrency(object.currency),
        status,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        dueDate: this.fromUnixSeconds(object.due_date),
        paidAt: status === 'paid' ? this.fromUnixSeconds(object.paid_at ?? object.created) ?? new Date() : undefined,
        hostedInvoiceUrl: object.hosted_invoice_url,
        invoicePdfUrl: object.invoice_pdf,
        metadata: this.toJson({
          stripeStatus: object.status,
          lastStripeEventType: type
        })
      }
    });

    return true;
  }

  private async applyPaystackEvent(
    type: string,
    object: PaystackObject,
    tenantId: string | null
  ) {
    if (type === 'charge.success') {
      const processed = await this.applyPaystackChargeSuccess(object, tenantId);
      return processed ? BillingEventStatus.PROCESSED : BillingEventStatus.IGNORED;
    }

    if (type.startsWith('subscription.')) {
      const processed = await this.applyPaystackSubscriptionEvent(type, object, tenantId);
      return processed ? BillingEventStatus.PROCESSED : BillingEventStatus.IGNORED;
    }

    return BillingEventStatus.IGNORED;
  }

  private async applyPaystackChargeSuccess(object: PaystackObject, tenantId: string | null) {
    const metadata = this.paystackMetadata(object);
    const resolvedTenantId = tenantId ?? this.stringValue(metadata.tenantId);
    if (!resolvedTenantId) return false;

    const plan = await this.resolvePaystackPlan(object, metadata);
    if (!plan) return false;

    const now = new Date();
    const seatCount = this.numberValue(metadata.seatCount) ?? 1;
    if (!this.paystackPaymentMatchesPlan(object, metadata, plan, seatCount)) {
      return false;
    }

    const paidAt = this.dateValue(object.paid_at) ?? this.dateValue(object.created_at) ?? now;
    const periodEnd = this.addPlanInterval(paidAt, plan.interval);
    const providerCustomerId =
      this.stringValue(object.customer?.customer_code) ??
      this.stringValue(object.customer?.id);
    const providerSubscriptionId =
      this.stringValue(object.subscription?.subscription_code) ??
      this.stringValue(object.authorization?.authorization_code) ??
      this.stringValue(object.reference);
    const providerInvoiceId = this.stringValue(object.reference) ?? this.stringValue(object.id);
    if (!providerInvoiceId) return false;

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId: resolvedTenantId },
      update: {
        planId: plan.id,
        status: BillingStatus.ACTIVE,
        provider: 'paystack',
        providerCustomerId,
        providerSubscriptionId,
        seatCount,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        currentPeriodStart: paidAt,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        metadata: this.toJson({
          paystackStatus: object.status,
          reference: object.reference,
          planCode: object.plan?.plan_code ?? plan.providerPriceId,
          lastPaystackEventType: 'charge.success'
        })
      },
      create: {
        tenantId: resolvedTenantId,
        planId: plan.id,
        status: BillingStatus.ACTIVE,
        provider: 'paystack',
        providerCustomerId,
        providerSubscriptionId,
        seatCount,
        cancelAtPeriodEnd: false,
        currentPeriodStart: paidAt,
        currentPeriodEnd: periodEnd,
        metadata: this.toJson({
          paystackStatus: object.status,
          reference: object.reference,
          planCode: object.plan?.plan_code ?? plan.providerPriceId,
          lastPaystackEventType: 'charge.success'
        })
      },
      select: {
        id: true,
        currentPeriodStart: true,
        currentPeriodEnd: true
      }
    });

    await this.prisma.invoice.upsert({
      where: {
        provider_providerInvoiceId: {
          provider: 'paystack',
          providerInvoiceId
        }
      },
      update: {
        tenantId: resolvedTenantId,
        subscriptionId: subscription.id,
        amount: this.subunitToMoney(this.numberValue(object.amount) ?? 0, object.currency),
        subtotal: this.subunitToMoney(this.numberValue(object.amount) ?? 0, object.currency),
        total: this.subunitToMoney(this.numberValue(object.amount) ?? 0, object.currency),
        currency: this.normalizeCurrency(object.currency),
        status: 'paid',
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        paidAt,
        metadata: this.toJson({
          paystackStatus: object.status,
          reference: object.reference,
          customerCode: object.customer?.customer_code
        })
      },
      create: {
        tenantId: resolvedTenantId,
        subscriptionId: subscription.id,
        provider: 'paystack',
        providerInvoiceId,
        number: providerInvoiceId,
        amount: this.subunitToMoney(this.numberValue(object.amount) ?? 0, object.currency),
        subtotal: this.subunitToMoney(this.numberValue(object.amount) ?? 0, object.currency),
        total: this.subunitToMoney(this.numberValue(object.amount) ?? 0, object.currency),
        currency: this.normalizeCurrency(object.currency),
        status: 'paid',
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        paidAt,
        metadata: this.toJson({
          paystackStatus: object.status,
          reference: object.reference,
          customerCode: object.customer?.customer_code
        })
      }
    });

    await this.updateTenantStatusFromBilling(resolvedTenantId, BillingStatus.ACTIVE);
    return true;
  }

  private async applyPaystackSubscriptionEvent(
    type: string,
    object: PaystackObject,
    tenantId: string | null
  ) {
    const providerSubscriptionId =
      this.stringValue(object.subscription?.subscription_code) ??
      this.stringValue(object.id);
    if (!providerSubscriptionId) return false;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        provider: 'paystack',
        OR: [
          { providerSubscriptionId },
          { tenantId: tenantId ?? undefined }
        ]
      },
      select: {
        id: true,
        tenantId: true,
        metadata: true
      }
    });
    if (!subscription) return false;

    const status =
      type === 'subscription.disable' || type === 'subscription.not_renew'
        ? BillingStatus.CANCELLED
        : BillingStatus.ACTIVE;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        canceledAt: status === BillingStatus.CANCELLED ? new Date() : null,
        metadata: this.mergeJson(subscription.metadata, {
          paystackStatus: object.status,
          lastPaystackEventType: type
        })
      }
    });
    await this.updateTenantStatusFromBilling(subscription.tenantId, status);
    return true;
  }

  private async resolvePaystackTenantId(object: PaystackObject) {
    const metadataTenantId = this.stringValue(this.paystackMetadata(object).tenantId);
    if (metadataTenantId) return metadataTenantId;

    const subscriptionId =
      this.stringValue(object.subscription?.subscription_code) ??
      this.stringValue(object.authorization?.authorization_code) ??
      this.stringValue(object.reference);
    if (subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          provider: 'paystack',
          providerSubscriptionId: subscriptionId
        },
        select: { tenantId: true }
      });
      if (subscription) return subscription.tenantId;
    }

    const customerId =
      this.stringValue(object.customer?.customer_code) ??
      this.stringValue(object.customer?.id);
    if (customerId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          provider: 'paystack',
          providerCustomerId: customerId
        },
        select: { tenantId: true }
      });
      if (subscription) return subscription.tenantId;
    }

    return null;
  }

  private async resolvePaystackPlan(object: PaystackObject, metadata: Record<string, unknown>) {
    const metadataPlanId = this.stringValue(metadata.planId);
    if (metadataPlanId) {
      return this.prisma.plan.findUnique({
        where: { id: metadataPlanId },
        select: {
          id: true,
          interval: true,
          price: true,
          currency: true,
          providerPriceId: true
        }
      });
    }

    const planCode = this.stringValue(object.plan?.plan_code);
    if (!planCode) return null;
    return this.prisma.plan.findFirst({
      where: { providerPriceId: planCode },
      select: {
        id: true,
        interval: true,
        price: true,
        currency: true,
        providerPriceId: true
      }
    });
  }

  private async resolveStripeTenantId(object: StripeObject) {
    const metadataTenantId = this.stringValue(object.metadata?.tenantId);
    if (metadataTenantId) return metadataTenantId;

    const subscriptionId = this.stringValue(object.subscription) ?? object.id;
    if (subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          provider: 'stripe',
          providerSubscriptionId: subscriptionId
        },
        select: { tenantId: true }
      });
      if (subscription) return subscription.tenantId;
    }

    const customerId = this.stringValue(object.customer);
    if (customerId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          provider: 'stripe',
          providerCustomerId: customerId
        },
        select: { tenantId: true }
      });
      if (subscription) return subscription.tenantId;
    }

    return null;
  }

  private verifyStripeSignature(payload: unknown, rawBody?: Buffer, signature?: string) {
    const secret = this.configService.get<string>('billing.stripeWebhookSecret');
    if (!secret) return;
    if (!signature) throw new UnauthorizedException('Missing Stripe signature');

    const timestamp = signature
      .split(',')
      .map((part) => part.split('='))
      .find(([key]) => key === 't')?.[1];
    const receivedSignature = signature
      .split(',')
      .map((part) => part.split('='))
      .find(([key]) => key === 'v1')?.[1];

    if (!timestamp || !receivedSignature) {
      throw new UnauthorizedException('Invalid Stripe signature header');
    }

    const rawPayload = rawBody?.toString('utf8') ?? JSON.stringify(payload);
    const signedPayload = `${timestamp}.${rawPayload}`;
    const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException('Invalid Stripe signature');
    }
  }

  private verifyPaystackSignature(payload: unknown, rawBody?: Buffer, signature?: string) {
    const secret = this.configService.get<string>('billing.paystackSecretKey');
    if (!secret) return;
    if (!signature) throw new UnauthorizedException('Missing Paystack signature');

    const rawPayload = rawBody?.toString('utf8') ?? JSON.stringify(payload);
    const expectedSignature = createHmac('sha512', secret).update(rawPayload).digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(signature, 'hex');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }
  }

  private async confirmStripeCheckoutSession(user: AuthenticatedUser, sessionId?: string) {
    this.assertCanManageBilling(user);
    if (!sessionId) throw new BadRequestException('Stripe checkout session id is required');

    const session = await this.retrieveStripeCheckoutSession(sessionId);
    const metadata = this.asRecord(session.metadata);
    const sessionTenantId =
      this.stringValue(metadata.tenantId) ??
      this.stringValue(session.client_reference_id);
    if (sessionTenantId && sessionTenantId !== user.tenantId) {
      throw new ForbiddenException('Checkout session does not belong to the current tenant');
    }

    const paymentStatus = session.payment_status ?? 'unpaid';
    const complete = session.status === 'complete' && ['paid', 'no_payment_required'].includes(paymentStatus);
    if (!complete) {
      await this.recordCheckoutBillingEvent('stripe', `checkout:${sessionId}`, user.tenantId, 'checkout.session.pending', session, BillingEventStatus.RECEIVED);
      return this.checkoutConfirmationResult(
        user,
        'stripe',
        paymentStatus === 'unpaid' ? 'pending' : paymentStatus,
        'Stripe checkout has not completed payment yet.'
      );
    }

    let subscriptionObject = this.asRecord(session.subscription) as StripeObject;
    const providerSubscriptionId =
      this.stringValue(session.subscription) ??
      this.stringValue(subscriptionObject.id);
    if (providerSubscriptionId && !subscriptionObject.id) {
      subscriptionObject = await this.retrieveStripeSubscription(providerSubscriptionId);
    }

    const subscriptionMetadata = this.asRecord(subscriptionObject.metadata);
    const planId =
      this.stringValue(metadata.planId) ??
      this.stringValue(subscriptionMetadata.planId);
    const priceId = subscriptionObject.items?.data?.[0]?.price?.id;
    const plan = planId
      ? await this.prisma.plan.findUnique({ where: { id: planId }, select: { id: true, interval: true } })
      : priceId
        ? await this.prisma.plan.findFirst({ where: { providerPriceId: priceId }, select: { id: true, interval: true } })
        : null;
    if (!plan) {
      throw new BadRequestException('Checkout plan could not be resolved');
    }

    const now = new Date();
    const status = this.mapStripeBillingStatus(subscriptionObject.status ?? 'active');
    const periodStart =
      this.fromUnixSeconds(subscriptionObject.current_period_start) ??
      now;
    const periodEnd =
      this.fromUnixSeconds(subscriptionObject.current_period_end) ??
      this.addPlanInterval(periodStart, plan.interval);
    const seatCount =
      subscriptionObject.quantity ??
      subscriptionObject.items?.data?.[0]?.quantity ??
      this.numberValue(subscriptionMetadata.seatCount) ??
      this.numberValue(metadata.seatCount) ??
      1;
    const customerObject = this.asRecord(session.customer);
    const providerCustomerId =
      this.stringValue(session.customer) ??
      this.stringValue(customerObject.id) ??
      this.stringValue(subscriptionObject.customer);

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId: user.tenantId },
      update: {
        planId: plan.id,
        status,
        provider: 'stripe',
        providerCustomerId,
        providerSubscriptionId,
        seatCount,
        cancelAtPeriodEnd: subscriptionObject.cancel_at_period_end ?? false,
        trialEndsAt: this.fromUnixSeconds(subscriptionObject.trial_end),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: status === BillingStatus.CANCELLED ? this.fromUnixSeconds(subscriptionObject.canceled_at) ?? now : null,
        metadata: this.toJson({
          stripeCheckoutSessionId: session.id,
          stripePaymentStatus: paymentStatus,
          stripeStatus: subscriptionObject.status,
          priceId,
          confirmedAt: now.toISOString()
        })
      },
      create: {
        tenantId: user.tenantId,
        planId: plan.id,
        status,
        provider: 'stripe',
        providerCustomerId,
        providerSubscriptionId,
        seatCount,
        cancelAtPeriodEnd: subscriptionObject.cancel_at_period_end ?? false,
        trialEndsAt: this.fromUnixSeconds(subscriptionObject.trial_end),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: status === BillingStatus.CANCELLED ? this.fromUnixSeconds(subscriptionObject.canceled_at) ?? now : undefined,
        metadata: this.toJson({
          stripeCheckoutSessionId: session.id,
          stripePaymentStatus: paymentStatus,
          stripeStatus: subscriptionObject.status,
          priceId,
          confirmedAt: now.toISOString()
        })
      },
      select: subscriptionSelect
    });

    const invoiceObject = this.asRecord(session.invoice) as StripeObject;
    const providerInvoiceId =
      this.stringValue(session.invoice) ??
      this.stringValue(invoiceObject.id) ??
      `checkout:${sessionId}`;
    await this.prisma.invoice.upsert({
      where: {
        provider_providerInvoiceId: {
          provider: 'stripe',
          providerInvoiceId
        }
      },
      update: {
        tenantId: user.tenantId,
        subscriptionId: subscription.id,
        amount: this.centsToMoney(session.amount_total ?? invoiceObject.amount_paid ?? invoiceObject.total ?? 0),
        subtotal: this.centsToMoney(session.amount_subtotal ?? invoiceObject.subtotal ?? 0),
        total: this.centsToMoney(session.amount_total ?? invoiceObject.total ?? 0),
        currency: this.normalizeCurrency(session.currency ?? invoiceObject.currency),
        status: 'paid',
        periodStart,
        periodEnd,
        paidAt: now,
        hostedInvoiceUrl: invoiceObject.hosted_invoice_url,
        invoicePdfUrl: invoiceObject.invoice_pdf,
        metadata: this.toJson({
          stripeCheckoutSessionId: session.id,
          stripePaymentStatus: paymentStatus,
          confirmedFromReturn: true
        })
      },
      create: {
        tenantId: user.tenantId,
        subscriptionId: subscription.id,
        provider: 'stripe',
        providerInvoiceId,
        number: invoiceObject.number ?? providerInvoiceId,
        amount: this.centsToMoney(session.amount_total ?? invoiceObject.amount_paid ?? invoiceObject.total ?? 0),
        subtotal: this.centsToMoney(session.amount_subtotal ?? invoiceObject.subtotal ?? 0),
        total: this.centsToMoney(session.amount_total ?? invoiceObject.total ?? 0),
        currency: this.normalizeCurrency(session.currency ?? invoiceObject.currency),
        status: 'paid',
        periodStart,
        periodEnd,
        paidAt: now,
        hostedInvoiceUrl: invoiceObject.hosted_invoice_url,
        invoicePdfUrl: invoiceObject.invoice_pdf,
        metadata: this.toJson({
          stripeCheckoutSessionId: session.id,
          stripePaymentStatus: paymentStatus,
          confirmedFromReturn: true
        })
      }
    });

    await this.updateTenantStatusFromBilling(user.tenantId, status);
    await this.recordCheckoutBillingEvent('stripe', `checkout:${sessionId}`, user.tenantId, 'checkout.session.confirmed', session, BillingEventStatus.PROCESSED);
    return this.checkoutConfirmationResult(user, 'stripe', 'paid', 'Stripe checkout confirmed.');
  }

  private async confirmPaystackCheckoutSession(user: AuthenticatedUser, reference?: string) {
    this.assertCanManageBilling(user);
    if (!reference) throw new BadRequestException('Paystack transaction reference is required');

    const object = await this.verifyPaystackTransaction(reference);
    const metadataTenantId = this.stringValue(this.paystackMetadata(object).tenantId);
    if (metadataTenantId && metadataTenantId !== user.tenantId) {
      throw new ForbiddenException('Paystack transaction does not belong to the current tenant');
    }

    if (object.status !== 'success') {
      await this.recordCheckoutBillingEvent('paystack', `verify:${reference}`, user.tenantId, 'charge.pending', object, BillingEventStatus.RECEIVED);
      return this.checkoutConfirmationResult(
        user,
        'paystack',
        object.status ?? 'pending',
        'Paystack transaction is not successful yet.'
      );
    }

    const processed = await this.applyPaystackChargeSuccess(object, user.tenantId);
    if (!processed) throw new BadRequestException('Paystack transaction could not be applied to a plan');

    await this.recordCheckoutBillingEvent('paystack', `verify:${reference}`, user.tenantId, 'charge.verified', object, BillingEventStatus.PROCESSED);
    return this.checkoutConfirmationResult(user, 'paystack', 'paid', 'Paystack payment confirmed.');
  }

  private async checkoutConfirmationResult(
    user: AuthenticatedUser,
    provider: 'stripe' | 'paystack',
    status: string,
    message: string
  ) {
    const [subscription, invoice, account] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
        select: subscriptionSelect
      }),
      this.prisma.invoice.findFirst({
        where: { tenantId: user.tenantId, provider },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        select: invoiceSelect
      }),
      this.accountStatus(user)
    ]);

    return {
      provider,
      status,
      message,
      subscription,
      invoice,
      account
    };
  }

  private async recordCheckoutBillingEvent(
    provider: 'stripe' | 'paystack',
    eventId: string,
    tenantId: string,
    type: string,
    payload: unknown,
    status: BillingEventStatus
  ) {
    await this.prisma.billingEvent.upsert({
      where: {
        provider_eventId: {
          provider,
          eventId
        }
      },
      update: {
        tenantId,
        type,
        status,
        payload: this.toJson(payload),
        processedAt: new Date(),
        error: null
      },
      create: {
        tenantId,
        provider,
        eventId,
        type,
        status,
        payload: this.toJson(payload),
        processedAt: new Date()
      }
    });
  }

  private async retrieveStripeCheckoutSession(sessionId: string) {
    const secretKey = this.configService.get<string>('billing.stripeSecretKey');
    if (!secretKey) throw new BadRequestException('Stripe is not configured');

    const params = new URLSearchParams();
    params.append('expand[]', 'subscription');
    params.append('expand[]', 'invoice');
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?${params}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    const body = (await response.json()) as StripeCheckoutSessionObject & Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException({
        message: 'Stripe checkout session could not be verified',
        stripe: body
      });
    }
    return body;
  }

  private async retrieveStripeSubscription(subscriptionId: string) {
    const secretKey = this.configService.get<string>('billing.stripeSecretKey');
    if (!secretKey) throw new BadRequestException('Stripe is not configured');

    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    const body = (await response.json()) as StripeObject & Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException({
        message: 'Stripe subscription could not be verified',
        stripe: body
      });
    }
    return body;
  }

  private async verifyPaystackTransaction(reference: string) {
    const secretKey = this.configService.get<string>('billing.paystackSecretKey');
    if (!secretKey) throw new BadRequestException('Paystack is not configured');

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    const body = (await response.json()) as Record<string, unknown>;
    const data = this.asRecord(body.data) as PaystackObject;
    if (!response.ok || body.status === false) {
      throw new BadRequestException({
        message: 'Paystack transaction could not be verified',
        paystack: body
      });
    }
    return data;
  }

  private async createStripeCheckoutSession(
    user: AuthenticatedUser,
    plan: Prisma.PlanGetPayload<{ select: typeof planSelect }>,
    seatCount: number,
    successUrl: string,
    cancelUrl: string
  ) {
    const secretKey = this.configService.get<string>('billing.stripeSecretKey');
    if (!secretKey) throw new BadRequestException('Stripe is not configured');

    const successRedirectUrl = this.appendCheckoutReturnParams(successUrl, {
      checkout: 'success',
      provider: 'stripe',
      session_id: '{CHECKOUT_SESSION_ID}'
    });
    const cancelRedirectUrl = this.appendCheckoutReturnParams(cancelUrl, {
      checkout: 'cancelled',
      provider: 'stripe'
    });

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', successRedirectUrl);
    params.set('cancel_url', cancelRedirectUrl);
    params.set('client_reference_id', user.tenantId);
    params.set('metadata[tenantId]', user.tenantId);
    params.set('metadata[planId]', plan.id);
    params.set('metadata[seatCount]', `${seatCount}`);
    params.set('subscription_data[metadata][tenantId]', user.tenantId);
    params.set('subscription_data[metadata][planId]', plan.id);
    params.set('subscription_data[metadata][seatCount]', `${seatCount}`);

    if (plan.providerPriceId) {
      params.set('line_items[0][price]', plan.providerPriceId);
    } else {
      params.set('line_items[0][price_data][currency]', plan.currency.toLowerCase());
      params.set('line_items[0][price_data][unit_amount]', `${Math.round(Number(plan.price) * 100)}`);
      params.set('line_items[0][price_data][recurring][interval]', plan.interval);
      params.set('line_items[0][price_data][product_data][name]', plan.name);
      params.set('line_items[0][price_data][product_data][metadata][planId]', plan.id);
    }
    params.set('line_items[0][quantity]', `${seatCount}`);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException({
        message: 'Stripe checkout session could not be created',
        stripe: body
      });
    }
    return {
      provider: 'stripe',
      id: body.id,
      url: body.url,
      expiresAt: body.expires_at,
      planId: plan.id,
      seatCount,
      currency: plan.currency,
      successUrl: successRedirectUrl,
      cancelUrl: cancelRedirectUrl
    };
  }

  private async createPaystackCheckoutSession(
    user: AuthenticatedUser,
    plan: Prisma.PlanGetPayload<{ select: typeof planSelect }>,
    seatCount: number,
    successUrl: string,
    cancelUrl: string
  ) {
    const secretKey = this.configService.get<string>('billing.paystackSecretKey');
    if (!secretKey) throw new BadRequestException('Paystack is not configured');

    const reference = `tb_${randomUUID().replace(/-/g, '')}`;
    const callbackBaseUrl =
      successUrl.trim().length > 0
        ? successUrl
        : this.configService.get<string>('billing.paystackCallbackUrl') ?? cancelUrl;
    const callbackUrl = this.appendCheckoutReturnParams(
      callbackBaseUrl,
      {
        checkout: 'success',
        provider: 'paystack',
        reference
      }
    );
    const cancelRedirectUrl = this.appendCheckoutReturnParams(cancelUrl, {
      checkout: 'cancelled',
      provider: 'paystack',
      reference
    });
    const amount = this.moneyToSubunit(Number(plan.price) * seatCount, plan.currency);
    if (amount <= 0) {
      throw new BadRequestException('Paystack checkout requires a paid plan amount');
    }

    const payload: Record<string, unknown> = {
      email: user.email,
      amount,
      currency: this.normalizeCurrency(plan.currency),
      reference,
      callback_url: callbackUrl,
      metadata: {
        tenantId: user.tenantId,
        planId: plan.id,
        planSlug: plan.slug,
        seatCount,
        reference,
        expectedAmount: amount,
        expectedCurrency: this.normalizeCurrency(plan.currency),
        provider: 'paystack',
        successUrl,
        cancelUrl: cancelRedirectUrl
      }
    };
    if (plan.providerPriceId) {
      payload.plan = plan.providerPriceId;
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const body = (await response.json()) as Record<string, unknown>;
    const data = this.asRecord(body.data);
    if (!response.ok || body.status === false) {
      throw new BadRequestException({
        message: 'Paystack checkout session could not be created',
        paystack: body
      });
    }

    return {
      provider: 'paystack',
      id: data.reference,
      reference: data.reference,
      accessCode: data.access_code,
      url: data.authorization_url,
      planId: plan.id,
      seatCount,
      currency: plan.currency,
      amount,
      callbackUrl,
      successUrl: callbackUrl,
      cancelUrl: cancelRedirectUrl
    };
  }

  private async createStripePortalSession(customerId: string, returnUrl: string) {
    const secretKey = this.configService.get<string>('billing.stripeSecretKey');
    if (!secretKey) throw new BadRequestException('Stripe is not configured');

    const params = new URLSearchParams();
    params.set('customer', customerId);
    params.set('return_url', returnUrl);

    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException({
        message: 'Stripe portal session could not be created',
        stripe: body
      });
    }
    return {
      provider: 'stripe',
      id: body.id,
      url: body.url
    };
  }

  private mapStripeBillingStatus(status?: string): BillingStatus {
    switch (status) {
      case 'trialing':
        return BillingStatus.TRIALING;
      case 'active':
        return BillingStatus.ACTIVE;
      case 'past_due':
      case 'incomplete':
        return BillingStatus.PAST_DUE;
      case 'canceled':
      case 'cancelled':
        return BillingStatus.CANCELLED;
      case 'unpaid':
      case 'incomplete_expired':
        return BillingStatus.EXPIRED;
      default:
        return BillingStatus.PAST_DUE;
    }
  }

  private mapStripeInvoiceStatus(eventType: string, status?: string) {
    if (eventType === 'invoice.paid' || eventType === 'invoice.payment_succeeded') return 'paid';
    if (eventType === 'invoice.payment_failed') return 'failed';
    if (eventType === 'invoice.voided') return 'void';
    return status ?? 'open';
  }

  private calculatePlanChangeProration(
    subscription: Prisma.SubscriptionGetPayload<{ select: typeof subscriptionSelect }>,
    nextPlan: Prisma.PlanGetPayload<{ select: typeof planSelect }>,
    now: Date,
    behavior: ProrationBehavior
  ): PlanChangeProration {
    const oldCurrency = this.normalizeCurrency(subscription.plan.currency);
    const nextCurrency = this.normalizeCurrency(nextPlan.currency);
    const oldPeriodAmount = this.roundMoney(Number(subscription.plan.price) * subscription.seatCount);
    const newPeriodAmount = this.roundMoney(Number(nextPlan.price) * subscription.seatCount);

    if (behavior === 'none' || oldCurrency !== nextCurrency) {
      return {
        behavior,
        currency: nextCurrency,
        creditAmount: 0,
        invoiceAmount: 0,
        oldPeriodAmount,
        newPeriodAmount,
        remainingRatio: 0,
        unsupportedCurrencyChange: oldCurrency !== nextCurrency
      };
    }

    const periodStart = subscription.currentPeriodStart?.getTime();
    const periodEnd = subscription.currentPeriodEnd?.getTime();
    const current = now.getTime();
    const remainingRatio =
      periodStart && periodEnd && periodEnd > periodStart && periodEnd > current
        ? Math.max(0, Math.min(1, (periodEnd - current) / (periodEnd - periodStart)))
        : 0;
    const netChange = this.roundMoney((newPeriodAmount - oldPeriodAmount) * remainingRatio);

    return {
      behavior,
      currency: nextCurrency,
      creditAmount: netChange < 0 ? Math.abs(netChange) : 0,
      invoiceAmount: behavior === 'create_proration_invoice' && netChange > 0 ? netChange : 0,
      oldPeriodAmount,
      newPeriodAmount,
      remainingRatio,
      unsupportedCurrencyChange: false
    };
  }

  private async createPlanChangeAdjustmentInvoice(
    subscription: Prisma.SubscriptionGetPayload<{ select: typeof subscriptionSelect }>,
    previousPlanId: string,
    nextPlanId: string,
    proration: PlanChangeProration,
    now: Date
  ) {
    const providerInvoiceId = `plan-change:${subscription.id}:${now.getTime()}`;
    await this.prisma.invoice.create({
      data: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        provider: 'manual',
        providerInvoiceId,
        number: `ADJ-${now.getTime()}`,
        amount: proration.invoiceAmount,
        subtotal: proration.invoiceAmount,
        total: proration.invoiceAmount,
        currency: proration.currency,
        status: 'open',
        periodStart: now,
        periodEnd: subscription.currentPeriodEnd,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        metadata: this.toJson({
          type: 'plan_change_proration',
          previousPlanId,
          nextPlanId,
          creditAmount: proration.creditAmount,
          remainingRatio: proration.remainingRatio
        })
      }
    });
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private addPlanInterval(start: Date, interval: string) {
    const end = new Date(start);
    switch (interval) {
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        break;
      case 'year':
        end.setFullYear(end.getFullYear() + 1);
        break;
      case 'month':
      default:
        end.setMonth(end.getMonth() + 1);
        break;
    }
    return end;
  }

  private fromUnixSeconds(value?: number) {
    return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000) : undefined;
  }

  private dateValue(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private centsToMoney(value: number) {
    return Number((value / 100).toFixed(2));
  }

  private appendCheckoutReturnParams(url: string, params: Record<string, string>) {
    try {
      const parsed = new URL(url);
      for (const [key, value] of Object.entries(params)) {
        parsed.searchParams.set(key, value);
      }
      return parsed.toString().replace(/%7BCHECKOUT_SESSION_ID%7D/g, '{CHECKOUT_SESSION_ID}');
    } catch {
      const query = new URLSearchParams(params)
        .toString()
        .replace(/%7BCHECKOUT_SESSION_ID%7D/g, '{CHECKOUT_SESSION_ID}');
      return `${url}${url.includes('?') ? '&' : '?'}${query}`;
    }
  }

  private moneyToSubunit(value: number, currency?: string) {
    const normalized = this.normalizeCurrency(currency);
    const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
    const multiplier = zeroDecimalCurrencies.has(normalized) ? 1 : 100;
    return Math.round(value * multiplier);
  }

  private subunitToMoney(value: number, currency?: string) {
    const normalized = this.normalizeCurrency(currency);
    const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
    const divisor = zeroDecimalCurrencies.has(normalized) ? 1 : 100;
    return Number((value / divisor).toFixed(2));
  }

  private normalizeSlug(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeFeatureKey(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeCurrency(value?: string) {
    return (value ?? 'USD').trim().toUpperCase();
  }

  private assertCanManageBilling(user: AuthenticatedUser) {
    if (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:billing')
    ) {
      return;
    }
    throw new ForbiddenException('Cannot manage billing');
  }

  private assertTenantFilter(user: AuthenticatedUser, tenantId?: string) {
    if (tenantId && tenantId !== user.tenantId) {
      throw new ForbiddenException('Cannot access billing records outside the current tenant');
    }
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private mergeJson(current: unknown, patch: Record<string, unknown>) {
    return this.toJson({
      ...this.asRecord(current),
      ...patch
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private numberValue(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private paystackPaymentMatchesPlan(
    object: PaystackObject,
    metadata: Record<string, unknown>,
    plan: { price: Prisma.Decimal | number | string; currency: string },
    seatCount: number
  ) {
    const paidAmount = this.numberValue(object.amount);
    if (!paidAmount || paidAmount <= 0) return false;

    const expectedCurrency = this.normalizeCurrency(
      this.stringValue(metadata.expectedCurrency) ?? plan.currency
    );
    const paidCurrency = this.normalizeCurrency(object.currency ?? expectedCurrency);
    if (paidCurrency !== expectedCurrency) return false;

    const expectedAmount =
      this.numberValue(metadata.expectedAmount) ??
      this.moneyToSubunit(Number(plan.price) * seatCount, plan.currency);
    return paidAmount === expectedAmount;
  }

  private paystackMetadata(object: PaystackObject) {
    return this.asRecord(object.metadata);
  }

  private paystackEventId(type: string, object: PaystackObject) {
    return [
      this.stringValue(object.reference),
      this.stringValue(object.subscription?.subscription_code),
      this.stringValue(object.authorization?.authorization_code),
      this.stringValue(object.id)
    ].find(Boolean) ?? `${type}-${randomUUID()}`;
  }

  private isBillingProviderConfigured(provider: string) {
    if (provider === 'stripe') {
      return Boolean(this.configService.get<string>('billing.stripeSecretKey'));
    }
    if (provider === 'paystack') {
      return Boolean(this.configService.get<string>('billing.paystackSecretKey'));
    }
    return provider === 'none' || provider === 'paypal';
  }

  private resolveCheckoutProvider(provider: CheckoutDto['provider'], currency?: string) {
    if (provider === 'local') return 'none';
    if (provider) return provider;

    const normalizedCurrency = this.normalizeCurrency(currency);
    if (normalizedCurrency === 'NGN' && this.configService.get<string>('billing.paystackSecretKey')) {
      return 'paystack';
    }
    if (normalizedCurrency !== 'NGN' && this.configService.get<string>('billing.stripeSecretKey')) {
      return 'stripe';
    }
    return this.configService.get<string>('billing.provider', 'none');
  }

  private isUniqueConstraintError(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
  }

  private paginate<T>(data: T[], total: number, query: PaginationQueryDto) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  private async recordAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: Prisma.InputJsonValue | undefined,
    newValue: Prisma.InputJsonValue | undefined,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }
}
