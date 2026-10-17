export const isNetlifyEnvironment = (): boolean => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    // Local development or cloud container run Express server
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('run.app')) {
        return false;
    }
    // Production deployments (mwabonje.co.ke, mwabonje.netlify.app, etc.) run on Netlify
    return true;
};

export const getApiUrl = (path: string): string => {
    if (isNetlifyEnvironment()) {
        const cleanPath = path.replace(/^\/?api\//, '');
        return `/.netlify/functions/${cleanPath}`;
    }
    return path.startsWith('/') ? path : `/${path}`;
};
