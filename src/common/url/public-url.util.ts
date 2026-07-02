export const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

const firstUrlCandidate = (value?: string | null) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0]
    ?.replace(/^https\/\//i, 'https://')
    ?.replace(/^http\/\//i, 'http://');

export const tryNormalizePublicOrigin = (value?: string | null) => {
  const candidate = firstUrlCandidate(value);
  if (!candidate) return undefined;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
};

export const normalizePublicOrigin = (
  value?: string | null,
  fallback = DEFAULT_FRONTEND_ORIGIN
) =>
  tryNormalizePublicOrigin(value) ??
  tryNormalizePublicOrigin(fallback) ??
  DEFAULT_FRONTEND_ORIGIN;

export const buildPublicUrl = (
  baseUrl: string | undefined | null,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => {
  const url = new URL(path, `${normalizePublicOrigin(baseUrl)}/`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};
