export const getApiUrl = (path: string) => {
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
    if (isNetlify) {
        return `/.netlify/functions/${path.replace('/api/', '')}`;
    }
    return path;
};
