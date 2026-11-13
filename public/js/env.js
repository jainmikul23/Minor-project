/**
 * Frontend Runtime Environment Configuration
 * Automatically resolves the live backend API URL
 */
(function() {
    var defaultBackendUrl = 'https://minor-project-t1cf.onrender.com';
    var resolvedOrigin = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? window.location.origin
        : defaultBackendUrl;

    window.__ENV__ = {
        API_BASE_URL: resolvedOrigin,
        SITE_URL: resolvedOrigin,
        APP_NAME: 'Indore Civic Grievance Redressal Portal',
        ENVIRONMENT: (resolvedOrigin.indexOf('localhost') !== -1 || resolvedOrigin.indexOf('127.0.0.1') !== -1)
            ? 'development'
            : 'production'
    };

    if (typeof window.SERVER_URL === 'undefined') {
        window.SERVER_URL = window.__ENV__.API_BASE_URL;
    }
})();
