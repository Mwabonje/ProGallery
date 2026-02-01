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
  if (url.includes('supabase.co/storage/v1/object/public')) {
    const separator = url.includes('?') ? '&' : '?';
    let params = `width=${width}&quality=60`;
    
    if (height) {
      params += `&height=${height}&resize=cover`;
    }
    
    return `${url}${separator}${params}`;
  }
  return url;
};