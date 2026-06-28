import { PrismaClient } from '@prisma/client';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES, permissionKey } from '../src/auth/auth.constants';

const prisma = new PrismaClient();

async function syncTenantDefaults(tenantId: string) {
  const permissions = new Map<string, string>();
  let permissionCount = 0;
  let roleCount = 0;
  let rolePermissionCount = 0;

  for (const permission of DEFAULT_PERMISSIONS) {
    const saved = await prisma.permission.upsert({
      where: {
        tenantId_action_subject: {
          tenantId,
          action: permission.action,
          subject: permission.subject
        }
      },
      update: {
        description: permission.description
      },
      create: {
        tenantId,
        action: permission.action,
        subject: permission.subject,
        description: permission.description
      }
    });

    permissionCount += 1;
    permissions.set(permissionKey(permission), saved.id);
  }

  for (const role of DEFAULT_ROLES) {
    const savedRole = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: role.name
        }
      },
      update: {
        description: role.description,
        isSystem: true
      },
      create: {
        tenantId,
        name: role.name,
        description: role.description,
        isSystem: true
      }
    });

    roleCount += 1;

    for (const rolePermission of role.permissions) {
      const permissionId = permissions.get(rolePermission);

      if (!permissionId) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: savedRole.id,
            permissionId
          }
        },
        update: {},
        create: {
          roleId: savedRole.id,
          permissionId
        }
      });
      rolePermissionCount += 1;
    }
  }

  return {
    permissions: permissionCount,
    roles: roleCount,
    rolePermissions: rolePermissionCount
  };
}

async function main() {
  const tenantId = process.env.TENANT_ID?.trim();
  const tenantSlug = process.env.TENANT_SLUG?.trim();
  const tenants = tenantId
    ? await prisma.tenant.findMany({ where: { id: tenantId } })
    : tenantSlug
      ? await prisma.tenant.findMany({ where: { slug: tenantSlug } })
      : await prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } });

  if (tenants.length === 0) {
    throw new Error('No tenants matched TENANT_ID/TENANT_SLUG, and no tenants exist to sync.');
  }

  for (const tenant of tenants) {
    const counts = await syncTenantDefaults(tenant.id);
    console.log(
      `Synced RBAC defaults for ${tenant.slug}: ${counts.permissions} permissions, ${counts.roles} roles, ${counts.rolePermissions} role permissions.`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
