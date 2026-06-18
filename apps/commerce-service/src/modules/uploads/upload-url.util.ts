const INTERNAL_UPLOAD_SEGMENT = '/api/uploads/';

const normalizeUploadPathname = (pathname: string): string | null => {
  if (!pathname) return null;

  if (pathname.startsWith(INTERNAL_UPLOAD_SEGMENT)) {
    return pathname;
  }

  if (pathname.startsWith('api/uploads/')) {
    return `/${pathname}`;
  }

  if (pathname.startsWith('/uploads/')) {
    return `/api${pathname}`;
  }

  if (pathname.startsWith('uploads/')) {
    return `/api/${pathname}`;
  }

  return null;
};

export const toRelativeUploadUrl = (url?: string | null): string | undefined => {
  if (typeof url !== 'string') return undefined;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return undefined;

  const normalizedPath = normalizeUploadPathname(trimmedUrl);
  if (normalizedPath) return normalizedPath;

  try {
    const parsedUrl = new URL(trimmedUrl);
    return normalizeUploadPathname(parsedUrl.pathname) ?? trimmedUrl;
  } catch {
    return trimmedUrl;
  }
};

export const isSupportedProductImageUrl = (url?: string | null): boolean => {
  if (typeof url !== 'string') return false;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return false;

  if (normalizeUploadPathname(trimmedUrl)) {
    return true;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};
