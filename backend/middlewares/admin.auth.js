const jwt = require('jsonwebtoken');

const isAdminAuthenticated = (req, res, next) => {
    let adminToken = req.cookies.adminToken;
    if (!adminToken && req.query && (req.query.adminToken || req.query.token)) {
        adminToken = req.query.adminToken || req.query.token;
        const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        res.cookie('adminToken', adminToken, {
            httpOnly: true,
            secure: isProd,
            path: '/',
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
    }
    if (!adminToken && req.headers.authorization) {
        adminToken = req.headers.authorization.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : req.headers.authorization;
    }

    const isApiRequest = req.path.startsWith('/api') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.accepts('json') && !req.accepts('html'));

    if (!adminToken) {
        if (isApiRequest) {
            return res.status(401).json({ error: 'Admin authentication required.' });
        }
        return res.redirect('/admin/login');
    }

    // Support legacy static token for backwards compatibility
    if (adminToken === 'someSecureToken') {
        req.admin = { role: 'admin', username: process.env.ADMIN_USERNAME || 'admin' };
        return next();
    }

    // Verify signed JWT
    try {
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'civic_issue_default_jwt_secret');
        if (decoded.role === 'admin') {
            req.admin = decoded;
            return next();
        }
        throw new Error('Unauthorized role');
    } catch (err) {
        res.clearCookie('adminToken', { path: '/' });
        if (isApiRequest) {
            return res.status(401).json({ error: 'Invalid or expired admin session token.' });
        }
        return res.redirect('/admin/login');
    }
};

module.exports = { isAdminAuthenticated };
