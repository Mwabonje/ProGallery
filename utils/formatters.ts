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

export const getOptimizedImageUrl = (url: string, width: number = 800, height?: number, quality: number = 70) => {
  if (!url) return '';
  
  // Use a global, free image compression proxy (wsrv.nl)
  // This ensures images load blazing fast on mobile without needing a paid Supabase plan
  try {
    // Some urls might already have query params from supabase
    const cleanUrl = url.split('?')[0]; 
    const encodedUrl = encodeURIComponent(cleanUrl);
    let wsrvUrl = `https://wsrv.nl/?url=${encodedUrl}&w=${width}&q=${quality}&output=webp`;
    
    if (height) {
      wsrvUrl += `&h=${height}&fit=cover`;
    }
    
    return wsrvUrl;
  } catch (e) {
    return url;
  }
};