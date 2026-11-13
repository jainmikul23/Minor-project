const db = require('../../database/dbConnect');

const viewCityIssues = (req, res) => {
    const userCity = req.query.city || req.user?.City || 'Indore';

    const query = `
        SELECT c.*, cat.Name AS category_name, d.Name AS department_name
        FROM Complaint c
        LEFT JOIN category cat ON c.category_id = cat.category_id
        LEFT JOIN Department d ON c.department_id = d.department_id
        WHERE c.City = ? OR c.City LIKE ?
        ORDER BY c.priority_score DESC, c.created_at DESC
    `;
    db.query(query, [userCity, `%${userCity}%`], (err, results) => {
        if (err) {
            console.error('Error fetching city issues:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        return res.status(200).json({ cityIssues: results, city: userCity });
    });
};

module.exports = { viewCityIssues };
