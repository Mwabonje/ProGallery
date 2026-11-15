export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const getTimeRemaining = (expiresAt: string) => {
  const total = Date.parse(expiresAt) - Date.now();
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  
  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    expired: total <= 0
  };
};

export const rewriteUrlToR2 = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.split('?')[0]; 
  
  if (cleanUrl.includes('supabase.co')) {
    const r2BaseUrl = (import.meta as any).env.VITE_R2_PUBLIC_URL || '';
    if (r2BaseUrl) {
        const parts = cleanUrl.split('/public/gallery-files/');
        if (parts.length === 2 && parts[1]) {
           return `${r2BaseUrl.replace(/\/$/, '')}/${parts[1]}`;
        }
    }
  }
  return cleanUrl;
};

export const getOptimizedImageUrl = (url: string, width: number = 800, height?: number, quality: number = 70) => {
  if (!url) return '';
  
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}${height ? `&h=${height}` : ''}&q=${quality}`;
  }

  // HOTFIX for Supabase Egress: automatically rewrite old supabase.co URLs to use R2 proxy on the fly!
  try {
    const cleanUrl = rewriteUrlToR2(url);
    
    const encodedUrl = encodeURIComponent(cleanUrl);
    // Tell wsrv.nl to cache aggressively for 1 month
    let wsrvUrl = `https://wsrv.nl/?url=${encodedUrl}&w=${width}&q=${quality}&output=webp&maxage=31d`;
    
    if (height) {
      wsrvUrl += `&h=${height}&fit=cover`;
    }
    
    return wsrvUrl;
  } catch (e) {
    return url;
  }
};

/**
 * Extracts a clean, human-readable display title for any gallery,
 * properly stripping raw JSON structures (e.g. {"projectTitle":"Lamu","projectDescription":""})
 * and falling back gracefully to client_name or "Portfolio".
 */
export const getCleanGalleryTitle = (gal?: { title?: string | null; client_name?: string | null } | null): string => {
  if (!gal) return "Portfolio";

  if (gal.title) {
    const raw = gal.title.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.projectTitle && typeof parsed.projectTitle === 'string' && parsed.projectTitle.trim()) {
            return parsed.projectTitle.trim();
          }
          if (parsed.title && typeof parsed.title === 'string' && parsed.title.trim()) {
            return parsed.title.trim();
          }
        }
      } catch {}
      // If parsing fails or yields nothing, return client_name
      return gal.client_name?.trim() || "Portfolio";
    }

    // Check if it's the auto-generated "Client's gallery" placeholder
    const autoGen = new RegExp(`^${gal.client_name || ""}('s|'s|’s)?\\s*gallery$`, 'i');
    if (raw && !autoGen.test(raw)) {
      return raw;
    }
  }

  return gal.client_name?.trim() || "Portfolio";
};

/**
 * Extracts clean, human-readable description for any gallery,
 * safely handling JSON payloads and returning empty string if unset.
 */
export const getCleanGalleryDescription = (gal?: { title?: string | null } | null): string => {
  if (!gal || !gal.title) return "";
  const raw = gal.title.trim();

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.projectDescription && typeof parsed.projectDescription === 'string') {
          return parsed.projectDescription.trim();
        }
        if (parsed.description && typeof parsed.description === 'string') {
          return parsed.description.trim();
        }
      }
    } catch {}
    return "";
  }

  return raw;
};

export interface GalleryMetadataPayload {
  projectTitle?: string;
  projectDescription?: string;
  parentGalleryId?: string | null;
  isParentGallery?: boolean;
  subGalleryIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
  lockedExtraFileIds?: string[];
}

