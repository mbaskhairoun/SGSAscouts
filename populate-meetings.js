// Standalone script to populate yearly meetings
// Run this in browser console when on the website

async function populateMeetingsNow(year = 2025) {
    console.log(`🚀 Starting to populate meetings for ${year}...`);

    // Check if Firebase is available
    if (!window.firebase || !window.firebase.apps.length) {
        console.error('❌ Firebase not initialized. Please wait for the page to fully load.');
        return;
    }

    // Get database instance
    const database = window.firebase.apps[0].database();
    if (!database) {
        console.error('❌ Firebase database not available');
        return;
    }

    // Check if MEETING_CONFIG exists
    if (!window.MEETING_CONFIG) {
        console.error('❌ MEETING_CONFIG not found. Make sure you\'re on the main page.');
        return;
    }

    const meetingConfig = window.MEETING_CONFIG;
    console.log('📅 Meeting config:', {
        day: 'Tuesday',
        time: `${meetingConfig.hour}:${meetingConfig.minute.toString().padStart(2, '0')} - ${meetingConfig.endHour}:${meetingConfig.endMinute.toString().padStart(2, '0')}`,
        holidays: meetingConfig.holidays.length
    });

    const eventsRef = database.ref('calendar/events');
    let meetingsAdded = 0;
    let meetingsSkipped = 0;

    // Start from January 1st of the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Find first Tuesday
    let currentDate = new Date(startDate);
    while (currentDate.getDay() !== 2) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📍 First Tuesday of ${year}: ${currentDate.toDateString()}`);

    // Generate all Tuesdays for the year
    while (currentDate <= endDate) {
        // Check if this Tuesday is not a holiday
        const isHoliday = meetingConfig.holidays.some(holiday =>
            holiday.toDateString() === currentDate.toDateString()
        );

        if (!isHoliday) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const startTime = `${meetingConfig.hour.toString().padStart(2, '0')}:${meetingConfig.minute.toString().padStart(2, '0')}`;
            const endTime = `${meetingConfig.endHour.toString().padStart(2, '0')}:${meetingConfig.endMinute.toString().padStart(2, '0')}`;

            const meetingEvent = {
                id: `meeting-${dateStr}`,
                title: 'Scout Meeting',
                type: 'meeting',
                date: dateStr,
                startTime: startTime,
                endTime: endTime,
                description: 'Weekly scout meeting for all teams (6:15 PM - 7:45 PM)',
                recurring: true,
                location: 'Scout Hall',
                createdBy: 'system',
                createdAt: Date.now()
            };

            try {
                await eventsRef.child(`meeting-${dateStr}`).set(meetingEvent);
                meetingsAdded++;
                if (meetingsAdded % 10 === 0) {
                    console.log(`📝 Added ${meetingsAdded} meetings so far...`);
                }
            } catch (error) {
                console.error(`❌ Error adding meeting for ${dateStr}:`, error);
            }
        } else {
            meetingsSkipped++;
            console.log(`🏖️ Skipped holiday: ${currentDate.toDateString()}`);
        }

        // Move to next Tuesday
        currentDate.setDate(currentDate.getDate() + 7);
    }

    console.log(`✅ COMPLETE! Added ${meetingsAdded} meetings, skipped ${meetingsSkipped} holidays for ${year}`);
    console.log(`📊 Total Tuesdays in year: ${meetingsAdded + meetingsSkipped}`);

    // Refresh calendar if possible
    if (window.loadCalendarEvents) {
        console.log('🔄 Refreshing calendar...');
        setTimeout(() => {
            window.loadCalendarEvents();
            if (window.generateCalendar) window.generateCalendar();
            if (window.loadUpcomingEvents) window.loadUpcomingEvents();
            console.log('✨ Calendar refreshed!');
        }, 1000);
    }

    return { added: meetingsAdded, skipped: meetingsSkipped };
}

// Make function available globally
window.populateMeetingsNow = populateMeetingsNow;

console.log('🎯 Meeting populator loaded! Run: populateMeetingsNow(2025)');