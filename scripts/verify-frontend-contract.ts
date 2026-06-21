import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';

type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
type OperationWithSecurity = {
  security?: Array<Record<string, unknown>>;
};

interface RequiredEndpoint {
  method: HttpMethod;
  path: string;
  workflow: string;
  auth: 'public' | 'bearer';
}

interface FrontendClientCheck {
  helper: string;
  routeSnippets: string[];
  workflow: string;
}

const requiredEndpoints: RequiredEndpoint[] = [
  { method: 'get', path: '/api/v1/health/ready', workflow: 'frontend readiness gate', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/status', workflow: 'login screen API status', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/register', workflow: 'workspace signup', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/login', workflow: 'workspace login', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/refresh', workflow: 'session refresh', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/me', workflow: 'current user bootstrap', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workspaces', workflow: 'workspace switcher and create project form', auth: 'bearer' },
  { method: 'get', path: '/api/v1/teams', workflow: 'team selector and capacity views', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects', workflow: 'project portfolio list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects', workflow: 'create project flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}', workflow: 'project detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}', workflow: 'update project flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks', workflow: 'task list and board hydration', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks', workflow: 'create task flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}', workflow: 'task detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/{taskId}', workflow: 'update task flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/agile/projects/{projectId}/board', workflow: 'kanban board hydration', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/tasks/{taskId}/order', workflow: 'drag task board order update', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/tasks/{taskId}/status', workflow: 'drag task status update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/dashboards', workflow: 'dashboard list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/overview', workflow: 'executive metrics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/ai/status', workflow: 'AI availability badge', auth: 'public' },
  { method: 'get', path: '/api/v1/admin/overview', workflow: 'admin console overview', auth: 'bearer' }
];

const frontendClientChecks: FrontendClientCheck[] = [
  {
    helper: 'listProjects',
    routeSnippets: ['/projects?${params.toString()}', '/api/v1/projects'],
    workflow: 'project portfolio list'
  },
  {
    helper: 'getProject',
    routeSnippets: ['/projects/${projectId}', '/api/v1/projects/{projectId}'],
    workflow: 'project detail load'
  },
  {
    helper: 'createProject',
    routeSnippets: ['"/projects"', '/api/v1/projects'],
    workflow: 'create project flow'
  },
  {
    helper: 'updateProject',
    routeSnippets: ['/projects/${projectId}', '/api/v1/projects/{projectId}'],
    workflow: 'update project flow'
  },
  {
    helper: 'listTasks',
    routeSnippets: ['/tasks?${params.toString()}', '/api/v1/tasks'],
    workflow: 'task list and board hydration'
  },
  {
    helper: 'getTask',
    routeSnippets: ['/tasks/${taskId}', '/api/v1/tasks/{taskId}'],
    workflow: 'task detail load'
  },
  {
    helper: 'createTask',
    routeSnippets: ['"/tasks"', '/api/v1/tasks'],
    workflow: 'create task flow'
  },
  {
    helper: 'updateTask',
    routeSnippets: ['/tasks/${taskId}', '/api/v1/tasks/{taskId}'],
    workflow: 'update task flow'
  },
  {
    helper: 'getProjectBoard',
    routeSnippets: ['/agile/projects/${projectId}/board', '/api/v1/agile/projects/{projectId}/board'],
    workflow: 'kanban board hydration'
  },
  {
    helper: 'updateTaskBoardOrder',
    routeSnippets: ['/agile/tasks/${taskId}/order', '/api/v1/agile/tasks/{taskId}/order'],
    workflow: 'drag task board order update'
  },
  {
    helper: 'updateTaskStatus',
    routeSnippets: ['/agile/tasks/${taskId}/status', '/api/v1/agile/tasks/{taskId}/status'],
    workflow: 'direct task status update'
  }
];

function readOpenApiContract(): OpenAPIObject {
  const contractPath = join(process.cwd(), 'docs', 'api', 'openapi.json');
  return JSON.parse(readFileSync(contractPath, 'utf8')) as OpenAPIObject;
}

function getOperation(document: OpenAPIObject, endpoint: RequiredEndpoint) {
  return document.paths[endpoint.path]?.[endpoint.method] as OperationWithSecurity | undefined;
}

function operationHasBearerAuth(operation: OperationWithSecurity | undefined) {
  if (!operation?.security) return false;

  return operation.security.some((requirement) => Object.keys(requirement).includes('bearer'));
}

function readFrontendClient() {
  const frontendClientPath = resolve(process.cwd(), '..', 'taskbricks-fe', 'src', 'lib', 'api.ts');
  return readFileSync(frontendClientPath, 'utf8');
}

function findMissingFrontendClientChecks(frontendClient: string) {
  return frontendClientChecks.filter((check) => {
    const helperMatch = new RegExp(`(?:export\\s+)?function\\s+${check.helper}\\s*\\(`).exec(frontendClient);
    if (!helperMatch) return true;

    const helperIndex = helperMatch.index;

    const nextFunctionIndex = frontendClient.indexOf('\nexport function ', helperIndex + 1);
    const helperSource =
      nextFunctionIndex === -1
        ? frontendClient.slice(helperIndex)
        : frontendClient.slice(helperIndex, nextFunctionIndex);

    return !check.routeSnippets.some((routeSnippet) => helperSource.includes(routeSnippet));
  });
}

function main() {
  const document = readOpenApiContract();
  const missing = requiredEndpoints.filter((endpoint) => !getOperation(document, endpoint));
  const unsecured = requiredEndpoints.filter(
    (endpoint) =>
      endpoint.auth === 'bearer' && !operationHasBearerAuth(getOperation(document, endpoint))
  );
  const unversioned = Object.keys(document.paths).filter((path) => !path.startsWith('/api/v1/'));
  const bearerScheme = document.components?.securitySchemes?.bearer;
  const missingFrontendClientChecks = findMissingFrontendClientChecks(readFrontendClient());

  if (missing.length || unsecured.length || unversioned.length || !bearerScheme || missingFrontendClientChecks.length) {
    if (missing.length) {
      console.error('Missing frontend contract endpoints:');
      missing.forEach((endpoint) =>
        console.error(`- ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.workflow})`)
      );
    }

    if (unsecured.length) {
      console.error('Bearer endpoints without OpenAPI bearer metadata:');
      unsecured.forEach((endpoint) =>
        console.error(`- ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.workflow})`)
      );
    }

    if (unversioned.length) {
      console.error('Unversioned paths found:');
      unversioned.forEach((path) => console.error(`- ${path}`));
    }

    if (!bearerScheme) {
      console.error('Missing bearer security scheme.');
    }

    if (missingFrontendClientChecks.length) {
      console.error('Frontend client helper route checks failed:');
      missingFrontendClientChecks.forEach((check) =>
        console.error(`- ${check.helper} must call one of ${check.routeSnippets.join(', ')} (${check.workflow})`)
      );
    }

    process.exit(1);
  }

  console.log(`Frontend contract verified against ${Object.keys(document.paths).length} paths.`);
  console.log(`Required workflows covered: ${requiredEndpoints.length}`);
  console.log(`Frontend client helpers covered: ${frontendClientChecks.length}`);
}

main();
