const db = require('../../database/dbConnect');

const viewStateIssues = (req, res) => {
    const userState = req.query.state || req.user?.State || 'Madhya Pradesh';

    const query = `
        SELECT c.*, cat.Name AS category_name, d.Name AS department_name
        FROM Complaint c
        LEFT JOIN category cat ON c.category_id = cat.category_id
        LEFT JOIN Department d ON c.department_id = d.department_id
        WHERE c.State = ? OR c.State LIKE ?
        ORDER BY c.priority_score DESC, c.created_at DESC
    `;
    db.query(query, [userState, `%${userState}%`], (err, results) => {
        if (err) {
            console.error('Error fetching state issues:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        return res.status(200).json({ stateIssues: results, state: userState });
    });
};

module.exports = { viewStateIssues };
