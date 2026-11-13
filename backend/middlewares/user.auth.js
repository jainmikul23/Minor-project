const jwt = require('jsonwebtoken');
const db = require('../database/dbConnect');

const isAuthenticated = (req, res, next) => {
    let token = req.cookies.token;
    if (!token && req.query && req.query.token) {
        token = req.query.token;
        const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProd,
            path: '/',
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
    }
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : req.headers.authorization;
    }

    const isHtmlRequest = req.accepts('html') && !req.xhr && !req.path.startsWith('/api') && req.method === 'GET';

    if (!token) {
        if (isHtmlRequest) {
            return res.redirect('/user/login');
        }
        return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'civic_issue_default_jwt_secret');
        const user_id = decoded.userId;

        db.query('SELECT * FROM User WHERE user_id = ?', [user_id], (err, results) => {
            if (err) {
                console.error('❌ Database error fetching user:', err);
                return res.status(500).json({ error: 'Database error while fetching user.' });
            }
            if (results.length === 0) {
                res.clearCookie('token', { path: '/' });
                if (isHtmlRequest) {
                    return res.redirect('/user/login');
                }
                return res.status(404).json({ error: 'User not found.' });
            }
            const safeUser = { ...results[0] };
            delete safeUser.Password_hash;
            req.user = safeUser;
            next();
        });
    } catch (error) {
        console.error('❌ JWT verification failed:', error.message);
        res.clearCookie('token', { path: '/' });
        if (isHtmlRequest) {
            return res.redirect('/user/login');
        }
        return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
};

module.exports = { isAuthenticated };
