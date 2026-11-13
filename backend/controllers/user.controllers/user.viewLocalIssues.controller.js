const db = require('../../database/dbConnect');

const viewLocalIssues = (req, res) => {
    const userPincode = req.query.pincode || req.user?.Pincode || '452018';

    const query = `
        SELECT c.*, cat.Name AS category_name, d.Name AS department_name
        FROM Complaint c
        LEFT JOIN category cat ON c.category_id = cat.category_id
        LEFT JOIN Department d ON c.department_id = d.department_id
        WHERE c.Pincode = ?
        ORDER BY c.priority_score DESC, c.created_at DESC
    `;
    db.query(query, [userPincode], (err, results) => {
        if (err) {
            console.error('Error fetching local issues:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        return res.status(200).json({ localIssues: results, pincode: userPincode });
    });
};

module.exports = { viewLocalIssues };
