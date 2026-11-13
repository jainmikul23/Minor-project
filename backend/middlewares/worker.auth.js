const jwt = require('jsonwebtoken');
const db = require('../database/dbConnect');

const isWorkerAuthenticated = (req, res, next) => {
    let token = req.cookies.workerToken;
    if (!token && req.query && (req.query.workerToken || req.query.token)) {
        token = req.query.workerToken || req.query.token;
        const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        res.cookie('workerToken', token, {
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
            return res.redirect('/worker/login');
        }
        return res.status(401).json({ error: 'Worker authentication token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'civic_issue_default_jwt_secret');
        const workerId = decoded.worker_id || decoded.userId;

        db.query('SELECT w.*, d.Name AS department_name FROM Worker w LEFT JOIN Department d ON w.department_id = d.department_id WHERE w.worker_id = ?', [workerId], (err, results) => {
            if (err) {
                console.error('Error fetching worker from database:', err);
                return res.status(500).json({ error: 'Database error while fetching worker.' });
            }
            if (results.length === 0) {
                res.clearCookie('workerToken', { path: '/' });
                if (isHtmlRequest) {
                    return res.redirect('/worker/login');
                }
                return res.status(404).json({ error: 'Worker not found.' });
            }
            const safeWorker = { ...results[0] };
            delete safeWorker.Pin;
            req.worker = safeWorker;
            next();
        });
    } catch (error) {
        res.clearCookie('workerToken', { path: '/' });
        if (isHtmlRequest) {
            return res.redirect('/worker/login');
        }
        return res.status(401).json({ error: 'Invalid or expired worker authentication token.' });
    }
};

module.exports = { isWorkerAuthenticated };
