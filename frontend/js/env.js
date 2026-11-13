/**
 * Frontend Runtime Environment Configuration
 * Automatically resolves the live backend API URL
 */
(function() {
    var defaultBackendUrl = 'https://minor-project-t1cf.onrender.com';
    var isStaticSite = (typeof window !== 'undefined' && window.location && (window.location.hostname.indexOf('uyvr') !== -1 || window.location.hostname.indexOf('minor-project-1') !== -1));
    var resolvedApiBase = isStaticSite
        ? defaultBackendUrl
        : ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : defaultBackendUrl);

    window.__ENV__ = {
        API_BASE_URL: resolvedApiBase,
        BACKEND_URL: defaultBackendUrl,
        SITE_URL: (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : defaultBackendUrl,
        APP_NAME: 'Indore Civic Grievance Redressal Portal',
        ENVIRONMENT: (resolvedApiBase.indexOf('localhost') !== -1 || resolvedApiBase.indexOf('127.0.0.1') !== -1)
            ? 'development'
            : 'production'
    };

    if (typeof window.SERVER_URL === 'undefined') {
        window.SERVER_URL = window.__ENV__.API_BASE_URL;
    }
})();
