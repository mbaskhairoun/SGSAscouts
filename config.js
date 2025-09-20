// GitHub Configuration
// For local development: Just edit the token below
// For GitHub Pages: Token is automatically injected from secrets

window.GITHUB_CONFIG = {
    username: 'baskhairounm',
    repository: 'SGSA-Pics',
    token: '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', // Edit this for local development
    baseUrl: 'https://api.github.com/repos/baskhairounm/SGSA-Pics/contents'
};

// Meeting Configuration
window.MEETING_CONFIG = {
    day: 2, // Tuesday (0 = Sunday, 1 = Monday, 2 = Tuesday, etc.)
    hour: 18, // 6 PM
    minute: 15, // 6:15 PM
    endHour: 19, // 7 PM
    endMinute: 45, // 7:45 PM
    // Year-round meetings - runs all year except holidays
    programStart: new Date(new Date().getFullYear(), 0, 1), // January 1st
    programEnd: new Date(new Date().getFullYear(), 11, 31), // December 31st
    holidays: [
        // Winter holidays 2024/2025
        new Date(2024, 11, 24), // Christmas Eve
        new Date(2024, 11, 31), // New Year's Eve
        new Date(2025, 0, 7),   // First Tuesday after New Year

        // Spring break (adjust dates as needed)
        new Date(2025, 2, 18),  // Spring break week

        // Summer holidays (if any meetings are cancelled)
        new Date(2025, 6, 1),   // Canada Day week (July 1st)

        // Add more holidays as needed throughout the year
        // Note: Update these dates annually
    ]
};