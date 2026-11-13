const db = require('../../database/dbConnect');

/**
 * Controller to fetch system API logs with optional filters
 * Used by Official Portal: "User API Interactions & Logs"
 */
const getApiLogs = async (req, res) => {
    try {
        const { user_type, endpoint, limit = 50 } = req.query;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

        let query = `
            SELECT 
                l.log_id,
                l.user_id,
                l.user_type,
                l.method,
                l.endpoint,
                l.request_body,
                l.request_params,
                l.request_query,
                l.response_status,
                l.response_data,
                l.error_message,
                l.ip_address,
                l.created_at,
                u.First_name,
                u.Last_name,
                u.Email
            FROM api_logs l
            LEFT JOIN User u ON l.user_id = u.user_id
            WHERE 1=1
        `;

        const queryParams = [];

        if (user_type && user_type !== 'all') {
            query += ' AND l.user_type = ?';
            queryParams.push(user_type);
        }

        if (endpoint && endpoint !== 'all') {
            query += ' AND l.endpoint LIKE ?';
            queryParams.push(`%${endpoint}%`);
        }

        query += ' ORDER BY l.created_at DESC, l.log_id DESC LIMIT ?';
        queryParams.push(parsedLimit);

        const [logs] = await db.promise().query(query, queryParams);

        return res.status(200).json({
            success: true,
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('Error fetching API logs:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch API logs',
            error: error.message
        });
    }
};

/**
 * Controller to fetch API statistics summary
 */
const getApiStats = async (req, res) => {
    try {
        const [statsRows] = await db.promise().query(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(CASE WHEN response_status >= 200 AND response_status < 400 THEN 1 ELSE 0 END) as successful_requests,
                SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as failed_requests,
                SUM(CASE WHEN user_type = 'citizen' THEN 1 ELSE 0 END) as citizen_requests
            FROM api_logs
        `);

        const stats = statsRows[0] || {
            total_requests: 0,
            unique_users: 0,
            successful_requests: 0,
            failed_requests: 0,
            citizen_requests: 0
        };

        return res.status(200).json({
            success: true,
            stats: {
                total_requests: parseInt(stats.total_requests || 0),
                unique_users: parseInt(stats.unique_users || 0),
                successful_requests: parseInt(stats.successful_requests || 0),
                failed_requests: parseInt(stats.failed_requests || 0),
                citizen_requests: parseInt(stats.citizen_requests || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching API stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch API stats',
            error: error.message
        });
    }
};

/**
 * Middleware to record API requests and responses in api_logs
 */
const logApiMiddleware = (req, res, next) => {
    // Skip static assets and internal checks
    if (
        req.path.startsWith('/public') ||
        req.path.startsWith('/styles') ||
        req.path.startsWith('/images') ||
        req.path.startsWith('/js') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js') ||
        req.path.endsWith('.png') ||
        req.path.endsWith('.jpg') ||
        req.path.endsWith('.ico') ||
        req.path === '/official/apiLogs' ||
        req.path === '/official/apiLogs/stats'
    ) {
        return next();
    }

    const startTime = Date.now();
    const originalJson = res.json;
    const originalSend = res.send;

    let responseBody = null;

    res.json = function (body) {
        responseBody = body;
        return originalJson.apply(this, arguments);
    };

    res.on('finish', async () => {
        try {
            // Determine user type and id
            let userType = 'guest';
            let userId = null;

            if (req.user) {
                if (req.user.official_id) {
                    userType = 'official';
                    userId = req.user.official_id;
                } else if (req.user.worker_id) {
                    userType = 'worker';
                    userId = req.user.worker_id;
                } else if (req.user.user_id) {
                    userType = 'citizen';
                    userId = req.user.user_id;
                } else if (req.session?.admin) {
                    userType = 'admin';
                    userId = req.session.admin.id || 1;
                }
            } else if (req.session?.admin) {
                userType = 'admin';
                userId = 1;
            } else if (req.path.includes('/official')) {
                userType = 'official';
            } else if (req.path.includes('/worker')) {
                userType = 'worker';
            } else if (req.path.includes('/admin')) {
                userType = 'admin';
            } else if (req.path.includes('/user')) {
                userType = 'citizen';
            }

            // Sanitize body
            let safeBody = null;
            if (req.body && Object.keys(req.body).length > 0) {
                const clone = { ...req.body };
                if (clone.Password) clone.Password = '***';
                if (clone.password) clone.password = '***';
                if (clone.Pin) clone.Pin = '***';
                if (clone.pin) clone.pin = '***';
                safeBody = JSON.stringify(clone);
            }

            let safeResp = null;
            if (responseBody) {
                try {
                    const str = typeof responseBody === 'object' ? JSON.stringify(responseBody) : String(responseBody);
                    safeResp = str.length > 500 ? str.substring(0, 500) + '...' : str;
                } catch (e) {}
            }

            await db.promise().query(
                `INSERT INTO api_logs (user_id, user_type, method, endpoint, request_body, request_params, request_query, response_status, response_data, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    userType,
                    req.method,
                    req.path,
                    safeBody,
                    JSON.stringify(req.params || {}),
                    JSON.stringify(req.query || {}),
                    res.statusCode,
                    safeResp,
                    req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
                ]
            );
        } catch (logErr) {
            // Silently ignore logging errors to not block request pipeline
        }
    });

    next();
};

module.exports = {
    getApiLogs,
    getApiStats,
    logApiMiddleware
};

