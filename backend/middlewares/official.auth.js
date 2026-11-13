const jwt = require('jsonwebtoken');
const db = require('../database/dbConnect');

const isOfficialAuthenticated = (req, res, next) => {
    let token = req.cookies.officialToken;
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : req.headers.authorization;
    }
    if (!token && req.cookies.token) {
        token = req.cookies.token;
    }

    const isApiOrAjax = req.xhr ||
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.path.startsWith('/api') ||
        req.path.includes('/data') ||
        req.path.includes('/apiLogs') ||
        req.path.includes('/appointments') ||
        req.path.includes('/getWorkers') ||
        req.path.includes('/chatHistory') ||
        req.method !== 'GET';

    if (!token) {
        if (!isApiOrAjax) {
            return res.redirect('/official/login');
        }
        return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'civic_issue_default_jwt_secret');
        const officialId = decoded.userId || decoded.official_id;

        // If decoded role is present and not official, reject
        if (decoded.role && decoded.role !== 'official') {
            if (!isApiOrAjax) {
                return res.redirect('/official/login');
            }
            return res.status(401).json({ error: 'Unauthorized: official role required.' });
        }

        db.query('SELECT * FROM Official WHERE official_id = ?', [officialId], (err, results) => {
            if (err) {
                console.error('Error fetching official from database:', err);
                return res.status(500).json({ error: 'Database error while fetching official.' });
            }
            if (results.length === 0) {
                res.clearCookie('officialToken', { path: '/' });
                if (!isApiOrAjax) {
                    return res.redirect('/official/login');
                }
                return res.status(404).json({ error: 'Official not found.' });
            }
            const safeOfficial = { ...results[0] };
            delete safeOfficial.Password_hash;
            req.user = safeOfficial;
            next();
        });
    } catch (error) {
        res.clearCookie('officialToken', { path: '/' });
        if (!isApiOrAjax) {
            return res.redirect('/official/login');
        }
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }
};

module.exports = { isOfficialAuthenticated };
