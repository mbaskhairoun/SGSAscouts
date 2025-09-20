// Scout Calendar Management System
// Firebase Configuration for calendar (using existing config)
let calendarDatabase;

// Calendar state variables
let currentDate = new Date();
let currentEvents = [];
let currentRSVPs = [];
let selectedEvent = null;

// Calendar initialization
function initializeCalendar() {
    try {
        // Ensure MEETING_CONFIG is available
        if (!window.MEETING_CONFIG) {
            console.warn('MEETING_CONFIG not found - weekly meetings may not display');
        }

        // Use existing Firebase app instance
        if (window.announcementsDatabase) {
            calendarDatabase = window.announcementsDatabase;
        } else if (window.firebase && window.firebase.apps.length > 0) {
            calendarDatabase = window.firebase.apps[0].database();
        } else {
            console.warn('Firebase not available for calendar');
            return;
        }

        // Setup calendar navigation
        setupCalendarNavigation();

        // Load calendar data
        loadCalendarEvents();
        loadRSVPData();

        // Setup RSVP form handlers
        setupRSVPForm();


        // Generate calendar for current month
        generateCalendar();

        // Load upcoming events
        loadUpcomingEvents();

        // Check for direct RSVP link parameters
        setTimeout(() => {
            checkForDirectRSVPLink();
        }, 2000); // Wait for events to load

        console.log('Calendar initialized successfully');
    } catch (error) {
        console.error('Error initializing calendar:', error);
    }
}

// Check for direct RSVP link parameters
function checkForDirectRSVPLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('rsvp');
    const eventDate = urlParams.get('date');

    if (eventId || eventDate) {
        console.log('Direct RSVP link detected:', { eventId, eventDate });

        // Find event by ID first
        if (eventId) {
            const event = currentEvents.find(e => e.id === eventId);
            if (event) {
                console.log('Found event by ID, opening RSVP modal');
                openRSVPModal(event);
                return;
            }
        }

        // If no ID or event not found by ID, try to find by date
        if (eventDate) {
            const eventsOnDate = currentEvents.filter(e => e.date === eventDate);
            if (eventsOnDate.length === 1) {
                console.log('Found single event on date, opening RSVP modal');
                openRSVPModal(eventsOnDate[0]);
                return;
            } else if (eventsOnDate.length > 1) {
                console.log('Multiple events on date, showing day events');
                showDayEvents(eventDate, eventsOnDate);
                return;
            }
        }

        console.log('No matching event found for direct link parameters');
    }
}

// Generate direct RSVP link for an event
function generateRSVPLink(event) {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    if (event.id) {
        params.set('rsvp', event.id);
    }
    if (event.date) {
        params.set('date', event.date);
    }

    return `${baseUrl}?${params.toString()}`;
}

// Copy RSVP link to clipboard
function copyRSVPLink(event) {
    const link = generateRSVPLink(event);

    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            alert('RSVP link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy link:', err);
            fallbackCopyToClipboard(link);
        });
    } else {
        fallbackCopyToClipboard(link);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        alert('RSVP link copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please copy manually: ' + text);
    }

    document.body.removeChild(textArea);
}

// Setup calendar navigation buttons
function setupCalendarNavigation() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            // Safer month navigation - set to first day to avoid day overflow issues
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            currentDate = new Date(year, month - 1, 1);
            generateCalendar();
            loadUpcomingEvents();
        });

        nextBtn.addEventListener('click', () => {
            // Safer month navigation - set to first day to avoid day overflow issues
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            currentDate = new Date(year, month + 1, 1);
            generateCalendar();
            loadUpcomingEvents();
        });
    }
}

// Generate calendar grid
function generateCalendar() {
    const monthYearElement = document.getElementById('currentMonthYear');
    const calendarGridElement = document.getElementById('calendarGrid');

    if (!monthYearElement || !calendarGridElement) return;

    // Update month/year display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    monthYearElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Generate calendar days
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();

    // Remove all existing calendar day elements (keep headers)
    const existingDays = calendarGridElement.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        // Add classes based on date
        if (date.getMonth() !== currentDate.getMonth()) {
            dayElement.classList.add('other-month');
        }

        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Check for events on this date
        const dayEvents = getEventsForDate(date);
        if (dayEvents.length > 0) {
            dayElement.classList.add('has-events');
            if (dayEvents.some(event => event.type === 'meeting')) {
                dayElement.classList.add('has-meetings');
            }
        }

        // Create day content
        dayElement.innerHTML = `
            <div class="day-number">${date.getDate()}</div>
            <div class="day-events">
                ${generateDayEvents(dayEvents)}
            </div>
        `;

        // Add click handler for day
        dayElement.addEventListener('click', () => {
            if (dayEvents.length > 0) {
                showDayEvents(date, dayEvents);
            }
        });

        calendarGridElement.appendChild(dayElement);
    }
}

