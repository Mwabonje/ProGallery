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
  
  return {
    total,
    days,
    hours,
    minutes,
    expired: total <= 0
  };
};

export const getOptimizedImageUrl = (url: string, width: number = 800, height?: number) => {
  if (!url) return '';
  
  // Only apply to Supabase Storage URLs
  // We need to switch from standard storage URL to the Image Transformation URL
  // Standard: .../storage/v1/object/public/...
  // Transform: .../storage/v1/render/image/public/...
  if (url.includes('supabase.co/storage/v1/object/public')) {
    const optimizedUrl = url.replace('/object/public/', '/render/image/public/');
    
    const separator = optimizedUrl.includes('?') ? '&' : '?';
    // Lower quality to 50 for previews to ensure speed
    // Add format=webp for significantly smaller file sizes
    let params = `width=${width}&quality=50&format=webp`;
    
    if (height) {
      params += `&height=${height}&resize=cover`;
    }
    
    return `${optimizedUrl}${separator}${params}`;
  }
  return url;
};