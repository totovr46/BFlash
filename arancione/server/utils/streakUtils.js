// filepath: /workspaces/BFlash/arancione/server/utils/streakUtils.js
const User = require('../models/User');

async function calculateAndUpdateStreak(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
        const lastLoginDay = lastLogin ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()) : null;

        // Calculate if login is consecutive
        if (!lastLoginDay || lastLoginDay < today) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (!lastLoginDay || lastLoginDay.getTime() === yesterday.getTime()) {
                // Consecutive login
                user.currentStreak = (user.currentStreak || 0) + 1;
            } else if (lastLoginDay < yesterday) {
                // Broken streak
                user.currentStreak = 1;
            }

            // Update last login date
            user.lastLoginDate = now;
            await user.save();
        }

        return user.currentStreak;
    } catch (error) {
        console.error('Error calculating streak:', error);
        return 0;
    }
}

module.exports = { calculateAndUpdateStreak };