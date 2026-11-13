const db = require('../../database/dbConnect');

const getUserProfile = (req, res) => {
    const requestedId = parseInt(req.params.id, 10);
    const authUserId = req.user && req.user.user_id;

    // Prevent IDOR: standard citizens can only access their own profile
    if (authUserId && requestedId !== authUserId) {
        return res.redirect('/user/profile/' + authUserId);
    }

    const query = 'SELECT user_id, First_name, Last_name, Email, Phone, Pincode, State, City, Address_Line, good_reports, bad_reports, trust_score, created_at FROM User WHERE user_id = ?';
    db.query(query, [requestedId || authUserId], (err, results) => {
        if (err) {
            console.error('Error fetching user profile:', err);
            return res.status(500).json({ error: 'Database error while fetching user profile.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200);
        res.render('user/user.profile.ejs', { user: results[0] });
    });
};

module.exports = { getUserProfile };
