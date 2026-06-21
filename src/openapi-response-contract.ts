import { OpenAPIObject } from '@nestjs/swagger';

type OpenApiSchema = Record<string, unknown>;
type OpenApiMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

export const openApiComponentSchemas: Record<string, OpenApiSchema> = {
  "AdminOverview": {
    "properties": {
      "apiKeys": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "auditLogs": {
        "type": "number"
      },
      "complianceJobs": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "securityChecks": {
        "$ref": "#/components/schemas/SecurityChecks"
      },
      "securityEvents": {
        "properties": {
          "open": {
            "type": "number"
          }
        },
        "required": [
          "open"
        ],
        "type": "object"
      },
      "sessions": {
        "properties": {
          "active": {
            "type": "number"
          },
          "revoked": {
            "type": "number"
          }
        },
        "required": [
          "active",
          "revoked"
        ],
        "type": "object"
      },
      "tenant": {
        "properties": {
          "createdAt": {
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status",
          "createdAt",
          "updatedAt"
        ],
        "type": "object"
      },
      "users": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      }
    },
    "required": [
      "tenant",
      "users",
      "sessions",
      "auditLogs",
      "securityEvents",
      "complianceJobs",
      "apiKeys",
      "securityChecks"
    ],
    "type": "object"
  },
  "AiActionStatus": {
    "enum": [
      "PENDING",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "AiAgent": {
    "properties": {
      "_count": {
        "properties": {
          "actions": {
            "type": "number"
          },
          "conversations": {
            "type": "number"
          },
          "usageLogs": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "enabled": {
        "type": "boolean"
      },
      "guardrails": {},
      "id": {
        "type": "string"
      },
      "knowledgeScope": {},
      "maxOutputTokens": {
        "nullable": true,
        "type": "number"
      },
      "model": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "systemPrompt": {
        "nullable": true,
        "type": "string"
      },
      "temperature": {
        "nullable": true,
        "type": "number"
      },
      "tenantId": {
        "type": "string"
      },
      "tools": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "type",
      "provider",
      "model",
      "tools",
      "enabled",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "AiConversationStatus": {
    "enum": [
      "OPEN",
      "ARCHIVED",
      "RESOLVED"
    ],
    "type": "string"
  },
  "AiRequestStatus": {
    "enum": [
      "COMPLETED",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "AiSettings": {
    "properties": {
      "allowedProviders": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "createdAt": {
        "type": "string"
      },
      "dataRetentionDays": {
        "type": "number"
      },
      "defaultModel": {
        "type": "string"
      },
      "defaultProvider": {
        "type": "string"
      },
      "enabled": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "monthlyCostLimit": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "monthlyTokenLimit": {
        "nullable": true,
        "type": "number"
      },
      "policy": {},
      "redactSensitiveData": {
        "type": "boolean"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "enabled",
      "defaultProvider",
      "defaultModel",
      "allowedProviders",
      "redactSensitiveData",
      "dataRetentionDays",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "AnalyticsOverview": {
    "properties": {
      "budget": {
        "properties": {
          "actual": {
            "type": "number"
          },
          "planned": {
            "type": "number"
          }
        },
        "required": [
          "planned",
          "actual"
        ],
        "type": "object"
      },
      "openRisks": {
        "type": "number"
      },
      "overdueTasks": {
        "type": "number"
      },
      "projects": {
        "type": "number"
      },
      "tasks": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "time": {
        "properties": {
          "entries": {
            "type": "number"
          },
          "minutes": {
            "type": "number"
          }
        },
        "required": [
          "entries",
          "minutes"
        ],
        "type": "object"
      }
    },
    "required": [
      "projects",
      "tasks",
      "overdueTasks",
      "openRisks",
      "budget",
      "time"
    ],
    "type": "object"
  },
  "AnalyticsQuery": {
    "properties": {
      "from": {
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "teamId": {
        "type": "string"
      },
      "to": {
        "type": "string"
      },
      "workspaceId": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "ApiKey": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "createdBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "expiresAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastUsedAt": {
        "nullable": true,
        "type": "string"
      },
      "metadata": {},
      "name": {
        "type": "string"
      },
      "prefix": {
        "type": "string"
      },
      "revokedAt": {
        "nullable": true,
        "type": "string"
      },
      "scopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "$ref": "#/components/schemas/ApiKeyStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "prefix",
      "scopes",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "ApiKeyStatus": {
    "enum": [
      "ACTIVE",
      "REVOKED",
      "EXPIRED"
    ],
    "type": "string"
  },
  "ApprovalStatus": {
    "enum": [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "AuditLog": {
    "properties": {
      "action": {
        "type": "string"
      },
      "actorId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "entityId": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ipAddress": {
        "nullable": true,
        "type": "string"
      },
      "newValue": {},
      "oldValue": {},
      "tenantId": {
        "type": "string"
      },
      "userAgent": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "action",
      "entityType",
      "createdAt"
    ],
    "type": "object"
  },
  "AuthLifecycleResponse": {
    "properties": {
      "devLink": {
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "message": {
        "type": "string"
      },
      "requiresEmailVerification": {
        "type": "boolean"
      },
      "success": {
        "type": "boolean"
      },
      "tenantSlug": {
        "type": "string"
      }
    },
    "required": [
      "success",
      "message"
    ],
    "type": "object"
  },
  "AuthResponse": {
    "properties": {
      "accessToken": {
        "type": "string"
      },
      "refreshToken": {
        "type": "string"
      },
      "trustedDeviceToken": {
        "type": "string"
      },
      "user": {
        "$ref": "#/components/schemas/AuthUser"
      }
    },
    "required": [
      "accessToken",
      "user"
    ],
    "type": "object"
  },
  "AuthSession": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "expiresAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ipAddress": {
        "nullable": true,
        "type": "string"
      },
      "revokedAt": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userAgent": {
        "nullable": true,
        "type": "string"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "userId",
      "expiresAt",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "AuthUser": {
    "properties": {
      "avatarUrl": {
        "nullable": true,
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "firstName": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isPlatformAdmin": {
        "type": "boolean"
      },
      "lastName": {
        "type": "string"
      },
      "locale": {
        "nullable": true,
        "type": "string"
      },
      "permissions": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "platformAdminLevel": {
        "allOf": [
          {
            "$ref": "#/components/schemas/PlatformAdminLevel"
          }
        ],
        "nullable": true
      },
      "platformAdminScopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "roles": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "email",
      "firstName",
      "lastName",
      "status",
      "roles",
      "permissions"
    ],
    "type": "object"
  },
  "BillingAccountStatus": {
    "properties": {
      "entitlements": {
        "$ref": "#/components/schemas/BillingEntitlements"
      },
      "seats": {
        "properties": {
          "limit": {
            "nullable": true,
            "type": "number"
          },
          "remaining": {
            "nullable": true,
            "type": "number"
          },
          "used": {
            "type": "number"
          },
          "withinLimit": {
            "type": "boolean"
          }
        },
        "required": [
          "used",
          "withinLimit"
        ],
        "type": "object"
      },
      "subscription": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SiteSubscription"
          }
        ],
        "nullable": true
      },
      "tenantId": {
        "type": "string"
      }
    },
    "required": [
      "tenantId",
      "subscription",
      "seats",
      "entitlements"
    ],
    "type": "object"
  },
  "BillingCheckoutSession": {
    "properties": {
      "accessCode": {},
      "currency": {
        "type": "string"
      },
      "expiresAt": {},
      "id": {},
      "message": {
        "type": "string"
      },
      "mode": {
        "type": "string"
      },
      "planId": {
        "nullable": true,
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "reference": {},
      "seatCount": {
        "type": "number"
      },
      "url": {}
    },
    "required": [
      "provider"
    ],
    "type": "object"
  },
  "BillingEntitlementFeature": {
    "properties": {
      "allowed": {
        "type": "boolean"
      },
      "category": {
        "nullable": true,
        "type": "string"
      },
      "config": {},
      "enabled": {
        "type": "boolean"
      },
      "key": {
        "type": "string"
      },
      "limit": {
        "nullable": true,
        "type": "number"
      },
      "metered": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "remaining": {
        "nullable": true,
        "type": "number"
      },
      "unit": {
        "nullable": true,
        "type": "string"
      },
      "used": {
        "type": "number"
      }
    },
    "required": [
      "key",
      "name",
      "metered",
      "enabled",
      "allowed",
      "used"
    ],
    "type": "object"
  },
  "BillingEntitlements": {
    "properties": {
      "features": {
        "items": {
          "$ref": "#/components/schemas/BillingEntitlementFeature"
        },
        "type": "array"
      },
      "plan": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "interval": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "interval"
        ],
        "type": "object"
      },
      "seats": {
        "properties": {
          "allowed": {
            "type": "boolean"
          },
          "limit": {
            "nullable": true,
            "type": "number"
          },
          "remaining": {
            "nullable": true,
            "type": "number"
          },
          "used": {
            "type": "number"
          }
        },
        "required": [
          "used",
          "allowed"
        ],
        "type": "object"
      },
      "subscription": {
        "nullable": true,
        "properties": {
          "currentPeriodEnd": {
            "nullable": true,
            "type": "string"
          },
          "currentPeriodStart": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "trialEndsAt": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "status"
        ],
        "type": "object"
      }
    },
    "required": [
      "subscription",
      "plan",
      "seats",
      "features"
    ],
    "type": "object"
  },
  "BillingInvoice": {
    "$ref": "#/components/schemas/SiteInvoice"
  },
  "BillingPlan": {
    "$ref": "#/components/schemas/SiteBillingPlan"
  },
  "BillingPortalSession": {
    "properties": {
      "id": {},
      "message": {
        "type": "string"
      },
      "mode": {
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "subscriptionId": {
        "nullable": true,
        "type": "string"
      },
      "url": {}
    },
    "required": [
      "provider"
    ],
    "type": "object"
  },
  "BillingUsageRecord": {
    "$ref": "#/components/schemas/SiteUsageRecord"
  },
  "BillingUsageSummary": {
    "properties": {
      "data": {
        "items": {
          "properties": {
            "featureKey": {
              "type": "string"
            },
            "quantity": {
              "type": "number"
            },
            "records": {
              "type": "number"
            }
          },
          "required": [
            "featureKey",
            "quantity",
            "records"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "totalQuantity": {
        "type": "number"
      },
      "totalRecords": {
        "type": "number"
      }
    },
    "required": [
      "data",
      "totalQuantity",
      "totalRecords"
    ],
    "type": "object"
  },
  "BoardColumn": {
    "properties": {
      "boardId": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isCollapsed": {
        "type": "boolean"
      },
      "isOverWipLimit": {
        "type": "boolean"
      },
      "metrics": {
        "properties": {
          "actualMins": {
            "type": "number"
          },
          "blockedCount": {
            "type": "number"
          },
          "completedStoryPoints": {
            "type": "number"
          },
          "completionRate": {
            "type": "number"
          },
          "dueTodayCount": {
            "type": "number"
          },
          "estimateMins": {
            "type": "number"
          },
          "highPriorityCount": {
            "type": "number"
          },
          "isOverWipLimit": {
            "type": "boolean"
          },
          "overdueCount": {
            "type": "number"
          },
          "storyPoints": {
            "type": "number"
          },
          "taskCount": {
            "type": "number"
          },
          "unassignedCount": {
            "type": "number"
          }
        },
        "required": [
          "taskCount",
          "storyPoints",
          "completedStoryPoints",
          "estimateMins",
          "actualMins",
          "blockedCount",
          "overdueCount",
          "dueTodayCount",
          "highPriorityCount",
          "unassignedCount",
          "completionRate",
          "isOverWipLimit"
        ],
        "type": "object"
      },
      "name": {
        "type": "string"
      },
      "sortOrder": {
        "type": "number"
      },
      "status": {
        "allOf": [
          {
            "$ref": "#/components/schemas/TaskStatus"
          }
        ],
        "nullable": true
      },
      "taskCount": {
        "type": "number"
      },
      "tasks": {
        "items": {
          "$ref": "#/components/schemas/Task"
        },
        "type": "array"
      },
      "updatedAt": {
        "type": "string"
      },
      "wip": {
        "properties": {
          "limit": {
            "nullable": true,
            "type": "number"
          },
          "remaining": {
            "nullable": true,
            "type": "number"
          },
          "usagePercent": {
            "nullable": true,
            "type": "number"
          },
          "used": {
            "type": "number"
          }
        },
        "required": [
          "used"
        ],
        "type": "object"
      },
      "wipLimit": {
        "nullable": true,
        "type": "number"
      }
    },
    "required": [
      "id",
      "boardId",
      "name",
      "isCollapsed",
      "sortOrder"
    ],
    "type": "object"
  },
  "BookingFormField": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "fieldKey": {
        "type": "string"
      },
      "helpText": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "label": {
        "type": "string"
      },
      "options": {
        "items": {
          "type": "string"
        },
        "nullable": true,
        "type": "array"
      },
      "pageId": {
        "type": "string"
      },
      "placeholder": {
        "nullable": true,
        "type": "string"
      },
      "required": {
        "type": "boolean"
      },
      "sortOrder": {
        "type": "number"
      },
      "tenantId": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/BookingFormFieldType"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "pageId",
      "fieldKey",
      "label",
      "type",
      "required",
      "sortOrder",
      "isActive"
    ],
    "type": "object"
  },
  "BookingFormFieldType": {
    "enum": [
      "TEXT",
      "LONG_TEXT",
      "EMAIL",
      "PHONE",
      "NUMBER",
      "DATE",
      "SINGLE_SELECT",
      "MULTI_SELECT",
      "BOOLEAN",
      "URL"
    ],
    "type": "string"
  },
  "BookingPage": {
    "properties": {
      "_count": {
        "properties": {
          "fields": {
            "type": "number"
          },
          "requests": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "allowCancel": {
        "type": "boolean"
      },
      "allowReschedule": {
        "type": "boolean"
      },
      "approvalRequired": {
        "type": "boolean"
      },
      "brandColor": {
        "nullable": true,
        "type": "string"
      },
      "bufferAfterMins": {
        "type": "number"
      },
      "bufferBeforeMins": {
        "type": "number"
      },
      "collectCompanyName": {
        "type": "boolean"
      },
      "conferenceProvider": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "dailyLimit": {
        "nullable": true,
        "type": "number"
      },
      "department": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "durationMins": {
        "nullable": true,
        "type": "number"
      },
      "fields": {
        "items": {
          "$ref": "#/components/schemas/BookingFormField"
        },
        "type": "array"
      },
      "heroImageUrl": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "locationMode": {
        "$ref": "#/components/schemas/MeetingLocationMode"
      },
      "locationName": {
        "nullable": true,
        "type": "string"
      },
      "logoUrl": {
        "nullable": true,
        "type": "string"
      },
      "meetingType": {
        "nullable": true,
        "properties": {
          "bufferAfterMins": {
            "type": "number"
          },
          "bufferBeforeMins": {
            "type": "number"
          },
          "category": {
            "$ref": "#/components/schemas/MeetingTypeCategory"
          },
          "defaultAgenda": {
            "items": {
              "type": "string"
            },
            "nullable": true,
            "type": "array"
          },
          "defaultReminderMins": {
            "items": {
              "type": "number"
            },
            "type": "array"
          },
          "description": {
            "nullable": true,
            "type": "string"
          },
          "durationMins": {
            "type": "number"
          },
          "id": {
            "type": "string"
          },
          "isActive": {
            "type": "boolean"
          },
          "locationMode": {
            "$ref": "#/components/schemas/MeetingLocationMode"
          },
          "name": {
            "type": "string"
          },
          "requiresApproval": {
            "type": "boolean"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "category",
          "durationMins",
          "bufferBeforeMins",
          "bufferAfterMins",
          "locationMode",
          "requiresApproval",
          "defaultReminderMins",
          "isActive"
        ],
        "type": "object"
      },
      "meetingTypeId": {
        "nullable": true,
        "type": "string"
      },
      "meetingUrl": {
        "nullable": true,
        "type": "string"
      },
      "minNoticeMins": {
        "type": "number"
      },
      "owner": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          },
          {
            "properties": {
              "avatarUrl": {
                "nullable": true,
                "type": "string"
              },
              "status": {
                "type": "string"
              },
              "timezone": {
                "nullable": true,
                "type": "string"
              }
            },
            "type": "object"
          }
        ],
        "nullable": true
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "path": {
        "type": "string"
      },
      "rollingWindowDays": {
        "type": "number"
      },
      "routingStrategy": {
        "$ref": "#/components/schemas/BookingRoutingStrategy"
      },
      "scope": {
        "$ref": "#/components/schemas/BookingPageScope"
      },
      "subtitle": {
        "nullable": true,
        "type": "string"
      },
      "team": {
        "allOf": [
          {
            "properties": {
              "description": {
                "nullable": true,
                "type": "string"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name"
            ],
            "type": "object"
          },
          {
            "properties": {
              "members": {
                "items": {
                  "properties": {
                    "role": {
                      "nullable": true,
                      "type": "string"
                    },
                    "user": {
                      "allOf": [
                        {
                          "$ref": "#/components/schemas/UserSummary"
                        },
                        {
                          "properties": {
                            "avatarUrl": {
                              "nullable": true,
                              "type": "string"
                            },
                            "status": {
                              "type": "string"
                            },
                            "timezone": {
                              "nullable": true,
                              "type": "string"
                            }
                          },
                          "type": "object"
                        }
                      ]
                    }
                  },
                  "required": [
                    "user"
                  ],
                  "type": "object"
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        ],
        "nullable": true
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "logoUrl": {
            "nullable": true,
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "website": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "weeklyLimit": {
        "nullable": true,
        "type": "number"
      }
    },
    "required": [
      "id",
      "tenantId",
      "path",
      "title",
      "scope",
      "routingStrategy",
      "bufferBeforeMins",
      "bufferAfterMins",
      "minNoticeMins",
      "rollingWindowDays",
      "approvalRequired",
      "allowReschedule",
      "allowCancel",
      "collectCompanyName",
      "locationMode",
      "timezone",
      "isActive"
    ],
    "type": "object"
  },
  "BookingPageScope": {
    "enum": [
      "TENANT",
      "TEAM",
      "USER"
    ],
    "type": "string"
  },
  "BookingRequest": {
    "properties": {
      "approvedAt": {
        "nullable": true,
        "type": "string"
      },
      "cancellationReason": {
        "nullable": true,
        "type": "string"
      },
      "cancelledAt": {
        "nullable": true,
        "type": "string"
      },
      "conferenceProvider": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "endAt": {
        "type": "string"
      },
      "guestCompany": {
        "nullable": true,
        "type": "string"
      },
      "guestEmail": {
        "type": "string"
      },
      "guestName": {
        "type": "string"
      },
      "guestPhone": {
        "nullable": true,
        "type": "string"
      },
      "guestTimezone": {
        "type": "string"
      },
      "host": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "hostId": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "intakeResponses": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "locationMode": {
        "$ref": "#/components/schemas/MeetingLocationMode"
      },
      "locationName": {
        "nullable": true,
        "type": "string"
      },
      "meeting": {
        "nullable": true,
        "properties": {
          "approvalStatus": {
            "$ref": "#/components/schemas/MeetingApprovalStatus"
          },
          "endAt": {
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "startAt": {
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/MeetingStatus"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "title",
          "status",
          "approvalStatus",
          "startAt",
          "endAt"
        ],
        "type": "object"
      },
      "meetingId": {
        "nullable": true,
        "type": "string"
      },
      "meetingType": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug"
        ],
        "type": "object"
      },
      "meetingTypeId": {
        "nullable": true,
        "type": "string"
      },
      "meetingUrl": {
        "nullable": true,
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "page": {
        "properties": {
          "allowCancel": {
            "type": "boolean"
          },
          "allowReschedule": {
            "type": "boolean"
          },
          "id": {
            "type": "string"
          },
          "path": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "path",
          "title",
          "allowReschedule",
          "allowCancel"
        ],
        "type": "object"
      },
      "pageId": {
        "type": "string"
      },
      "rejectedAt": {
        "nullable": true,
        "type": "string"
      },
      "routingSnapshot": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "startAt": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/BookingRequestStatus"
      },
      "team": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "pageId",
      "status",
      "guestName",
      "guestEmail",
      "guestTimezone",
      "title",
      "startAt",
      "endAt",
      "locationMode"
    ],
    "type": "object"
  },
  "BookingRequestStatus": {
    "enum": [
      "PENDING_APPROVAL",
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
      "RESCHEDULED",
      "EXPIRED"
    ],
    "type": "string"
  },
  "BookingRoutingStrategy": {
    "enum": [
      "DIRECT_HOST",
      "ROUND_ROBIN",
      "LEAST_BUSY",
      "PRIORITY",
      "DEPARTMENT"
    ],
    "type": "string"
  },
  "BudgetAnalytics": {
    "properties": {
      "data": {
        "items": {
          "properties": {
            "actual": {
              "type": "number"
            },
            "currency": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "notes": {
              "nullable": true,
              "type": "string"
            },
            "planned": {
              "type": "number"
            },
            "project": {
              "properties": {
                "id": {
                  "type": "string"
                },
                "key": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "key",
                "name"
              ],
              "type": "object"
            },
            "utilizationPercent": {
              "type": "number"
            },
            "variance": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "currency",
            "planned",
            "actual",
            "project",
            "variance",
            "utilizationPercent"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "data",
      "total"
    ],
    "type": "object"
  },
  "BulkInviteUserInput": {
    "properties": {
      "email": {
        "type": "string"
      },
      "firstName": {
        "type": "string"
      },
      "lastName": {
        "type": "string"
      },
      "roleIds": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "email"
    ],
    "type": "object"
  },
  "BulkInviteUsersResponse": {
    "properties": {
      "created": {
        "type": "number"
      },
      "failed": {
        "type": "number"
      },
      "inviteDelivery": {
        "type": "string"
      },
      "results": {
        "items": {
          "properties": {
            "email": {
              "type": "string"
            },
            "message": {
              "type": "string"
            },
            "status": {
              "enum": [
                "CREATED",
                "UPDATED",
                "SKIPPED",
                "FAILED"
              ],
              "type": "string"
            },
            "userId": {
              "nullable": true,
              "type": "string"
            }
          },
          "required": [
            "email",
            "status",
            "userId",
            "message"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "skipped": {
        "type": "number"
      },
      "updated": {
        "type": "number"
      }
    },
    "required": [
      "created",
      "updated",
      "skipped",
      "failed",
      "inviteDelivery",
      "results"
    ],
    "type": "object"
  },
  "ComplianceJob": {
    "properties": {
      "approvedAt": {
        "nullable": true,
        "type": "string"
      },
      "approvedBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "approvedById": {
        "nullable": true,
        "type": "string"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "expiresAt": {
        "nullable": true,
        "type": "string"
      },
      "fileName": {
        "nullable": true,
        "type": "string"
      },
      "fileUrl": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "mimeType": {
        "nullable": true,
        "type": "string"
      },
      "parameters": {},
      "reason": {
        "nullable": true,
        "type": "string"
      },
      "requestedAt": {
        "type": "string"
      },
      "requestedBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "requestedById": {
        "nullable": true,
        "type": "string"
      },
      "result": {},
      "sizeBytes": {
        "nullable": true,
        "type": "number"
      },
      "startedAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ComplianceJobStatus"
      },
      "subjectId": {
        "nullable": true,
        "type": "string"
      },
      "subjectType": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/ComplianceJobType"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "type",
      "status",
      "requestedAt",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "ComplianceJobStatus": {
    "enum": [
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "QUEUED",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "EXPIRED"
    ],
    "type": "string"
  },
  "ComplianceJobType": {
    "enum": [
      "DATA_EXPORT",
      "DATA_DELETION",
      "RETENTION_PURGE"
    ],
    "type": "string"
  },
  "Conversation": {
    "properties": {
      "_count": {
        "properties": {
          "members": {
            "type": "number"
          },
          "messages": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isGroup": {
        "type": "boolean"
      },
      "members": {
        "items": {
          "$ref": "#/components/schemas/ConversationMember"
        },
        "type": "array"
      },
      "messages": {
        "items": {
          "$ref": "#/components/schemas/Message"
        },
        "type": "array"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "isGroup",
      "createdAt",
      "members"
    ],
    "type": "object"
  },
  "ConversationMember": {
    "properties": {
      "id": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId"
    ],
    "type": "object"
  },
  "CreatedApiKey": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ApiKey"
      },
      {
        "properties": {
          "token": {
            "type": "string"
          }
        },
        "required": [
          "token"
        ],
        "type": "object"
      }
    ]
  },
  "CustomField": {
    "properties": {
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "config": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "options": {
        "items": {
          "$ref": "#/components/schemas/CustomFieldOption"
        },
        "type": "array"
      },
      "projectId": {
        "nullable": true,
        "type": "string"
      },
      "required": {
        "type": "boolean"
      },
      "sortOrder": {
        "type": "number"
      },
      "tenantId": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/CustomFieldType"
      },
      "updatedAt": {
        "type": "string"
      },
      "workspaceId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "entityType",
      "name",
      "type",
      "required",
      "sortOrder",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "CustomFieldOption": {
    "properties": {
      "customFieldId": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "sortOrder": {
        "type": "number"
      },
      "value": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "customFieldId",
      "label",
      "value",
      "sortOrder"
    ],
    "type": "object"
  },
  "CustomFieldType": {
    "enum": [
      "TEXT",
      "LONG_TEXT",
      "NUMBER",
      "CURRENCY",
      "DATE",
      "DATETIME",
      "BOOLEAN",
      "SINGLE_SELECT",
      "MULTI_SELECT",
      "USER",
      "PROJECT",
      "TASK",
      "URL",
      "EMAIL",
      "PHONE",
      "JSON"
    ],
    "type": "string"
  },
  "CycleTimeAnalytics": {
    "properties": {
      "averageCycleTimeHours": {
        "type": "number"
      },
      "data": {
        "items": {
          "allOf": [
            {
              "properties": {
                "id": {
                  "type": "string"
                },
                "key": {
                  "type": "string"
                },
                "priority": {
                  "$ref": "#/components/schemas/TaskPriority"
                },
                "title": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "key",
                "title",
                "priority"
              ],
              "type": "object"
            },
            {
              "properties": {
                "completedAt": {
                  "nullable": true,
                  "type": "string"
                },
                "createdAt": {
                  "type": "string"
                },
                "cycleTimeHours": {
                  "nullable": true,
                  "type": "number"
                },
                "type": {
                  "type": "string"
                }
              },
              "required": [
                "createdAt"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "data",
      "averageCycleTimeHours",
      "total"
    ],
    "type": "object"
  },
  "DocumentFolder": {
    "properties": {
      "_count": {
        "properties": {
          "children": {
            "type": "number"
          },
          "documents": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "children": {
        "items": {
          "$ref": "#/components/schemas/DocumentFolder"
        },
        "type": "array"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "parentId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "DocumentPayload": {
    "properties": {
      "body": {
        "type": "string"
      },
      "changeNote": {
        "type": "string"
      },
      "documentType": {
        "type": "string"
      },
      "folderId": {
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "slug": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/DocumentStatus"
      },
      "summary": {
        "type": "string"
      },
      "tags": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "title": {
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "DocumentStatus": {
    "enum": [
      "DRAFT",
      "PUBLISHED",
      "ARCHIVED"
    ],
    "type": "string"
  },
  "DocumentVersion": {
    "properties": {
      "body": {
        "nullable": true,
        "type": "string"
      },
      "changeNote": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "documentId": {
        "type": "string"
      },
      "folderId": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "projectId": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "allOf": [
          {
            "$ref": "#/components/schemas/DocumentStatus"
          }
        ],
        "nullable": true
      },
      "summary": {
        "nullable": true,
        "type": "string"
      },
      "tags": {
        "items": {
          "type": "string"
        },
        "nullable": true,
        "type": "array"
      },
      "title": {
        "nullable": true,
        "type": "string"
      },
      "version": {
        "type": "number"
      },
      "visibility": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Visibility"
          }
        ],
        "nullable": true
      }
    },
    "required": [
      "id",
      "documentId",
      "version",
      "createdAt"
    ],
    "type": "object"
  },
  "FileAsset": {
    "properties": {
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "deletedAt": {
        "nullable": true,
        "type": "string"
      },
      "entityId": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "expiresAt": {
        "nullable": true,
        "type": "string"
      },
      "fileName": {
        "type": "string"
      },
      "fileUrl": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "metadata": {},
      "mimeType": {
        "nullable": true,
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "scope": {
        "type": "string"
      },
      "sizeBytes": {
        "nullable": true,
        "type": "number"
      },
      "storageKey": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "uploadedBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "uploadedById": {
        "nullable": true,
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "id",
      "tenantId",
      "scope",
      "entityType",
      "fileName",
      "fileUrl",
      "provider",
      "visibility",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "GlobalSearchResponse": {
    "allOf": [
      {
        "properties": {
          "data": {
            "items": {
              "$ref": "#/components/schemas/GlobalSearchResult"
            },
            "type": "array"
          },
          "limit": {
            "type": "number"
          },
          "page": {
            "type": "number"
          },
          "total": {
            "type": "number"
          },
          "totalPages": {
            "type": "number"
          }
        },
        "required": [
          "data",
          "page",
          "limit",
          "total",
          "totalPages"
        ],
        "type": "object"
      },
      {
        "properties": {
          "facets": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "query": {
            "properties": {
              "category": {
                "$ref": "#/components/schemas/SearchCategory"
              },
              "contextId": {
                "type": "string"
              },
              "contextType": {
                "type": "string"
              },
              "search": {
                "type": "string"
              }
            },
            "required": [
              "search",
              "category"
            ],
            "type": "object"
          }
        },
        "required": [
          "facets",
          "query"
        ],
        "type": "object"
      }
    ]
  },
  "GlobalSearchResult": {
    "properties": {
      "id": {
        "type": "string"
      },
      "metadata": {
        "additionalProperties": {},
        "type": "object"
      },
      "score": {
        "type": "number"
      },
      "subtitle": {
        "nullable": true,
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/GlobalSearchResultType"
      },
      "updatedAt": {
        "nullable": true,
        "type": "string"
      },
      "url": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "type",
      "title",
      "url",
      "score"
    ],
    "type": "object"
  },
  "GlobalSearchResultType": {
    "enum": [
      "PROJECT",
      "TASK",
      "FILE",
      "USER",
      "TEAM",
      "WORKSPACE",
      "MESSAGE"
    ],
    "type": "string"
  },
  "IdentitySecurityOverview": {
    "properties": {
      "loginHistory": {
        "items": {
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "email": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "ipAddress": {
              "nullable": true,
              "type": "string"
            },
            "method": {
              "type": "string"
            },
            "reason": {
              "nullable": true,
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "suspicious": {
              "type": "boolean"
            },
            "userAgent": {
              "nullable": true,
              "type": "string"
            }
          },
          "required": [
            "id",
            "email",
            "method",
            "status",
            "suspicious",
            "createdAt"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "mfa": {
        "properties": {
          "backupCodes": {
            "properties": {
              "remaining": {
                "type": "number"
              },
              "total": {
                "type": "number"
              }
            },
            "required": [
              "total",
              "remaining"
            ],
            "type": "object"
          },
          "enabled": {
            "type": "boolean"
          },
          "factors": {
            "items": {
              "properties": {
                "createdAt": {
                  "type": "string"
                },
                "enabledAt": {
                  "nullable": true,
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "label": {
                  "nullable": true,
                  "type": "string"
                },
                "lastUsedAt": {
                  "nullable": true,
                  "type": "string"
                },
                "status": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "type",
                "status",
                "createdAt"
              ],
              "type": "object"
            },
            "type": "array"
          }
        },
        "required": [
          "enabled",
          "factors",
          "backupCodes"
        ],
        "type": "object"
      },
      "trustedDevices": {
        "items": {
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "expiresAt": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "ipAddress": {
              "nullable": true,
              "type": "string"
            },
            "lastUsedAt": {
              "nullable": true,
              "type": "string"
            },
            "name": {
              "nullable": true,
              "type": "string"
            },
            "revokedAt": {
              "nullable": true,
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "userAgent": {
              "nullable": true,
              "type": "string"
            }
          },
          "required": [
            "id",
            "status",
            "expiresAt",
            "createdAt"
          ],
          "type": "object"
        },
        "type": "array"
      }
    },
    "required": [
      "mfa",
      "trustedDevices",
      "loginHistory"
    ],
    "type": "object"
  },
  "Integration": {
    "properties": {
      "_count": {
        "properties": {
          "logs": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "config": {},
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "enabled": {
        "type": "boolean"
      },
      "externalAccountId": {
        "nullable": true,
        "type": "string"
      },
      "hasSecrets": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "lastError": {
        "nullable": true,
        "type": "string"
      },
      "lastSyncAt": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "provider": {
        "$ref": "#/components/schemas/IntegrationProvider"
      },
      "scopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "secretKeys": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "$ref": "#/components/schemas/IntegrationStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "provider",
      "name",
      "scopes",
      "enabled",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "IntegrationLog": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "data": {},
      "eventType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "integrationId": {
        "type": "string"
      },
      "level": {
        "type": "string"
      },
      "message": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "integrationId",
      "level",
      "eventType",
      "message",
      "createdAt"
    ],
    "type": "object"
  },
  "IntegrationProvider": {
    "enum": [
      "GITHUB",
      "GITLAB",
      "BITBUCKET",
      "SLACK",
      "TEAMS",
      "GOOGLE",
      "MICROSOFT",
      "ZOOM",
      "STRIPE",
      "PAYPAL",
      "OPENAI",
      "ANTHROPIC",
      "ZAPIER",
      "CUSTOM"
    ],
    "type": "string"
  },
  "IntegrationStatus": {
    "enum": [
      "ACTIVE",
      "DISABLED",
      "ERROR",
      "REVOKED"
    ],
    "type": "string"
  },
  "InternalMailFolder": {
    "enum": [
      "INBOX",
      "SENT",
      "DRAFTS",
      "ARCHIVE",
      "DELETED",
      "JUNK",
      "SNOOZED"
    ],
    "type": "string"
  },
  "InternalMailFolderSummary": {
    "properties": {
      "counts": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "flagged": {
        "type": "number"
      },
      "pinned": {
        "type": "number"
      },
      "starred": {
        "type": "number"
      },
      "unread": {
        "type": "number"
      }
    },
    "required": [
      "counts",
      "unread",
      "starred",
      "flagged",
      "pinned"
    ],
    "type": "object"
  },
  "InternalMailMessage": {
    "properties": {
      "attachments": {},
      "bodyHtml": {
        "nullable": true,
        "type": "string"
      },
      "bodyText": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isDraft": {
        "type": "boolean"
      },
      "priority": {
        "$ref": "#/components/schemas/InternalMailPriority"
      },
      "recipients": {
        "items": {
          "$ref": "#/components/schemas/InternalMailRecipient"
        },
        "type": "array"
      },
      "sender": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "senderId": {
        "type": "string"
      },
      "sentAt": {
        "nullable": true,
        "type": "string"
      },
      "subject": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "threadId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "threadId",
      "senderId",
      "subject",
      "bodyText",
      "priority",
      "isDraft",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "InternalMailParticipant": {
    "properties": {
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "deletedAt": {
        "nullable": true,
        "type": "string"
      },
      "flaggedAt": {
        "nullable": true,
        "type": "string"
      },
      "folder": {
        "$ref": "#/components/schemas/InternalMailFolder"
      },
      "id": {
        "type": "string"
      },
      "lastReadMessageId": {
        "nullable": true,
        "type": "string"
      },
      "pinnedAt": {
        "nullable": true,
        "type": "string"
      },
      "readAt": {
        "nullable": true,
        "type": "string"
      },
      "snoozedUntil": {
        "nullable": true,
        "type": "string"
      },
      "starredAt": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "threadId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "threadId",
      "userId",
      "folder",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "InternalMailPriority": {
    "enum": [
      "NORMAL",
      "HIGH",
      "URGENT"
    ],
    "type": "string"
  },
  "InternalMailRecipient": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "deliveredAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "kind": {
        "$ref": "#/components/schemas/InternalMailRecipientKind"
      },
      "messageId": {
        "type": "string"
      },
      "readAt": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "messageId",
      "userId",
      "kind",
      "createdAt"
    ],
    "type": "object"
  },
  "InternalMailRecipientKind": {
    "enum": [
      "TO",
      "CC",
      "BCC"
    ],
    "type": "string"
  },
  "InternalMailThread": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "createdBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "createdById": {
        "type": "string"
      },
      "currentParticipant": {
        "$ref": "#/components/schemas/InternalMailParticipant"
      },
      "id": {
        "type": "string"
      },
      "lastMessageAt": {
        "type": "string"
      },
      "latestMessage": {
        "allOf": [
          {
            "$ref": "#/components/schemas/InternalMailMessage"
          }
        ],
        "nullable": true
      },
      "messageCount": {
        "type": "number"
      },
      "messages": {
        "items": {
          "$ref": "#/components/schemas/InternalMailMessage"
        },
        "type": "array"
      },
      "metadata": {},
      "participants": {
        "items": {
          "$ref": "#/components/schemas/InternalMailParticipant"
        },
        "type": "array"
      },
      "priority": {
        "$ref": "#/components/schemas/InternalMailPriority"
      },
      "recipientCount": {
        "type": "number"
      },
      "subject": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "unread": {
        "type": "boolean"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "subject",
      "createdById",
      "priority",
      "lastMessageAt",
      "createdAt",
      "updatedAt",
      "participants",
      "messages",
      "currentParticipant",
      "unread",
      "messageCount",
      "recipientCount"
    ],
    "type": "object"
  },
  "InternalMailbox": {
    "properties": {
      "address": {
        "type": "string"
      },
      "aliases": {
        "items": {
          "$ref": "#/components/schemas/InternalMailboxAlias"
        },
        "type": "array"
      },
      "canReceive": {
        "type": "boolean"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "displayName": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "localPart": {
        "type": "string"
      },
      "memberCount": {
        "type": "number"
      },
      "members": {
        "items": {
          "$ref": "#/components/schemas/InternalMailboxMember"
        },
        "type": "array"
      },
      "primaryAddress": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/InternalMailboxStatus"
      },
      "team": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/InternalMailboxType"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "type",
      "status",
      "displayName",
      "localPart",
      "address",
      "primaryAddress",
      "canReceive",
      "memberCount",
      "createdAt",
      "updatedAt",
      "aliases",
      "members"
    ],
    "type": "object"
  },
  "InternalMailboxAlias": {
    "properties": {
      "address": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isPrimary": {
        "type": "boolean"
      },
      "localPart": {
        "type": "string"
      },
      "mailboxId": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/InternalMailboxStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "mailboxId",
      "localPart",
      "address",
      "status",
      "isPrimary",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "InternalMailboxMember": {
    "properties": {
      "id": {
        "type": "string"
      },
      "role": {
        "$ref": "#/components/schemas/InternalMailboxMemberRole"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId",
      "role"
    ],
    "type": "object"
  },
  "InternalMailboxMemberRole": {
    "enum": [
      "OWNER",
      "MANAGER",
      "MEMBER"
    ],
    "type": "string"
  },
  "InternalMailboxStatus": {
    "enum": [
      "ACTIVE",
      "SUSPENDED",
      "ARCHIVED"
    ],
    "type": "string"
  },
  "InternalMailboxType": {
    "enum": [
      "USER",
      "SHARED",
      "TEAM",
      "SYSTEM"
    ],
    "type": "string"
  },
  "Meeting": {
    "properties": {
      "_count": {
        "properties": {
          "activities": {
            "type": "number"
          },
          "agendaItems": {
            "type": "number"
          },
          "attendees": {
            "type": "number"
          },
          "checklistItems": {
            "type": "number"
          },
          "comments": {
            "type": "number"
          },
          "decisions": {
            "type": "number"
          },
          "reminders": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "agendaItems": {
        "items": {
          "$ref": "#/components/schemas/MeetingAgendaItem"
        },
        "type": "array"
      },
      "aiEnabled": {
        "type": "boolean"
      },
      "aiSummary": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "approvalStatus": {
        "$ref": "#/components/schemas/MeetingApprovalStatus"
      },
      "approvedAt": {
        "nullable": true,
        "type": "string"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "attendees": {
        "items": {
          "$ref": "#/components/schemas/MeetingAttendee"
        },
        "type": "array"
      },
      "cancelledAt": {
        "nullable": true,
        "type": "string"
      },
      "cancelledReason": {
        "nullable": true,
        "type": "string"
      },
      "clientCompany": {
        "nullable": true,
        "type": "string"
      },
      "clientEmail": {
        "nullable": true,
        "type": "string"
      },
      "clientName": {
        "nullable": true,
        "type": "string"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "conferenceProvider": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "endAt": {
        "type": "string"
      },
      "host": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "hostId": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "liveNotes": {
        "nullable": true,
        "type": "string"
      },
      "liveNotesUpdatedAt": {
        "nullable": true,
        "type": "string"
      },
      "liveNotesUpdatedBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "liveNotesUpdatedById": {
        "nullable": true,
        "type": "string"
      },
      "liveNotesVersion": {
        "type": "number"
      },
      "locationMode": {
        "$ref": "#/components/schemas/MeetingLocationMode"
      },
      "locationName": {
        "nullable": true,
        "type": "string"
      },
      "meetingType": {
        "nullable": true,
        "properties": {
          "category": {
            "$ref": "#/components/schemas/MeetingTypeCategory"
          },
          "color": {
            "nullable": true,
            "type": "string"
          },
          "durationMins": {
            "type": "number"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "requiresApproval": {
            "type": "boolean"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "category",
          "durationMins",
          "requiresApproval"
        ],
        "type": "object"
      },
      "meetingTypeId": {
        "nullable": true,
        "type": "string"
      },
      "meetingUrl": {
        "nullable": true,
        "type": "string"
      },
      "project": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/ProjectStatus"
          }
        },
        "required": [
          "id",
          "key",
          "name",
          "status"
        ],
        "type": "object"
      },
      "projectId": {
        "nullable": true,
        "type": "string"
      },
      "recurrenceRule": {
        "nullable": true,
        "type": "string"
      },
      "reminders": {
        "items": {
          "$ref": "#/components/schemas/MeetingReminder"
        },
        "type": "array"
      },
      "runtimeState": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "sprint": {
        "nullable": true,
        "properties": {
          "completedAt": {
            "nullable": true,
            "type": "string"
          },
          "endDate": {
            "nullable": true,
            "type": "string"
          },
          "goal": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "startDate": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "sprintId": {
        "nullable": true,
        "type": "string"
      },
      "startAt": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/MeetingStatus"
      },
      "task": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "priority": {
            "$ref": "#/components/schemas/TaskPriority"
          },
          "status": {
            "$ref": "#/components/schemas/TaskStatus"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "title",
          "status",
          "priority"
        ],
        "type": "object"
      },
      "taskId": {
        "nullable": true,
        "type": "string"
      },
      "team": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "id",
      "tenantId",
      "title",
      "status",
      "visibility",
      "approvalStatus",
      "startAt",
      "endAt",
      "timezone",
      "locationMode",
      "aiEnabled"
    ],
    "type": "object"
  },
  "MeetingActivity": {
    "properties": {
      "action": {
        "type": "string"
      },
      "actor": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "actorId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "meetingId": {
        "type": "string"
      },
      "newValue": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "oldValue": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      }
    },
    "required": [
      "id",
      "meetingId",
      "action",
      "createdAt"
    ],
    "type": "object"
  },
  "MeetingAdminAnalytics": {
    "properties": {
      "bookings": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "byStatus": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "hostUtilization": {
        "items": {
          "properties": {
            "completed": {
              "type": "number"
            },
            "completionRate": {
              "type": "number"
            },
            "host": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/UserSummary"
                }
              ],
              "nullable": true
            },
            "hostId": {
              "type": "string"
            },
            "hours": {
              "type": "number"
            },
            "meetings": {
              "type": "number"
            }
          },
          "required": [
            "hostId",
            "host",
            "meetings",
            "completed",
            "hours",
            "completionRate"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "range": {
        "properties": {
          "from": {
            "type": "string"
          },
          "to": {
            "type": "string"
          }
        },
        "required": [
          "from",
          "to"
        ],
        "type": "object"
      },
      "totals": {
        "properties": {
          "booked": {
            "type": "number"
          },
          "cancellationRate": {
            "type": "number"
          },
          "cancelled": {
            "type": "number"
          },
          "completed": {
            "type": "number"
          },
          "completionRate": {
            "type": "number"
          },
          "convertedActionItems": {
            "type": "number"
          },
          "live": {
            "type": "number"
          },
          "meetingToTaskConversion": {
            "type": "number"
          },
          "noShowRate": {
            "type": "number"
          },
          "noShows": {
            "type": "number"
          },
          "overdueFollowUps": {
            "type": "number"
          },
          "scheduled": {
            "type": "number"
          },
          "totalActionItems": {
            "type": "number"
          }
        },
        "required": [
          "booked",
          "completed",
          "noShows",
          "cancelled",
          "live",
          "scheduled",
          "completionRate",
          "noShowRate",
          "cancellationRate",
          "meetingToTaskConversion",
          "convertedActionItems",
          "totalActionItems",
          "overdueFollowUps"
        ],
        "type": "object"
      }
    },
    "required": [
      "range",
      "totals",
      "byStatus",
      "bookings",
      "hostUtilization"
    ],
    "type": "object"
  },
  "MeetingAdminOverview": {
    "properties": {
      "aiUsage": {
        "$ref": "#/components/schemas/MeetingAiUsageSummary"
      },
      "analytics": {
        "$ref": "#/components/schemas/MeetingAdminAnalytics"
      },
      "integrationHealth": {
        "$ref": "#/components/schemas/MeetingIntegrationHealth"
      },
      "permissions": {
        "properties": {
          "canConnectCalendar": {
            "type": "boolean"
          },
          "canConnectWhatsApp": {
            "type": "boolean"
          },
          "canCreateBookingLinks": {
            "type": "boolean"
          },
          "canManagePolicy": {
            "type": "boolean"
          },
          "canUseMeetingAi": {
            "type": "boolean"
          }
        },
        "required": [
          "canManagePolicy",
          "canCreateBookingLinks",
          "canConnectCalendar",
          "canConnectWhatsApp",
          "canUseMeetingAi"
        ],
        "type": "object"
      },
      "policy": {
        "$ref": "#/components/schemas/MeetingPolicy"
      },
      "recentAudit": {
        "items": {
          "properties": {
            "action": {
              "type": "string"
            },
            "createdAt": {
              "type": "string"
            },
            "entityId": {
              "nullable": true,
              "type": "string"
            },
            "entityType": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "ipAddress": {
              "nullable": true,
              "type": "string"
            },
            "userAgent": {
              "nullable": true,
              "type": "string"
            }
          },
          "required": [
            "id",
            "action",
            "entityType",
            "createdAt"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "reminderDelivery": {
        "$ref": "#/components/schemas/MeetingReminderDeliverySummary"
      }
    },
    "required": [
      "policy",
      "permissions",
      "analytics",
      "integrationHealth",
      "reminderDelivery",
      "aiUsage",
      "recentAudit"
    ],
    "type": "object"
  },
  "MeetingAgendaItem": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "durationMins": {
        "nullable": true,
        "type": "number"
      },
      "id": {
        "type": "string"
      },
      "meetingId": {
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "owner": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "sortOrder": {
        "type": "number"
      },
      "status": {
        "$ref": "#/components/schemas/MeetingAgendaStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "title",
      "status",
      "sortOrder"
    ],
    "type": "object"
  },
  "MeetingAgendaStatus": {
    "enum": [
      "OPEN",
      "IN_PROGRESS",
      "DONE",
      "SKIPPED"
    ],
    "type": "string"
  },
  "MeetingAiActionItem": {
    "properties": {
      "convertedTaskId": {
        "nullable": true,
        "type": "string"
      },
      "convertedTaskKey": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ownerEmail": {
        "nullable": true,
        "type": "string"
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "priority": {
        "$ref": "#/components/schemas/TaskPriority"
      },
      "projectId": {
        "nullable": true,
        "type": "string"
      },
      "reminderId": {
        "nullable": true,
        "type": "string"
      },
      "sprintId": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "enum": [
          "OPEN",
          "CONVERTED",
          "DONE",
          "DISMISSED"
        ],
        "type": "string"
      },
      "taskId": {
        "nullable": true,
        "type": "string"
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "title"
    ],
    "type": "object"
  },
  "MeetingAiState": {
    "properties": {
      "actionItems": {
        "items": {
          "$ref": "#/components/schemas/MeetingAiActionItem"
        },
        "type": "array"
      },
      "enabled": {
        "type": "boolean"
      },
      "health": {
        "properties": {
          "convertedActionItems": {
            "type": "number"
          },
          "effectivenessScore": {
            "nullable": true,
            "type": "number"
          },
          "hasAgenda": {
            "type": "boolean"
          },
          "hasNotes": {
            "type": "boolean"
          },
          "missingDueDates": {
            "type": "number"
          },
          "missingOwners": {
            "type": "number"
          },
          "openActionItems": {
            "type": "number"
          }
        },
        "required": [
          "hasAgenda",
          "hasNotes",
          "openActionItems",
          "convertedActionItems",
          "missingOwners",
          "missingDueDates"
        ],
        "type": "object"
      },
      "links": {
        "properties": {
          "clientCompany": {
            "nullable": true,
            "type": "string"
          },
          "clientEmail": {
            "nullable": true,
            "type": "string"
          },
          "clientName": {
            "nullable": true,
            "type": "string"
          },
          "projectId": {
            "nullable": true,
            "type": "string"
          },
          "sprintId": {
            "nullable": true,
            "type": "string"
          },
          "taskId": {
            "nullable": true,
            "type": "string"
          },
          "teamId": {
            "nullable": true,
            "type": "string"
          }
        },
        "type": "object"
      },
      "meetingId": {
        "type": "string"
      },
      "summary": {
        "additionalProperties": {},
        "type": "object"
      }
    },
    "required": [
      "meetingId",
      "enabled",
      "links",
      "summary",
      "actionItems",
      "health"
    ],
    "type": "object"
  },
  "MeetingAiUsageSummary": {
    "properties": {
      "byType": {
        "items": {
          "properties": {
            "estimatedCost": {
              "type": "number"
            },
            "requestType": {
              "type": "string"
            },
            "requests": {
              "type": "number"
            },
            "status": {
              "type": "string"
            },
            "totalTokens": {
              "type": "number"
            }
          },
          "required": [
            "requestType",
            "status",
            "requests",
            "totalTokens",
            "estimatedCost"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "recentFailures": {
        "items": {
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "error": {
              "nullable": true,
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "model": {
              "type": "string"
            },
            "provider": {
              "type": "string"
            },
            "requestType": {
              "nullable": true,
              "type": "string"
            },
            "status": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "provider",
            "model",
            "status",
            "createdAt"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "totals": {
        "properties": {
          "estimatedCost": {
            "type": "number"
          },
          "inputTokens": {
            "type": "number"
          },
          "outputTokens": {
            "type": "number"
          },
          "requests": {
            "type": "number"
          },
          "totalTokens": {
            "type": "number"
          }
        },
        "required": [
          "requests",
          "inputTokens",
          "outputTokens",
          "totalTokens",
          "estimatedCost"
        ],
        "type": "object"
      }
    },
    "required": [
      "totals",
      "byType",
      "recentFailures"
    ],
    "type": "object"
  },
  "MeetingApprovalStatus": {
    "enum": [
      "NOT_REQUIRED",
      "PENDING",
      "APPROVED",
      "REJECTED"
    ],
    "type": "string"
  },
  "MeetingAttendee": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "email": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isExternal": {
        "type": "boolean"
      },
      "meetingId": {
        "type": "string"
      },
      "name": {
        "nullable": true,
        "type": "string"
      },
      "responseNote": {
        "nullable": true,
        "type": "string"
      },
      "role": {
        "$ref": "#/components/schemas/MeetingAttendeeRole"
      },
      "status": {
        "$ref": "#/components/schemas/MeetingAttendeeStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "role",
      "status",
      "isExternal"
    ],
    "type": "object"
  },
  "MeetingAttendeeRole": {
    "enum": [
      "HOST",
      "CO_HOST",
      "REQUIRED",
      "OPTIONAL",
      "GUEST",
      "OBSERVER"
    ],
    "type": "string"
  },
  "MeetingAttendeeStatus": {
    "enum": [
      "INVITED",
      "ACCEPTED",
      "DECLINED",
      "TENTATIVE",
      "ATTENDED",
      "NO_SHOW",
      "REMOVED"
    ],
    "type": "string"
  },
  "MeetingAvailability": {
    "properties": {
      "blackouts": {
        "items": {
          "$ref": "#/components/schemas/MeetingBlackoutWindow"
        },
        "type": "array"
      },
      "windows": {
        "items": {
          "$ref": "#/components/schemas/MeetingAvailabilityWindow"
        },
        "type": "array"
      }
    },
    "required": [
      "windows",
      "blackouts"
    ],
    "type": "object"
  },
  "MeetingAvailabilityScope": {
    "enum": [
      "USER",
      "TEAM",
      "TENANT"
    ],
    "type": "string"
  },
  "MeetingAvailabilityWindow": {
    "properties": {
      "capacity": {
        "type": "number"
      },
      "createdAt": {
        "type": "string"
      },
      "dayOfWeek": {
        "type": "number"
      },
      "endTime": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "label": {
        "nullable": true,
        "type": "string"
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "scope": {
        "$ref": "#/components/schemas/MeetingAvailabilityScope"
      },
      "startTime": {
        "type": "string"
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "scope",
      "dayOfWeek",
      "startTime",
      "endTime",
      "timezone",
      "capacity",
      "isActive"
    ],
    "type": "object"
  },
  "MeetingBlackoutWindow": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "endAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "reason": {
        "nullable": true,
        "type": "string"
      },
      "startAt": {
        "type": "string"
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "title",
      "startAt",
      "endAt",
      "timezone"
    ],
    "type": "object"
  },
  "MeetingChecklistItem": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "dueAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isDone": {
        "type": "boolean"
      },
      "meetingId": {
        "type": "string"
      },
      "metadata": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "owner": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "sortOrder": {
        "type": "number"
      },
      "taskId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "title",
      "isDone",
      "sortOrder",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "MeetingComment": {
    "properties": {
      "author": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "authorId": {
        "type": "string"
      },
      "body": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "meetingId": {
        "type": "string"
      },
      "metadata": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "authorId",
      "body",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "MeetingConferenceProvider": {
    "enum": [
      "NONE",
      "MANUAL",
      "GOOGLE_CALENDAR",
      "GOOGLE_MEET",
      "MICROSOFT_TEAMS",
      "ZOOM",
      "CUSTOM_URL"
    ],
    "type": "string"
  },
  "MeetingDecision": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "dueAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "impact": {
        "nullable": true,
        "type": "string"
      },
      "meetingId": {
        "type": "string"
      },
      "metadata": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "owner": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/MeetingDecisionStatus"
      },
      "summary": {
        "nullable": true,
        "type": "string"
      },
      "taskId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "title",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "MeetingDecisionStatus": {
    "enum": [
      "OPEN",
      "APPROVED",
      "REJECTED",
      "DEFERRED",
      "SUPERSEDED"
    ],
    "type": "string"
  },
  "MeetingIntegrationHealth": {
    "properties": {
      "providers": {
        "additionalProperties": {
          "properties": {
            "connected": {
              "type": "boolean"
            },
            "integrationId": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "provider": {
              "type": "string"
            },
            "scopes": {
              "items": {
                "type": "string"
              },
              "type": "array"
            }
          },
          "required": [
            "connected"
          ],
          "type": "object"
        },
        "type": "object"
      },
      "queue": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "settings": {
        "$ref": "#/components/schemas/MeetingPolicy"
      },
      "webhookErrors": {
        "items": {
          "properties": {
            "attempts": {
              "type": "number"
            },
            "createdAt": {
              "type": "string"
            },
            "eventType": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "lastError": {
              "nullable": true,
              "type": "string"
            },
            "responseStatus": {
              "nullable": true,
              "type": "number"
            },
            "status": {
              "type": "string"
            },
            "webhook": {
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name",
                "enabled"
              ],
              "type": "object"
            }
          },
          "required": [
            "id",
            "eventType",
            "status",
            "attempts",
            "createdAt"
          ],
          "type": "object"
        },
        "type": "array"
      }
    },
    "required": [
      "settings",
      "providers",
      "queue",
      "webhookErrors"
    ],
    "type": "object"
  },
  "MeetingIntegrationSettings": {
    "properties": {
      "aiMeetingProcessingEnabled": {
        "type": "boolean"
      },
      "allowExternalGuests": {
        "type": "boolean"
      },
      "allowedConferenceProviders": {
        "items": {
          "$ref": "#/components/schemas/MeetingConferenceProvider"
        },
        "type": "array"
      },
      "calendarConnectionPermissions": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "calendarSyncEnabled": {
        "type": "boolean"
      },
      "createdAt": {
        "type": "string"
      },
      "defaultConferenceProvider": {
        "$ref": "#/components/schemas/MeetingConferenceProvider"
      },
      "defaultMeetingVisibility": {
        "$ref": "#/components/schemas/Visibility"
      },
      "defaultReminderChannels": {
        "items": {
          "$ref": "#/components/schemas/MeetingReminderChannel"
        },
        "type": "array"
      },
      "emailRemindersEnabled": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "manualLinkPolicy": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "maxAdvanceBookingDays": {
        "type": "number"
      },
      "maxMeetingDurationMins": {
        "type": "number"
      },
      "minBookingNoticeMins": {
        "type": "number"
      },
      "policyConfig": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "providerConfig": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "publicBookingCreatorPermissions": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "publicBookingEnabled": {
        "type": "boolean"
      },
      "requireApprovalForExternalGuests": {
        "type": "boolean"
      },
      "requireApprovedWhatsappTemplates": {
        "type": "boolean"
      },
      "smsRemindersEnabled": {
        "type": "boolean"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "webhookEventsEnabled": {
        "type": "boolean"
      },
      "whatsappConnectionPermissions": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "whatsappRemindersEnabled": {
        "type": "boolean"
      }
    },
    "required": [
      "id",
      "tenantId",
      "defaultConferenceProvider",
      "allowedConferenceProviders",
      "defaultReminderChannels",
      "calendarSyncEnabled",
      "emailRemindersEnabled",
      "whatsappRemindersEnabled",
      "smsRemindersEnabled",
      "webhookEventsEnabled",
      "requireApprovedWhatsappTemplates"
    ],
    "type": "object"
  },
  "MeetingIntegrationStatus": {
    "properties": {
      "providers": {
        "additionalProperties": {
          "properties": {
            "connected": {
              "type": "boolean"
            },
            "integrationId": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "provider": {
              "type": "string"
            },
            "scopes": {
              "items": {
                "type": "string"
              },
              "type": "array"
            }
          },
          "required": [
            "connected"
          ],
          "type": "object"
        },
        "type": "object"
      },
      "queue": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "settings": {
        "$ref": "#/components/schemas/MeetingIntegrationSettings"
      },
      "supportedEvents": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "settings",
      "providers",
      "queue",
      "supportedEvents"
    ],
    "type": "object"
  },
  "MeetingLocationMode": {
    "enum": [
      "IN_PERSON",
      "ONLINE",
      "HYBRID",
      "PHONE",
      "TBD"
    ],
    "type": "string"
  },
  "MeetingPolicy": {
    "allOf": [
      {
        "properties": {
          "aiMeetingProcessingEnabled": {
            "type": "boolean"
          },
          "allowExternalGuests": {
            "type": "boolean"
          },
          "calendarConnectionPermissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "defaultMeetingVisibility": {
            "$ref": "#/components/schemas/Visibility"
          },
          "id": {
            "type": "string"
          },
          "maxAdvanceBookingDays": {
            "type": "number"
          },
          "maxMeetingDurationMins": {
            "type": "number"
          },
          "minBookingNoticeMins": {
            "type": "number"
          },
          "publicBookingCreatorPermissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "publicBookingEnabled": {
            "type": "boolean"
          },
          "requireApprovalForExternalGuests": {
            "type": "boolean"
          },
          "tenantId": {
            "type": "string"
          },
          "whatsappConnectionPermissions": {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
        },
        "required": [
          "id",
          "tenantId",
          "publicBookingEnabled",
          "publicBookingCreatorPermissions",
          "calendarConnectionPermissions",
          "whatsappConnectionPermissions",
          "defaultMeetingVisibility",
          "allowExternalGuests",
          "requireApprovalForExternalGuests",
          "maxAdvanceBookingDays",
          "minBookingNoticeMins",
          "maxMeetingDurationMins",
          "aiMeetingProcessingEnabled"
        ],
        "type": "object"
      },
      {
        "properties": {
          "policyConfig": {
            "additionalProperties": {},
            "nullable": true,
            "type": "object"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "type": "object"
      }
    ]
  },
  "MeetingReminder": {
    "properties": {
      "attendeeId": {
        "nullable": true,
        "type": "string"
      },
      "channel": {
        "$ref": "#/components/schemas/MeetingReminderChannel"
      },
      "createdAt": {
        "type": "string"
      },
      "destination": {
        "nullable": true,
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "meetingId": {
        "type": "string"
      },
      "offsetMinutes": {
        "type": "number"
      },
      "scheduledFor": {
        "type": "string"
      },
      "sentAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/MeetingReminderStatus"
      },
      "templateKey": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "channel",
      "offsetMinutes",
      "scheduledFor",
      "status"
    ],
    "type": "object"
  },
  "MeetingReminderChannel": {
    "enum": [
      "IN_APP",
      "EMAIL",
      "WHATSAPP",
      "SMS",
      "WEBHOOK"
    ],
    "type": "string"
  },
  "MeetingReminderDeliverySummary": {
    "properties": {
      "byChannel": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "byStatus": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "failedRecent": {
        "items": {
          "$ref": "#/components/schemas/MeetingReminderJob"
        },
        "type": "array"
      }
    },
    "required": [
      "byStatus",
      "byChannel",
      "failedRecent"
    ],
    "type": "object"
  },
  "MeetingReminderJob": {
    "properties": {
      "attempts": {
        "type": "number"
      },
      "channel": {
        "$ref": "#/components/schemas/MeetingReminderChannel"
      },
      "createdAt": {
        "type": "string"
      },
      "deadLetterAt": {
        "nullable": true,
        "type": "string"
      },
      "destination": {
        "nullable": true,
        "type": "string"
      },
      "failedAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastError": {
        "nullable": true,
        "type": "string"
      },
      "lockedAt": {
        "nullable": true,
        "type": "string"
      },
      "maxAttempts": {
        "type": "number"
      },
      "meeting": {
        "properties": {
          "conferenceProvider": {
            "nullable": true,
            "type": "string"
          },
          "endAt": {
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "meetingUrl": {
            "nullable": true,
            "type": "string"
          },
          "startAt": {
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/MeetingStatus"
          },
          "tenantId": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "tenantId",
          "title",
          "status",
          "startAt",
          "endAt"
        ],
        "type": "object"
      },
      "meetingId": {
        "type": "string"
      },
      "nextAttemptAt": {
        "type": "string"
      },
      "provider": {
        "nullable": true,
        "type": "string"
      },
      "reminder": {
        "nullable": true,
        "properties": {
          "attendeeId": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "offsetMinutes": {
            "type": "number"
          },
          "templateKey": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "offsetMinutes"
        ],
        "type": "object"
      },
      "reminderId": {
        "nullable": true,
        "type": "string"
      },
      "scheduledFor": {
        "type": "string"
      },
      "sentAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/MeetingReminderJobStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "meetingId",
      "channel",
      "status",
      "scheduledFor",
      "attempts",
      "maxAttempts",
      "nextAttemptAt"
    ],
    "type": "object"
  },
  "MeetingReminderJobStatus": {
    "enum": [
      "QUEUED",
      "PROCESSING",
      "SENT",
      "FAILED",
      "CANCELLED",
      "DEAD_LETTER"
    ],
    "type": "string"
  },
  "MeetingReminderStatus": {
    "enum": [
      "PENDING",
      "SCHEDULED",
      "SENT",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "MeetingStatus": {
    "enum": [
      "SCHEDULED",
      "LIVE",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
      "ARCHIVED"
    ],
    "type": "string"
  },
  "MeetingType": {
    "properties": {
      "_count": {
        "properties": {
          "meetings": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "bufferAfterMins": {
        "type": "number"
      },
      "bufferBeforeMins": {
        "type": "number"
      },
      "category": {
        "$ref": "#/components/schemas/MeetingTypeCategory"
      },
      "color": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "defaultAgenda": {
        "items": {
          "type": "string"
        },
        "nullable": true,
        "type": "array"
      },
      "defaultReminderMins": {
        "items": {
          "type": "number"
        },
        "type": "array"
      },
      "defaultVisibility": {
        "$ref": "#/components/schemas/Visibility"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "durationMins": {
        "type": "number"
      },
      "icon": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "locationMode": {
        "$ref": "#/components/schemas/MeetingLocationMode"
      },
      "name": {
        "type": "string"
      },
      "requiresApproval": {
        "type": "boolean"
      },
      "slug": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "slug",
      "category",
      "durationMins",
      "bufferBeforeMins",
      "bufferAfterMins",
      "locationMode",
      "defaultVisibility",
      "requiresApproval",
      "defaultReminderMins",
      "isActive"
    ],
    "type": "object"
  },
  "MeetingTypeCategory": {
    "enum": [
      "INTERNAL",
      "CLIENT",
      "SALES",
      "SUPPORT",
      "SPRINT",
      "STANDUP",
      "REVIEW",
      "INTERVIEW",
      "TRAINING",
      "CUSTOM"
    ],
    "type": "string"
  },
  "MeetingWorkspace": {
    "properties": {
      "activity": {
        "items": {
          "$ref": "#/components/schemas/MeetingActivity"
        },
        "type": "array"
      },
      "agendaItems": {
        "items": {
          "$ref": "#/components/schemas/MeetingAgendaItem"
        },
        "type": "array"
      },
      "attendees": {
        "items": {
          "$ref": "#/components/schemas/MeetingAttendee"
        },
        "type": "array"
      },
      "checklist": {
        "items": {
          "$ref": "#/components/schemas/MeetingChecklistItem"
        },
        "type": "array"
      },
      "comments": {
        "items": {
          "$ref": "#/components/schemas/MeetingComment"
        },
        "type": "array"
      },
      "decisions": {
        "items": {
          "$ref": "#/components/schemas/MeetingDecision"
        },
        "type": "array"
      },
      "files": {
        "items": {
          "$ref": "#/components/schemas/FileAsset"
        },
        "type": "array"
      },
      "live": {
        "properties": {
          "notes": {
            "type": "string"
          },
          "runtimeState": {
            "additionalProperties": {},
            "type": "object"
          },
          "updatedAt": {
            "nullable": true,
            "type": "string"
          },
          "updatedBy": {
            "allOf": [
              {
                "$ref": "#/components/schemas/UserSummary"
              }
            ],
            "nullable": true
          },
          "version": {
            "type": "number"
          }
        },
        "required": [
          "notes",
          "version",
          "runtimeState"
        ],
        "type": "object"
      },
      "meeting": {
        "$ref": "#/components/schemas/Meeting"
      },
      "metrics": {
        "properties": {
          "absent": {
            "type": "number"
          },
          "agendaItems": {
            "type": "number"
          },
          "attendees": {
            "type": "number"
          },
          "checklist": {
            "type": "number"
          },
          "checklistDone": {
            "type": "number"
          },
          "checklistProgress": {
            "type": "number"
          },
          "completedRelatedTasks": {
            "type": "number"
          },
          "decisions": {
            "type": "number"
          },
          "files": {
            "type": "number"
          },
          "openDecisions": {
            "type": "number"
          },
          "present": {
            "type": "number"
          },
          "relatedTasks": {
            "type": "number"
          },
          "reminders": {
            "type": "number"
          }
        },
        "required": [
          "attendees",
          "present",
          "absent",
          "agendaItems",
          "decisions",
          "openDecisions",
          "checklist",
          "checklistDone",
          "checklistProgress",
          "relatedTasks",
          "completedRelatedTasks",
          "files",
          "reminders"
        ],
        "type": "object"
      },
      "relatedTasks": {
        "items": {
          "$ref": "#/components/schemas/Task"
        },
        "type": "array"
      },
      "reminderJobs": {
        "items": {
          "$ref": "#/components/schemas/MeetingReminderJob"
        },
        "type": "array"
      },
      "reminders": {
        "items": {
          "$ref": "#/components/schemas/MeetingReminder"
        },
        "type": "array"
      }
    },
    "required": [
      "meeting",
      "live",
      "attendees",
      "agendaItems",
      "comments",
      "decisions",
      "checklist",
      "files",
      "relatedTasks",
      "reminders",
      "reminderJobs",
      "activity",
      "metrics"
    ],
    "type": "object"
  },
  "Message": {
    "properties": {
      "attachments": {
        "oneOf": [
          {
            "items": {
              "$ref": "#/components/schemas/MessageAttachment"
            },
            "type": "array"
          },
          {}
        ]
      },
      "body": {
        "nullable": true,
        "type": "string"
      },
      "conversationId": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "forwardedFromMessageId": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "metadata": {},
      "parentMessageId": {
        "nullable": true,
        "type": "string"
      },
      "pinnedAt": {
        "nullable": true,
        "type": "string"
      },
      "pinnedById": {
        "nullable": true,
        "type": "string"
      },
      "reactions": {
        "items": {
          "$ref": "#/components/schemas/MessageReaction"
        },
        "type": "array"
      },
      "readReceipts": {
        "items": {
          "$ref": "#/components/schemas/MessageReadReceipt"
        },
        "type": "array"
      },
      "sender": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "senderId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "conversationId",
      "senderId",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "MessageAttachment": {
    "properties": {
      "id": {
        "type": "string"
      },
      "kind": {
        "enum": [
          "image",
          "video",
          "audio",
          "file",
          "link"
        ],
        "type": "string"
      },
      "mimeType": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "sizeBytes": {
        "nullable": true,
        "type": "number"
      },
      "url": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "url"
    ],
    "type": "object"
  },
  "MessageReaction": {
    "properties": {
      "emoji": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "messageId": {
        "type": "string"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId",
      "emoji"
    ],
    "type": "object"
  },
  "MessageReadReceipt": {
    "properties": {
      "id": {
        "type": "string"
      },
      "messageId": {
        "type": "string"
      },
      "readAt": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId",
      "readAt"
    ],
    "type": "object"
  },
  "MfaChallengeResponse": {
    "properties": {
      "expiresAt": {
        "type": "string"
      },
      "message": {
        "type": "string"
      },
      "methods": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "mfaToken": {
        "type": "string"
      },
      "requiresMfa": {
        "enum": [
          true
        ],
        "type": "boolean"
      }
    },
    "required": [
      "requiresMfa",
      "mfaToken",
      "methods",
      "expiresAt",
      "message"
    ],
    "type": "object"
  },
  "ModuleStatus": {
    "properties": {
      "module": {
        "type": "string"
      },
      "status": {
        "type": "string"
      }
    },
    "required": [
      "status"
    ],
    "type": "object"
  },
  "Notification": {
    "properties": {
      "body": {
        "nullable": true,
        "type": "string"
      },
      "channel": {
        "$ref": "#/components/schemas/NotificationChannel"
      },
      "createdAt": {
        "type": "string"
      },
      "data": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "deliveries": {
        "items": {
          "$ref": "#/components/schemas/NotificationDelivery"
        },
        "type": "array"
      },
      "id": {
        "type": "string"
      },
      "readAt": {
        "nullable": true,
        "type": "string"
      },
      "template": {
        "nullable": true,
        "properties": {
          "channel": {
            "$ref": "#/components/schemas/NotificationChannel"
          },
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "name",
          "channel"
        ],
        "type": "object"
      },
      "templateId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "userId",
      "title",
      "channel",
      "createdAt"
    ],
    "type": "object"
  },
  "NotificationChannel": {
    "enum": [
      "IN_APP",
      "EMAIL",
      "SMS",
      "PUSH",
      "WEBHOOK"
    ],
    "type": "string"
  },
  "NotificationDelivery": {
    "properties": {
      "attempts": {
        "type": "number"
      },
      "channel": {
        "$ref": "#/components/schemas/NotificationChannel"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastError": {
        "nullable": true,
        "type": "string"
      },
      "nextAttemptAt": {
        "nullable": true,
        "type": "string"
      },
      "provider": {
        "nullable": true,
        "type": "string"
      },
      "providerMessageId": {
        "nullable": true,
        "type": "string"
      },
      "sentAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/NotificationDeliveryStatus"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "channel",
      "status",
      "attempts",
      "createdAt"
    ],
    "type": "object"
  },
  "NotificationDeliveryStatus": {
    "enum": [
      "PENDING",
      "SENT",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "NotificationPreference": {
    "properties": {
      "channel": {
        "$ref": "#/components/schemas/NotificationChannel"
      },
      "enabled": {
        "type": "boolean"
      },
      "id": {
        "nullable": true,
        "type": "string"
      },
      "locked": {
        "type": "boolean"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId",
      "channel",
      "enabled"
    ],
    "type": "object"
  },
  "OmoFlowRuntimeActionItem": {
    "properties": {
      "assigneeEmail": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "dueDate": {
        "type": "string"
      },
      "priority": {
        "$ref": "#/components/schemas/TaskPriority"
      },
      "storyPoints": {
        "type": "number"
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "OmoFlowRuntimeEvent": {
    "properties": {
      "actionItems": {
        "items": {
          "$ref": "#/components/schemas/OmoFlowRuntimeActionItem"
        },
        "type": "array"
      },
      "agendaItems": {
        "items": {},
        "type": "array"
      },
      "eventId": {
        "type": "string"
      },
      "eventType": {
        "type": "string"
      },
      "meeting": {
        "properties": {
          "endedAt": {
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "recordingUrl": {
            "type": "string"
          },
          "startedAt": {
            "type": "string"
          },
          "summary": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "transcriptUrl": {
            "type": "string"
          }
        },
        "type": "object"
      },
      "payload": {},
      "projectId": {
        "type": "string"
      }
    },
    "required": [
      "eventId",
      "eventType"
    ],
    "type": "object"
  },
  "OmoFlowRuntimeResult": {
    "properties": {
      "eventId": {
        "type": "string"
      },
      "idempotent": {
        "type": "boolean"
      },
      "integration": {
        "$ref": "#/components/schemas/Integration"
      },
      "mappedTasks": {
        "items": {
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "description": {
              "nullable": true,
              "type": "string"
            },
            "dueDate": {
              "nullable": true,
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "key": {
              "type": "string"
            },
            "priority": {
              "$ref": "#/components/schemas/TaskPriority"
            },
            "projectId": {
              "type": "string"
            },
            "status": {
              "$ref": "#/components/schemas/TaskStatus"
            },
            "storyPoints": {
              "nullable": true,
              "type": "number"
            },
            "title": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "projectId",
            "key",
            "title",
            "status",
            "priority"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "message": {
        "type": "string"
      }
    },
    "required": [
      "idempotent",
      "eventId",
      "integration",
      "mappedTasks",
      "message"
    ],
    "type": "object"
  },
  "Permission": {
    "properties": {
      "action": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "subject": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "action",
      "subject"
    ],
    "type": "object"
  },
  "PlatformAdminGrant": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "grantedById": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "level": {
        "$ref": "#/components/schemas/PlatformAdminLevel"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "revokedAt": {
        "nullable": true,
        "type": "string"
      },
      "revokedById": {
        "nullable": true,
        "type": "string"
      },
      "scopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "$ref": "#/components/schemas/PlatformAdminStatus"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          },
          {
            "properties": {
              "tenant": {
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "slug": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "slug"
                ],
                "type": "object"
              },
              "tenantId": {
                "type": "string"
              }
            },
            "required": [
              "tenantId",
              "tenant"
            ],
            "type": "object"
          }
        ]
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId",
      "level",
      "status",
      "scopes",
      "createdAt",
      "updatedAt",
      "user"
    ],
    "type": "object"
  },
  "PlatformAdminLevel": {
    "enum": [
      "OWNER",
      "ADMIN",
      "SUPPORT",
      "AUDITOR"
    ],
    "type": "string"
  },
  "PlatformAdminStatus": {
    "enum": [
      "ACTIVE",
      "REVOKED"
    ],
    "type": "string"
  },
  "PlatformAuditLog": {
    "properties": {
      "action": {
        "type": "string"
      },
      "actor": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          },
          {
            "properties": {
              "id": {
                "type": "string"
              }
            },
            "required": [
              "id"
            ],
            "type": "object"
          }
        ],
        "nullable": true
      },
      "actorId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "entityId": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ipAddress": {
        "nullable": true,
        "type": "string"
      },
      "newValue": {},
      "oldValue": {},
      "targetTenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug"
        ],
        "type": "object"
      },
      "targetTenantId": {
        "nullable": true,
        "type": "string"
      },
      "userAgent": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "action",
      "entityType",
      "createdAt"
    ],
    "type": "object"
  },
  "Project": {
    "properties": {
      "_count": {
        "properties": {
          "budgets": {
            "type": "number"
          },
          "changeRequests": {
            "type": "number"
          },
          "decisions": {
            "type": "number"
          },
          "dependencies": {
            "type": "number"
          },
          "documents": {
            "type": "number"
          },
          "members": {
            "type": "number"
          },
          "milestones": {
            "type": "number"
          },
          "risks": {
            "type": "number"
          },
          "sprints": {
            "type": "number"
          },
          "stakeholders": {
            "type": "number"
          },
          "tasks": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "addressLine1": {
        "nullable": true,
        "type": "string"
      },
      "addressLine2": {
        "nullable": true,
        "type": "string"
      },
      "billingCode": {
        "nullable": true,
        "type": "string"
      },
      "city": {
        "nullable": true,
        "type": "string"
      },
      "clientEmail": {
        "nullable": true,
        "type": "string"
      },
      "clientName": {
        "nullable": true,
        "type": "string"
      },
      "clientPhone": {
        "nullable": true,
        "type": "string"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "contractValue": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "costCenter": {
        "nullable": true,
        "type": "string"
      },
      "country": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "currency": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "financeRedacted": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "key": {
        "type": "string"
      },
      "locationName": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "permissions": {
        "$ref": "#/components/schemas/ProjectPermissionMatrix"
      },
      "postalCode": {
        "nullable": true,
        "type": "string"
      },
      "progress": {
        "type": "number"
      },
      "startDate": {
        "nullable": true,
        "type": "string"
      },
      "state": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ProjectStatus"
      },
      "team": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "teamId": {
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      },
      "workspace": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug"
        ],
        "type": "object"
      },
      "workspaceId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "key",
      "name",
      "status",
      "progress"
    ],
    "type": "object"
  },
  "ProjectBoard": {
    "properties": {
      "columns": {
        "items": {
          "$ref": "#/components/schemas/BoardColumn"
        },
        "type": "array"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isDefault": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "permissions": {
        "properties": {
          "canCreateTask": {
            "type": "boolean"
          },
          "canEditBoard": {
            "type": "boolean"
          },
          "canManageColumns": {
            "type": "boolean"
          },
          "canManageSprints": {
            "type": "boolean"
          },
          "canMoveTasks": {
            "type": "boolean"
          },
          "canView": {
            "type": "boolean"
          },
          "canViewReports": {
            "type": "boolean"
          }
        },
        "required": [
          "canView",
          "canCreateTask",
          "canMoveTasks",
          "canManageColumns",
          "canEditBoard",
          "canViewReports"
        ],
        "type": "object"
      },
      "projectId": {
        "type": "string"
      },
      "summary": {
        "properties": {
          "actualMins": {
            "type": "number"
          },
          "blockedCount": {
            "type": "number"
          },
          "blockingCount": {
            "type": "number"
          },
          "cancelledCount": {
            "type": "number"
          },
          "completedCount": {
            "type": "number"
          },
          "completedStoryPoints": {
            "type": "number"
          },
          "completionRate": {
            "type": "number"
          },
          "dueTodayCount": {
            "type": "number"
          },
          "estimateMins": {
            "type": "number"
          },
          "generatedAt": {
            "type": "string"
          },
          "highPriorityCount": {
            "type": "number"
          },
          "openCount": {
            "type": "number"
          },
          "overdueCount": {
            "type": "number"
          },
          "storyPoints": {
            "type": "number"
          },
          "taskCount": {
            "type": "number"
          },
          "unassignedCount": {
            "type": "number"
          }
        },
        "required": [
          "taskCount",
          "completedCount",
          "openCount",
          "cancelledCount",
          "storyPoints",
          "completedStoryPoints",
          "estimateMins",
          "actualMins",
          "blockedCount",
          "blockingCount",
          "overdueCount",
          "dueTodayCount",
          "highPriorityCount",
          "unassignedCount",
          "completionRate",
          "generatedAt"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "projectId",
      "name",
      "isDefault",
      "columns"
    ],
    "type": "object"
  },
  "ProjectBudget": {
    "properties": {
      "actual": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "createdAt": {
        "type": "string"
      },
      "currency": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "planned": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "projectId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId"
    ],
    "type": "object"
  },
  "ProjectChangeRequest": {
    "properties": {
      "approvedAt": {
        "nullable": true,
        "type": "string"
      },
      "approvedByEmail": {
        "nullable": true,
        "type": "string"
      },
      "approvedByName": {
        "nullable": true,
        "type": "string"
      },
      "budgetImpact": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "implementedAt": {
        "nullable": true,
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "reason": {
        "nullable": true,
        "type": "string"
      },
      "requestedByEmail": {
        "nullable": true,
        "type": "string"
      },
      "requestedByName": {
        "nullable": true,
        "type": "string"
      },
      "riskImpact": {
        "nullable": true,
        "type": "string"
      },
      "scheduleImpactDays": {
        "nullable": true,
        "type": "number"
      },
      "scopeImpact": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ProjectChangeRequestStatus"
      },
      "submittedAt": {
        "nullable": true,
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "title",
      "status"
    ],
    "type": "object"
  },
  "ProjectChangeRequestStatus": {
    "enum": [
      "DRAFT",
      "SUBMITTED",
      "APPROVED",
      "REJECTED",
      "IMPLEMENTED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "ProjectDecision": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "decidedAt": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "effectiveAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "outcome": {
        "nullable": true,
        "type": "string"
      },
      "ownerEmail": {
        "nullable": true,
        "type": "string"
      },
      "ownerName": {
        "nullable": true,
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ProjectDecisionStatus"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "title",
      "status"
    ],
    "type": "object"
  },
  "ProjectDecisionStatus": {
    "enum": [
      "PROPOSED",
      "DECIDED",
      "SUPERSEDED",
      "REOPENED"
    ],
    "type": "string"
  },
  "ProjectDependency": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "dependencyType": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "externalUrl": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "ownerEmail": {
        "nullable": true,
        "type": "string"
      },
      "ownerName": {
        "nullable": true,
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "resolvedAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ProjectDependencyStatus"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "title",
      "status"
    ],
    "type": "object"
  },
  "ProjectDependencyStatus": {
    "enum": [
      "OPEN",
      "BLOCKED",
      "RESOLVED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "ProjectHealthAnalytics": {
    "properties": {
      "data": {
        "items": {
          "allOf": [
            {
              "properties": {
                "dueDate": {
                  "nullable": true,
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "key": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "progress": {
                  "type": "number"
                },
                "status": {
                  "$ref": "#/components/schemas/ProjectStatus"
                }
              },
              "required": [
                "id",
                "key",
                "name",
                "status",
                "progress"
              ],
              "type": "object"
            },
            {
              "properties": {
                "_count": {
                  "properties": {
                    "risks": {
                      "type": "number"
                    },
                    "tasks": {
                      "type": "number"
                    }
                  },
                  "type": "object"
                },
                "completion": {
                  "type": "number"
                },
                "doneTasks": {
                  "type": "number"
                },
                "healthScore": {
                  "type": "number"
                },
                "openRisks": {
                  "type": "number"
                },
                "overdueTasks": {
                  "type": "number"
                }
              },
              "required": [
                "doneTasks",
                "overdueTasks",
                "openRisks",
                "completion",
                "healthScore"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "data",
      "total"
    ],
    "type": "object"
  },
  "ProjectMember": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "role": {
        "nullable": true,
        "type": "string"
      },
      "user": {
        "$ref": "#/components/schemas/UserSummary"
      }
    },
    "required": [
      "id",
      "user"
    ],
    "type": "object"
  },
  "ProjectMilestone": {
    "properties": {
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "title"
    ],
    "type": "object"
  },
  "ProjectPermissionAction": {
    "enum": [
      "viewProject",
      "editProject",
      "archiveProject",
      "restoreProject",
      "deleteProject",
      "manageMembers",
      "manageMilestones",
      "manageRisks",
      "viewBudget",
      "manageBudget",
      "createTasks",
      "editTasks",
      "moveTasks",
      "deleteTasks",
      "commentTasks",
      "viewBoard",
      "manageBoardColumns",
      "manageSprints",
      "manageFiles",
      "viewPrivateFiles"
    ],
    "type": "string"
  },
  "ProjectPermissionMatrix": {
    "properties": {
      "accessLevel": {
        "type": "string"
      },
      "actions": {
        "additionalProperties": {
          "type": "boolean"
        },
        "type": "object"
      },
      "key": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "projectRole": {
        "nullable": true,
        "type": "string"
      },
      "roles": {
        "items": {
          "properties": {
            "accessLevel": {
              "type": "string"
            },
            "description": {
              "type": "string"
            },
            "role": {
              "type": "string"
            }
          },
          "required": [
            "role",
            "accessLevel",
            "description"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "source": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ProjectStatus"
      },
      "teamRole": {
        "nullable": true,
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "projectId",
      "key",
      "name",
      "status",
      "visibility",
      "accessLevel",
      "source",
      "actions",
      "roles"
    ],
    "type": "object"
  },
  "ProjectRisk": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isOpen": {
        "type": "boolean"
      },
      "mitigation": {
        "nullable": true,
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "severity": {
        "allOf": [
          {
            "$ref": "#/components/schemas/TaskPriority"
          }
        ],
        "nullable": true
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "title",
      "isOpen"
    ],
    "type": "object"
  },
  "ProjectStakeholder": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "email": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "influence": {
        "$ref": "#/components/schemas/ProjectStakeholderInfluence"
      },
      "isExternal": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "notes": {
        "nullable": true,
        "type": "string"
      },
      "organization": {
        "nullable": true,
        "type": "string"
      },
      "projectId": {
        "type": "string"
      },
      "role": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "name",
      "influence",
      "isExternal"
    ],
    "type": "object"
  },
  "ProjectStakeholderInfluence": {
    "enum": [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL"
    ],
    "type": "string"
  },
  "ProjectStatus": {
    "enum": [
      "PLANNING",
      "ACTIVE",
      "ON_HOLD",
      "COMPLETED",
      "ARCHIVED"
    ],
    "type": "string"
  },
  "PublicBookingCreateResponse": {
    "properties": {
      "booking": {
        "$ref": "#/components/schemas/BookingRequest"
      },
      "selfService": {
        "properties": {
          "cancelUrl": {
            "type": "string"
          },
          "expiresAt": {
            "type": "string"
          },
          "rescheduleUrl": {
            "type": "string"
          }
        },
        "required": [
          "cancelUrl",
          "rescheduleUrl",
          "expiresAt"
        ],
        "type": "object"
      }
    },
    "required": [
      "booking",
      "selfService"
    ],
    "type": "object"
  },
  "PublicBookingPageResponse": {
    "properties": {
      "page": {
        "allOf": [
          {
            "properties": {
              "allowCancel": {
                "type": "boolean"
              },
              "allowReschedule": {
                "type": "boolean"
              },
              "approvalRequired": {
                "type": "boolean"
              },
              "brandColor": {
                "nullable": true,
                "type": "string"
              },
              "collectCompanyName": {
                "type": "boolean"
              },
              "description": {
                "nullable": true,
                "type": "string"
              },
              "durationMins": {
                "nullable": true,
                "type": "number"
              },
              "fields": {
                "items": {
                  "$ref": "#/components/schemas/BookingFormField"
                },
                "type": "array"
              },
              "heroImageUrl": {
                "nullable": true,
                "type": "string"
              },
              "id": {
                "type": "string"
              },
              "locationMode": {
                "$ref": "#/components/schemas/MeetingLocationMode"
              },
              "locationName": {
                "nullable": true,
                "type": "string"
              },
              "logoUrl": {
                "nullable": true,
                "type": "string"
              },
              "meetingType": {
                "nullable": true,
                "properties": {
                  "bufferAfterMins": {
                    "type": "number"
                  },
                  "bufferBeforeMins": {
                    "type": "number"
                  },
                  "category": {
                    "$ref": "#/components/schemas/MeetingTypeCategory"
                  },
                  "defaultAgenda": {
                    "items": {
                      "type": "string"
                    },
                    "nullable": true,
                    "type": "array"
                  },
                  "defaultReminderMins": {
                    "items": {
                      "type": "number"
                    },
                    "type": "array"
                  },
                  "description": {
                    "nullable": true,
                    "type": "string"
                  },
                  "durationMins": {
                    "type": "number"
                  },
                  "id": {
                    "type": "string"
                  },
                  "isActive": {
                    "type": "boolean"
                  },
                  "locationMode": {
                    "$ref": "#/components/schemas/MeetingLocationMode"
                  },
                  "name": {
                    "type": "string"
                  },
                  "requiresApproval": {
                    "type": "boolean"
                  },
                  "slug": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "slug",
                  "category",
                  "durationMins",
                  "bufferBeforeMins",
                  "bufferAfterMins",
                  "locationMode",
                  "requiresApproval",
                  "defaultReminderMins",
                  "isActive"
                ],
                "type": "object"
              },
              "minNoticeMins": {
                "type": "number"
              },
              "path": {
                "type": "string"
              },
              "rollingWindowDays": {
                "type": "number"
              },
              "routingStrategy": {
                "$ref": "#/components/schemas/BookingRoutingStrategy"
              },
              "scope": {
                "$ref": "#/components/schemas/BookingPageScope"
              },
              "subtitle": {
                "nullable": true,
                "type": "string"
              },
              "team": {
                "allOf": [
                  {
                    "properties": {
                      "description": {
                        "nullable": true,
                        "type": "string"
                      },
                      "id": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "name"
                    ],
                    "type": "object"
                  },
                  {
                    "properties": {
                      "members": {
                        "items": {
                          "properties": {
                            "role": {
                              "nullable": true,
                              "type": "string"
                            },
                            "user": {
                              "allOf": [
                                {
                                  "$ref": "#/components/schemas/UserSummary"
                                },
                                {
                                  "properties": {
                                    "avatarUrl": {
                                      "nullable": true,
                                      "type": "string"
                                    },
                                    "status": {
                                      "type": "string"
                                    },
                                    "timezone": {
                                      "nullable": true,
                                      "type": "string"
                                    }
                                  },
                                  "type": "object"
                                }
                              ]
                            }
                          },
                          "required": [
                            "user"
                          ],
                          "type": "object"
                        },
                        "type": "array"
                      }
                    },
                    "type": "object"
                  }
                ],
                "nullable": true
              },
              "timezone": {
                "type": "string"
              },
              "title": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "path",
              "title",
              "scope",
              "routingStrategy",
              "minNoticeMins",
              "rollingWindowDays",
              "approvalRequired",
              "allowReschedule",
              "allowCancel",
              "collectCompanyName",
              "locationMode",
              "timezone"
            ],
            "type": "object"
          },
          {
            "properties": {
              "hosts": {
                "items": {
                  "properties": {
                    "avatarUrl": {
                      "nullable": true,
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "timezone": {
                      "nullable": true,
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "name"
                  ],
                  "type": "object"
                },
                "type": "array"
              }
            },
            "required": [
              "hosts"
            ],
            "type": "object"
          }
        ]
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "logoUrl": {
            "nullable": true,
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "website": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      }
    },
    "required": [
      "tenant",
      "page"
    ],
    "type": "object"
  },
  "PublicBookingSlot": {
    "properties": {
      "endAt": {
        "type": "string"
      },
      "hostAvatarUrl": {
        "nullable": true,
        "type": "string"
      },
      "hostId": {
        "type": "string"
      },
      "hostName": {
        "type": "string"
      },
      "routingStrategy": {
        "$ref": "#/components/schemas/BookingRoutingStrategy"
      },
      "startAt": {
        "type": "string"
      }
    },
    "required": [
      "startAt",
      "endAt",
      "hostId",
      "hostName",
      "routingStrategy"
    ],
    "type": "object"
  },
  "PublicBookingSlotsResponse": {
    "properties": {
      "page": {
        "properties": {
          "id": {
            "type": "string"
          },
          "path": {
            "type": "string"
          },
          "timezone": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "path",
          "title",
          "timezone"
        ],
        "type": "object"
      },
      "slots": {
        "items": {
          "$ref": "#/components/schemas/PublicBookingSlot"
        },
        "type": "array"
      }
    },
    "required": [
      "page",
      "slots"
    ],
    "type": "object"
  },
  "ReadinessResponse": {
    "properties": {
      "checks": {
        "additionalProperties": {},
        "type": "object"
      },
      "status": {
        "type": "string"
      },
      "timestamp": {
        "type": "string"
      }
    },
    "required": [
      "status"
    ],
    "type": "object"
  },
  "Report": {
    "properties": {
      "_count": {
        "properties": {
          "executions": {
            "type": "number"
          },
          "exports": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "cacheTtlSeconds": {
        "nullable": true,
        "type": "number"
      },
      "createdAt": {
        "type": "string"
      },
      "createdBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastRunAt": {
        "nullable": true,
        "type": "string"
      },
      "metadata": {},
      "name": {
        "type": "string"
      },
      "nextRunAt": {
        "nullable": true,
        "type": "string"
      },
      "query": {},
      "recipients": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "schedule": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ReportStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "timezone": {
        "nullable": true,
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "type",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "ReportExecution": {
    "properties": {
      "cacheKey": {
        "nullable": true,
        "type": "string"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "durationMs": {
        "nullable": true,
        "type": "number"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "parameters": {},
      "report": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/ReportStatus"
          },
          "type": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "type",
          "status"
        ],
        "type": "object"
      },
      "reportId": {
        "nullable": true,
        "type": "string"
      },
      "requestedById": {
        "nullable": true,
        "type": "string"
      },
      "result": {},
      "rowCount": {
        "nullable": true,
        "type": "number"
      },
      "startedAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ReportExecutionStatus"
      },
      "summary": {},
      "tenantId": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "type",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "ReportExecutionStatus": {
    "enum": [
      "QUEUED",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "ReportExport": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "execution": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "rowCount": {
            "nullable": true,
            "type": "number"
          },
          "status": {
            "$ref": "#/components/schemas/ReportExecutionStatus"
          }
        },
        "required": [
          "id",
          "status"
        ],
        "type": "object"
      },
      "executionId": {
        "nullable": true,
        "type": "string"
      },
      "expiresAt": {
        "nullable": true,
        "type": "string"
      },
      "fileName": {
        "nullable": true,
        "type": "string"
      },
      "fileUrl": {
        "nullable": true,
        "type": "string"
      },
      "format": {
        "$ref": "#/components/schemas/ReportExportFormat"
      },
      "id": {
        "type": "string"
      },
      "mimeType": {
        "nullable": true,
        "type": "string"
      },
      "report": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "type"
        ],
        "type": "object"
      },
      "reportId": {
        "nullable": true,
        "type": "string"
      },
      "requestedById": {
        "nullable": true,
        "type": "string"
      },
      "sizeBytes": {
        "nullable": true,
        "type": "number"
      },
      "status": {
        "$ref": "#/components/schemas/ReportExportStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "format",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "ReportExportFormat": {
    "enum": [
      "CSV",
      "XLSX",
      "PDF",
      "JSON"
    ],
    "type": "string"
  },
  "ReportExportStatus": {
    "enum": [
      "QUEUED",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "EXPIRED"
    ],
    "type": "string"
  },
  "ReportStatus": {
    "enum": [
      "DRAFT",
      "ACTIVE",
      "PAUSED",
      "ARCHIVED"
    ],
    "type": "string"
  },
  "Role": {
    "properties": {
      "_count": {
        "properties": {
          "users": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isSystem": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "permissions": {
        "items": {
          "properties": {
            "permission": {
              "$ref": "#/components/schemas/Permission"
            }
          },
          "required": [
            "permission"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name",
      "isSystem"
    ],
    "type": "object"
  },
  "SearchCategory": {
    "enum": [
      "all",
      "projects",
      "tasks",
      "files",
      "people",
      "teams",
      "workspaces",
      "messages"
    ],
    "type": "string"
  },
  "SecurityChecks": {
    "properties": {
      "corsConfigured": {
        "type": "boolean"
      },
      "corsOrigins": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "helmetEnabled": {
        "type": "boolean"
      },
      "nodeEnv": {
        "type": "string"
      },
      "rateLimit": {
        "properties": {
          "authMax": {
            "type": "number"
          },
          "defaultMax": {
            "type": "number"
          },
          "ttlSeconds": {
            "type": "number"
          }
        },
        "required": [
          "ttlSeconds",
          "defaultMax",
          "authMax"
        ],
        "type": "object"
      },
      "requestBodyLimit": {
        "type": "string"
      },
      "requestTimeoutMs": {
        "type": "number"
      },
      "secretsConfigured": {
        "properties": {
          "encryption": {
            "type": "boolean"
          },
          "jwtAccess": {
            "type": "boolean"
          },
          "jwtRefresh": {
            "type": "boolean"
          },
          "webhookSigning": {
            "type": "boolean"
          }
        },
        "required": [
          "jwtAccess",
          "jwtRefresh",
          "encryption",
          "webhookSigning"
        ],
        "type": "object"
      },
      "swaggerProductionSafe": {
        "type": "boolean"
      },
      "validationPipe": {
        "properties": {
          "forbidNonWhitelisted": {
            "type": "boolean"
          },
          "transform": {
            "type": "boolean"
          },
          "whitelist": {
            "type": "boolean"
          }
        },
        "required": [
          "whitelist",
          "forbidNonWhitelisted",
          "transform"
        ],
        "type": "object"
      }
    },
    "required": [
      "nodeEnv",
      "swaggerProductionSafe",
      "corsConfigured",
      "corsOrigins",
      "requestBodyLimit",
      "requestTimeoutMs",
      "helmetEnabled",
      "validationPipe",
      "rateLimit",
      "secretsConfigured"
    ],
    "type": "object"
  },
  "SecurityEvent": {
    "properties": {
      "actor": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "actorId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ipAddress": {
        "nullable": true,
        "type": "string"
      },
      "metadata": {},
      "requestId": {
        "nullable": true,
        "type": "string"
      },
      "resolvedAt": {
        "nullable": true,
        "type": "string"
      },
      "resolvedBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "resolvedById": {
        "nullable": true,
        "type": "string"
      },
      "severity": {
        "$ref": "#/components/schemas/SecurityEventSeverity"
      },
      "source": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/SecurityEventStatus"
      },
      "subjectId": {
        "nullable": true,
        "type": "string"
      },
      "subjectType": {
        "nullable": true,
        "type": "string"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "nullable": true,
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "userAgent": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "type",
      "severity",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SecurityEventSeverity": {
    "enum": [
      "INFO",
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL"
    ],
    "type": "string"
  },
  "SecurityEventStatus": {
    "enum": [
      "OPEN",
      "ACKNOWLEDGED",
      "RESOLVED",
      "DISMISSED"
    ],
    "type": "string"
  },
  "SecurityPolicy": {
    "properties": {
      "allowedLoginMethods": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "allowedUploadMimeTypes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "auditRetentionDays": {
        "type": "number"
      },
      "createdAt": {
        "type": "string"
      },
      "dataRetentionDays": {
        "nullable": true,
        "type": "number"
      },
      "domainDiscoveryEnabled": {
        "type": "boolean"
      },
      "enforceIpAllowlist": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "ipAllowlist": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "maxSessionsPerUser": {
        "nullable": true,
        "type": "number"
      },
      "maxUploadBytes": {
        "nullable": true,
        "type": "number"
      },
      "metadata": {},
      "mfaRequired": {
        "type": "boolean"
      },
      "passwordHistoryCount": {
        "type": "number"
      },
      "passwordMinLength": {
        "type": "number"
      },
      "passwordRequireLower": {
        "type": "boolean"
      },
      "passwordRequireNumber": {
        "type": "boolean"
      },
      "passwordRequireSymbol": {
        "type": "boolean"
      },
      "passwordRequireUpper": {
        "type": "boolean"
      },
      "sessionTtlMinutes": {
        "type": "number"
      },
      "ssoRequired": {
        "type": "boolean"
      },
      "tenantId": {
        "type": "string"
      },
      "trustedDeviceTtlDays": {
        "type": "number"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "enforceIpAllowlist",
      "ipAllowlist",
      "sessionTtlMinutes",
      "passwordMinLength",
      "passwordRequireUpper",
      "passwordRequireLower",
      "passwordRequireNumber",
      "passwordRequireSymbol",
      "passwordHistoryCount",
      "mfaRequired",
      "auditRetentionDays",
      "allowedUploadMimeTypes",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteAdminOverview": {
    "properties": {
      "platformAdmins": {
        "type": "number"
      },
      "platformAuditLogs": {
        "type": "number"
      },
      "recentEvents": {
        "items": {
          "$ref": "#/components/schemas/SecurityEvent"
        },
        "type": "array"
      },
      "recentTenants": {
        "items": {
          "$ref": "#/components/schemas/Tenant"
        },
        "type": "array"
      },
      "securityEvents": {
        "properties": {
          "open": {
            "type": "number"
          },
          "total": {
            "type": "number"
          }
        },
        "required": [
          "total",
          "open"
        ],
        "type": "object"
      },
      "sessions": {
        "properties": {
          "active": {
            "type": "number"
          }
        },
        "required": [
          "active"
        ],
        "type": "object"
      },
      "tenants": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "users": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      }
    },
    "required": [
      "tenants",
      "users",
      "sessions",
      "securityEvents",
      "platformAdmins",
      "platformAuditLogs",
      "recentTenants",
      "recentEvents"
    ],
    "type": "object"
  },
  "SiteAdminProfile": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "level": {
        "$ref": "#/components/schemas/PlatformAdminLevel"
      },
      "scopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "$ref": "#/components/schemas/PlatformAdminStatus"
      },
      "tenantMembership": {
        "properties": {
          "tenantId": {
            "type": "string"
          },
          "tenantName": {
            "type": "string"
          },
          "tenantSlug": {
            "type": "string"
          }
        },
        "required": [
          "tenantId",
          "tenantName",
          "tenantSlug"
        ],
        "type": "object"
      },
      "updatedAt": {
        "type": "string"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "userId",
      "level",
      "status",
      "scopes",
      "tenantMembership",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteAiAction": {
    "properties": {
      "agent": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "model": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "provider": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "provider",
          "model"
        ],
        "type": "object"
      },
      "agentId": {
        "nullable": true,
        "type": "string"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "conversation": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/AiConversationStatus"
          },
          "title": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "status"
        ],
        "type": "object"
      },
      "conversationId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "entityId": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "nullable": true,
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "input": {},
      "messageId": {
        "nullable": true,
        "type": "string"
      },
      "output": {},
      "requestedBy": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "requestedById": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/AiActionStatus"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "type",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteAiAgent": {
    "allOf": [
      {
        "$ref": "#/components/schemas/AiAgent"
      },
      {
        "properties": {
          "createdBy": {
            "allOf": [
              {
                "$ref": "#/components/schemas/UserSummary"
              }
            ],
            "nullable": true
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteAiConversation": {
    "properties": {
      "_count": {
        "properties": {
          "actions": {
            "type": "number"
          },
          "messages": {
            "type": "number"
          },
          "usageLogs": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "agent": {
        "properties": {
          "id": {
            "type": "string"
          },
          "model": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "provider": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "provider",
          "model"
        ],
        "type": "object"
      },
      "agentId": {
        "type": "string"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "contextId": {
        "nullable": true,
        "type": "string"
      },
      "contextType": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/AiConversationStatus"
      },
      "summary": {
        "nullable": true,
        "type": "string"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "$ref": "#/components/schemas/UserSummary"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "agentId",
      "userId",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteAiOverview": {
    "properties": {
      "actions": {
        "properties": {
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byStatus"
        ],
        "type": "object"
      },
      "agents": {
        "properties": {
          "byProvider": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byProvider"
        ],
        "type": "object"
      },
      "conversations": {
        "properties": {
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byStatus"
        ],
        "type": "object"
      },
      "recentActions": {
        "items": {
          "$ref": "#/components/schemas/SiteAiAction"
        },
        "type": "array"
      },
      "safety": {
        "properties": {
          "events": {
            "type": "number"
          },
          "recentEvents": {
            "items": {
              "$ref": "#/components/schemas/SecurityEvent"
            },
            "type": "array"
          }
        },
        "required": [
          "events",
          "recentEvents"
        ],
        "type": "object"
      },
      "settings": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "usage": {
        "properties": {
          "averageLatencyMs": {
            "type": "number"
          },
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "last30dCost": {
            "type": "number"
          },
          "last30dTokens": {
            "type": "number"
          }
        },
        "required": [
          "byStatus",
          "last30dTokens",
          "last30dCost",
          "averageLatencyMs"
        ],
        "type": "object"
      }
    },
    "required": [
      "settings",
      "agents",
      "conversations",
      "actions",
      "usage",
      "safety",
      "recentActions"
    ],
    "type": "object"
  },
  "SiteAiSettings": {
    "allOf": [
      {
        "$ref": "#/components/schemas/AiSettings"
      },
      {
        "properties": {
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteAiUsageLog": {
    "properties": {
      "agent": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "model": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "provider": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "provider",
          "model"
        ],
        "type": "object"
      },
      "agentId": {
        "nullable": true,
        "type": "string"
      },
      "conversationId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "estimatedCost": {
        "nullable": true,
        "type": "number"
      },
      "id": {
        "type": "string"
      },
      "inputTokens": {
        "type": "number"
      },
      "latencyMs": {
        "nullable": true,
        "type": "number"
      },
      "model": {
        "type": "string"
      },
      "outputTokens": {
        "type": "number"
      },
      "provider": {
        "type": "string"
      },
      "requestType": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/AiRequestStatus"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "totalTokens": {
        "type": "number"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "provider",
      "model",
      "status",
      "inputTokens",
      "outputTokens",
      "totalTokens",
      "createdAt"
    ],
    "type": "object"
  },
  "SiteApproval": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "currentStep": {
        "type": "number"
      },
      "decidedAt": {
        "nullable": true,
        "type": "string"
      },
      "definitionId": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "entityId": {
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "requestedById": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/ApprovalStatus"
      },
      "steps": {
        "items": {
          "properties": {
            "approverId": {
              "type": "string"
            },
            "decidedAt": {
              "nullable": true,
              "type": "string"
            },
            "dueDate": {
              "nullable": true,
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "required": {
              "type": "boolean"
            },
            "status": {
              "$ref": "#/components/schemas/ApprovalStatus"
            },
            "stepOrder": {
              "type": "number"
            },
            "title": {
              "nullable": true,
              "type": "string"
            }
          },
          "required": [
            "id",
            "stepOrder",
            "approverId",
            "required",
            "status"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "workflowRun": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/WorkflowRunStatus"
          },
          "workflow": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name"
            ],
            "type": "object"
          }
        },
        "required": [
          "id",
          "status"
        ],
        "type": "object"
      },
      "workflowRunId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "entityType",
      "entityId",
      "title",
      "status",
      "currentStep",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteApprovalDefinition": {
    "properties": {
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "steps": {
        "items": {
          "properties": {
            "approverId": {
              "nullable": true,
              "type": "string"
            },
            "approverRole": {
              "nullable": true,
              "type": "string"
            },
            "escalationHours": {
              "nullable": true,
              "type": "number"
            },
            "id": {
              "type": "string"
            },
            "required": {
              "type": "boolean"
            },
            "stepOrder": {
              "type": "number"
            },
            "title": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "stepOrder",
            "title",
            "required"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "entityType",
      "isActive",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteAutomationOverview": {
    "properties": {
      "approvals": {
        "properties": {
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byStatus"
        ],
        "type": "object"
      },
      "definitions": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "recentFailedRuns": {
        "items": {
          "$ref": "#/components/schemas/SiteWorkflowRun"
        },
        "type": "array"
      },
      "runs": {
        "properties": {
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "deadLetter": {
            "type": "number"
          },
          "last24h": {
            "type": "number"
          }
        },
        "required": [
          "byStatus",
          "last24h",
          "deadLetter"
        ],
        "type": "object"
      },
      "runtimeLogs": {
        "properties": {
          "errorLogs": {
            "type": "number"
          }
        },
        "required": [
          "errorLogs"
        ],
        "type": "object"
      },
      "workflows": {
        "properties": {
          "byTrigger": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byTrigger"
        ],
        "type": "object"
      }
    },
    "required": [
      "workflows",
      "runs",
      "approvals",
      "definitions",
      "runtimeLogs",
      "recentFailedRuns"
    ],
    "type": "object"
  },
  "SiteBillingEntitlement": {
    "properties": {
      "entitlements": {
        "items": {
          "properties": {
            "enabled": {
              "type": "boolean"
            },
            "key": {
              "type": "string"
            },
            "limit": {
              "nullable": true,
              "type": "number"
            },
            "metered": {
              "type": "boolean"
            },
            "name": {
              "type": "string"
            },
            "unit": {
              "nullable": true,
              "type": "string"
            }
          },
          "required": [
            "key",
            "name",
            "enabled",
            "metered"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "plan": {
        "$ref": "#/components/schemas/SiteBillingPlan"
      },
      "seatUsage": {
        "properties": {
          "limit": {
            "type": "number"
          },
          "used": {
            "type": "number"
          }
        },
        "required": [
          "used",
          "limit"
        ],
        "type": "object"
      },
      "subscription": {
        "properties": {
          "currentPeriodEnd": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "seatCount": {
            "type": "number"
          },
          "status": {
            "type": "string"
          },
          "trialEndsAt": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "status",
          "seatCount"
        ],
        "type": "object"
      },
      "tenant": {
        "allOf": [
          {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          },
          {
            "properties": {
              "_count": {
                "properties": {
                  "users": {
                    "type": "number"
                  }
                },
                "type": "object"
              }
            },
            "type": "object"
          }
        ]
      }
    },
    "required": [
      "tenant",
      "subscription",
      "plan",
      "entitlements",
      "seatUsage"
    ],
    "type": "object"
  },
  "SiteBillingEvent": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "eventId": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "processedAt": {
        "nullable": true,
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "nullable": true,
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "provider",
      "eventId",
      "type",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteBillingFeature": {
    "properties": {
      "category": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "defaultLimit": {
        "nullable": true,
        "type": "number"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "key": {
        "type": "string"
      },
      "metered": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "plans": {
        "items": {
          "properties": {
            "config": {},
            "enabled": {
              "type": "boolean"
            },
            "featureId": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "limit": {
              "nullable": true,
              "type": "number"
            },
            "plan": {
              "$ref": "#/components/schemas/SiteBillingPlan"
            },
            "planId": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "planId",
            "featureId",
            "enabled",
            "plan"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "unit": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "key",
      "name",
      "metered",
      "isActive",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteBillingFeaturePayload": {
    "properties": {
      "category": {
        "type": "string"
      },
      "defaultLimit": {
        "type": "number"
      },
      "description": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "key": {
        "type": "string"
      },
      "metered": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "unit": {
        "type": "string"
      }
    },
    "required": [
      "key",
      "name"
    ],
    "type": "object"
  },
  "SiteBillingOverview": {
    "properties": {
      "billingEvents": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "features": {
        "type": "number"
      },
      "invoices": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "plans": {
        "type": "number"
      },
      "recentBillingEvents": {
        "items": {
          "$ref": "#/components/schemas/SiteBillingEvent"
        },
        "type": "array"
      },
      "recentSubscriptions": {
        "items": {
          "$ref": "#/components/schemas/SiteSubscription"
        },
        "type": "array"
      },
      "revenue": {
        "type": "number"
      },
      "subscriptions": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "tenantHealth": {
        "items": {
          "allOf": [
            {
              "properties": {
                "createdAt": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "logoUrl": {
                  "nullable": true,
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "slug": {
                  "type": "string"
                },
                "status": {
                  "type": "string"
                },
                "updatedAt": {
                  "type": "string"
                },
                "website": {
                  "nullable": true,
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name",
                "slug",
                "status",
                "createdAt",
                "updatedAt"
              ],
              "type": "object"
            },
            {
              "properties": {
                "_count": {
                  "allOf": [
                    {
                      "properties": {
                        "auditLogs": {
                          "type": "number"
                        },
                        "integrations": {
                          "type": "number"
                        },
                        "projects": {
                          "type": "number"
                        },
                        "securityEvents": {
                          "type": "number"
                        },
                        "teams": {
                          "type": "number"
                        },
                        "users": {
                          "type": "number"
                        },
                        "workspaces": {
                          "type": "number"
                        }
                      },
                      "type": "object"
                    },
                    {
                      "properties": {
                        "billingEvents": {
                          "type": "number"
                        },
                        "usageRecords": {
                          "type": "number"
                        }
                      },
                      "type": "object"
                    }
                  ]
                },
                "billing": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/SiteSubscription"
                    }
                  ],
                  "nullable": true
                },
                "health": {
                  "type": "string"
                }
              },
              "required": [
                "health"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "usageRecords": {
        "type": "number"
      }
    },
    "required": [
      "plans",
      "features",
      "subscriptions",
      "invoices",
      "usageRecords",
      "billingEvents",
      "revenue",
      "recentSubscriptions",
      "recentBillingEvents",
      "tenantHealth"
    ],
    "type": "object"
  },
  "SiteBillingPlan": {
    "properties": {
      "_count": {
        "properties": {
          "features": {
            "type": "number"
          },
          "subscriptions": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "currency": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "features": {
        "items": {
          "properties": {
            "config": {},
            "enabled": {
              "type": "boolean"
            },
            "feature": {
              "properties": {
                "category": {
                  "nullable": true,
                  "type": "string"
                },
                "defaultLimit": {
                  "nullable": true,
                  "type": "number"
                },
                "description": {
                  "nullable": true,
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "isActive": {
                  "type": "boolean"
                },
                "key": {
                  "type": "string"
                },
                "metered": {
                  "type": "boolean"
                },
                "name": {
                  "type": "string"
                },
                "unit": {
                  "nullable": true,
                  "type": "string"
                }
              },
              "required": [
                "id",
                "key",
                "name",
                "metered",
                "isActive"
              ],
              "type": "object"
            },
            "id": {
              "type": "string"
            },
            "limit": {
              "nullable": true,
              "type": "number"
            }
          },
          "required": [
            "id",
            "enabled",
            "feature"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "id": {
        "type": "string"
      },
      "interval": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "metadata": {},
      "name": {
        "type": "string"
      },
      "price": {
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "providerPriceId": {
        "nullable": true,
        "type": "string"
      },
      "seatLimit": {
        "nullable": true,
        "type": "number"
      },
      "slug": {
        "type": "string"
      },
      "trialDays": {
        "nullable": true,
        "type": "number"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name",
      "slug",
      "price",
      "currency",
      "interval",
      "isActive",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteBillingPlanPayload": {
    "properties": {
      "currency": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "interval": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "metadata": {},
      "name": {
        "type": "string"
      },
      "price": {
        "type": "number"
      },
      "providerPriceId": {
        "type": "string"
      },
      "seatLimit": {
        "type": "number"
      },
      "slug": {
        "type": "string"
      },
      "trialDays": {
        "type": "number"
      }
    },
    "required": [
      "name",
      "slug"
    ],
    "type": "object"
  },
  "SiteComplianceJob": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ComplianceJob"
      },
      {
        "properties": {
          "approvedBy": {
            "allOf": [
              {
                "$ref": "#/components/schemas/UserSummary"
              }
            ],
            "nullable": true
          },
          "requestedBy": {
            "allOf": [
              {
                "$ref": "#/components/schemas/UserSummary"
              }
            ],
            "nullable": true
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteComplianceOverview": {
    "properties": {
      "evidenceTrail": {
        "items": {
          "allOf": [
            {
              "$ref": "#/components/schemas/AuditLog"
            },
            {
              "properties": {
                "tenant": {
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "slug": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "name",
                    "slug",
                    "status"
                  ],
                  "type": "object"
                }
              },
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "jobs": {
        "properties": {
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "byType": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byStatus",
          "byType"
        ],
        "type": "object"
      },
      "policies": {
        "properties": {
          "boundaryChecks": {
            "items": {
              "properties": {
                "auditRetentionDays": {
                  "type": "number"
                },
                "dataRetentionDays": {
                  "nullable": true,
                  "type": "number"
                },
                "domainDiscoveryEnabled": {
                  "type": "boolean"
                },
                "evidence": {
                  "enum": [
                    "PASS",
                    "REVIEW"
                  ],
                  "type": "string"
                },
                "mfaRequired": {
                  "type": "boolean"
                },
                "tenant": {
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "slug": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "name",
                    "slug",
                    "status"
                  ],
                  "type": "object"
                }
              },
              "required": [
                "tenant",
                "auditRetentionDays",
                "domainDiscoveryEnabled",
                "mfaRequired",
                "evidence"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "reviewed": {
            "type": "number"
          }
        },
        "required": [
          "reviewed",
          "boundaryChecks"
        ],
        "type": "object"
      },
      "recentJobs": {
        "items": {
          "$ref": "#/components/schemas/SiteComplianceJob"
        },
        "type": "array"
      }
    },
    "required": [
      "jobs",
      "policies",
      "recentJobs",
      "evidenceTrail"
    ],
    "type": "object"
  },
  "SiteConversationMetadata": {
    "properties": {
      "_count": {
        "properties": {
          "members": {
            "type": "number"
          },
          "messages": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isGroup": {
        "type": "boolean"
      },
      "members": {
        "items": {
          "properties": {
            "id": {
              "type": "string"
            },
            "userId": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "userId"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "messages": {
        "items": {
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "pinnedAt": {
              "nullable": true,
              "type": "string"
            },
            "senderId": {
              "type": "string"
            },
            "updatedAt": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "senderId",
            "createdAt"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "isGroup",
      "createdAt"
    ],
    "type": "object"
  },
  "SiteDashboard": {
    "properties": {
      "_count": {
        "properties": {
          "widgets": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isDefault": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "owner": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "ownerId": {
        "nullable": true,
        "type": "string"
      },
      "refreshIntervalSeconds": {
        "nullable": true,
        "type": "number"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "visibility": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "visibility",
      "isDefault",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteHardeningOverview": {
    "properties": {
      "checks": {
        "additionalProperties": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            }
          ]
        },
        "type": "object"
      },
      "data": {
        "additionalProperties": {},
        "type": "object"
      },
      "qaMatrix": {
        "items": {
          "properties": {
            "area": {
              "type": "string"
            },
            "evidence": {
              "type": "string"
            },
            "status": {
              "type": "string"
            }
          },
          "required": [
            "area",
            "status",
            "evidence"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "recentPlatformAudit": {
        "items": {
          "$ref": "#/components/schemas/PlatformAuditLog"
        },
        "type": "array"
      }
    },
    "required": [
      "checks",
      "data",
      "qaMatrix",
      "recentPlatformAudit"
    ],
    "type": "object"
  },
  "SiteIdentitySecurityOverview": {
    "properties": {
      "loginHistory": {
        "properties": {
          "byMethod": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "suspiciousLast7Days": {
            "type": "number"
          }
        },
        "required": [
          "byStatus",
          "byMethod",
          "suspiciousLast7Days"
        ],
        "type": "object"
      },
      "mfa": {
        "properties": {
          "activeFactors": {
            "type": "number"
          },
          "pendingFactors": {
            "type": "number"
          },
          "requiredPolicies": {
            "type": "number"
          }
        },
        "required": [
          "activeFactors",
          "pendingFactors",
          "requiredPolicies"
        ],
        "type": "object"
      },
      "recentSuspiciousLogins": {
        "items": {
          "$ref": "#/components/schemas/SiteLoginHistory"
        },
        "type": "array"
      },
      "riskyTenants": {
        "items": {
          "allOf": [
            {
              "$ref": "#/components/schemas/Tenant"
            },
            {
              "properties": {
                "riskScore": {
                  "type": "number"
                },
                "securityPolicy": {
                  "nullable": true,
                  "properties": {
                    "allowedLoginMethods": {
                      "items": {
                        "type": "string"
                      },
                      "type": "array"
                    },
                    "domainDiscoveryEnabled": {
                      "type": "boolean"
                    },
                    "mfaRequired": {
                      "type": "boolean"
                    },
                    "ssoRequired": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "mfaRequired",
                    "allowedLoginMethods",
                    "ssoRequired",
                    "domainDiscoveryEnabled"
                  ],
                  "type": "object"
                }
              },
              "required": [
                "riskScore"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "sso": {
        "properties": {
          "activeProviders": {
            "type": "number"
          },
          "domainDiscoveryPolicies": {
            "type": "number"
          },
          "requiredPolicies": {
            "type": "number"
          }
        },
        "required": [
          "activeProviders",
          "requiredPolicies",
          "domainDiscoveryPolicies"
        ],
        "type": "object"
      },
      "trustedDevices": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "users": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      }
    },
    "required": [
      "users",
      "mfa",
      "trustedDevices",
      "loginHistory",
      "sso",
      "recentSuspiciousLogins",
      "riskyTenants"
    ],
    "type": "object"
  },
  "SiteIntegration": {
    "allOf": [
      {
        "properties": {
          "_count": {
            "properties": {
              "logs": {
                "type": "number"
              }
            },
            "type": "object"
          },
          "config": {},
          "createdAt": {
            "type": "string"
          },
          "createdById": {
            "nullable": true,
            "type": "string"
          },
          "enabled": {
            "type": "boolean"
          },
          "externalAccountId": {
            "nullable": true,
            "type": "string"
          },
          "hasSecrets": {
            "type": "boolean"
          },
          "id": {
            "type": "string"
          },
          "lastError": {
            "nullable": true,
            "type": "string"
          },
          "lastSyncAt": {
            "nullable": true,
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "provider": {
            "$ref": "#/components/schemas/IntegrationProvider"
          },
          "scopes": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "secretKeys": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "status": {
            "$ref": "#/components/schemas/IntegrationStatus"
          },
          "tenantId": {
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "tenantId",
          "provider",
          "name",
          "scopes",
          "enabled",
          "status",
          "createdAt",
          "updatedAt"
        ],
        "type": "object"
      },
      {
        "properties": {
          "_count": {
            "properties": {
              "logs": {
                "type": "number"
              }
            },
            "type": "object"
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteIntegrationsOverview": {
    "properties": {
      "deliveries": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "deliveriesLast24h": {
        "type": "number"
      },
      "integrations": {
        "additionalProperties": {
          "additionalProperties": {
            "type": "number"
          },
          "type": "object"
        },
        "type": "object"
      },
      "omoflowIntegrations": {
        "items": {
          "$ref": "#/components/schemas/SiteIntegration"
        },
        "type": "array"
      },
      "providerCatalog": {
        "items": {
          "properties": {
            "category": {
              "type": "string"
            },
            "label": {
              "type": "string"
            },
            "provider": {
              "type": "string"
            }
          },
          "required": [
            "provider",
            "label",
            "category"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "recentFailures": {
        "items": {
          "$ref": "#/components/schemas/SiteWebhookDelivery"
        },
        "type": "array"
      },
      "webhooks": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      }
    },
    "required": [
      "integrations",
      "webhooks",
      "deliveries",
      "deliveriesLast24h",
      "recentFailures",
      "omoflowIntegrations",
      "providerCatalog"
    ],
    "type": "object"
  },
  "SiteInvoice": {
    "properties": {
      "amount": {
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "createdAt": {
        "type": "string"
      },
      "currency": {
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "hostedInvoiceUrl": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "invoicePdfUrl": {
        "nullable": true,
        "type": "string"
      },
      "number": {
        "nullable": true,
        "type": "string"
      },
      "paidAt": {
        "nullable": true,
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "providerInvoiceId": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "subscription": {
        "$ref": "#/components/schemas/SiteSubscription"
      },
      "subscriptionId": {
        "type": "string"
      },
      "subtotal": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "tax": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "tenantId": {
        "nullable": true,
        "type": "string"
      },
      "total": {
        "nullable": true,
        "oneOf": [
          {
            "type": "number"
          },
          {
            "type": "string"
          }
        ]
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "subscriptionId",
      "provider",
      "amount",
      "currency",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteLoginHistory": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ipAddress": {
        "nullable": true,
        "type": "string"
      },
      "metadata": {},
      "method": {
        "type": "string"
      },
      "reason": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "suspicious": {
        "type": "boolean"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "nullable": true,
        "type": "string"
      },
      "tenantSlug": {
        "nullable": true,
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userAgent": {
        "nullable": true,
        "type": "string"
      },
      "userId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "email",
      "method",
      "status",
      "suspicious",
      "createdAt"
    ],
    "type": "object"
  },
  "SiteMeetingOperationsOverview": {
    "properties": {
      "aiUsage": {
        "properties": {
          "estimatedCost": {
            "type": "number"
          },
          "requests": {
            "type": "number"
          },
          "totalTokens": {
            "type": "number"
          }
        },
        "required": [
          "requests",
          "totalTokens",
          "estimatedCost"
        ],
        "type": "object"
      },
      "booking": {
        "properties": {
          "activePages": {
            "type": "number"
          },
          "requests": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "activePages",
          "requests"
        ],
        "type": "object"
      },
      "deliveryPressure": {
        "items": {
          "properties": {
            "failures": {
              "type": "number"
            },
            "status": {
              "$ref": "#/components/schemas/MeetingReminderJobStatus"
            },
            "tenant": {
              "nullable": true,
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "slug": {
                  "type": "string"
                },
                "status": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name",
                "slug",
                "status"
              ],
              "type": "object"
            }
          },
          "required": [
            "tenant",
            "status",
            "failures"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "meetings": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "policies": {
        "properties": {
          "aiMeetingEnabled": {
            "type": "number"
          },
          "calendarSyncEnabled": {
            "type": "number"
          },
          "publicBookingEnabled": {
            "type": "number"
          },
          "tenantsWithSettings": {
            "type": "number"
          },
          "whatsappEnabled": {
            "type": "number"
          }
        },
        "required": [
          "tenantsWithSettings",
          "publicBookingEnabled",
          "calendarSyncEnabled",
          "whatsappEnabled",
          "aiMeetingEnabled"
        ],
        "type": "object"
      },
      "privacy": {
        "properties": {
          "policy": {
            "type": "string"
          },
          "redacted": {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
        },
        "required": [
          "policy",
          "redacted"
        ],
        "type": "object"
      },
      "reminderDelivery": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "topTenants": {
        "items": {
          "properties": {
            "meetings": {
              "type": "number"
            },
            "tenant": {
              "nullable": true,
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "slug": {
                  "type": "string"
                },
                "status": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name",
                "slug",
                "status"
              ],
              "type": "object"
            }
          },
          "required": [
            "tenant",
            "meetings"
          ],
          "type": "object"
        },
        "type": "array"
      }
    },
    "required": [
      "privacy",
      "meetings",
      "booking",
      "reminderDelivery",
      "policies",
      "aiUsage",
      "topTenants",
      "deliveryPressure"
    ],
    "type": "object"
  },
  "SiteMeetingReminderLog": {
    "allOf": [
      {
        "properties": {
          "attempts": {
            "type": "number"
          },
          "channel": {
            "$ref": "#/components/schemas/MeetingReminderChannel"
          },
          "createdAt": {
            "type": "string"
          },
          "deadLetterAt": {
            "nullable": true,
            "type": "string"
          },
          "destination": {
            "nullable": true,
            "type": "string"
          },
          "failedAt": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "lastError": {
            "nullable": true,
            "type": "string"
          },
          "lockedAt": {
            "nullable": true,
            "type": "string"
          },
          "maxAttempts": {
            "type": "number"
          },
          "meetingId": {
            "type": "string"
          },
          "nextAttemptAt": {
            "type": "string"
          },
          "provider": {
            "nullable": true,
            "type": "string"
          },
          "reminder": {
            "nullable": true,
            "properties": {
              "attendeeId": {
                "nullable": true,
                "type": "string"
              },
              "id": {
                "type": "string"
              },
              "offsetMinutes": {
                "type": "number"
              },
              "templateKey": {
                "nullable": true,
                "type": "string"
              }
            },
            "required": [
              "id",
              "offsetMinutes"
            ],
            "type": "object"
          },
          "reminderId": {
            "nullable": true,
            "type": "string"
          },
          "scheduledFor": {
            "type": "string"
          },
          "sentAt": {
            "nullable": true,
            "type": "string"
          },
          "status": {
            "$ref": "#/components/schemas/MeetingReminderJobStatus"
          },
          "tenantId": {
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "tenantId",
          "meetingId",
          "channel",
          "status",
          "scheduledFor",
          "attempts",
          "maxAttempts",
          "nextAttemptAt"
        ],
        "type": "object"
      },
      {
        "properties": {
          "meeting": {
            "allOf": [
              {
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "startAt": {
                    "type": "string"
                  },
                  "status": {
                    "$ref": "#/components/schemas/MeetingStatus"
                  }
                },
                "required": [
                  "id",
                  "status",
                  "startAt"
                ],
                "type": "object"
              },
              {
                "properties": {
                  "contentRedacted": {
                    "enum": [
                      true
                    ],
                    "type": "boolean"
                  }
                },
                "required": [
                  "contentRedacted"
                ],
                "type": "object"
              }
            ]
          },
          "tenant": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "required": [
          "tenant",
          "meeting"
        ],
        "type": "object"
      }
    ]
  },
  "SiteMeetingTenantPosture": {
    "properties": {
      "aiUsage": {
        "properties": {
          "estimatedCost": {
            "type": "number"
          },
          "requests": {
            "type": "number"
          },
          "totalTokens": {
            "type": "number"
          }
        },
        "required": [
          "requests",
          "totalTokens",
          "estimatedCost"
        ],
        "type": "object"
      },
      "meetings": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "privacy": {
        "enum": [
          "content_redacted"
        ],
        "type": "string"
      },
      "reminderDelivery": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "tenant": {
        "allOf": [
          {
            "properties": {
              "_count": {
                "properties": {
                  "auditLogs": {
                    "type": "number"
                  },
                  "integrations": {
                    "type": "number"
                  },
                  "projects": {
                    "type": "number"
                  },
                  "securityEvents": {
                    "type": "number"
                  },
                  "teams": {
                    "type": "number"
                  },
                  "users": {
                    "type": "number"
                  },
                  "workspaces": {
                    "type": "number"
                  }
                },
                "type": "object"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          },
          {
            "properties": {
              "meetingIntegrationSettings": {
                "allOf": [
                  {
                    "$ref": "#/components/schemas/MeetingIntegrationSettings"
                  }
                ],
                "nullable": true
              }
            },
            "type": "object"
          }
        ]
      }
    },
    "required": [
      "tenant",
      "meetings",
      "reminderDelivery",
      "aiUsage",
      "privacy"
    ],
    "type": "object"
  },
  "SiteMessageActivity": {
    "properties": {
      "_count": {
        "properties": {
          "reactions": {
            "type": "number"
          },
          "readReceipts": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "attachmentCount": {
        "type": "number"
      },
      "attachments": {},
      "bodyRedacted": {
        "enum": [
          true
        ],
        "type": "boolean"
      },
      "conversation": {
        "properties": {
          "id": {
            "type": "string"
          },
          "isGroup": {
            "type": "boolean"
          },
          "tenant": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          },
          "tenantId": {
            "type": "string"
          },
          "title": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "tenantId",
          "isGroup"
        ],
        "type": "object"
      },
      "conversationId": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "forwardedFromMessageId": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "metadata": {},
      "parentMessageId": {
        "nullable": true,
        "type": "string"
      },
      "pinnedAt": {
        "nullable": true,
        "type": "string"
      },
      "senderId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "conversationId",
      "senderId",
      "createdAt",
      "updatedAt",
      "bodyRedacted",
      "attachmentCount",
      "conversation"
    ],
    "type": "object"
  },
  "SiteObservabilityOverview": {
    "properties": {
      "api": {
        "properties": {
          "errorRateSignals": {
            "type": "number"
          },
          "errors": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "recentRequests": {
            "items": {
              "additionalProperties": {},
              "type": "object"
            },
            "type": "array"
          },
          "slowEndpoints": {
            "items": {
              "additionalProperties": {},
              "type": "object"
            },
            "type": "array"
          }
        },
        "required": [
          "errors",
          "errorRateSignals",
          "recentRequests",
          "slowEndpoints"
        ],
        "type": "object"
      },
      "live": {
        "properties": {
          "environment": {
            "type": "string"
          },
          "service": {
            "type": "string"
          },
          "startedAt": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "uptimeSeconds": {
            "type": "number"
          }
        },
        "required": [
          "status"
        ],
        "type": "object"
      },
      "queues": {
        "properties": {
          "compliance": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "metrics": {},
          "webhooks": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "workflows": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "workflows",
          "webhooks",
          "compliance",
          "metrics"
        ],
        "type": "object"
      },
      "ready": {
        "properties": {
          "database": {
            "properties": {
              "latencyMs": {
                "type": "number"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "status",
              "latencyMs"
            ],
            "type": "object"
          },
          "realtime": {
            "$ref": "#/components/schemas/SiteRealtimeSnapshot"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "status",
          "database",
          "realtime"
        ],
        "type": "object"
      },
      "securityEvents": {
        "properties": {
          "open": {
            "type": "number"
          },
          "recentApiSecurityEvents": {
            "items": {
              "$ref": "#/components/schemas/SecurityEvent"
            },
            "type": "array"
          }
        },
        "required": [
          "open",
          "recentApiSecurityEvents"
        ],
        "type": "object"
      },
      "sessions": {
        "properties": {
          "active": {
            "type": "number"
          }
        },
        "required": [
          "active"
        ],
        "type": "object"
      },
      "workers": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      }
    },
    "required": [
      "live",
      "ready",
      "api",
      "queues",
      "workers",
      "sessions",
      "securityEvents"
    ],
    "type": "object"
  },
  "SitePlanFeaturePayload": {
    "properties": {
      "config": {},
      "enabled": {
        "type": "boolean"
      },
      "featureId": {
        "type": "string"
      },
      "limit": {
        "type": "number"
      }
    },
    "required": [
      "featureId"
    ],
    "type": "object"
  },
  "SitePlatformSearchCategory": {
    "enum": [
      "ALL",
      "TENANTS",
      "USERS",
      "PROJECTS",
      "TASKS",
      "EVENTS",
      "AUDIT"
    ],
    "type": "string"
  },
  "SitePlatformSearchResponse": {
    "allOf": [
      {
        "properties": {
          "data": {
            "items": {
              "$ref": "#/components/schemas/SitePlatformSearchResult"
            },
            "type": "array"
          },
          "meta": {
            "properties": {
              "limit": {
                "type": "number"
              },
              "page": {
                "type": "number"
              },
              "total": {
                "type": "number"
              },
              "totalPages": {
                "type": "number"
              }
            },
            "required": [
              "page",
              "limit",
              "total",
              "totalPages"
            ],
            "type": "object"
          }
        },
        "required": [
          "data",
          "meta"
        ],
        "type": "object"
      },
      {
        "properties": {
          "facets": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "query": {
            "properties": {
              "category": {
                "type": "string"
              },
              "search": {
                "type": "string"
              },
              "tenantId": {
                "type": "string"
              }
            },
            "required": [
              "search",
              "category"
            ],
            "type": "object"
          }
        },
        "required": [
          "facets",
          "query"
        ],
        "type": "object"
      }
    ]
  },
  "SitePlatformSearchResult": {
    "properties": {
      "id": {
        "type": "string"
      },
      "metadata": {},
      "subtitle": {
        "nullable": true,
        "type": "string"
      },
      "tenant": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "url": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "type",
      "title",
      "url"
    ],
    "type": "object"
  },
  "SiteRealtimeOverview": {
    "properties": {
      "abuseAndRateLimit": {
        "properties": {
          "events": {
            "type": "number"
          },
          "recentEvents": {
            "items": {
              "$ref": "#/components/schemas/SecurityEvent"
            },
            "type": "array"
          }
        },
        "required": [
          "events",
          "recentEvents"
        ],
        "type": "object"
      },
      "conversations": {
        "properties": {
          "direct": {
            "type": "number"
          },
          "group": {
            "type": "number"
          },
          "total": {
            "type": "number"
          }
        },
        "required": [
          "total",
          "group",
          "direct"
        ],
        "type": "object"
      },
      "deliveryHealth": {
        "properties": {
          "privateContentPolicy": {
            "type": "string"
          },
          "readReceiptRatio": {
            "type": "number"
          }
        },
        "required": [
          "readReceiptRatio",
          "privateContentPolicy"
        ],
        "type": "object"
      },
      "messages": {
        "properties": {
          "last24h": {
            "type": "number"
          },
          "pinned": {
            "type": "number"
          },
          "reactions": {
            "type": "number"
          },
          "readReceiptsLast24h": {
            "type": "number"
          }
        },
        "required": [
          "last24h",
          "pinned",
          "reactions",
          "readReceiptsLast24h"
        ],
        "type": "object"
      },
      "realtime": {
        "$ref": "#/components/schemas/SiteRealtimeSnapshot"
      },
      "recentRooms": {
        "items": {
          "$ref": "#/components/schemas/SiteConversationMetadata"
        },
        "type": "array"
      }
    },
    "required": [
      "realtime",
      "conversations",
      "messages",
      "deliveryHealth",
      "abuseAndRateLimit",
      "recentRooms"
    ],
    "type": "object"
  },
  "SiteRealtimeSnapshot": {
    "properties": {
      "authMethods": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "connections": {
        "type": "number"
      },
      "namespace": {
        "type": "string"
      },
      "rooms": {
        "properties": {
          "conversation": {
            "type": "number"
          },
          "memberships": {
            "type": "number"
          },
          "task": {
            "type": "number"
          },
          "tenant": {
            "type": "number"
          },
          "total": {
            "type": "number"
          },
          "user": {
            "type": "number"
          }
        },
        "required": [
          "total",
          "tenant",
          "user",
          "conversation",
          "task",
          "memberships"
        ],
        "type": "object"
      },
      "status": {
        "type": "string"
      },
      "tenants": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      }
    },
    "required": [
      "namespace",
      "status",
      "connections",
      "rooms",
      "tenants",
      "authMethods"
    ],
    "type": "object"
  },
  "SiteReport": {
    "allOf": [
      {
        "$ref": "#/components/schemas/Report"
      },
      {
        "properties": {
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteReportExecution": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ReportExecution"
      },
      {
        "properties": {
          "requestedBy": {
            "allOf": [
              {
                "$ref": "#/components/schemas/UserSummary"
              }
            ],
            "nullable": true
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteReportExport": {
    "allOf": [
      {
        "$ref": "#/components/schemas/ReportExport"
      },
      {
        "properties": {
          "requestedBy": {
            "allOf": [
              {
                "$ref": "#/components/schemas/UserSummary"
              }
            ],
            "nullable": true
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteReportingOverview": {
    "properties": {
      "budget": {
        "properties": {
          "actual": {
            "type": "number"
          },
          "planned": {
            "type": "number"
          }
        },
        "required": [
          "planned",
          "actual"
        ],
        "type": "object"
      },
      "dashboards": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "executions": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "exports": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      },
      "recentExecutions": {
        "items": {
          "$ref": "#/components/schemas/SiteReportExecution"
        },
        "type": "array"
      },
      "recentExports": {
        "items": {
          "$ref": "#/components/schemas/SiteReportExport"
        },
        "type": "array"
      },
      "reports": {
        "properties": {
          "byStatus": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "byType": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "byStatus",
          "byType"
        ],
        "type": "object"
      },
      "tenantHealth": {
        "properties": {
          "completedTasksLast30d": {
            "type": "number"
          },
          "projects": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          },
          "tasks": {
            "additionalProperties": {
              "type": "number"
            },
            "type": "object"
          }
        },
        "required": [
          "projects",
          "tasks",
          "completedTasksLast30d"
        ],
        "type": "object"
      },
      "velocity": {
        "items": {
          "properties": {
            "completedAt": {
              "nullable": true,
              "type": "string"
            },
            "completedTasks": {
              "type": "number"
            },
            "id": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "project": {
              "properties": {
                "id": {
                  "type": "string"
                },
                "key": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "tenantId": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "key",
                "name"
              ],
              "type": "object"
            },
            "storyPoints": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "name",
            "storyPoints",
            "completedTasks"
          ],
          "type": "object"
        },
        "type": "array"
      }
    },
    "required": [
      "dashboards",
      "reports",
      "executions",
      "exports",
      "tenantHealth",
      "budget",
      "velocity",
      "recentExports",
      "recentExecutions"
    ],
    "type": "object"
  },
  "SiteSecurityPolicy": {
    "properties": {
      "allowedLoginMethods": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "allowedUploadMimeTypes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "auditRetentionDays": {
        "type": "number"
      },
      "createdAt": {
        "type": "string"
      },
      "dataRetentionDays": {
        "nullable": true,
        "type": "number"
      },
      "domainDiscoveryEnabled": {
        "type": "boolean"
      },
      "enforceIpAllowlist": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "ipAllowlist": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "maxSessionsPerUser": {
        "nullable": true,
        "type": "number"
      },
      "maxUploadBytes": {
        "nullable": true,
        "type": "number"
      },
      "metadata": {},
      "mfaRequired": {
        "type": "boolean"
      },
      "passwordHistoryCount": {
        "type": "number"
      },
      "passwordMinLength": {
        "type": "number"
      },
      "passwordRequireLower": {
        "type": "boolean"
      },
      "passwordRequireNumber": {
        "type": "boolean"
      },
      "passwordRequireSymbol": {
        "type": "boolean"
      },
      "passwordRequireUpper": {
        "type": "boolean"
      },
      "sessionTtlMinutes": {
        "type": "number"
      },
      "ssoRequired": {
        "type": "boolean"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "trustedDeviceTtlDays": {
        "type": "number"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "enforceIpAllowlist",
      "ipAllowlist",
      "sessionTtlMinutes",
      "passwordMinLength",
      "passwordRequireUpper",
      "passwordRequireLower",
      "passwordRequireNumber",
      "passwordRequireSymbol",
      "passwordHistoryCount",
      "mfaRequired",
      "allowedLoginMethods",
      "ssoRequired",
      "domainDiscoveryEnabled",
      "trustedDeviceTtlDays",
      "auditRetentionDays",
      "allowedUploadMimeTypes",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteSession": {
    "allOf": [
      {
        "$ref": "#/components/schemas/AuthSession"
      },
      {
        "properties": {
          "authMethod": {
            "type": "string"
          },
          "deviceFingerprint": {
            "nullable": true,
            "type": "string"
          },
          "deviceName": {
            "nullable": true,
            "type": "string"
          },
          "mfaVerifiedAt": {
            "nullable": true,
            "type": "string"
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          },
          "trustedDevice": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "lastUsedAt": {
                "nullable": true,
                "type": "string"
              },
              "name": {
                "nullable": true,
                "type": "string"
              },
              "revokedAt": {
                "nullable": true,
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "status"
            ],
            "type": "object"
          },
          "trustedDeviceId": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "authMethod"
        ],
        "type": "object"
      }
    ]
  },
  "SiteSessionsResponse": {
    "allOf": [
      {
        "properties": {
          "data": {
            "items": {
              "$ref": "#/components/schemas/SiteSession"
            },
            "type": "array"
          },
          "meta": {
            "properties": {
              "limit": {
                "type": "number"
              },
              "page": {
                "type": "number"
              },
              "total": {
                "type": "number"
              },
              "totalPages": {
                "type": "number"
              }
            },
            "required": [
              "page",
              "limit",
              "total",
              "totalPages"
            ],
            "type": "object"
          }
        },
        "required": [
          "data",
          "meta"
        ],
        "type": "object"
      },
      {
        "properties": {
          "summary": {
            "properties": {
              "active": {
                "type": "number"
              },
              "byMethod": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "revoked": {
                "type": "number"
              }
            },
            "required": [
              "active",
              "revoked",
              "byMethod"
            ],
            "type": "object"
          }
        },
        "required": [
          "summary"
        ],
        "type": "object"
      }
    ]
  },
  "SiteSsoProvider": {
    "properties": {
      "_count": {
        "properties": {
          "accounts": {
            "type": "number"
          },
          "loginStates": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "allowedDomains": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "authorizationUrl": {
        "nullable": true,
        "type": "string"
      },
      "buttonLabel": {
        "nullable": true,
        "type": "string"
      },
      "clientId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "issuerUrl": {
        "nullable": true,
        "type": "string"
      },
      "metadata": {},
      "name": {
        "type": "string"
      },
      "redirectUri": {
        "nullable": true,
        "type": "string"
      },
      "scopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "type": "string"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "tokenUrl": {
        "nullable": true,
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "userInfoUrl": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "type",
      "status",
      "name",
      "scopes",
      "allowedDomains",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteSubscription": {
    "properties": {
      "_count": {
        "properties": {
          "invoices": {
            "type": "number"
          },
          "usageRecords": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "cancelAtPeriodEnd": {
        "type": "boolean"
      },
      "canceledAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "currentPeriodEnd": {
        "nullable": true,
        "type": "string"
      },
      "currentPeriodStart": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "metadata": {},
      "plan": {
        "$ref": "#/components/schemas/SiteBillingPlan"
      },
      "planId": {
        "type": "string"
      },
      "provider": {
        "type": "string"
      },
      "providerCustomerId": {
        "nullable": true,
        "type": "string"
      },
      "providerSubscriptionId": {
        "nullable": true,
        "type": "string"
      },
      "seatCount": {
        "type": "number"
      },
      "status": {
        "type": "string"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "trialEndsAt": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "planId",
      "status",
      "provider",
      "seatCount",
      "cancelAtPeriodEnd",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteTenantDetail": {
    "properties": {
      "indices": {
        "properties": {
          "delivery": {
            "properties": {
              "actualBudget": {
                "type": "number"
              },
              "boards": {
                "type": "number"
              },
              "budgetVariance": {
                "type": "number"
              },
              "milestones": {
                "type": "number"
              },
              "openRisks": {
                "type": "number"
              },
              "plannedBudget": {
                "type": "number"
              },
              "sprints": {
                "type": "number"
              }
            },
            "required": [
              "sprints",
              "boards",
              "milestones",
              "openRisks",
              "plannedBudget",
              "actualBudget",
              "budgetVariance"
            ],
            "type": "object"
          },
          "projects": {
            "properties": {
              "byStatus": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "byVisibility": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "overdue": {
                "type": "number"
              },
              "total": {
                "type": "number"
              }
            },
            "required": [
              "total",
              "byStatus",
              "byVisibility",
              "overdue"
            ],
            "type": "object"
          },
          "security": {
            "properties": {
              "activeSessions": {
                "type": "number"
              },
              "apiKeys": {
                "type": "number"
              },
              "auditLogs": {
                "type": "number"
              },
              "mfaFactors": {
                "type": "number"
              },
              "openSecurityEvents": {
                "type": "number"
              },
              "platformAuditLogs": {
                "type": "number"
              },
              "revokedSessions": {
                "type": "number"
              },
              "ssoProviders": {
                "type": "number"
              },
              "totalSecurityEvents": {
                "type": "number"
              },
              "trustedDevices": {
                "type": "number"
              }
            },
            "required": [
              "activeSessions",
              "revokedSessions",
              "openSecurityEvents",
              "totalSecurityEvents",
              "apiKeys",
              "auditLogs",
              "platformAuditLogs",
              "mfaFactors",
              "trustedDevices",
              "ssoProviders"
            ],
            "type": "object"
          },
          "tasks": {
            "properties": {
              "byPriority": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "byStatus": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "byType": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "open": {
                "type": "number"
              },
              "overdue": {
                "type": "number"
              },
              "total": {
                "type": "number"
              }
            },
            "required": [
              "total",
              "open",
              "overdue",
              "byStatus",
              "byPriority",
              "byType"
            ],
            "type": "object"
          },
          "workspace": {
            "properties": {
              "aiAgents": {
                "type": "number"
              },
              "dashboards": {
                "type": "number"
              },
              "files": {
                "type": "number"
              },
              "integrations": {
                "type": "number"
              },
              "reports": {
                "type": "number"
              },
              "teams": {
                "type": "number"
              },
              "webhooks": {
                "type": "number"
              },
              "workspaces": {
                "type": "number"
              }
            },
            "required": [
              "workspaces",
              "teams",
              "integrations",
              "webhooks",
              "files",
              "aiAgents",
              "reports",
              "dashboards"
            ],
            "type": "object"
          }
        },
        "required": [
          "workspace",
          "projects",
          "tasks",
          "delivery",
          "security"
        ],
        "type": "object"
      },
      "projects": {
        "items": {
          "properties": {
            "_count": {
              "properties": {
                "budgets": {
                  "type": "number"
                },
                "changeRequests": {
                  "type": "number"
                },
                "decisions": {
                  "type": "number"
                },
                "dependencies": {
                  "type": "number"
                },
                "documents": {
                  "type": "number"
                },
                "members": {
                  "type": "number"
                },
                "milestones": {
                  "type": "number"
                },
                "risks": {
                  "type": "number"
                },
                "sprints": {
                  "type": "number"
                },
                "stakeholders": {
                  "type": "number"
                },
                "tasks": {
                  "type": "number"
                }
              },
              "type": "object"
            },
            "completedAt": {
              "nullable": true,
              "type": "string"
            },
            "createdAt": {
              "type": "string"
            },
            "description": {
              "nullable": true,
              "type": "string"
            },
            "dueDate": {
              "nullable": true,
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "key": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "progress": {
              "type": "number"
            },
            "startDate": {
              "nullable": true,
              "type": "string"
            },
            "status": {
              "$ref": "#/components/schemas/ProjectStatus"
            },
            "team": {
              "nullable": true,
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name"
              ],
              "type": "object"
            },
            "updatedAt": {
              "type": "string"
            },
            "visibility": {
              "$ref": "#/components/schemas/Visibility"
            },
            "workspace": {
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "slug": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name",
                "slug"
              ],
              "type": "object"
            }
          },
          "required": [
            "id",
            "key",
            "name",
            "status",
            "progress"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "recentSecurityEvents": {
        "items": {
          "$ref": "#/components/schemas/SecurityEvent"
        },
        "type": "array"
      },
      "recentTasks": {
        "items": {
          "allOf": [
            {
              "properties": {
                "dueDate": {
                  "nullable": true,
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "key": {
                  "type": "string"
                },
                "priority": {
                  "$ref": "#/components/schemas/TaskPriority"
                },
                "status": {
                  "$ref": "#/components/schemas/TaskStatus"
                },
                "storyPoints": {
                  "nullable": true,
                  "type": "number"
                },
                "title": {
                  "type": "string"
                },
                "type": {
                  "$ref": "#/components/schemas/TaskType"
                },
                "updatedAt": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "key",
                "title",
                "type",
                "status",
                "priority"
              ],
              "type": "object"
            },
            {
              "properties": {
                "_count": {
                  "properties": {
                    "assignees": {
                      "type": "number"
                    },
                    "attachments": {
                      "type": "number"
                    },
                    "checklists": {
                      "type": "number"
                    },
                    "comments": {
                      "type": "number"
                    }
                  },
                  "type": "object"
                },
                "project": {
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "key": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "key",
                    "name"
                  ],
                  "type": "object"
                }
              },
              "required": [
                "project"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "recentUsers": {
        "items": {
          "$ref": "#/components/schemas/TenantUser"
        },
        "type": "array"
      },
      "securityEvents": {
        "properties": {
          "open": {
            "type": "number"
          },
          "total": {
            "type": "number"
          }
        },
        "required": [
          "open"
        ],
        "type": "object"
      },
      "sessions": {
        "properties": {
          "active": {
            "type": "number"
          },
          "revoked": {
            "type": "number"
          }
        },
        "required": [
          "active"
        ],
        "type": "object"
      },
      "tenant": {
        "$ref": "#/components/schemas/Tenant"
      },
      "users": {
        "additionalProperties": {
          "type": "number"
        },
        "type": "object"
      }
    },
    "required": [
      "tenant",
      "users",
      "sessions",
      "securityEvents",
      "indices",
      "projects",
      "recentUsers",
      "recentTasks",
      "recentSecurityEvents"
    ],
    "type": "object"
  },
  "SiteTenantResourceSection": {
    "enum": [
      "users",
      "projects",
      "workspaces",
      "teams",
      "sessions",
      "security",
      "billing",
      "integrations",
      "files",
      "ai",
      "reports",
      "activity"
    ],
    "type": "string"
  },
  "SiteTrustedDevice": {
    "properties": {
      "_count": {
        "properties": {
          "sessions": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "expiresAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "ipAddress": {
        "nullable": true,
        "type": "string"
      },
      "lastUsedAt": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "nullable": true,
        "type": "string"
      },
      "revokedAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "user": {
        "$ref": "#/components/schemas/UserSummary"
      },
      "userAgent": {
        "nullable": true,
        "type": "string"
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "userId",
      "status",
      "expiresAt",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "SiteUsageRecord": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "featureId": {
        "nullable": true,
        "type": "string"
      },
      "featureKey": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "periodEnd": {
        "type": "string"
      },
      "periodStart": {
        "type": "string"
      },
      "quantity": {
        "type": "number"
      },
      "source": {
        "type": "string"
      },
      "subscription": {
        "allOf": [
          {
            "properties": {
              "id": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "status"
            ],
            "type": "object"
          },
          {
            "properties": {
              "plan": {
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "slug": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "slug"
                ],
                "type": "object"
              }
            },
            "type": "object"
          }
        ]
      },
      "subscriptionId": {
        "nullable": true,
        "type": "string"
      },
      "tenant": {
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          },
          "status": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug",
          "status"
        ],
        "type": "object"
      },
      "tenantId": {
        "type": "string"
      },
      "unit": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "featureKey",
      "quantity",
      "source",
      "periodStart",
      "periodEnd",
      "createdAt"
    ],
    "type": "object"
  },
  "SiteUserDetail": {
    "properties": {
      "platformAuditLogs": {
        "items": {
          "$ref": "#/components/schemas/PlatformAuditLog"
        },
        "type": "array"
      },
      "securityEvents": {
        "items": {
          "$ref": "#/components/schemas/SecurityEvent"
        },
        "type": "array"
      },
      "tenantAuditLogs": {
        "items": {
          "$ref": "#/components/schemas/AuditLog"
        },
        "type": "array"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/TenantUser"
          },
          {
            "properties": {
              "_count": {
                "additionalProperties": {
                  "type": "number"
                },
                "type": "object"
              },
              "assignedTasks": {
                "items": {
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "task": {
                      "allOf": [
                        {
                          "properties": {
                            "dueDate": {
                              "nullable": true,
                              "type": "string"
                            },
                            "id": {
                              "type": "string"
                            },
                            "key": {
                              "type": "string"
                            },
                            "priority": {
                              "$ref": "#/components/schemas/TaskPriority"
                            },
                            "status": {
                              "$ref": "#/components/schemas/TaskStatus"
                            },
                            "title": {
                              "type": "string"
                            },
                            "type": {
                              "$ref": "#/components/schemas/TaskType"
                            },
                            "updatedAt": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "id",
                            "key",
                            "title",
                            "type",
                            "status",
                            "priority"
                          ],
                          "type": "object"
                        },
                        {
                          "properties": {
                            "project": {
                              "properties": {
                                "id": {
                                  "type": "string"
                                },
                                "key": {
                                  "type": "string"
                                },
                                "name": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "id",
                                "key",
                                "name"
                              ],
                              "type": "object"
                            }
                          },
                          "required": [
                            "project"
                          ],
                          "type": "object"
                        }
                      ]
                    }
                  },
                  "required": [
                    "id",
                    "task"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "authSessions": {
                "items": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/AuthSession"
                    },
                    {
                      "properties": {
                        "authMethod": {
                          "type": "string"
                        },
                        "deviceName": {
                          "nullable": true,
                          "type": "string"
                        },
                        "mfaVerifiedAt": {
                          "nullable": true,
                          "type": "string"
                        },
                        "trustedDevice": {
                          "nullable": true,
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "lastUsedAt": {
                              "nullable": true,
                              "type": "string"
                            },
                            "name": {
                              "nullable": true,
                              "type": "string"
                            },
                            "status": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "id",
                            "status"
                          ],
                          "type": "object"
                        }
                      },
                      "type": "object"
                    }
                  ]
                },
                "type": "array"
              },
              "avatarUrl": {
                "nullable": true,
                "type": "string"
              },
              "emailVerificationTokens": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "expiresAt": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "usedAt": {
                      "nullable": true,
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "expiresAt",
                    "createdAt"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "failedLoginAttempts": {
                "type": "number"
              },
              "lockedUntil": {
                "nullable": true,
                "type": "string"
              },
              "loginHistory": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "ipAddress": {
                      "nullable": true,
                      "type": "string"
                    },
                    "method": {
                      "type": "string"
                    },
                    "reason": {
                      "nullable": true,
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "suspicious": {
                      "type": "boolean"
                    },
                    "tenantId": {
                      "nullable": true,
                      "type": "string"
                    },
                    "tenantSlug": {
                      "nullable": true,
                      "type": "string"
                    },
                    "userAgent": {
                      "nullable": true,
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "email",
                    "method",
                    "status",
                    "suspicious",
                    "createdAt"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "mfaFactors": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "disabledAt": {
                      "nullable": true,
                      "type": "string"
                    },
                    "enabledAt": {
                      "nullable": true,
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "label": {
                      "nullable": true,
                      "type": "string"
                    },
                    "lastUsedAt": {
                      "nullable": true,
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    },
                    "updatedAt": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "type",
                    "status",
                    "createdAt",
                    "updatedAt"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "passwordResetTokens": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "expiresAt": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "usedAt": {
                      "nullable": true,
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "expiresAt",
                    "createdAt"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "platformAdminProfile": {
                "nullable": true,
                "properties": {
                  "createdAt": {
                    "type": "string"
                  },
                  "id": {
                    "type": "string"
                  },
                  "level": {
                    "$ref": "#/components/schemas/PlatformAdminLevel"
                  },
                  "revokedAt": {
                    "nullable": true,
                    "type": "string"
                  },
                  "scopes": {
                    "items": {
                      "type": "string"
                    },
                    "type": "array"
                  },
                  "status": {
                    "$ref": "#/components/schemas/PlatformAdminStatus"
                  },
                  "updatedAt": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "level",
                  "status",
                  "scopes",
                  "createdAt",
                  "updatedAt"
                ],
                "type": "object"
              },
              "projectMembers": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "project": {
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "key": {
                          "type": "string"
                        },
                        "name": {
                          "type": "string"
                        },
                        "progress": {
                          "type": "number"
                        },
                        "status": {
                          "$ref": "#/components/schemas/ProjectStatus"
                        },
                        "visibility": {
                          "$ref": "#/components/schemas/Visibility"
                        },
                        "workspace": {
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
                            "slug": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "id",
                            "name",
                            "slug"
                          ],
                          "type": "object"
                        }
                      },
                      "required": [
                        "id",
                        "key",
                        "name",
                        "status",
                        "progress"
                      ],
                      "type": "object"
                    },
                    "role": {
                      "nullable": true,
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "createdAt",
                    "project"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "ssoAccounts": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "displayName": {
                      "nullable": true,
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "lastLoginAt": {
                      "nullable": true,
                      "type": "string"
                    },
                    "provider": {
                      "nullable": true,
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "name": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string"
                        },
                        "type": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "id",
                        "name",
                        "type",
                        "status"
                      ],
                      "type": "object"
                    },
                    "providerType": {
                      "type": "string"
                    },
                    "updatedAt": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "providerType",
                    "email",
                    "createdAt",
                    "updatedAt"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "teamMemberships": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "role": {
                      "nullable": true,
                      "type": "string"
                    },
                    "team": {
                      "allOf": [
                        {
                          "$ref": "#/components/schemas/Team"
                        },
                        {
                          "properties": {
                            "workspace": {
                              "nullable": true,
                              "properties": {
                                "id": {
                                  "type": "string"
                                },
                                "name": {
                                  "type": "string"
                                },
                                "slug": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "id",
                                "name",
                                "slug"
                              ],
                              "type": "object"
                            }
                          },
                          "type": "object"
                        }
                      ]
                    }
                  },
                  "required": [
                    "id",
                    "createdAt",
                    "team"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "trustedDevices": {
                "items": {
                  "properties": {
                    "createdAt": {
                      "type": "string"
                    },
                    "expiresAt": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "ipAddress": {
                      "nullable": true,
                      "type": "string"
                    },
                    "lastUsedAt": {
                      "nullable": true,
                      "type": "string"
                    },
                    "name": {
                      "nullable": true,
                      "type": "string"
                    },
                    "revokedAt": {
                      "nullable": true,
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "updatedAt": {
                      "type": "string"
                    },
                    "userAgent": {
                      "nullable": true,
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "status",
                    "expiresAt",
                    "createdAt",
                    "updatedAt"
                  ],
                  "type": "object"
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        ]
      }
    },
    "required": [
      "user",
      "securityEvents",
      "tenantAuditLogs",
      "platformAuditLogs"
    ],
    "type": "object"
  },
  "SiteWebhook": {
    "allOf": [
      {
        "properties": {
          "_count": {
            "properties": {
              "deliveries": {
                "type": "number"
              }
            },
            "type": "object"
          },
          "createdAt": {
            "type": "string"
          },
          "createdById": {
            "nullable": true,
            "type": "string"
          },
          "description": {
            "nullable": true,
            "type": "string"
          },
          "enabled": {
            "type": "boolean"
          },
          "events": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "failureCount": {
            "type": "number"
          },
          "hasSecret": {
            "type": "boolean"
          },
          "id": {
            "type": "string"
          },
          "lastDeliveryAt": {
            "nullable": true,
            "type": "string"
          },
          "lastError": {
            "nullable": true,
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "signingAlgorithm": {
            "type": "string"
          },
          "signingSecret": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "tenantId",
          "name",
          "url",
          "signingAlgorithm",
          "events",
          "enabled",
          "failureCount",
          "createdAt",
          "updatedAt"
        ],
        "type": "object"
      },
      {
        "properties": {
          "_count": {
            "properties": {
              "deliveries": {
                "type": "number"
              }
            },
            "type": "object"
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteWebhookDelivery": {
    "allOf": [
      {
        "$ref": "#/components/schemas/WebhookDelivery"
      },
      {
        "properties": {
          "webhook": {
            "allOf": [
              {
                "properties": {
                  "enabled": {
                    "type": "boolean"
                  },
                  "events": {
                    "items": {
                      "type": "string"
                    },
                    "type": "array"
                  },
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "url": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "url",
                  "events",
                  "enabled"
                ],
                "type": "object"
              },
              {
                "properties": {
                  "tenant": {
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      },
                      "slug": {
                        "type": "string"
                      },
                      "status": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "name",
                      "slug",
                      "status"
                    ],
                    "type": "object"
                  }
                },
                "type": "object"
              }
            ]
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteWorkflow": {
    "allOf": [
      {
        "properties": {
          "_count": {
            "properties": {
              "runs": {
                "type": "number"
              }
            },
            "type": "object"
          },
          "archivedAt": {
            "nullable": true,
            "type": "string"
          },
          "config": {},
          "createdAt": {
            "type": "string"
          },
          "createdById": {
            "nullable": true,
            "type": "string"
          },
          "description": {
            "nullable": true,
            "type": "string"
          },
          "entityType": {
            "type": "string"
          },
          "eventType": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "isActive": {
            "type": "boolean"
          },
          "lastRunAt": {
            "nullable": true,
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          },
          "triggerType": {
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "tenantId",
          "name",
          "entityType",
          "triggerType",
          "isActive",
          "createdAt",
          "updatedAt"
        ],
        "type": "object"
      },
      {
        "properties": {
          "nodes": {
            "items": {
              "$ref": "#/components/schemas/WorkflowNode"
            },
            "type": "array"
          },
          "tenant": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteWorkflowRun": {
    "allOf": [
      {
        "$ref": "#/components/schemas/WorkflowRun"
      },
      {
        "properties": {
          "tenant": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SiteWorkflowRunLog": {
    "allOf": [
      {
        "$ref": "#/components/schemas/WorkflowRunLog"
      },
      {
        "properties": {
          "node": {
            "nullable": true,
            "properties": {
              "actionType": {
                "nullable": true,
                "type": "string"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "type": {
                "type": "string"
              }
            },
            "required": [
              "name",
              "type"
            ],
            "type": "object"
          },
          "run": {
            "allOf": [
              {
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "status": {
                    "$ref": "#/components/schemas/WorkflowRunStatus"
                  },
                  "tenantId": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "tenantId",
                  "status"
                ],
                "type": "object"
              },
              {
                "properties": {
                  "workflow": {
                    "nullable": true,
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "id",
                      "name"
                    ],
                    "type": "object"
                  }
                },
                "type": "object"
              }
            ]
          },
          "tenant": {
            "nullable": true,
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          }
        },
        "type": "object"
      }
    ]
  },
  "SlaAnalytics": {
    "properties": {
      "breached": {
        "type": "number"
      },
      "completedOnTime": {
        "type": "number"
      },
      "compliancePercent": {
        "type": "number"
      },
      "totalWithDueDate": {
        "type": "number"
      }
    },
    "required": [
      "totalWithDueDate",
      "breached",
      "completedOnTime",
      "compliancePercent"
    ],
    "type": "object"
  },
  "Sprint": {
    "properties": {
      "_count": {
        "properties": {
          "retrospectives": {
            "type": "number"
          },
          "tasks": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "endDate": {
        "nullable": true,
        "type": "string"
      },
      "goal": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "project": {
        "properties": {
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "name"
        ],
        "type": "object"
      },
      "projectId": {
        "type": "string"
      },
      "startDate": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "name"
    ],
    "type": "object"
  },
  "SsoProvider": {
    "properties": {
      "allowedDomains": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "authorizationUrl": {
        "nullable": true,
        "type": "string"
      },
      "buttonLabel": {
        "nullable": true,
        "type": "string"
      },
      "clientId": {
        "nullable": true,
        "type": "string"
      },
      "clientSecretConfigured": {
        "type": "boolean"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "issuerUrl": {
        "nullable": true,
        "type": "string"
      },
      "metadata": {},
      "name": {
        "type": "string"
      },
      "redirectUri": {
        "nullable": true,
        "type": "string"
      },
      "scopes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "status": {
        "enum": [
          "ACTIVE",
          "DISABLED"
        ],
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "tokenUrl": {
        "nullable": true,
        "type": "string"
      },
      "type": {
        "enum": [
          "GOOGLE",
          "MICROSOFT",
          "OIDC",
          "SAML"
        ],
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "userInfoUrl": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "type",
      "status",
      "name",
      "clientSecretConfigured",
      "scopes",
      "allowedDomains",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "Task": {
    "properties": {
      "_count": {
        "properties": {
          "attachments": {
            "type": "number"
          },
          "checklists": {
            "type": "number"
          },
          "comments": {
            "type": "number"
          },
          "dependenciesFrom": {
            "type": "number"
          },
          "dependenciesTo": {
            "type": "number"
          },
          "subtasks": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "actualMins": {
        "nullable": true,
        "type": "number"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "assignees": {
        "items": {
          "$ref": "#/components/schemas/TaskAssignee"
        },
        "type": "array"
      },
      "boardColumn": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "sortOrder": {
            "type": "number"
          },
          "status": {
            "allOf": [
              {
                "$ref": "#/components/schemas/TaskStatus"
              }
            ],
            "nullable": true
          }
        },
        "required": [
          "id",
          "name",
          "sortOrder"
        ],
        "type": "object"
      },
      "boardColumnId": {
        "nullable": true,
        "type": "string"
      },
      "card": {
        "$ref": "#/components/schemas/TaskBoardCardSummary"
      },
      "checklists": {
        "items": {
          "$ref": "#/components/schemas/TaskChecklist"
        },
        "type": "array"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "deletedAt": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "dueDate": {
        "nullable": true,
        "type": "string"
      },
      "estimateMins": {
        "nullable": true,
        "type": "number"
      },
      "id": {
        "type": "string"
      },
      "key": {
        "type": "string"
      },
      "labels": {
        "items": {
          "$ref": "#/components/schemas/TaskLabelAssignment"
        },
        "type": "array"
      },
      "metrics": {
        "$ref": "#/components/schemas/TaskBoardMetrics"
      },
      "permissions": {
        "$ref": "#/components/schemas/TaskBoardPermissions"
      },
      "priority": {
        "$ref": "#/components/schemas/TaskPriority"
      },
      "project": {
        "properties": {
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "teamId": {
            "nullable": true,
            "type": "string"
          },
          "workspaceId": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "name"
        ],
        "type": "object"
      },
      "projectId": {
        "type": "string"
      },
      "reporter": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "sortOrder": {
        "type": "number"
      },
      "sprint": {
        "nullable": true,
        "properties": {
          "completedAt": {
            "nullable": true,
            "type": "string"
          },
          "endDate": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "startDate": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "sprintId": {
        "nullable": true,
        "type": "string"
      },
      "startDate": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/TaskStatus"
      },
      "storyPoints": {
        "nullable": true,
        "type": "number"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/TaskType"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "projectId",
      "key",
      "title",
      "type",
      "status",
      "priority",
      "sortOrder"
    ],
    "type": "object"
  },
  "TaskActivity": {
    "properties": {
      "action": {
        "type": "string"
      },
      "actorId": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "newValue": {},
      "oldValue": {},
      "taskId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "taskId",
      "action",
      "createdAt"
    ],
    "type": "object"
  },
  "TaskAssignee": {
    "properties": {
      "id": {
        "type": "string"
      },
      "user": {
        "$ref": "#/components/schemas/UserSummary"
      }
    },
    "required": [
      "id",
      "user"
    ],
    "type": "object"
  },
  "TaskAttachment": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "fileName": {
        "type": "string"
      },
      "fileUrl": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "mimeType": {
        "nullable": true,
        "type": "string"
      },
      "sizeBytes": {
        "nullable": true,
        "type": "number"
      },
      "taskId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "taskId",
      "fileName",
      "fileUrl",
      "createdAt"
    ],
    "type": "object"
  },
  "TaskBoardCardSummary": {
    "properties": {
      "assignees": {
        "items": {
          "properties": {
            "avatarUrl": {
              "nullable": true,
              "type": "string"
            },
            "email": {
              "type": "string"
            },
            "firstName": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "lastName": {
              "type": "string"
            },
            "userId": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "userId",
            "email",
            "firstName",
            "lastName"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "attachments": {
        "properties": {
          "count": {
            "type": "number"
          },
          "previews": {
            "items": {
              "properties": {
                "createdAt": {
                  "type": "string"
                },
                "fileName": {
                  "type": "string"
                },
                "fileUrl": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "kind": {
                  "oneOf": [
                    {
                      "enum": [
                        "IMAGE"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "PDF"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "SHEET"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "SLIDE"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "DOC"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "VIDEO"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "AUDIO"
                      ],
                      "type": "string"
                    },
                    {
                      "enum": [
                        "FILE"
                      ],
                      "type": "string"
                    },
                    {
                      "type": "string"
                    }
                  ]
                },
                "mimeType": {
                  "nullable": true,
                  "type": "string"
                },
                "sizeBytes": {
                  "nullable": true,
                  "type": "number"
                }
              },
              "required": [
                "id",
                "fileName",
                "fileUrl",
                "kind",
                "createdAt"
              ],
              "type": "object"
            },
            "type": "array"
          }
        },
        "required": [
          "count",
          "previews"
        ],
        "type": "object"
      },
      "checklist": {
        "properties": {
          "checklistCount": {
            "type": "number"
          },
          "completed": {
            "type": "number"
          },
          "percent": {
            "type": "number"
          },
          "total": {
            "type": "number"
          }
        },
        "required": [
          "checklistCount",
          "total",
          "completed",
          "percent"
        ],
        "type": "object"
      },
      "code": {
        "type": "string"
      },
      "colors": {
        "properties": {
          "priority": {
            "type": "string"
          },
          "rail": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "type": {
            "type": "string"
          }
        },
        "required": [
          "status",
          "priority",
          "type",
          "rail"
        ],
        "type": "object"
      },
      "comments": {
        "properties": {
          "count": {
            "type": "number"
          },
          "latest": {
            "nullable": true,
            "properties": {
              "author": {
                "$ref": "#/components/schemas/UserSummary"
              },
              "authorId": {
                "type": "string"
              },
              "body": {
                "type": "string"
              },
              "createdAt": {
                "type": "string"
              },
              "id": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "body",
              "authorId",
              "author",
              "createdAt"
            ],
            "type": "object"
          }
        },
        "required": [
          "count"
        ],
        "type": "object"
      },
      "dependencies": {
        "properties": {
          "blockedByCount": {
            "type": "number"
          },
          "blockers": {
            "items": {
              "properties": {
                "id": {
                  "type": "string"
                },
                "task": {
                  "$ref": "#/components/schemas/TaskReferenceSummary"
                },
                "type": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "type",
                "task"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "blocking": {
            "items": {
              "properties": {
                "id": {
                  "type": "string"
                },
                "task": {
                  "$ref": "#/components/schemas/TaskReferenceSummary"
                },
                "type": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "type",
                "task"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "blockingCount": {
            "type": "number"
          },
          "isBlocked": {
            "type": "boolean"
          },
          "isBlocking": {
            "type": "boolean"
          }
        },
        "required": [
          "isBlocked",
          "isBlocking",
          "blockedByCount",
          "blockingCount",
          "blockers",
          "blocking"
        ],
        "type": "object"
      },
      "due": {
        "properties": {
          "date": {
            "nullable": true,
            "type": "string"
          },
          "daysUntil": {
            "nullable": true,
            "type": "number"
          },
          "state": {
            "$ref": "#/components/schemas/TaskDueState"
          }
        },
        "required": [
          "state"
        ],
        "type": "object"
      },
      "estimate": {
        "properties": {
          "actualMins": {
            "nullable": true,
            "type": "number"
          },
          "estimateMins": {
            "nullable": true,
            "type": "number"
          },
          "remainingMins": {
            "nullable": true,
            "type": "number"
          }
        },
        "type": "object"
      },
      "flags": {
        "properties": {
          "hasAssignees": {
            "type": "boolean"
          },
          "hasAttachments": {
            "type": "boolean"
          },
          "hasChecklist": {
            "type": "boolean"
          },
          "hasComments": {
            "type": "boolean"
          },
          "hasLabels": {
            "type": "boolean"
          },
          "hasSubtasks": {
            "type": "boolean"
          },
          "isBlocked": {
            "type": "boolean"
          },
          "isBlocking": {
            "type": "boolean"
          },
          "isDueToday": {
            "type": "boolean"
          },
          "isHighPriority": {
            "type": "boolean"
          },
          "isOverdue": {
            "type": "boolean"
          },
          "isStale": {
            "type": "boolean"
          }
        },
        "required": [
          "isBlocked",
          "isBlocking",
          "isOverdue",
          "isDueToday",
          "isHighPriority",
          "hasAssignees",
          "hasLabels",
          "hasComments",
          "hasAttachments",
          "hasChecklist",
          "hasSubtasks",
          "isStale"
        ],
        "type": "object"
      },
      "freshness": {
        "properties": {
          "createdAgeDays": {
            "type": "number"
          },
          "updatedAgeDays": {
            "type": "number"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "createdAgeDays",
          "updatedAgeDays",
          "updatedAt"
        ],
        "type": "object"
      },
      "key": {
        "type": "string"
      },
      "labels": {
        "items": {
          "properties": {
            "color": {
              "nullable": true,
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "labelId": {
              "type": "string"
            },
            "name": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "labelId",
            "name"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "priority": {
        "$ref": "#/components/schemas/TaskPriority"
      },
      "sprint": {
        "nullable": true,
        "properties": {
          "completedAt": {
            "nullable": true,
            "type": "string"
          },
          "endDate": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "startDate": {
            "nullable": true,
            "type": "string"
          },
          "state": {
            "oneOf": [
              {
                "enum": [
                  "PLANNED"
                ],
                "type": "string"
              },
              {
                "enum": [
                  "ACTIVE"
                ],
                "type": "string"
              },
              {
                "enum": [
                  "ENDED"
                ],
                "type": "string"
              },
              {
                "enum": [
                  "COMPLETED"
                ],
                "type": "string"
              },
              {
                "enum": [
                  "UNSCHEDULED"
                ],
                "type": "string"
              },
              {
                "type": "string"
              }
            ]
          }
        },
        "required": [
          "id",
          "name",
          "state"
        ],
        "type": "object"
      },
      "status": {
        "$ref": "#/components/schemas/TaskStatus"
      },
      "storyPoints": {
        "nullable": true,
        "type": "number"
      },
      "title": {
        "type": "string"
      },
      "type": {
        "$ref": "#/components/schemas/TaskType"
      }
    },
    "required": [
      "key",
      "code",
      "title",
      "type",
      "status",
      "priority",
      "colors",
      "assignees",
      "labels",
      "due",
      "estimate",
      "checklist",
      "comments",
      "attachments",
      "dependencies",
      "flags",
      "freshness"
    ],
    "type": "object"
  },
  "TaskBoardMetrics": {
    "properties": {
      "actualMins": {
        "type": "number"
      },
      "ageDays": {
        "type": "number"
      },
      "attachmentCount": {
        "type": "number"
      },
      "blockedByCount": {
        "type": "number"
      },
      "blockingCount": {
        "type": "number"
      },
      "checklistCompleted": {
        "type": "number"
      },
      "checklistTotal": {
        "type": "number"
      },
      "commentCount": {
        "type": "number"
      },
      "estimateMins": {
        "type": "number"
      },
      "remainingMins": {
        "type": "number"
      },
      "storyPoints": {
        "type": "number"
      },
      "updatedAgeDays": {
        "type": "number"
      }
    },
    "required": [
      "storyPoints",
      "estimateMins",
      "actualMins",
      "remainingMins",
      "commentCount",
      "attachmentCount",
      "checklistTotal",
      "checklistCompleted",
      "blockedByCount",
      "blockingCount",
      "ageDays",
      "updatedAgeDays"
    ],
    "type": "object"
  },
  "TaskBoardPermissions": {
    "properties": {
      "canArchive": {
        "type": "boolean"
      },
      "canAssign": {
        "type": "boolean"
      },
      "canAttach": {
        "type": "boolean"
      },
      "canComment": {
        "type": "boolean"
      },
      "canDelete": {
        "type": "boolean"
      },
      "canEdit": {
        "type": "boolean"
      },
      "canMove": {
        "type": "boolean"
      },
      "canView": {
        "type": "boolean"
      }
    },
    "required": [
      "canView",
      "canEdit",
      "canMove",
      "canArchive",
      "canDelete",
      "canAssign",
      "canComment",
      "canAttach"
    ],
    "type": "object"
  },
  "TaskChecklist": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "items": {
        "items": {
          "$ref": "#/components/schemas/TaskChecklistItem"
        },
        "type": "array"
      },
      "taskId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "taskId",
      "title",
      "items"
    ],
    "type": "object"
  },
  "TaskChecklistItem": {
    "properties": {
      "checklistId": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isDone": {
        "type": "boolean"
      },
      "sortOrder": {
        "type": "number"
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "checklistId",
      "text",
      "isDone",
      "sortOrder"
    ],
    "type": "object"
  },
  "TaskComment": {
    "properties": {
      "_count": {
        "properties": {
          "replies": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "author": {
        "$ref": "#/components/schemas/UserSummary"
      },
      "authorId": {
        "type": "string"
      },
      "body": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "parentId": {
        "nullable": true,
        "type": "string"
      },
      "taskId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "taskId",
      "authorId",
      "body",
      "createdAt",
      "updatedAt",
      "author"
    ],
    "type": "object"
  },
  "TaskDependency": {
    "properties": {
      "fromTask": {
        "properties": {
          "dueDate": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "priority": {
            "$ref": "#/components/schemas/TaskPriority"
          },
          "status": {
            "$ref": "#/components/schemas/TaskStatus"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "title",
          "status",
          "priority"
        ],
        "type": "object"
      },
      "fromTaskId": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "toTask": {
        "properties": {
          "dueDate": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "priority": {
            "$ref": "#/components/schemas/TaskPriority"
          },
          "status": {
            "$ref": "#/components/schemas/TaskStatus"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "title",
          "status",
          "priority"
        ],
        "type": "object"
      },
      "toTaskId": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "fromTaskId",
      "toTaskId",
      "type"
    ],
    "type": "object"
  },
  "TaskDueState": {
    "enum": [
      "NONE",
      "OVERDUE",
      "TODAY",
      "UPCOMING",
      "DONE"
    ],
    "type": "string"
  },
  "TaskLabel": {
    "properties": {
      "_count": {
        "properties": {
          "tasks": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "color": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "name"
    ],
    "type": "object"
  },
  "TaskLabelAssignment": {
    "properties": {
      "id": {
        "type": "string"
      },
      "label": {
        "$ref": "#/components/schemas/TaskLabel"
      }
    },
    "required": [
      "id",
      "label"
    ],
    "type": "object"
  },
  "TaskPriority": {
    "enum": [
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
      "CRITICAL"
    ],
    "type": "string"
  },
  "TaskReferenceSummary": {
    "properties": {
      "id": {
        "type": "string"
      },
      "key": {
        "type": "string"
      },
      "priority": {
        "$ref": "#/components/schemas/TaskPriority"
      },
      "status": {
        "$ref": "#/components/schemas/TaskStatus"
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "key",
      "title",
      "status",
      "priority"
    ],
    "type": "object"
  },
  "TaskSavedView": {
    "properties": {
      "columns": {
        "additionalProperties": {},
        "nullable": true,
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "filters": {
        "additionalProperties": {},
        "type": "object"
      },
      "id": {
        "type": "string"
      },
      "isDefault": {
        "type": "boolean"
      },
      "name": {
        "type": "string"
      },
      "owner": {
        "$ref": "#/components/schemas/UserSummary"
      },
      "ownerId": {
        "type": "string"
      },
      "project": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "name"
        ],
        "type": "object"
      },
      "projectId": {
        "nullable": true,
        "type": "string"
      },
      "sortBy": {
        "nullable": true,
        "type": "string"
      },
      "sortDirection": {
        "enum": [
          "asc",
          "desc"
        ],
        "nullable": true,
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "id",
      "tenantId",
      "ownerId",
      "name",
      "visibility",
      "filters",
      "isDefault",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "TaskStatus": {
    "enum": [
      "BACKLOG",
      "TODO",
      "IN_PROGRESS",
      "REVIEW",
      "TESTING",
      "DONE",
      "CANCELLED"
    ],
    "type": "string"
  },
  "TaskTaxonomy": {
    "properties": {
      "customFieldEntityTypes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "dependencyTypes": {
        "items": {
          "properties": {
            "inverseLabel": {
              "type": "string"
            },
            "label": {
              "type": "string"
            },
            "value": {
              "type": "string"
            }
          },
          "required": [
            "value",
            "label",
            "inverseLabel"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "priorities": {
        "items": {
          "$ref": "#/components/schemas/TaskPriority"
        },
        "type": "array"
      },
      "sortFields": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "statuses": {
        "items": {
          "$ref": "#/components/schemas/TaskStatus"
        },
        "type": "array"
      },
      "taskTypes": {
        "items": {
          "properties": {
            "category": {
              "type": "string"
            },
            "label": {
              "type": "string"
            },
            "value": {
              "$ref": "#/components/schemas/TaskType"
            },
            "workflow": {
              "items": {
                "$ref": "#/components/schemas/TaskStatus"
              },
              "type": "array"
            }
          },
          "required": [
            "value",
            "label",
            "category",
            "workflow"
          ],
          "type": "object"
        },
        "type": "array"
      }
    },
    "required": [
      "taskTypes",
      "statuses",
      "priorities",
      "dependencyTypes",
      "sortFields",
      "customFieldEntityTypes"
    ],
    "type": "object"
  },
  "TaskType": {
    "enum": [
      "TASK",
      "BUG",
      "STORY",
      "EPIC",
      "FEATURE",
      "INCIDENT",
      "APPROVAL",
      "CHANGE_REQUEST",
      "MILESTONE"
    ],
    "type": "string"
  },
  "TaskWatcher": {
    "properties": {
      "id": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          }
        ],
        "nullable": true
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id"
    ],
    "type": "object"
  },
  "Team": {
    "properties": {
      "_count": {
        "properties": {
          "members": {
            "type": "number"
          },
          "projects": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "workspace": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "slug": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "slug"
        ],
        "type": "object"
      },
      "workspaceId": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name"
    ],
    "type": "object"
  },
  "TeamMember": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "role": {
        "nullable": true,
        "type": "string"
      },
      "teamId": {
        "type": "string"
      },
      "user": {
        "allOf": [
          {
            "$ref": "#/components/schemas/UserSummary"
          },
          {
            "properties": {
              "roles": {
                "items": {
                  "properties": {
                    "role": {
                      "$ref": "#/components/schemas/Role"
                    }
                  },
                  "required": [
                    "role"
                  ],
                  "type": "object"
                },
                "type": "array"
              }
            },
            "type": "object"
          }
        ]
      },
      "userId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "teamId",
      "userId",
      "user"
    ],
    "type": "object"
  },
  "TeamPerformanceAnalytics": {
    "properties": {
      "data": {
        "items": {
          "allOf": [
            {
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name"
              ],
              "type": "object"
            },
            {
              "properties": {
                "_count": {
                  "properties": {
                    "members": {
                      "type": "number"
                    },
                    "projects": {
                      "type": "number"
                    }
                  },
                  "type": "object"
                },
                "completionRate": {
                  "type": "number"
                },
                "doneTasks": {
                  "type": "number"
                },
                "minutes": {
                  "type": "number"
                },
                "tasks": {
                  "type": "number"
                }
              },
              "required": [
                "tasks",
                "doneTasks",
                "completionRate",
                "minutes"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "data",
      "total"
    ],
    "type": "object"
  },
  "Tenant": {
    "properties": {
      "_count": {
        "properties": {
          "auditLogs": {
            "type": "number"
          },
          "integrations": {
            "type": "number"
          },
          "projects": {
            "type": "number"
          },
          "securityEvents": {
            "type": "number"
          },
          "teams": {
            "type": "number"
          },
          "users": {
            "type": "number"
          },
          "workspaces": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "logoUrl": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "slug": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "website": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "name",
      "slug",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "TenantUser": {
    "allOf": [
      {
        "$ref": "#/components/schemas/UserSummary"
      },
      {
        "properties": {
          "createdAt": {
            "type": "string"
          },
          "emailVerifiedAt": {
            "nullable": true,
            "type": "string"
          },
          "lastLoginAt": {
            "nullable": true,
            "type": "string"
          },
          "locale": {
            "nullable": true,
            "type": "string"
          },
          "roles": {
            "items": {
              "properties": {
                "role": {
                  "properties": {
                    "description": {
                      "nullable": true,
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "isSystem": {
                      "type": "boolean"
                    },
                    "name": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id",
                    "name",
                    "isSystem"
                  ],
                  "type": "object"
                }
              },
              "required": [
                "role"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "tenant": {
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "slug": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "name",
              "slug",
              "status"
            ],
            "type": "object"
          },
          "tenantId": {
            "type": "string"
          },
          "timezone": {
            "nullable": true,
            "type": "string"
          },
          "updatedAt": {
            "type": "string"
          }
        },
        "required": [
          "tenantId"
        ],
        "type": "object"
      }
    ]
  },
  "TotpSetupResponse": {
    "properties": {
      "factorId": {
        "type": "string"
      },
      "issuer": {
        "type": "string"
      },
      "otpauthUrl": {
        "type": "string"
      },
      "secret": {
        "type": "string"
      }
    },
    "required": [
      "factorId",
      "secret",
      "otpauthUrl",
      "issuer"
    ],
    "type": "object"
  },
  "UploadIntent": {
    "properties": {
      "bucket": {
        "type": "string"
      },
      "entityId": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "expiresAt": {
        "type": "string"
      },
      "fields": {
        "additionalProperties": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            }
          ]
        },
        "type": "object"
      },
      "fileName": {
        "type": "string"
      },
      "fileUrl": {
        "type": "string"
      },
      "headers": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "maxUploadBytes": {
        "type": "number"
      },
      "method": {
        "oneOf": [
          {
            "enum": [
              "POST"
            ],
            "type": "string"
          },
          {
            "enum": [
              "PUT"
            ],
            "type": "string"
          },
          {
            "type": "string"
          }
        ]
      },
      "mimeType": {
        "nullable": true,
        "type": "string"
      },
      "note": {
        "type": "string"
      },
      "provider": {
        "oneOf": [
          {
            "enum": [
              "local"
            ],
            "type": "string"
          },
          {
            "enum": [
              "s3"
            ],
            "type": "string"
          },
          {
            "enum": [
              "cloudinary"
            ],
            "type": "string"
          },
          {
            "type": "string"
          }
        ]
      },
      "region": {
        "type": "string"
      },
      "scope": {
        "type": "string"
      },
      "sizeBytes": {
        "nullable": true,
        "type": "number"
      },
      "storageKey": {
        "type": "string"
      },
      "uploadUrl": {
        "nullable": true,
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "provider",
      "method",
      "fileUrl",
      "storageKey",
      "fields",
      "headers",
      "expiresAt",
      "maxUploadBytes",
      "scope",
      "entityType",
      "visibility",
      "fileName"
    ],
    "type": "object"
  },
  "UserSummary": {
    "properties": {
      "avatarUrl": {
        "nullable": true,
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "firstName": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastName": {
        "type": "string"
      },
      "status": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "email",
      "firstName",
      "lastName"
    ],
    "type": "object"
  },
  "VelocityAnalytics": {
    "properties": {
      "averageStoryPoints": {
        "type": "number"
      },
      "data": {
        "items": {
          "allOf": [
            {
              "properties": {
                "completedAt": {
                  "nullable": true,
                  "type": "string"
                },
                "endDate": {
                  "nullable": true,
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "projectId": {
                  "type": "string"
                },
                "startDate": {
                  "nullable": true,
                  "type": "string"
                }
              },
              "required": [
                "id",
                "projectId",
                "name"
              ],
              "type": "object"
            },
            {
              "properties": {
                "completedTasks": {
                  "type": "number"
                },
                "project": {
                  "properties": {
                    "key": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "key",
                    "name"
                  ],
                  "type": "object"
                },
                "storyPoints": {
                  "type": "number"
                }
              },
              "required": [
                "completedTasks",
                "storyPoints"
              ],
              "type": "object"
            }
          ]
        },
        "type": "array"
      },
      "total": {
        "type": "number"
      }
    },
    "required": [
      "data",
      "averageStoryPoints",
      "total"
    ],
    "type": "object"
  },
  "Visibility": {
    "enum": [
      "PRIVATE",
      "TEAM",
      "WORKSPACE",
      "ORGANIZATION",
      "PUBLIC"
    ],
    "type": "string"
  },
  "Webhook": {
    "properties": {
      "_count": {
        "properties": {
          "deliveries": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "enabled": {
        "type": "boolean"
      },
      "events": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "failureCount": {
        "type": "number"
      },
      "hasSecret": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "lastDeliveryAt": {
        "nullable": true,
        "type": "string"
      },
      "lastError": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "signingAlgorithm": {
        "type": "string"
      },
      "signingSecret": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "url": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "url",
      "signingAlgorithm",
      "events",
      "enabled",
      "failureCount",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "WebhookDelivery": {
    "properties": {
      "attempts": {
        "type": "number"
      },
      "createdAt": {
        "type": "string"
      },
      "deliveredAt": {
        "nullable": true,
        "type": "string"
      },
      "eventType": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastError": {
        "nullable": true,
        "type": "string"
      },
      "nextAttemptAt": {
        "nullable": true,
        "type": "string"
      },
      "payload": {},
      "requestHeaders": {},
      "responseBody": {
        "nullable": true,
        "type": "string"
      },
      "responseStatus": {
        "nullable": true,
        "type": "number"
      },
      "status": {
        "$ref": "#/components/schemas/WebhookDeliveryStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "webhook": {
        "properties": {
          "enabled": {
            "type": "boolean"
          },
          "events": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "url",
          "events",
          "enabled"
        ],
        "type": "object"
      },
      "webhookId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "webhookId",
      "eventType",
      "status",
      "attempts",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "WebhookDeliveryStatus": {
    "enum": [
      "PENDING",
      "DELIVERED",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "Workflow": {
    "properties": {
      "_count": {
        "properties": {
          "runs": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "config": {},
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "entityType": {
        "type": "string"
      },
      "eventType": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "isActive": {
        "type": "boolean"
      },
      "lastRunAt": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "nodes": {
        "items": {
          "$ref": "#/components/schemas/WorkflowNode"
        },
        "type": "array"
      },
      "tenantId": {
        "type": "string"
      },
      "triggerType": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "entityType",
      "triggerType",
      "isActive",
      "createdAt",
      "updatedAt",
      "nodes"
    ],
    "type": "object"
  },
  "WorkflowNode": {
    "properties": {
      "actionType": {
        "nullable": true,
        "type": "string"
      },
      "config": {},
      "createdAt": {
        "type": "string"
      },
      "dependsOn": {},
      "enabled": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "key": {
        "nullable": true,
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "onFailure": {
        "nullable": true,
        "type": "string"
      },
      "positionX": {
        "nullable": true,
        "type": "number"
      },
      "positionY": {
        "nullable": true,
        "type": "number"
      },
      "retryAttempts": {
        "type": "number"
      },
      "sortOrder": {
        "type": "number"
      },
      "timeoutSeconds": {
        "nullable": true,
        "type": "number"
      },
      "type": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "workflowId": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "type"
    ],
    "type": "object"
  },
  "WorkflowRun": {
    "properties": {
      "approvals": {
        "items": {
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "currentStep": {
              "type": "number"
            },
            "id": {
              "type": "string"
            },
            "status": {
              "type": "string"
            },
            "title": {
              "type": "string"
            },
            "updatedAt": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "title",
            "status",
            "currentStep",
            "createdAt",
            "updatedAt"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "completedAt": {
        "nullable": true,
        "type": "string"
      },
      "context": {},
      "createdAt": {
        "type": "string"
      },
      "entityId": {
        "type": "string"
      },
      "entityType": {
        "nullable": true,
        "type": "string"
      },
      "error": {
        "nullable": true,
        "type": "string"
      },
      "eventType": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "idempotencyKey": {
        "nullable": true,
        "type": "string"
      },
      "logs": {
        "items": {
          "$ref": "#/components/schemas/WorkflowRunLog"
        },
        "type": "array"
      },
      "startedAt": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/WorkflowRunStatus"
      },
      "tenantId": {
        "type": "string"
      },
      "triggerType": {
        "nullable": true,
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "workflow": {
        "properties": {
          "entityType": {
            "type": "string"
          },
          "eventType": {
            "nullable": true,
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "triggerType": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "entityType",
          "triggerType"
        ],
        "type": "object"
      },
      "workflowId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "workflowId",
      "tenantId",
      "entityId",
      "status",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  },
  "WorkflowRunLog": {
    "properties": {
      "createdAt": {
        "type": "string"
      },
      "data": {},
      "finishedAt": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "level": {
        "type": "string"
      },
      "message": {
        "type": "string"
      },
      "nodeId": {
        "nullable": true,
        "type": "string"
      },
      "runId": {
        "type": "string"
      },
      "startedAt": {
        "nullable": true,
        "type": "string"
      }
    },
    "required": [
      "id",
      "runId",
      "level",
      "message",
      "createdAt"
    ],
    "type": "object"
  },
  "WorkflowRunStatus": {
    "enum": [
      "PENDING",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED"
    ],
    "type": "string"
  },
  "Workspace": {
    "properties": {
      "_count": {
        "properties": {
          "projects": {
            "type": "number"
          },
          "teams": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "description": {
        "nullable": true,
        "type": "string"
      },
      "icon": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "slug": {
        "type": "string"
      },
      "tenantId": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "tenantId",
      "name",
      "slug"
    ],
    "type": "object"
  },
  "WorkspaceDocument": {
    "properties": {
      "_count": {
        "properties": {
          "versions": {
            "type": "number"
          }
        },
        "type": "object"
      },
      "archivedAt": {
        "nullable": true,
        "type": "string"
      },
      "body": {
        "nullable": true,
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "createdById": {
        "nullable": true,
        "type": "string"
      },
      "documentType": {
        "type": "string"
      },
      "folder": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "parentId": {
            "nullable": true,
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "folderId": {
        "nullable": true,
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "project": {
        "nullable": true,
        "properties": {
          "id": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "key",
          "name"
        ],
        "type": "object"
      },
      "projectId": {
        "nullable": true,
        "type": "string"
      },
      "publishedAt": {
        "nullable": true,
        "type": "string"
      },
      "slug": {
        "nullable": true,
        "type": "string"
      },
      "status": {
        "$ref": "#/components/schemas/DocumentStatus"
      },
      "summary": {
        "nullable": true,
        "type": "string"
      },
      "tags": {
        "items": {
          "type": "string"
        },
        "nullable": true,
        "type": "array"
      },
      "tenantId": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "updatedById": {
        "nullable": true,
        "type": "string"
      },
      "visibility": {
        "$ref": "#/components/schemas/Visibility"
      }
    },
    "required": [
      "id",
      "tenantId",
      "title",
      "documentType",
      "status",
      "visibility",
      "createdAt",
      "updatedAt"
    ],
    "type": "object"
  }
};

export const openApiOperationResponseSchemas: Record<string, Partial<Record<OpenApiMethod, OpenApiSchema>>> = {
  "/api/v1/admin/api-keys": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/ApiKey"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/CreatedApiKey"
    }
  },
  "/api/v1/admin/api-keys/{apiKeyId}/revoke": {
    "post": {
      "$ref": "#/components/schemas/ApiKey"
    }
  },
  "/api/v1/admin/audit-logs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/AuditLog"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/admin/compliance-jobs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/ComplianceJob"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/ComplianceJob"
    }
  },
  "/api/v1/admin/compliance-jobs/{jobId}/approve": {
    "post": {
      "$ref": "#/components/schemas/ComplianceJob"
    }
  },
  "/api/v1/admin/compliance-jobs/{jobId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/ComplianceJob"
    }
  },
  "/api/v1/admin/compliance-jobs/{jobId}/reject": {
    "post": {
      "$ref": "#/components/schemas/ComplianceJob"
    }
  },
  "/api/v1/admin/compliance-jobs/{jobId}/run": {
    "post": {
      "$ref": "#/components/schemas/ComplianceJob"
    }
  },
  "/api/v1/admin/overview": {
    "get": {
      "$ref": "#/components/schemas/AdminOverview"
    }
  },
  "/api/v1/admin/security-checks": {
    "get": {
      "$ref": "#/components/schemas/SecurityChecks"
    }
  },
  "/api/v1/admin/security-events": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SecurityEvent"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/admin/security-events/{eventId}": {
    "patch": {
      "$ref": "#/components/schemas/SecurityEvent"
    }
  },
  "/api/v1/admin/security-policy": {
    "get": {
      "$ref": "#/components/schemas/SecurityPolicy"
    },
    "patch": {
      "$ref": "#/components/schemas/SecurityPolicy"
    }
  },
  "/api/v1/admin/sessions": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/AuthSession"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/admin/sessions/{sessionId}/revoke": {
    "post": {
      "$ref": "#/components/schemas/AuthSession"
    }
  },
  "/api/v1/admin/users/{userId}/sessions/revoke": {
    "post": {
      "properties": {
        "revokedSessions": {
          "type": "number"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "revokedSessions"
      ],
      "type": "object"
    }
  },
  "/api/v1/agile/boards/{boardId}/columns": {
    "post": {
      "$ref": "#/components/schemas/BoardColumn"
    }
  },
  "/api/v1/agile/boards/{boardId}/columns/reorder": {
    "patch": {
      "$ref": "#/components/schemas/ProjectBoard"
    }
  },
  "/api/v1/agile/boards/{boardId}/columns/{columnId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/BoardColumn"
    }
  },
  "/api/v1/agile/projects/{projectId}/board": {
    "get": {
      "$ref": "#/components/schemas/ProjectBoard"
    }
  },
  "/api/v1/agile/sprints": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Sprint"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Sprint"
    }
  },
  "/api/v1/agile/sprints/{sprintId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/Sprint"
    }
  },
  "/api/v1/agile/sprints/{sprintId}/complete": {
    "post": {
      "$ref": "#/components/schemas/Sprint"
    }
  },
  "/api/v1/agile/sprints/{sprintId}/start": {
    "post": {
      "$ref": "#/components/schemas/Sprint"
    }
  },
  "/api/v1/agile/sprints/{sprintId}/tasks": {
    "post": {
      "properties": {
        "count": {
          "type": "number"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "count"
      ],
      "type": "object"
    }
  },
  "/api/v1/agile/sprints/{sprintId}/tasks/{taskId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/agile/tasks/{taskId}/order": {
    "patch": {
      "$ref": "#/components/schemas/Task"
    }
  },
  "/api/v1/agile/tasks/{taskId}/status": {
    "patch": {
      "$ref": "#/components/schemas/Task"
    }
  },
  "/api/v1/ai/agents": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/AiAgent"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/AiAgent"
    }
  },
  "/api/v1/ai/agents/{agentId}": {
    "delete": {
      "oneOf": [
        {
          "properties": {
            "success": {
              "type": "boolean"
            }
          },
          "required": [
            "success"
          ],
          "type": "object"
        },
        {
          "$ref": "#/components/schemas/AiAgent"
        }
      ]
    },
    "patch": {
      "$ref": "#/components/schemas/AiAgent"
    }
  },
  "/api/v1/ai/agents/{agentId}/archive": {
    "post": {
      "$ref": "#/components/schemas/AiAgent"
    }
  },
  "/api/v1/ai/agents/{agentId}/restore": {
    "post": {
      "$ref": "#/components/schemas/AiAgent"
    }
  },
  "/api/v1/ai/settings": {
    "get": {
      "$ref": "#/components/schemas/AiSettings"
    },
    "patch": {
      "$ref": "#/components/schemas/AiSettings"
    }
  },
  "/api/v1/auth/accept-invite": {
    "post": {
      "$ref": "#/components/schemas/AuthResponse"
    }
  },
  "/api/v1/auth/change-password": {
    "post": {
      "properties": {
        "message": {
          "type": "string"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "message"
      ],
      "type": "object"
    }
  },
  "/api/v1/auth/forgot-password": {
    "post": {
      "$ref": "#/components/schemas/AuthLifecycleResponse"
    }
  },
  "/api/v1/auth/login": {
    "post": {
      "oneOf": [
        {
          "$ref": "#/components/schemas/AuthResponse"
        },
        {
          "$ref": "#/components/schemas/MfaChallengeResponse"
        }
      ]
    }
  },
  "/api/v1/auth/logout": {
    "post": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/auth/me": {
    "get": {
      "$ref": "#/components/schemas/AuthUser"
    }
  },
  "/api/v1/auth/mfa/verify-login": {
    "post": {
      "$ref": "#/components/schemas/AuthResponse"
    }
  },
  "/api/v1/auth/refresh": {
    "post": {
      "$ref": "#/components/schemas/AuthResponse"
    }
  },
  "/api/v1/auth/register": {
    "post": {
      "oneOf": [
        {
          "$ref": "#/components/schemas/AuthResponse"
        },
        {
          "$ref": "#/components/schemas/AuthLifecycleResponse"
        }
      ]
    }
  },
  "/api/v1/auth/resend-verification": {
    "post": {
      "$ref": "#/components/schemas/AuthLifecycleResponse"
    }
  },
  "/api/v1/auth/reset-password": {
    "post": {
      "properties": {
        "message": {
          "type": "string"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "message"
      ],
      "type": "object"
    }
  },
  "/api/v1/auth/sso/callback": {
    "post": {
      "$ref": "#/components/schemas/AuthResponse"
    }
  },
  "/api/v1/auth/sso/discovery": {
    "get": {
      "properties": {
        "loginMethods": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "mfaRequired": {
          "type": "boolean"
        },
        "providers": {
          "items": {
            "$ref": "#/components/schemas/SsoProvider"
          },
          "type": "array"
        },
        "ssoRequired": {
          "type": "boolean"
        },
        "tenant": {
          "nullable": true,
          "properties": {
            "id": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "slug": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "name",
            "slug"
          ],
          "type": "object"
        }
      },
      "required": [
        "tenant",
        "loginMethods",
        "providers"
      ],
      "type": "object"
    }
  },
  "/api/v1/auth/sso/start": {
    "get": {
      "properties": {
        "authorizationUrl": {
          "type": "string"
        },
        "stateExpiresAt": {
          "type": "string"
        }
      },
      "required": [
        "authorizationUrl",
        "stateExpiresAt"
      ],
      "type": "object"
    }
  },
  "/api/v1/auth/verify-email": {
    "post": {
      "$ref": "#/components/schemas/AuthResponse"
    }
  },
  "/api/v1/billing/account": {
    "get": {
      "$ref": "#/components/schemas/BillingAccountStatus"
    }
  },
  "/api/v1/billing/checkout": {
    "post": {
      "$ref": "#/components/schemas/BillingCheckoutSession"
    }
  },
  "/api/v1/billing/portal": {
    "post": {
      "$ref": "#/components/schemas/BillingPortalSession"
    }
  },
  "/api/v1/billing/trial": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/booking/public/cancel/{token}": {
    "post": {
      "$ref": "#/components/schemas/BookingRequest"
    }
  },
  "/api/v1/booking/public/reschedule/{token}": {
    "post": {
      "$ref": "#/components/schemas/PublicBookingCreateResponse"
    }
  },
  "/api/v1/booking/public/{tenantSlug}/book": {
    "post": {
      "$ref": "#/components/schemas/PublicBookingCreateResponse"
    }
  },
  "/api/v1/booking/public/{tenantSlug}/page": {
    "get": {
      "$ref": "#/components/schemas/PublicBookingPageResponse"
    }
  },
  "/api/v1/booking/public/{tenantSlug}/slots": {
    "get": {
      "$ref": "#/components/schemas/PublicBookingSlotsResponse"
    }
  },
  "/api/v1/conversations": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Conversation"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Conversation"
    }
  },
  "/api/v1/conversations/{conversationId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "get": {
      "$ref": "#/components/schemas/Conversation"
    },
    "patch": {
      "$ref": "#/components/schemas/Conversation"
    }
  },
  "/api/v1/conversations/{conversationId}/members": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ConversationMember"
      },
      "type": "array"
    },
    "post": {
      "items": {
        "$ref": "#/components/schemas/ConversationMember"
      },
      "type": "array"
    }
  },
  "/api/v1/conversations/{conversationId}/members/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/conversations/{conversationId}/messages": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Message"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Message"
    }
  },
  "/api/v1/conversations/{conversationId}/messages/pinned": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/Message"
      },
      "type": "array"
    }
  },
  "/api/v1/document-folders": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/DocumentFolder"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/DocumentFolder"
    }
  },
  "/api/v1/document-folders/tree": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/DocumentFolder"
      },
      "type": "array"
    }
  },
  "/api/v1/document-folders/{folderId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/DocumentFolder"
    }
  },
  "/api/v1/document-folders/{folderId}/archive": {
    "post": {
      "$ref": "#/components/schemas/DocumentFolder"
    }
  },
  "/api/v1/document-folders/{folderId}/restore": {
    "post": {
      "$ref": "#/components/schemas/DocumentFolder"
    }
  },
  "/api/v1/documents": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/WorkspaceDocument"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    }
  },
  "/api/v1/documents/{documentId}": {
    "get": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    },
    "patch": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    }
  },
  "/api/v1/documents/{documentId}/archive": {
    "post": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    }
  },
  "/api/v1/documents/{documentId}/hard-delete": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/documents/{documentId}/publish": {
    "post": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    }
  },
  "/api/v1/documents/{documentId}/restore": {
    "post": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    }
  },
  "/api/v1/documents/{documentId}/versions": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/DocumentVersion"
      },
      "type": "array"
    }
  },
  "/api/v1/documents/{documentId}/versions/{version}/restore": {
    "post": {
      "$ref": "#/components/schemas/WorkspaceDocument"
    }
  },
  "/api/v1/entitlements": {
    "get": {
      "$ref": "#/components/schemas/BillingEntitlements"
    }
  },
  "/api/v1/files": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/FileAsset"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/FileAsset"
    }
  },
  "/api/v1/files/upload-intents": {
    "post": {
      "$ref": "#/components/schemas/UploadIntent"
    }
  },
  "/api/v1/files/{fileId}": {
    "delete": {
      "$ref": "#/components/schemas/FileAsset"
    }
  },
  "/api/v1/files/{fileId}/archive": {
    "post": {
      "$ref": "#/components/schemas/FileAsset"
    }
  },
  "/api/v1/files/{fileId}/restore": {
    "post": {
      "$ref": "#/components/schemas/FileAsset"
    }
  },
  "/api/v1/health/ready": {
    "get": {
      "$ref": "#/components/schemas/ReadinessResponse"
    }
  },
  "/api/v1/identity-security/login-policy": {
    "patch": {
      "properties": {
        "allowedLoginMethods": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "domainDiscoveryEnabled": {
          "type": "boolean"
        },
        "mfaRequired": {
          "type": "boolean"
        },
        "ssoRequired": {
          "type": "boolean"
        },
        "trustedDeviceTtlDays": {
          "type": "number"
        }
      },
      "required": [
        "mfaRequired",
        "allowedLoginMethods",
        "ssoRequired",
        "domainDiscoveryEnabled",
        "trustedDeviceTtlDays"
      ],
      "type": "object"
    }
  },
  "/api/v1/identity-security/mfa/backup-codes/regenerate": {
    "post": {
      "properties": {
        "backupCodes": {
          "items": {
            "type": "string"
          },
          "type": "array"
        }
      },
      "required": [
        "backupCodes"
      ],
      "type": "object"
    }
  },
  "/api/v1/identity-security/mfa/disable": {
    "post": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/identity-security/mfa/totp/enable": {
    "post": {
      "properties": {
        "backupCodes": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "backupCodes"
      ],
      "type": "object"
    }
  },
  "/api/v1/identity-security/mfa/totp/setup": {
    "post": {
      "$ref": "#/components/schemas/TotpSetupResponse"
    }
  },
  "/api/v1/identity-security/overview": {
    "get": {
      "$ref": "#/components/schemas/IdentitySecurityOverview"
    }
  },
  "/api/v1/identity-security/sso-providers": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/SsoProvider"
      },
      "type": "array"
    },
    "post": {
      "items": {
        "$ref": "#/components/schemas/SsoProvider"
      },
      "type": "array"
    }
  },
  "/api/v1/identity-security/trusted-devices/{deviceId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/integrations": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Integration"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Integration"
    }
  },
  "/api/v1/integrations/omoflow/events": {
    "post": {
      "$ref": "#/components/schemas/OmoFlowRuntimeResult"
    }
  },
  "/api/v1/integrations/{integrationId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/Integration"
    }
  },
  "/api/v1/integrations/{integrationId}/disable": {
    "post": {
      "$ref": "#/components/schemas/Integration"
    }
  },
  "/api/v1/integrations/{integrationId}/enable": {
    "post": {
      "$ref": "#/components/schemas/Integration"
    }
  },
  "/api/v1/integrations/{integrationId}/logs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/IntegrationLog"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/integrations/{integrationId}/rotate-secret": {
    "post": {
      "$ref": "#/components/schemas/Integration"
    }
  },
  "/api/v1/integrations/{integrationId}/sync": {
    "post": {
      "properties": {
        "integration": {
          "$ref": "#/components/schemas/Integration"
        },
        "message": {
          "type": "string"
        },
        "queued": {
          "type": "boolean"
        }
      },
      "required": [
        "integration",
        "queued"
      ],
      "type": "object"
    }
  },
  "/api/v1/internal-mail/folders": {
    "get": {
      "$ref": "#/components/schemas/InternalMailFolderSummary"
    }
  },
  "/api/v1/internal-mail/mailboxes": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/InternalMailbox"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/InternalMailbox"
    }
  },
  "/api/v1/internal-mail/mailboxes/{mailboxId}": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailbox"
    }
  },
  "/api/v1/internal-mail/mailboxes/{mailboxId}/aliases": {
    "post": {
      "$ref": "#/components/schemas/InternalMailboxAlias"
    }
  },
  "/api/v1/internal-mail/mailboxes/{mailboxId}/members": {
    "post": {
      "$ref": "#/components/schemas/InternalMailboxMember"
    }
  },
  "/api/v1/internal-mail/mailboxes/{mailboxId}/members/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/internal-mail/threads": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/InternalMailThread"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/InternalMailThread"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}": {
    "delete": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    },
    "get": {
      "$ref": "#/components/schemas/InternalMailThread"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/archive": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/flag": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/move": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/pin": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/read": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/reply": {
    "post": {
      "$ref": "#/components/schemas/InternalMailThread"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/restore": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/snooze": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/star": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/internal-mail/threads/{threadId}/unread": {
    "patch": {
      "$ref": "#/components/schemas/InternalMailParticipant"
    }
  },
  "/api/v1/invoices": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/BillingInvoice"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Meeting"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/admin/analytics": {
    "get": {
      "$ref": "#/components/schemas/MeetingAdminAnalytics"
    }
  },
  "/api/v1/meetings/admin/overview": {
    "get": {
      "$ref": "#/components/schemas/MeetingAdminOverview"
    }
  },
  "/api/v1/meetings/admin/policy": {
    "get": {
      "$ref": "#/components/schemas/MeetingPolicy"
    },
    "patch": {
      "$ref": "#/components/schemas/MeetingPolicy"
    }
  },
  "/api/v1/meetings/admin/reminder-logs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/MeetingReminderJob"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/availability": {
    "get": {
      "$ref": "#/components/schemas/MeetingAvailability"
    }
  },
  "/api/v1/meetings/availability/windows": {
    "post": {
      "$ref": "#/components/schemas/MeetingAvailabilityWindow"
    }
  },
  "/api/v1/meetings/availability/windows/{windowId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/booking/pages": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/BookingPage"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/BookingPage"
    }
  },
  "/api/v1/meetings/booking/pages/{pageId}": {
    "patch": {
      "$ref": "#/components/schemas/BookingPage"
    }
  },
  "/api/v1/meetings/booking/pages/{pageId}/fields": {
    "post": {
      "$ref": "#/components/schemas/BookingFormField"
    }
  },
  "/api/v1/meetings/booking/pages/{pageId}/fields/{fieldId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/BookingFormField"
    }
  },
  "/api/v1/meetings/booking/requests": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/BookingRequest"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/integrations/settings": {
    "get": {
      "$ref": "#/components/schemas/MeetingIntegrationSettings"
    },
    "patch": {
      "$ref": "#/components/schemas/MeetingIntegrationSettings"
    }
  },
  "/api/v1/meetings/integrations/status": {
    "get": {
      "$ref": "#/components/schemas/MeetingIntegrationStatus"
    }
  },
  "/api/v1/meetings/reminder-jobs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/MeetingReminderJob"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/reminder-jobs/process": {
    "post": {
      "properties": {
        "deadLetter": {
          "type": "number"
        },
        "failed": {
          "type": "number"
        },
        "processed": {
          "type": "number"
        },
        "results": {
          "items": {
            "properties": {
              "error": {
                "type": "string"
              },
              "id": {
                "type": "string"
              },
              "provider": {
                "type": "string"
              },
              "status": {
                "type": "string"
              }
            },
            "required": [
              "id",
              "status"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "sent": {
          "type": "number"
        }
      },
      "required": [
        "processed",
        "sent",
        "failed",
        "deadLetter",
        "results"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/reminder-jobs/{jobId}/retry": {
    "post": {
      "properties": {
        "job": {
          "$ref": "#/components/schemas/MeetingReminderJob"
        },
        "previousStatus": {
          "$ref": "#/components/schemas/MeetingReminderJobStatus"
        }
      },
      "required": [
        "job",
        "previousStatus"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/types": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/MeetingType"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/MeetingType"
    }
  },
  "/api/v1/meetings/types/{typeId}": {
    "patch": {
      "$ref": "#/components/schemas/MeetingType"
    }
  },
  "/api/v1/meetings/{meetingId}": {
    "get": {
      "$ref": "#/components/schemas/Meeting"
    },
    "patch": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/action-items/assign": {
    "post": {
      "properties": {
        "actionItemId": {
          "nullable": true,
          "type": "string"
        },
        "task": {
          "$ref": "#/components/schemas/Task"
        }
      },
      "required": [
        "task"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/{meetingId}/activity": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/MeetingActivity"
      },
      "type": "array"
    }
  },
  "/api/v1/meetings/{meetingId}/agenda": {
    "post": {
      "$ref": "#/components/schemas/MeetingAgendaItem"
    }
  },
  "/api/v1/meetings/{meetingId}/agenda/{itemId}": {
    "patch": {
      "$ref": "#/components/schemas/MeetingAgendaItem"
    }
  },
  "/api/v1/meetings/{meetingId}/ai": {
    "get": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/action-items/convert-tasks": {
    "post": {
      "properties": {
        "actionItems": {
          "items": {
            "$ref": "#/components/schemas/MeetingAiActionItem"
          },
          "type": "array"
        },
        "converted": {
          "type": "number"
        },
        "meetingId": {
          "type": "string"
        },
        "tasks": {
          "items": {
            "$ref": "#/components/schemas/Task"
          },
          "type": "array"
        }
      },
      "required": [
        "meetingId",
        "converted",
        "tasks",
        "actionItems"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/action-items/follow-up-reminders": {
    "post": {
      "properties": {
        "actionItems": {
          "items": {
            "$ref": "#/components/schemas/MeetingAiActionItem"
          },
          "type": "array"
        },
        "created": {
          "items": {
            "$ref": "#/components/schemas/MeetingReminder"
          },
          "type": "array"
        },
        "meetingId": {
          "type": "string"
        }
      },
      "required": [
        "meetingId",
        "created",
        "actionItems"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/agenda": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/effectiveness-score": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/follow-up": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/links": {
    "patch": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/missed-decisions": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/notes": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/preparation-brief": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/risk-detection": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/role-summary": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/ai/suggest-attendees": {
    "post": {
      "$ref": "#/components/schemas/MeetingAiState"
    }
  },
  "/api/v1/meetings/{meetingId}/archive": {
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/attendance/{attendeeId}": {
    "patch": {
      "$ref": "#/components/schemas/MeetingAttendee"
    }
  },
  "/api/v1/meetings/{meetingId}/attendees": {
    "post": {
      "$ref": "#/components/schemas/MeetingAttendee"
    }
  },
  "/api/v1/meetings/{meetingId}/attendees/{attendeeId}": {
    "patch": {
      "$ref": "#/components/schemas/MeetingAttendee"
    }
  },
  "/api/v1/meetings/{meetingId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/checklist": {
    "post": {
      "$ref": "#/components/schemas/MeetingChecklistItem"
    }
  },
  "/api/v1/meetings/{meetingId}/checklist/{itemId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/MeetingChecklistItem"
    }
  },
  "/api/v1/meetings/{meetingId}/comments": {
    "post": {
      "$ref": "#/components/schemas/MeetingComment"
    }
  },
  "/api/v1/meetings/{meetingId}/comments/{commentId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/MeetingComment"
    }
  },
  "/api/v1/meetings/{meetingId}/complete": {
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/conference": {
    "post": {
      "properties": {
        "meeting": {},
        "message": {
          "type": "string"
        },
        "provider": {
          "$ref": "#/components/schemas/MeetingConferenceProvider"
        }
      },
      "required": [
        "meeting",
        "provider",
        "message"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/{meetingId}/decisions": {
    "post": {
      "$ref": "#/components/schemas/MeetingDecision"
    }
  },
  "/api/v1/meetings/{meetingId}/decisions/{decisionId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/MeetingDecision"
    }
  },
  "/api/v1/meetings/{meetingId}/follow-up": {
    "post": {
      "properties": {
        "queued": {
          "type": "number"
        },
        "reminders": {
          "items": {
            "$ref": "#/components/schemas/MeetingReminder"
          },
          "type": "array"
        }
      },
      "required": [
        "queued",
        "reminders"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/{meetingId}/live-notes": {
    "patch": {}
  },
  "/api/v1/meetings/{meetingId}/no-show": {
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/omoflow/sync": {
    "post": {
      "properties": {
        "meeting": {
          "$ref": "#/components/schemas/Meeting"
        },
        "runtimeState": {
          "additionalProperties": {},
          "type": "object"
        }
      },
      "required": [
        "meeting",
        "runtimeState"
      ],
      "type": "object"
    }
  },
  "/api/v1/meetings/{meetingId}/reminders": {
    "post": {
      "$ref": "#/components/schemas/MeetingReminder"
    }
  },
  "/api/v1/meetings/{meetingId}/restore": {
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/start": {
    "post": {
      "$ref": "#/components/schemas/Meeting"
    }
  },
  "/api/v1/meetings/{meetingId}/workspace": {
    "get": {
      "$ref": "#/components/schemas/MeetingWorkspace"
    }
  },
  "/api/v1/messages/{messageId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/Message"
    }
  },
  "/api/v1/messages/{messageId}/forward": {
    "post": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Message"
          },
          "type": "array"
        },
        "forwarded": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "forwarded"
      ],
      "type": "object"
    }
  },
  "/api/v1/messages/{messageId}/pin": {
    "post": {
      "$ref": "#/components/schemas/Message"
    }
  },
  "/api/v1/messages/{messageId}/reactions": {
    "post": {
      "$ref": "#/components/schemas/MessageReaction"
    }
  },
  "/api/v1/messages/{messageId}/reactions/{emoji}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/messages/{messageId}/read-receipts": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/MessageReadReceipt"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/MessageReadReceipt"
    }
  },
  "/api/v1/messages/{messageId}/unpin": {
    "post": {
      "$ref": "#/components/schemas/Message"
    }
  },
  "/api/v1/notification-preferences": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/NotificationPreference"
      },
      "type": "array"
    },
    "patch": {
      "items": {
        "$ref": "#/components/schemas/NotificationPreference"
      },
      "type": "array"
    }
  },
  "/api/v1/notifications": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Notification"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/notifications/read": {
    "delete": {
      "properties": {
        "deleted": {
          "type": "number"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "deleted"
      ],
      "type": "object"
    }
  },
  "/api/v1/notifications/read-all": {
    "patch": {
      "properties": {
        "success": {
          "type": "boolean"
        },
        "updated": {
          "type": "number"
        }
      },
      "required": [
        "success",
        "updated"
      ],
      "type": "object"
    }
  },
  "/api/v1/notifications/unread-count": {
    "get": {
      "properties": {
        "total": {
          "type": "number"
        }
      },
      "required": [
        "total"
      ],
      "type": "object"
    }
  },
  "/api/v1/notifications/{notificationId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/notifications/{notificationId}/read": {
    "patch": {
      "$ref": "#/components/schemas/Notification"
    }
  },
  "/api/v1/notifications/{notificationId}/unread": {
    "patch": {
      "$ref": "#/components/schemas/Notification"
    }
  },
  "/api/v1/permissions": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/Permission"
      },
      "type": "array"
    }
  },
  "/api/v1/plans": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/BillingPlan"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/projects": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Project"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Project"
    }
  },
  "/api/v1/projects/{projectId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "get": {
      "$ref": "#/components/schemas/Project"
    },
    "patch": {
      "$ref": "#/components/schemas/Project"
    }
  },
  "/api/v1/projects/{projectId}/budgets": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectBudget"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectBudget"
    }
  },
  "/api/v1/projects/{projectId}/budgets/{budgetId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectBudget"
    }
  },
  "/api/v1/projects/{projectId}/change-requests": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectChangeRequest"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectChangeRequest"
    }
  },
  "/api/v1/projects/{projectId}/change-requests/{changeRequestId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectChangeRequest"
    }
  },
  "/api/v1/projects/{projectId}/decisions": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectDecision"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectDecision"
    }
  },
  "/api/v1/projects/{projectId}/decisions/{decisionId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectDecision"
    }
  },
  "/api/v1/projects/{projectId}/dependencies": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectDependency"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectDependency"
    }
  },
  "/api/v1/projects/{projectId}/dependencies/{dependencyId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectDependency"
    }
  },
  "/api/v1/projects/{projectId}/members": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectMember"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectMember"
    }
  },
  "/api/v1/projects/{projectId}/members/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/projects/{projectId}/milestones": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectMilestone"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectMilestone"
    }
  },
  "/api/v1/projects/{projectId}/milestones/{milestoneId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectMilestone"
    }
  },
  "/api/v1/projects/{projectId}/permissions": {
    "get": {
      "$ref": "#/components/schemas/ProjectPermissionMatrix"
    }
  },
  "/api/v1/projects/{projectId}/risks": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectRisk"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectRisk"
    }
  },
  "/api/v1/projects/{projectId}/risks/{riskId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectRisk"
    }
  },
  "/api/v1/projects/{projectId}/stakeholders": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/ProjectStakeholder"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/ProjectStakeholder"
    }
  },
  "/api/v1/projects/{projectId}/stakeholders/{stakeholderId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/ProjectStakeholder"
    }
  },
  "/api/v1/reporting/analytics/budget": {
    "get": {
      "$ref": "#/components/schemas/BudgetAnalytics"
    }
  },
  "/api/v1/reporting/analytics/cycle-time": {
    "get": {
      "$ref": "#/components/schemas/CycleTimeAnalytics"
    }
  },
  "/api/v1/reporting/analytics/overview": {
    "get": {
      "$ref": "#/components/schemas/AnalyticsOverview"
    }
  },
  "/api/v1/reporting/analytics/project-health": {
    "get": {
      "$ref": "#/components/schemas/ProjectHealthAnalytics"
    }
  },
  "/api/v1/reporting/analytics/sla": {
    "get": {
      "$ref": "#/components/schemas/SlaAnalytics"
    }
  },
  "/api/v1/reporting/analytics/team-performance": {
    "get": {
      "$ref": "#/components/schemas/TeamPerformanceAnalytics"
    }
  },
  "/api/v1/reporting/analytics/velocity": {
    "get": {
      "$ref": "#/components/schemas/VelocityAnalytics"
    }
  },
  "/api/v1/reporting/executions": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/ReportExecution"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/reporting/exports": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/ReportExport"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/reporting/reports": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Report"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Report"
    }
  },
  "/api/v1/reporting/reports/run": {
    "post": {
      "$ref": "#/components/schemas/ReportExecution"
    }
  },
  "/api/v1/reporting/reports/{reportId}/exports": {
    "post": {
      "$ref": "#/components/schemas/ReportExport"
    }
  },
  "/api/v1/reporting/reports/{reportId}/run": {
    "post": {
      "$ref": "#/components/schemas/ReportExecution"
    }
  },
  "/api/v1/roles": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/Role"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/Role"
    }
  },
  "/api/v1/roles/assignments": {
    "post": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/roles/{roleId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/Role"
    }
  },
  "/api/v1/roles/{roleId}/users/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/search": {
    "get": {
      "$ref": "#/components/schemas/GlobalSearchResponse"
    }
  },
  "/api/v1/site-admin/ai/actions": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteAiAction"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/ai/agents": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteAiAgent"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/ai/conversations": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteAiConversation"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/ai/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteAiOverview"
    }
  },
  "/api/v1/site-admin/ai/settings": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteAiSettings"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/ai/usage": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteAiUsageLog"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/audit-logs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/PlatformAuditLog"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/automation/approval-definitions": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteApprovalDefinition"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/automation/approvals": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteApproval"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/automation/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteAutomationOverview"
    }
  },
  "/api/v1/site-admin/automation/run-logs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteWorkflowRunLog"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/automation/runs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteWorkflowRun"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/automation/runs/{runId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/SiteWorkflowRun"
    }
  },
  "/api/v1/site-admin/automation/runs/{runId}/retry": {
    "post": {
      "$ref": "#/components/schemas/SiteWorkflowRun"
    }
  },
  "/api/v1/site-admin/automation/workflows": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteWorkflow"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/billing/entitlements": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteBillingEntitlement"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/billing/events": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteBillingEvent"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/billing/features": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteBillingFeature"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/SiteBillingFeature"
    }
  },
  "/api/v1/site-admin/billing/features/{featureId}": {
    "patch": {
      "$ref": "#/components/schemas/SiteBillingFeature"
    }
  },
  "/api/v1/site-admin/billing/features/{featureId}/disable": {
    "post": {
      "$ref": "#/components/schemas/SiteBillingFeature"
    }
  },
  "/api/v1/site-admin/billing/features/{featureId}/enable": {
    "post": {
      "$ref": "#/components/schemas/SiteBillingFeature"
    }
  },
  "/api/v1/site-admin/billing/invoices": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteInvoice"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/billing/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteBillingOverview"
    }
  },
  "/api/v1/site-admin/billing/plans": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteBillingPlan"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/plans/{planId}": {
    "patch": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/plans/{planId}/archive": {
    "post": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/plans/{planId}/features": {
    "post": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/plans/{planId}/features/{featureId}": {
    "delete": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    },
    "patch": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/plans/{planId}/restore": {
    "post": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/plans/{planId}/sync/stripe": {
    "post": {
      "$ref": "#/components/schemas/SiteBillingPlan"
    }
  },
  "/api/v1/site-admin/billing/subscriptions": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteSubscription"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/billing/subscriptions/{subscriptionId}": {
    "patch": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/site-admin/billing/subscriptions/{subscriptionId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/site-admin/billing/subscriptions/{subscriptionId}/change-plan": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/site-admin/billing/subscriptions/{subscriptionId}/resume": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/site-admin/billing/tenants/{tenantId}/start-trial": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/site-admin/billing/usage-records": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteUsageRecord"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/compliance/jobs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteComplianceJob"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/compliance/jobs/{jobId}/approve": {
    "post": {
      "$ref": "#/components/schemas/SiteComplianceJob"
    }
  },
  "/api/v1/site-admin/compliance/jobs/{jobId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/SiteComplianceJob"
    }
  },
  "/api/v1/site-admin/compliance/jobs/{jobId}/reject": {
    "post": {
      "$ref": "#/components/schemas/SiteComplianceJob"
    }
  },
  "/api/v1/site-admin/compliance/jobs/{jobId}/run": {
    "post": {
      "$ref": "#/components/schemas/SiteComplianceJob"
    }
  },
  "/api/v1/site-admin/compliance/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteComplianceOverview"
    }
  },
  "/api/v1/site-admin/hardening/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteHardeningOverview"
    }
  },
  "/api/v1/site-admin/identity-security/login-history": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteLoginHistory"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/identity-security/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteIdentitySecurityOverview"
    }
  },
  "/api/v1/site-admin/identity-security/policies": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteSecurityPolicy"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/identity-security/sso-providers": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteSsoProvider"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/identity-security/trusted-devices": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteTrustedDevice"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/identity-security/trusted-devices/{deviceId}/revoke": {
    "patch": {
      "$ref": "#/components/schemas/SiteTrustedDevice"
    }
  },
  "/api/v1/site-admin/identity-security/users/{userId}/password-reset": {
    "post": {
      "properties": {
        "devLink": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "provider": {
          "type": "string"
        },
        "sent": {
          "type": "boolean"
        },
        "skipped": {
          "type": "boolean"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "sent",
        "message"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/integrations": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteIntegration"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/integrations/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteIntegrationsOverview"
    }
  },
  "/api/v1/site-admin/integrations/{integrationId}/rotate-secret": {
    "patch": {
      "properties": {
        "generatedSecret": {
          "type": "string"
        },
        "integration": {
          "$ref": "#/components/schemas/SiteIntegration"
        }
      },
      "required": [
        "integration"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/me": {
    "get": {
      "$ref": "#/components/schemas/SiteAdminProfile"
    }
  },
  "/api/v1/site-admin/meetings/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteMeetingOperationsOverview"
    }
  },
  "/api/v1/site-admin/meetings/reminder-logs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteMeetingReminderLog"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/meetings/tenants": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteMeetingTenantPosture"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/observability/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteObservabilityOverview"
    }
  },
  "/api/v1/site-admin/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteAdminOverview"
    }
  },
  "/api/v1/site-admin/platform-admins": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/PlatformAdminGrant"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/PlatformAdminGrant"
    }
  },
  "/api/v1/site-admin/platform-admins/{platformAdminId}/revoke": {
    "patch": {
      "allOf": [
        {
          "$ref": "#/components/schemas/PlatformAdminGrant"
        }
      ],
      "nullable": true
    }
  },
  "/api/v1/site-admin/realtime/conversations": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteConversationMetadata"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/realtime/message-activity": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteMessageActivity"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/realtime/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteRealtimeOverview"
    }
  },
  "/api/v1/site-admin/reporting/dashboards": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteDashboard"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/reporting/executions": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteReportExecution"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/reporting/exports": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteReportExport"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/reporting/overview": {
    "get": {
      "$ref": "#/components/schemas/SiteReportingOverview"
    }
  },
  "/api/v1/site-admin/reporting/reports": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteReport"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/search": {
    "get": {
      "$ref": "#/components/schemas/SitePlatformSearchResponse"
    }
  },
  "/api/v1/site-admin/security-events": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SecurityEvent"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/security-events/{eventId}": {
    "patch": {
      "$ref": "#/components/schemas/SecurityEvent"
    }
  },
  "/api/v1/site-admin/sessions": {
    "get": {
      "$ref": "#/components/schemas/SiteSessionsResponse"
    }
  },
  "/api/v1/site-admin/sessions/{sessionId}/revoke": {
    "patch": {
      "$ref": "#/components/schemas/SiteSession"
    }
  },
  "/api/v1/site-admin/tenants": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Tenant"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/tenants/{tenantId}": {
    "get": {
      "$ref": "#/components/schemas/SiteTenantDetail"
    }
  },
  "/api/v1/site-admin/tenants/{tenantId}/activity": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/ai": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/billing": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/files": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/integrations": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/projects": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/reports": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/security": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/sessions": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/status": {
    "patch": {
      "$ref": "#/components/schemas/Tenant"
    }
  },
  "/api/v1/site-admin/tenants/{tenantId}/teams": {
    "get": {}
  },
  "/api/v1/site-admin/tenants/{tenantId}/users": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/TenantUser"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/tenants/{tenantId}/workspaces": {
    "get": {}
  },
  "/api/v1/site-admin/users": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/TenantUser"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/users/{userId}": {
    "get": {
      "$ref": "#/components/schemas/SiteUserDetail"
    }
  },
  "/api/v1/site-admin/users/{userId}/resend-verification": {
    "post": {
      "properties": {
        "devLink": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "provider": {
          "type": "string"
        },
        "sent": {
          "type": "boolean"
        },
        "skipped": {
          "type": "boolean"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "sent",
        "message"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/users/{userId}/sessions/revoke": {
    "post": {
      "properties": {
        "sessionsRevoked": {
          "type": "number"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "sessionsRevoked"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/users/{userId}/status": {
    "patch": {
      "$ref": "#/components/schemas/TenantUser"
    }
  },
  "/api/v1/site-admin/webhook-deliveries": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteWebhookDelivery"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/webhook-deliveries/{deliveryId}/retry": {
    "post": {
      "$ref": "#/components/schemas/SiteWebhookDelivery"
    }
  },
  "/api/v1/site-admin/webhooks": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/SiteWebhook"
          },
          "type": "array"
        },
        "meta": {
          "properties": {
            "limit": {
              "type": "number"
            },
            "page": {
              "type": "number"
            },
            "total": {
              "type": "number"
            },
            "totalPages": {
              "type": "number"
            }
          },
          "required": [
            "page",
            "limit",
            "total",
            "totalPages"
          ],
          "type": "object"
        }
      },
      "required": [
        "data",
        "meta"
      ],
      "type": "object"
    }
  },
  "/api/v1/site-admin/webhooks/{webhookId}/rotate-secret": {
    "patch": {
      "allOf": [
        {
          "$ref": "#/components/schemas/SiteWebhook"
        },
        {
          "properties": {
            "signingSecret": {
              "type": "string"
            }
          },
          "type": "object"
        }
      ]
    }
  },
  "/api/v1/subscriptions/current": {
    "get": {
      "allOf": [
        {
          "$ref": "#/components/schemas/SiteSubscription"
        }
      ],
      "nullable": true
    }
  },
  "/api/v1/subscriptions/{subscriptionId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/subscriptions/{subscriptionId}/change-plan": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/subscriptions/{subscriptionId}/resume": {
    "post": {
      "$ref": "#/components/schemas/SiteSubscription"
    }
  },
  "/api/v1/tasks": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Task"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Task"
    }
  },
  "/api/v1/tasks/bulk": {
    "post": {
      "properties": {
        "count": {
          "type": "number"
        },
        "operation": {
          "type": "string"
        },
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success",
        "operation",
        "count"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/custom-fields": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/CustomField"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/CustomField"
    }
  },
  "/api/v1/tasks/custom-fields/{customFieldId}": {
    "delete": {
      "oneOf": [
        {
          "properties": {
            "success": {
              "type": "boolean"
            }
          },
          "required": [
            "success"
          ],
          "type": "object"
        },
        {
          "$ref": "#/components/schemas/CustomField"
        }
      ]
    },
    "patch": {
      "$ref": "#/components/schemas/CustomField"
    }
  },
  "/api/v1/tasks/custom-fields/{customFieldId}/archive": {
    "post": {
      "$ref": "#/components/schemas/CustomField"
    }
  },
  "/api/v1/tasks/custom-fields/{customFieldId}/restore": {
    "post": {
      "$ref": "#/components/schemas/CustomField"
    }
  },
  "/api/v1/tasks/labels": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskLabel"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskLabel"
    }
  },
  "/api/v1/tasks/labels/{labelId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/TaskLabel"
    }
  },
  "/api/v1/tasks/saved-views": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/TaskSavedView"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/TaskSavedView"
    }
  },
  "/api/v1/tasks/saved-views/{viewId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/TaskSavedView"
    }
  },
  "/api/v1/tasks/taxonomy": {
    "get": {
      "$ref": "#/components/schemas/TaskTaxonomy"
    }
  },
  "/api/v1/tasks/{taskId}": {
    "delete": {
      "$ref": "#/components/schemas/Task"
    },
    "get": {
      "$ref": "#/components/schemas/Task"
    },
    "patch": {
      "$ref": "#/components/schemas/Task"
    }
  },
  "/api/v1/tasks/{taskId}/activities": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskActivity"
      },
      "type": "array"
    }
  },
  "/api/v1/tasks/{taskId}/archive": {
    "post": {
      "$ref": "#/components/schemas/Task"
    }
  },
  "/api/v1/tasks/{taskId}/assignees": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskAssignee"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskAssignee"
    }
  },
  "/api/v1/tasks/{taskId}/assignees/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/{taskId}/attachments": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskAttachment"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskAttachment"
    }
  },
  "/api/v1/tasks/{taskId}/attachments/{attachmentId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/{taskId}/checklists": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskChecklist"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskChecklist"
    }
  },
  "/api/v1/tasks/{taskId}/checklists/{checklistId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/{taskId}/checklists/{checklistId}/items": {
    "post": {
      "$ref": "#/components/schemas/TaskChecklistItem"
    }
  },
  "/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/TaskChecklistItem"
    }
  },
  "/api/v1/tasks/{taskId}/comments": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskComment"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskComment"
    }
  },
  "/api/v1/tasks/{taskId}/comments/{commentId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/{taskId}/dependencies": {
    "get": {
      "properties": {
        "blockedBy": {
          "items": {
            "$ref": "#/components/schemas/TaskDependency"
          },
          "type": "array"
        },
        "blocking": {
          "items": {
            "$ref": "#/components/schemas/TaskDependency"
          },
          "type": "array"
        }
      },
      "required": [
        "blocking",
        "blockedBy"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/TaskDependency"
    }
  },
  "/api/v1/tasks/{taskId}/dependencies/{dependencyId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/{taskId}/labels": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskLabelAssignment"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskLabelAssignment"
    }
  },
  "/api/v1/tasks/{taskId}/labels/{labelId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tasks/{taskId}/restore": {
    "post": {
      "$ref": "#/components/schemas/Task"
    }
  },
  "/api/v1/tasks/{taskId}/watchers": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TaskWatcher"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TaskWatcher"
    }
  },
  "/api/v1/tasks/{taskId}/watchers/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/teams": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Team"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Team"
    }
  },
  "/api/v1/teams/{teamId}/invite": {
    "post": {
      "$ref": "#/components/schemas/TeamMember"
    }
  },
  "/api/v1/teams/{teamId}/members": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/TeamMember"
      },
      "type": "array"
    },
    "post": {
      "$ref": "#/components/schemas/TeamMember"
    }
  },
  "/api/v1/teams/{teamId}/members/{userId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    }
  },
  "/api/v1/tenants/current": {
    "get": {
      "$ref": "#/components/schemas/Tenant"
    },
    "patch": {
      "$ref": "#/components/schemas/Tenant"
    }
  },
  "/api/v1/usage-records": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/BillingUsageRecord"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/usage-records/summary": {
    "get": {
      "$ref": "#/components/schemas/BillingUsageSummary"
    }
  },
  "/api/v1/users": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/TenantUser"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/users/bulk-invite": {
    "post": {
      "$ref": "#/components/schemas/BulkInviteUsersResponse"
    }
  },
  "/api/v1/users/invite": {
    "post": {
      "$ref": "#/components/schemas/TenantUser"
    }
  },
  "/api/v1/users/me/profile": {
    "patch": {
      "$ref": "#/components/schemas/TenantUser"
    }
  },
  "/api/v1/webhook-deliveries": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/WebhookDelivery"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/webhook-deliveries/{deliveryId}/retry": {
    "post": {
      "$ref": "#/components/schemas/WebhookDelivery"
    }
  },
  "/api/v1/webhook-events": {
    "post": {
      "properties": {
        "deliveries": {
          "items": {
            "properties": {
              "delivery": {
                "$ref": "#/components/schemas/WebhookDelivery"
              },
              "dispatched": {
                "type": "boolean"
              }
            },
            "required": [
              "delivery",
              "dispatched"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "event": {},
        "matched": {
          "type": "number"
        }
      },
      "required": [
        "event",
        "matched",
        "deliveries"
      ],
      "type": "object"
    }
  },
  "/api/v1/webhooks": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Webhook"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Webhook"
    }
  },
  "/api/v1/webhooks/{webhookId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/Webhook"
    }
  },
  "/api/v1/webhooks/{webhookId}/disable": {
    "post": {
      "$ref": "#/components/schemas/Webhook"
    }
  },
  "/api/v1/webhooks/{webhookId}/enable": {
    "post": {
      "$ref": "#/components/schemas/Webhook"
    }
  },
  "/api/v1/webhooks/{webhookId}/rotate-secret": {
    "post": {
      "$ref": "#/components/schemas/Webhook"
    }
  },
  "/api/v1/workflow-runs": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/WorkflowRun"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/workflow-runs/dead-letter": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/WorkflowRun"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  },
  "/api/v1/workflow-runs/{runId}/cancel": {
    "post": {
      "$ref": "#/components/schemas/WorkflowRun"
    }
  },
  "/api/v1/workflow-runs/{runId}/logs": {
    "get": {
      "items": {
        "$ref": "#/components/schemas/WorkflowRunLog"
      },
      "type": "array"
    }
  },
  "/api/v1/workflow-runs/{runId}/requeue": {
    "post": {
      "$ref": "#/components/schemas/WorkflowRun"
    }
  },
  "/api/v1/workflow-runs/{runId}/retry": {
    "post": {
      "$ref": "#/components/schemas/WorkflowRun"
    }
  },
  "/api/v1/workflows": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Workflow"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    },
    "post": {
      "$ref": "#/components/schemas/Workflow"
    }
  },
  "/api/v1/workflows/{workflowId}": {
    "delete": {
      "properties": {
        "success": {
          "type": "boolean"
        }
      },
      "required": [
        "success"
      ],
      "type": "object"
    },
    "patch": {
      "$ref": "#/components/schemas/Workflow"
    }
  },
  "/api/v1/workflows/{workflowId}/archive": {
    "post": {
      "$ref": "#/components/schemas/Workflow"
    }
  },
  "/api/v1/workflows/{workflowId}/nodes": {
    "put": {
      "$ref": "#/components/schemas/Workflow"
    }
  },
  "/api/v1/workflows/{workflowId}/restore": {
    "post": {
      "$ref": "#/components/schemas/Workflow"
    }
  },
  "/api/v1/workflows/{workflowId}/run": {
    "post": {
      "$ref": "#/components/schemas/WorkflowRun"
    }
  },
  "/api/v1/workspaces": {
    "get": {
      "properties": {
        "data": {
          "items": {
            "$ref": "#/components/schemas/Workspace"
          },
          "type": "array"
        },
        "limit": {
          "type": "number"
        },
        "page": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "totalPages": {
          "type": "number"
        }
      },
      "required": [
        "data",
        "page",
        "limit",
        "total",
        "totalPages"
      ],
      "type": "object"
    }
  }
};

export function applyOpenApiResponseContract(document: OpenAPIObject): OpenAPIObject {
  document.components ??= { schemas: {} };
  document.components.schemas = {
    ...openApiComponentSchemas,
    ...(document.components.schemas ?? {})
  };

  const paths = document.paths as Record<
    string,
    Partial<Record<OpenApiMethod, { responses?: Record<string, { description?: string; content?: Record<string, unknown> }> }>>
  >;

  for (const [route, methods] of Object.entries(openApiOperationResponseSchemas)) {
    for (const [method, schema] of Object.entries(methods) as Array<[OpenApiMethod, OpenApiSchema]>) {
      const operation = paths[route]?.[method];
      if (!operation) continue;

      operation.responses ??= {};
      const status = operation.responses['201'] ? '201' : operation.responses['200'] ? '200' : method === 'post' ? '201' : '200';
      const existing = operation.responses[status] ?? { description: 'Successful response' };

      operation.responses[status] = {
        ...existing,
        description: existing.description ?? 'Successful response',
        content: {
          ...(existing.content ?? {}),
          'application/json': { schema }
        }
      };
    }
  }

  return document;
}