// Get events for a specific date
function getEventsForDate(date) {
    const events = [];
    const dateStr = date.toISOString().split('T')[0];

    // Get all events from Firebase for this date (including meetings)
    currentEvents.forEach(event => {
        if (event.date === dateStr) {
            events.push(event);
        }
    });

    return events;
}

// Generate event dots for calendar day
function generateDayEvents(events) {
    return events.slice(0, 3).map(event => {
        const eventClass = event.type || 'event';
        return `<div class="event-dot ${eventClass}" title="${event.title}"></div>`;
    }).join('');
}

// Show events for a specific day
function showDayEvents(date, events) {
    // For now, if there's only one event, show RSVP modal directly
    if (events.length === 1) {
        openRSVPModal(events[0]);
    } else {
        // TODO: Implement day view modal for multiple events
        console.log('Day events:', events);
    }
}

// Load calendar events from Firebase
async function loadCalendarEvents() {
    if (!calendarDatabase) return;

    try {
        const eventsRef = calendarDatabase.ref('calendar/events');
        const snapshot = await eventsRef.once('value');

        currentEvents = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const event = childSnapshot.val();
                // Include active events (both old format and new format)
                const isActive = event.active === true || event.status === 'active' || (!event.hasOwnProperty('active') && !event.hasOwnProperty('status'));
                if (isActive) {
                    currentEvents.push({
                        id: childSnapshot.key,
                        ...event
                    });
                }
            });
        }

        console.log('Loaded calendar events:', currentEvents.length);
        generateCalendar();
        loadUpcomingEvents();
    } catch (error) {
        console.error('Error loading calendar events:', error);
    }
}

// Load RSVP data from Firebase
async function loadRSVPData() {
    if (!calendarDatabase) return;

    try {
        const rsvpRef = calendarDatabase.ref('calendar/rsvps');
        const snapshot = await rsvpRef.once('value');

        currentRSVPs = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const rsvp = childSnapshot.val();
                currentRSVPs.push({
                    id: childSnapshot.key,
                    ...rsvp
                });
            });
        }

        console.log('Loaded RSVP data:', currentRSVPs.length);
    } catch (error) {
        console.error('Error loading RSVP data:', error);
    }
}

// Load and display upcoming events
function loadUpcomingEvents() {
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    if (!upcomingEventsList) return;

    const today = new Date();
    const futureEvents = [];

    // Get events for the next 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const dayEvents = getEventsForDate(date);
        dayEvents.forEach(event => {
            event.fullDate = date;
            futureEvents.push(event);
        });
    }

    // Sort by date
    futureEvents.sort((a, b) => a.fullDate - b.fullDate);

    if (futureEvents.length === 0) {
        upcomingEventsList.innerHTML = `
            <div class="no-events">
                <i class="fas fa-calendar-times"></i>
                <p>No upcoming events scheduled</p>
            </div>
        `;
        return;
    }

    upcomingEventsList.innerHTML = futureEvents.slice(0, 5).map(event => {
        const dateStr = event.fullDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });

        const timeStr = event.startTime ?
            `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` :
            'All Day';

        // Check RSVP status for this event
        const userRSVP = getUserRSVPForEvent(event.id);

        return `
            <div class="event-item ${event.type}">
                <div class="event-header">
                    <h4 class="event-title">${event.title}</h4>
                    <span class="event-type ${event.type}">${event.type.toUpperCase()}</span>
                </div>
                <div class="event-datetime">
                    <i class="fas fa-calendar"></i>
                    ${dateStr}
                </div>
                <div class="event-datetime">
                    <i class="fas fa-clock"></i>
                    ${timeStr}
                </div>
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                <div class="event-actions">
                    ${userRSVP ?
                        `<span class="rsvp-status ${userRSVP.status}">${userRSVP.status === 'attending' ? 'Attending' : 'Not Attending'}</span>` :
                        `<button class="rsvp-btn" onclick="openRSVPModal('${event.id}')">
                            <i class="fas fa-check"></i>
                            RSVP
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Format time string
function formatTime(timeStr) {
    if (!timeStr) return '';

    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    return `${displayHour}:${minutes} ${ampm}`;
}

