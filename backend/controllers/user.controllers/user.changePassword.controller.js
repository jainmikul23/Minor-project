const bcrypt = require('bcrypt');
const db = require('../../database/dbConnect');

const changePassword = (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.user_id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Both current password and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    db.query('SELECT Password_hash FROM User WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user from database:', err);
            return res.status(500).json({ error: 'Database error while fetching user.' });
        }   
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const currentPasswordHash = results[0].Password_hash;
        bcrypt.compare(oldPassword, currentPasswordHash, (compareErr, isMatch) => {
            if (compareErr) {
                console.error('Error comparing passwords:', compareErr);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect.' });
            }

            bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    console.error('Error hashing new password:', hashErr);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                db.query('UPDATE User SET Password_hash = ? WHERE user_id = ?', [hashedPassword, userId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating password in database:', updateErr);
                        return res.status(500).json({ error: 'Database error while updating password.' });
                    }
                    res.status(200).json({ success: true, message: 'Password changed successfully.' });    
                });
            });
        });
    });
};

module.exports = { changePassword };