export const parseGalleryMetadata = (gal?: { title?: string | null; client_name?: string | null } | null): GalleryMetadataPayload => {
  if (!gal || !gal.title) {
    return {
      projectTitle: gal?.client_name || '',
      projectDescription: '',
      parentGalleryId: null,
      isParentGallery: false,
      subGalleryIds: [],
      seoTitle: '',
      seoDescription: '',
      lockedExtraFileIds: []
    };
  }
  const raw = gal.title.trim();
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          projectTitle: parsed.projectTitle || parsed.title || gal.client_name || '',
          projectDescription: parsed.projectDescription || parsed.description || '',
          parentGalleryId: parsed.parentGalleryId || null,
          isParentGallery: Boolean(parsed.isParentGallery || (parsed.subGalleryIds && parsed.subGalleryIds.length > 0)),
          subGalleryIds: Array.isArray(parsed.subGalleryIds) ? parsed.subGalleryIds : [],
          seoTitle: typeof parsed.seoTitle === 'string' ? parsed.seoTitle : '',
          seoDescription: typeof parsed.seoDescription === 'string' ? parsed.seoDescription : '',
          lockedExtraFileIds: Array.isArray(parsed.lockedExtraFileIds)
            ? parsed.lockedExtraFileIds.filter((id: any): id is string => typeof id === 'string' && id.length > 0)
            : []
        };
      }
    } catch {}
  }
  return {
    projectTitle: gal.client_name || '',
    projectDescription: raw,
    parentGalleryId: null,
    isParentGallery: false,
    subGalleryIds: [],
    seoTitle: '',
    seoDescription: '',
    lockedExtraFileIds: []
  };
};

export const getParentGalleryId = (gal?: { title?: string | null } | null): string | null => {
  if (!gal || !gal.title) return null;
  const raw = gal.title.trim();
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.parentGalleryId) {
        return parsed.parentGalleryId;
      }
    } catch {}
  }
  return null;
};

export const getLockedExtraFileIds = (gal?: { title?: string | null; client_name?: string | null } | null): string[] => {
  return parseGalleryMetadata(gal).lockedExtraFileIds || [];
};

export const buildUpdatedGalleryTitleJson = (
  gal: { title?: string | null; client_name?: string | null } | null | undefined,
  patch: Partial<GalleryMetadataPayload>
): string => {
  let existingRawObj: Record<string, any> = {};
  if (gal?.title && gal.title.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(gal.title.trim());
      if (parsed && typeof parsed === 'object') {
        existingRawObj = parsed;
      }
    } catch {}
  }
  const parsedMeta = parseGalleryMetadata(gal);
  const nextMeta: Record<string, any> = {
    ...existingRawObj,
    projectTitle: patch.projectTitle !== undefined ? patch.projectTitle : (parsedMeta.projectTitle || getCleanGalleryTitle(gal)),
    projectDescription: patch.projectDescription !== undefined ? patch.projectDescription : (parsedMeta.projectDescription || getCleanGalleryDescription(gal)),
    parentGalleryId: patch.parentGalleryId !== undefined ? patch.parentGalleryId : (parsedMeta.parentGalleryId || null),
    isParentGallery: patch.isParentGallery !== undefined ? patch.isParentGallery : Boolean(parsedMeta.isParentGallery),
    subGalleryIds: patch.subGalleryIds !== undefined ? patch.subGalleryIds : (parsedMeta.subGalleryIds || []),
    seoTitle: patch.seoTitle !== undefined ? patch.seoTitle : (parsedMeta.seoTitle || ''),
    seoDescription: patch.seoDescription !== undefined ? patch.seoDescription : (parsedMeta.seoDescription || ''),
    lockedExtraFileIds: patch.lockedExtraFileIds !== undefined
      ? Array.from(new Set(patch.lockedExtraFileIds))
      : (parsedMeta.lockedExtraFileIds || [])
  };
  return JSON.stringify(nextMeta);
};

export const encodeGalleryMetadata = (meta: GalleryMetadataPayload): string => {
  return JSON.stringify({
    projectTitle: meta.projectTitle || '',
    projectDescription: meta.projectDescription || '',
    parentGalleryId: meta.parentGalleryId || null,
    isParentGallery: Boolean(meta.isParentGallery),
    subGalleryIds: Array.isArray(meta.subGalleryIds) ? meta.subGalleryIds : [],
    ...(meta.seoTitle ? { seoTitle: meta.seoTitle } : {}),
    ...(meta.seoDescription ? { seoDescription: meta.seoDescription } : {}),
    ...(Array.isArray(meta.lockedExtraFileIds) && meta.lockedExtraFileIds.length > 0
      ? { lockedExtraFileIds: Array.from(new Set(meta.lockedExtraFileIds)) }
      : {})
  });
};