// Get user RSVP for an event
function getUserRSVPForEvent(eventId) {
    // For now, return null - this would check localStorage or user session
    return null;
}

// Setup RSVP form handlers
function setupRSVPForm() {
    const rsvpForm = document.getElementById('rsvpForm');
    const attendanceRadios = document.querySelectorAll('input[name="attendanceStatus"]');
    const reasonGroup = document.getElementById('reasonGroup');
    const campingFields = document.getElementById('campingFields');
    const transportationRadios = document.querySelectorAll('input[name="transportation"]');
    const carpoolDetails = document.getElementById('carpoolDetails');

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', handleRSVPSubmission);
    }

    // Handle attendance status changes
    if (attendanceRadios && reasonGroup) {
        attendanceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'not-attending' && radio.checked) {
                    reasonGroup.style.display = 'block';
                    if (campingFields) campingFields.style.display = 'none';
                } else if (radio.value === 'attending' && radio.checked) {
                    reasonGroup.style.display = 'none';
                    // Show camping fields only if this is a camping event
                    if (campingFields && selectedEvent && selectedEvent.type === 'camping') {
                        campingFields.style.display = 'block';
                        campingFields.style.visibility = 'visible';
                        campingFields.style.opacity = '1';
                    }
                    // Clear any permissions validation error
                    const permissionsError = document.getElementById('permissionsError');
                    if (permissionsError) {
                        permissionsError.style.display = 'none';
                    }
                }
            });
        });
    }

    // Handle transportation selection for carpool details
    if (transportationRadios && carpoolDetails) {
        transportationRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'can-carpool' && radio.checked) {
                    carpoolDetails.style.display = 'block';
                } else {
                    carpoolDetails.style.display = 'none';
                }
            });
        });
    }

    // Add input validation for scout names
    const firstNameInput = document.getElementById('scoutFirstName');
    const lastNameInput = document.getElementById('scoutLastName');

    if (firstNameInput && lastNameInput) {
        // Add real-time validation
        [firstNameInput, lastNameInput].forEach(input => {
            input.addEventListener('input', (e) => {
                // Remove non-letter characters except spaces, hyphens, and apostrophes
                e.target.value = e.target.value.replace(/[^a-zA-Z\s\-']/g, '');

                // Capitalize first letter of each word
                e.target.value = e.target.value.replace(/\b\w/g, l => l.toUpperCase());
            });
        });
    }
}


// Open RSVP modal
function openRSVPModal(eventIdOrObject) {
    const modal = document.getElementById('rsvpModal');
    if (!modal) return;

    let event;

    if (typeof eventIdOrObject === 'string') {
        // Find event by ID
        event = currentEvents.find(e => e.id === eventIdOrObject);
        if (!event) {
            // Check if it's a meeting
            const today = new Date();
            if (eventIdOrObject.startsWith('meeting-')) {
                const dateStr = eventIdOrObject.replace('meeting-', '');
                const date = new Date(dateStr);
                event = {
                    id: eventIdOrObject,
                    title: 'Scout Meeting',
                    type: 'meeting',
                    date: dateStr,
                    startTime: '18:15',
                    endTime: '19:45',
                    description: 'Weekly scout meeting for all teams',
                    recurring: true
                };
            }
        }
    } else {
        event = eventIdOrObject;
    }

    if (!event) {
        console.error('Event not found');
        return;
    }

    selectedEvent = event;

    // Populate modal with event details
    const eventDate = new Date(event.date);
    const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const timeStr = event.startTime ?
        `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` :
        'All Day';

    document.getElementById('rsvpEventTitle').textContent = `RSVP for ${event.title}`;
    document.getElementById('rsvpEventName').textContent = event.title;
    document.getElementById('rsvpEventDate').textContent = `${dateStr} at ${timeStr}`;
    document.getElementById('rsvpEventDescription').textContent = event.description || 'Join us for this scout activity!';

    // Reset form
    document.getElementById('rsvpForm').reset();
    document.getElementById('reasonGroup').style.display = 'none';

    // Handle camping fields visibility
    const campingFields = document.getElementById('campingFields');
    const carpoolDetails = document.getElementById('carpoolDetails');

    if (campingFields) {
        if (event.type === 'camping') {
            campingFields.style.display = 'none'; // Will show when they select attending
        } else {
            campingFields.style.display = 'none';
        }
    }

    if (carpoolDetails) {
        carpoolDetails.style.display = 'none';
    }

    // Reset scout selection
    const scoutNameSelect = document.getElementById('childName');
    if (scoutNameSelect) {
        scoutNameSelect.innerHTML = '<option value="">First select a team above</option>';
    }

    // Hide manual entry
    const manualEntryContainer = document.querySelector('.scout-search-input');
    if (manualEntryContainer) {
        manualEntryContainer.style.display = 'none';
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close RSVP modal
function closeRSVPModal() {
    const modal = document.getElementById('rsvpModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        selectedEvent = null;
    }
}

// Handle RSVP form submission
async function handleRSVPSubmission(e) {
    e.preventDefault();

    if (!selectedEvent || !calendarDatabase) {
        console.error('No event selected or database not available');
        return;
    }

    const formData = new FormData(e.target);

    // Helper function to get all values from checkboxes with the same name
    function getCheckboxValues(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Custom validation for camping events
    if (selectedEvent.type === 'camping' && formData.get('attendanceStatus') === 'attending') {
        const permissions = getCheckboxValues('permissions');
        const permissionsError = document.getElementById('permissionsError');

        if (permissions.length === 0) {
            permissionsError.style.display = 'block';
            permissionsError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        } else {
            permissionsError.style.display = 'none';
        }
    }

    // Combine first and last name
    const firstName = formData.get('scoutFirstName') || '';
    const lastName = formData.get('scoutLastName') || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const rsvpData = {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        eventType: selectedEvent.type || 'meeting',
        parentName: formData.get('parentName'),
        parentEmail: formData.get('parentEmail'),
        childName: fullName,
        scoutFirstName: firstName,
        scoutLastName: lastName,
        scoutTeam: formData.get('scoutTeam'),
        attendanceStatus: formData.get('attendanceStatus'),
        absentReason: formData.get('absentReason') || '',
        additionalNotes: formData.get('additionalNotes') || '',
        timestamp: Date.now(),
        submittedAt: new Date().toISOString()
    };

    // Add camping-specific fields if this is a camping event and they're attending
    if (selectedEvent.type === 'camping' && formData.get('attendanceStatus') === 'attending') {
        rsvpData.campingDetails = {
            emergencyContact: {
                name: formData.get('emergencyContactName') || '',
                phone: formData.get('emergencyContactPhone') || '',
                relation: formData.get('emergencyContactRelation') || ''
            },
            medical: {
                conditions: formData.get('medicalConditions') || '',
                medications: formData.get('medications') || ''
            },
            dietary: {
                restrictions: getCheckboxValues('dietaryRestrictions'),
                other: formData.get('otherDietary') || ''
            },
            camping: {
                experience: formData.get('campingExperience') || '',
                sleepingArrangements: formData.get('sleepingArrangements') || '',
                availableGear: getCheckboxValues('availableGear')
            },
            transportation: {
                method: formData.get('transportation') || '',
                carpoolSpaces: formData.get('carpoolSpaces') || ''
            },
            specialNeeds: formData.get('specialNeeds') || '',
            parentParticipation: formData.get('parentParticipation') || '',
            contactInstructions: formData.get('contactInstructions') || '',
            permissions: getCheckboxValues('permissions')
        };
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        // Save to Firebase
        const rsvpRef = calendarDatabase.ref('calendar/rsvps');
        await rsvpRef.push(rsvpData);

        console.log('RSVP submitted successfully:', rsvpData);

        // Show success message
        if (window.showNotification) {
            window.showNotification('RSVP submitted successfully! Thank you for letting us know.', 'success');
        } else {
            alert('RSVP submitted successfully! Thank you for letting us know.');
        }

        // Close modal
        closeRSVPModal();

        // Reload RSVP data and refresh upcoming events
        await loadRSVPData();
        loadUpcomingEvents();

    } catch (error) {
        console.error('Error submitting RSVP:', error);

        if (window.showNotification) {
            window.showNotification('Error submitting RSVP. Please try again.', 'error');
        } else {
            alert('Error submitting RSVP. Please try again.');
        }

        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('rsvpModal');
    if (modal && e.target === modal) {
        closeRSVPModal();
    }
});


// Expose functions to global scope
window.openRSVPModal = openRSVPModal;
window.closeRSVPModal = closeRSVPModal;

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Firebase to initialize
    setTimeout(initializeCalendar, 1000);

    // Make functions available immediately
    console.log('Calendar functions loaded:', {
        populateYearlyMeetings: typeof populateYearlyMeetings,
        openRSVPModal: typeof openRSVPModal
    });
});

// Initialize calendar when page loads
window.addEventListener('load', () => {
    setTimeout(initializeCalendar, 2000);
});