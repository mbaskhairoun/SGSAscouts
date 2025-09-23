// Admin Calendar Management Functions
let adminCalendarDatabase;
let adminCurrentEvents = [];
let adminCurrentRSVPs = [];

// Utility functions to handle dates correctly and avoid timezone issues
function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize admin calendar functionality
function initializeAdminCalendar() {
    try {
        // Use Firebase database instance
        if (typeof firebase !== 'undefined' && firebase.database) {
            adminCalendarDatabase = firebase.database();
        } else {
            console.warn('Firebase not available for admin calendar');
            return;
        }

        // Calendar section is active if this function is called

        setupCalendarTabs();
        setupEventForms();
        loadAdminEvents();
        loadAdminRSVPs();

        console.log('Admin calendar initialized successfully');
    } catch (error) {
        console.error('Error initializing admin calendar:', error);
    }
}

// Update payment status for a camping RSVP
async function updatePaymentStatus(rsvpId, paymentReceived) {
    try {
        if (!adminCalendarDatabase) {
            console.error('Database not available');
            return;
        }

        const updateData = {
            'campingDetails/paymentReceived': paymentReceived
        };

        if (paymentReceived) {
            updateData['campingDetails/paymentReceivedDate'] = new Date().toISOString();
            updateData['campingDetails/paymentReceivedBy'] = currentUser ? currentUser.email : 'admin';
        } else {
            updateData['campingDetails/paymentReceivedDate'] = null;
            updateData['campingDetails/paymentReceivedBy'] = null;
        }

        await adminCalendarDatabase.ref(`calendar/rsvps/${rsvpId}`).update(updateData);

        // Update the UI immediately
        const checkbox = document.getElementById(`paymentReceived_${rsvpId}`);
        const label = checkbox ? checkbox.nextElementSibling : null;

        if (label) {
            label.style.color = paymentReceived ? '#27ae60' : '#666';
        }

        // Refresh RSVPs to show updated date
        loadAdminRSVPs();

        showNotification(
            paymentReceived ? 'Payment marked as received' : 'Payment marked as not received',
            'success'
        );

    } catch (error) {
        console.error('Error updating payment status:', error);
        showNotification('Error updating payment status: ' + error.message, 'error');

        // Revert checkbox state on error
        const checkbox = document.getElementById(`paymentReceived_${rsvpId}`);
        if (checkbox) {
            checkbox.checked = !paymentReceived;
        }
    }
}

// Setup calendar tabs functionality
function setupCalendarTabs() {
    const tabButtons = document.querySelectorAll('.calendar-admin-tabs .tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and target tab
            button.classList.add('active');
            document.getElementById(`${targetTab}Tab`).classList.add('active');

            // Load data for the active tab
            if (targetTab === 'events') {
                displayAdminEvents();
            } else if (targetTab === 'rsvps') {
                displayAdminRSVPs();
            }
        });
    });
}

// Setup event form handlers
function setupEventForms() {
    const addEventForm = document.getElementById('addEventForm');
    const editEventForm = document.getElementById('editEventForm');

    if (addEventForm) {
        addEventForm.addEventListener('submit', handleAddEvent);

        // Initialize recurring options as disabled by default
        setTimeout(() => {
            toggleRecurringOptions(false);
        }, 100);
    }

    if (editEventForm) {
        editEventForm.addEventListener('submit', handleEditEvent);
    }
}

// Load events from Firebase
async function loadAdminEvents() {
    if (!adminCalendarDatabase) return;

    try {
        const eventsRef = adminCalendarDatabase.ref('calendar/events');
        const snapshot = await eventsRef.once('value');

        adminCurrentEvents = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const event = childSnapshot.val();
                adminCurrentEvents.push({
                    id: childSnapshot.key,
                    ...event
                });
            });
        }

        // Sort by date
        adminCurrentEvents.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

        console.log('Loaded admin events:', adminCurrentEvents.length);
        displayAdminEvents();
        updateEventStats();
    } catch (error) {
        console.error('Error loading admin events:', error);
    }
}

// Load RSVPs from Firebase
async function loadAdminRSVPs() {
    if (!adminCalendarDatabase) return;

    try {
        const rsvpRef = adminCalendarDatabase.ref('calendar/rsvps');
        const snapshot = await rsvpRef.once('value');

        adminCurrentRSVPs = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const rsvp = childSnapshot.val();
                adminCurrentRSVPs.push({
                    id: childSnapshot.key,
                    ...rsvp
                });
            });
        }

        // Sort by timestamp (newest first)
        adminCurrentRSVPs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        console.log('Loaded admin RSVPs:', adminCurrentRSVPs.length);
        console.log('RSVP data sample:', adminCurrentRSVPs.slice(0, 2));
        displayAdminRSVPs();
        updateRSVPStats();
        populateRSVPEventFilter();
    } catch (error) {
        console.error('Error loading admin RSVPs:', error);
    }
}

// Display events in admin grid
function displayAdminEvents() {
    const eventsGrid = document.getElementById('eventsGrid');
    if (!eventsGrid) return;

    const filteredEvents = getFilteredEvents();

    if (filteredEvents.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Events Found</h3>
                <p>No events match your current filters. Try adjusting your search or add a new event.</p>
            </div>
        `;
        return;
    }

    eventsGrid.innerHTML = filteredEvents.map(event => {
        const eventDate = parseLocalDate(event.date);
        const dateStr = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const timeStr = event.startTime && event.endTime ?
            `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` :
            event.startTime ? `${formatTime(event.startTime)}` : 'All Day';

        const rsvpCount = adminCurrentRSVPs.filter(rsvp => rsvp.eventId === event.id).length;
        const attendingCount = adminCurrentRSVPs.filter(rsvp =>
            rsvp.eventId === event.id && rsvp.attendanceStatus === 'attending'
        ).length;

        const isPast = eventDate < new Date();
        const statusClass = event.status || 'active';

        return `
            <div class="event-card ${event.type} ${statusClass} ${isPast ? 'past' : ''}">
                <div class="event-card-header">
                    <div class="event-card-date">
                        <div class="date-number">${eventDate.getDate()}</div>
                        <div class="date-month">${eventDate.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </div>
                    <div class="event-card-info">
                        <h4 class="event-card-title">${event.title}</h4>
                        <div class="event-card-meta">
                            <span class="event-type-badge ${event.type}">${event.type.toUpperCase()}</span>
                            <span class="event-time">${timeStr}</span>
                        </div>
                    </div>
                </div>

                <div class="event-card-body">
                    ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
                    ${event.location ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}

                    <div class="event-rsvp-summary">
                        <div class="rsvp-stats">
                            <span class="rsvp-count">
                                <i class="fas fa-users"></i>
                                ${rsvpCount} RSVPs
                            </span>
                            <span class="attending-count">
                                <i class="fas fa-check-circle"></i>
                                ${attendingCount} Attending
                            </span>
                        </div>
                    </div>
                </div>

                <div class="event-card-actions">
                    <button class="action-btn small secondary" onclick="editEvent('${event.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="action-btn small secondary" onclick="viewEventRSVPs('${event.id}')">
                        <i class="fas fa-eye"></i>
                        View RSVPs
                    </button>
                    <button class="action-btn small primary" onclick="copyEventRSVPLink('${event.id}')">
                        <i class="fas fa-link"></i>
                        Copy RSVP Link
                    </button>
                    <button class="action-btn small danger" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Display RSVPs in admin list
function displayAdminRSVPs() {
    const rsvpList = document.getElementById('rsvpList');
    if (!rsvpList) {
        console.error('RSVP list element not found');
        return;
    }

    const filteredRSVPs = getFilteredRSVPs();
    console.log('Displaying RSVPs - Total:', adminCurrentRSVPs.length, 'Filtered:', filteredRSVPs.length);

    if (filteredRSVPs.length === 0) {
        rsvpList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No RSVPs Found</h3>
                <p>No RSVP responses match your current filters.</p>
            </div>
        `;
        return;
    }

    rsvpList.innerHTML = filteredRSVPs.map(rsvp => {
        const event = adminCurrentEvents.find(e => e.id === rsvp.eventId);
        const eventTitle = event ? event.title : 'Unknown Event';
        const eventDate = rsvp.eventDate ? new Date(rsvp.eventDate).toLocaleDateString() : 'Unknown Date';
        const submittedDate = new Date(rsvp.timestamp).toLocaleDateString();

        return `
            <div class="rsvp-item ${rsvp.attendanceStatus}">
                <div class="rsvp-header">
                    <div class="rsvp-event-info">
                        <h4 class="rsvp-event-title">${eventTitle}</h4>
                        <span class="rsvp-event-date">${eventDate}</span>
                    </div>
                    <div class="rsvp-status-badge ${rsvp.attendanceStatus}">
                        ${rsvp.attendanceStatus === 'attending' ?
                            '<i class="fas fa-check"></i> Attending' :
                            '<i class="fas fa-times"></i> Not Attending'
                        }
                    </div>
                </div>

                <div class="rsvp-details">
                    <div class="rsvp-scout-info">
                        <div class="scout-detail">
                            <strong>Scout:</strong> ${rsvp.childName}
                        </div>
                        <div class="scout-detail">
                            <strong>Team:</strong> ${getTeamDisplayName(rsvp.scoutTeam)}
                        </div>
                        <div class="scout-detail">
                            <strong>Parent:</strong> ${rsvp.parentName}
                        </div>
                        <div class="scout-detail">
                            <strong>Email:</strong> ${rsvp.parentEmail}
                        </div>
                    </div>

                    ${rsvp.absentReason ? `
                        <div class="rsvp-reason">
                            <strong>Reason for absence:</strong>
                            <p>${rsvp.absentReason}</p>
                        </div>
                    ` : ''}

                    ${rsvp.additionalNotes ? `
                        <div class="rsvp-notes">
                            <strong>Additional notes:</strong>
                            <p>${rsvp.additionalNotes}</p>
                        </div>
                    ` : ''}

                    ${rsvp.campingDetails ? `
                        <div class="camping-details">
                            <h5><i class="fas fa-campground"></i> Camping Details</h5>

                            <div class="camping-section">
                                <strong>Emergency Contact:</strong>
                                <div class="camping-info">
                                    ${rsvp.campingDetails.emergencyContact.name} (${rsvp.campingDetails.emergencyContact.relation})<br>
                                    📞 ${rsvp.campingDetails.emergencyContact.phone}
                                </div>
                            </div>

                            <div class="camping-section">
                                <strong>OHIP Number:</strong>
                                <div class="camping-info">
                                    ${rsvp.campingDetails.ohipNumber || 'Not provided'}
                                </div>
                            </div>

                            <div class="camping-section">
                                <strong>Payment Status:</strong>
                                <div class="camping-info">
                                    <div style="margin-bottom: 8px;">
                                        Acknowledgment: ${rsvp.campingDetails.paymentAcknowledged ?
                                            '<span style="color: #27ae60;">✅ Acknowledged ($30 to Raymonda.farid@gmail.com)</span>' :
                                            '<span style="color: #e74c3c;">❌ Not acknowledged</span>'}
                                    </div>
                                    <div class="payment-tracking">
                                        <label style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                                            <input type="checkbox"
                                                   id="paymentReceived_${rsvp.id || rsvp.timestamp}"
                                                   ${rsvp.campingDetails.paymentReceived ? 'checked' : ''}
                                                   onchange="updatePaymentStatus('${rsvp.id || rsvp.timestamp}', this.checked)"
                                                   style="margin: 0;">
                                            <span style="font-weight: 500; color: ${rsvp.campingDetails.paymentReceived ? '#27ae60' : '#666'};">
                                                💰 Payment Received
                                            </span>
                                        </label>
                                        ${rsvp.campingDetails.paymentReceivedDate ?
                                            `<small style="color: #666; margin-left: 24px; display: block;">Received: ${new Date(rsvp.campingDetails.paymentReceivedDate).toLocaleDateString()}</small>` :
                                            ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="rsvp-meta">
                        <span class="submitted-date">Submitted: ${submittedDate}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Get team display name
function getTeamDisplayName(teamValue) {
    const teams = {
        cubs: 'Cubs & Brownies',
        scouts: 'Scouts',
        rovers: 'Rovers'
    };
    return teams[teamValue] || teamValue;
}

// Filter events based on current filters
function getFilteredEvents() {
    let filtered = [...adminCurrentEvents];

    // Filter by type
    const typeFilter = document.getElementById('eventTypeFilter')?.value;
    if (typeFilter && typeFilter !== 'all') {
        filtered = filtered.filter(event => event.type === typeFilter);
    }

    // Filter by search
    const searchQuery = document.getElementById('eventSearchInput')?.value.toLowerCase();
    if (searchQuery) {
        filtered = filtered.filter(event =>
            event.title.toLowerCase().includes(searchQuery) ||
            (event.description && event.description.toLowerCase().includes(searchQuery))
        );
    }

    return filtered;
}

// Filter RSVPs based on current filters
function getFilteredRSVPs() {
    let filtered = [...adminCurrentRSVPs];

    // Filter by event
    const eventFilter = document.getElementById('rsvpEventFilter')?.value;
    if (eventFilter && eventFilter !== 'all') {
        filtered = filtered.filter(rsvp => rsvp.eventId === eventFilter);
    }

    // Filter by status
    const statusFilter = document.getElementById('rsvpStatusFilter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(rsvp => rsvp.attendanceStatus === statusFilter);
    }

    // Filter by team
    const teamFilter = document.getElementById('rsvpTeamFilter')?.value;
    if (teamFilter && teamFilter !== 'all') {
        filtered = filtered.filter(rsvp => rsvp.scoutTeam === teamFilter);
    }

    return filtered;
}

// Update event statistics
function updateEventStats() {
    const totalEvents = adminCurrentEvents.length;
    const today = new Date();
    const upcomingEvents = adminCurrentEvents.filter(event => parseLocalDate(event.date) >= today).length;

    const totalEventsElement = document.getElementById('totalEventsCount');
    const upcomingEventsElement = document.getElementById('upcomingEventsCount');

    if (totalEventsElement) totalEventsElement.textContent = totalEvents;
    if (upcomingEventsElement) upcomingEventsElement.textContent = upcomingEvents;
}

// Update RSVP statistics
function updateRSVPStats() {
    const filteredRSVPs = getFilteredRSVPs();
    const totalRSVPs = filteredRSVPs.length;
    const attendingCount = filteredRSVPs.filter(rsvp => rsvp.attendanceStatus === 'attending').length;
    const notAttendingCount = filteredRSVPs.filter(rsvp => rsvp.attendanceStatus === 'not-attending').length;

    // Payment statistics for camping events
    const campingRSVPs = filteredRSVPs.filter(rsvp => rsvp.campingDetails);
    const paymentAcknowledged = campingRSVPs.filter(rsvp => rsvp.campingDetails?.paymentAcknowledged).length;
    const paymentReceived = campingRSVPs.filter(rsvp => rsvp.campingDetails?.paymentReceived).length;
    const pendingPayments = campingRSVPs.filter(rsvp =>
        rsvp.campingDetails?.paymentAcknowledged && !rsvp.campingDetails?.paymentReceived
    ).length;

    // Update basic stats
    const totalRSVPsElement = document.getElementById('totalRSVPsCount');
    const attendingElement = document.getElementById('attendingCount');
    const notAttendingElement = document.getElementById('notAttendingCount');

    if (totalRSVPsElement) totalRSVPsElement.textContent = totalRSVPs;
    if (attendingElement) attendingElement.textContent = attendingCount;
    if (notAttendingElement) notAttendingElement.textContent = notAttendingCount;

    // Add or update payment stats
    let paymentStatsElement = document.getElementById('paymentStats');
    if (campingRSVPs.length > 0) {
        if (!paymentStatsElement) {
            // Create payment stats section
            const rsvpStatsDiv = document.querySelector('.rsvp-stats');
            if (rsvpStatsDiv) {
                paymentStatsElement = document.createElement('div');
                paymentStatsElement.id = 'paymentStats';
                paymentStatsElement.className = 'payment-stats-section';
                paymentStatsElement.innerHTML = `
                    <div style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
                        <h4 style="color: #2c5aa0; margin-bottom: 10px;">
                            <i class="fas fa-dollar-sign"></i> Payment Tracking
                        </h4>
                        <div class="payment-stats-grid">
                            <span class="stat-item">
                                <i class="fas fa-check-circle" style="color: #27ae60;"></i>
                                <strong id="paymentReceivedCount">0</strong> received
                            </span>
                            <span class="stat-item">
                                <i class="fas fa-clock" style="color: #f39c12;"></i>
                                <strong id="pendingPaymentCount">0</strong> pending
                            </span>
                            <span class="stat-item">
                                <i class="fas fa-handshake" style="color: #3498db;"></i>
                                <strong id="paymentAcknowledgedCount">0</strong> acknowledged
                            </span>
                        </div>
                    </div>
                `;
                rsvpStatsDiv.appendChild(paymentStatsElement);
            }
        }

        // Update payment counts
        const paymentReceivedElement = document.getElementById('paymentReceivedCount');
        const pendingPaymentElement = document.getElementById('pendingPaymentCount');
        const paymentAcknowledgedElement = document.getElementById('paymentAcknowledgedCount');

        if (paymentReceivedElement) paymentReceivedElement.textContent = paymentReceived;
        if (pendingPaymentElement) pendingPaymentElement.textContent = pendingPayments;
        if (paymentAcknowledgedElement) paymentAcknowledgedElement.textContent = paymentAcknowledged;

        paymentStatsElement.style.display = 'block';
    } else if (paymentStatsElement) {
        paymentStatsElement.style.display = 'none';
    }
}

// Populate RSVP event filter dropdown
function populateRSVPEventFilter() {
    const eventFilter = document.getElementById('rsvpEventFilter');
    if (!eventFilter) return;

    // Keep the "All Events" option and add events that have RSVPs
    const eventsWithRSVPs = adminCurrentEvents.filter(event =>
        adminCurrentRSVPs.some(rsvp => rsvp.eventId === event.id)
    );

    const existingOptions = Array.from(eventFilter.options).slice(1); // Skip "All Events"
    existingOptions.forEach(option => option.remove());

    eventsWithRSVPs.forEach(event => {
        const option = document.createElement('option');
        option.value = event.id;
        option.textContent = `${event.title} (${parseLocalDate(event.date).toLocaleDateString()})`;
        eventFilter.appendChild(option);
    });
}

// Show add event modal
function showAddEventModal() {
    const modal = document.getElementById('addEventModal');
    if (modal) {
        document.getElementById('addEventForm').reset();
        modal.style.display = 'flex';
    }
}

// Edit event
function editEvent(eventId) {
    const event = adminCurrentEvents.find(e => e.id === eventId);
    if (!event) return;

    const form = document.getElementById('editEventForm');
    const modal = document.getElementById('editEventModal');

    if (form && modal) {
        // Populate form with event data
        form.eventId.value = event.id;
        form.title.value = event.title;
        form.type.value = event.type;
        form.date.value = event.date;
        form.startTime.value = event.startTime || '';
        form.endTime.value = event.endTime || '';
        form.description.value = event.description || '';
        form.location.value = event.location || '';
        form.status.value = event.status || 'active';

        // Set RSVP required radio
        const rsvpRequired = event.rsvpRequired !== false; // Default to true
        form.querySelector(`input[name="rsvpRequired"][value="${rsvpRequired}"]`).checked = true;

        // Set teams invited
        if (event.teamsInvited && Array.isArray(event.teamsInvited)) {
            const teamsSelect = form.teamsInvited;
            Array.from(teamsSelect.options).forEach(option => {
                option.selected = event.teamsInvited.includes(option.value);
            });
        }

        modal.style.display = 'flex';
    }
}

// View event RSVPs
function viewEventRSVPs(eventId) {
    // Switch to RSVPs tab and filter by this event
    const rsvpTab = document.querySelector('.tab-btn[data-tab="rsvps"]');
    const eventFilter = document.getElementById('rsvpEventFilter');

    if (rsvpTab && eventFilter) {
        rsvpTab.click(); // This will activate the RSVPs tab
        eventFilter.value = eventId;
        filterRSVPs(); // Apply the filter
    }
}

// Delete event
async function deleteEvent(eventId) {
    const event = adminCurrentEvents.find(e => e.id === eventId);
    if (!event) return;

    const confirmDelete = confirm(`Are you sure you want to delete the event "${event.title}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
        await adminCalendarDatabase.ref(`calendar/events/${eventId}`).remove();

        if (window.showNotification) {
            window.showNotification('Event deleted successfully', 'success');
        }

        // Reload events
        await loadAdminEvents();
    } catch (error) {
        console.error('Error deleting event:', error);
        if (window.showNotification) {
            window.showNotification('Error deleting event', 'error');
        }
    }
}

// Handle add event form submission
async function handleAddEvent(e) {
    e.preventDefault();

    if (!adminCalendarDatabase) {
        console.error('Database not available');
        return;
    }

    const formData = new FormData(e.target);

    // Add teams invited to form data properly
    const teamsInvited = Array.from(e.target.teamsInvited.selectedOptions).map(option => option.value);
    formData.delete('teamsInvited'); // Remove existing entries
    teamsInvited.forEach(team => formData.append('teamsInvited', team));

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        const isRecurring = formData.get('recurring') === 'true';

        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isRecurring ? 'Creating Events...' : 'Adding Event...'}`;
        submitBtn.disabled = true;

        // Process the event(s) using the new recurring functionality
        const events = await processRecurringEvent(formData);

        const eventCount = events.length;
        const successMessage = eventCount === 1 ?
            'Event added successfully' :
            `${eventCount} recurring events created successfully`;

        if (window.showNotification) {
            window.showNotification(successMessage, 'success');
        }

        // Close modal and reload events
        closeModal('addEventModal');
        await loadAdminEvents();

    } catch (error) {
        console.error('Error adding event(s):', error);
        if (window.showNotification) {
            window.showNotification('Error adding event(s)', 'error');
        }

        // Restore button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Event';
        submitBtn.disabled = false;
    }
}

// Handle edit event form submission
async function handleEditEvent(e) {
    e.preventDefault();

    if (!adminCalendarDatabase) {
        console.error('Database not available');
        return;
    }

    const formData = new FormData(e.target);
    const eventId = formData.get('eventId');
    const teamsInvited = Array.from(e.target.teamsInvited.selectedOptions).map(option => option.value);

    const eventData = {
        title: formData.get('title'),
        type: formData.get('type'),
        date: formData.get('date'),
        startTime: formData.get('startTime') || null,
        endTime: formData.get('endTime') || null,
        description: formData.get('description') || '',
        location: formData.get('location') || '',
        teamsInvited: teamsInvited,
        rsvpRequired: formData.get('rsvpRequired') === 'true',
        status: formData.get('status') || 'active',
        updatedAt: Date.now()
    };

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        await adminCalendarDatabase.ref(`calendar/events/${eventId}`).update(eventData);

        if (window.showNotification) {
            window.showNotification('Event updated successfully', 'success');
        }

        // Close modal and reload events
        closeModal('editEventModal');
        await loadAdminEvents();

    } catch (error) {
        console.error('Error updating event:', error);
        if (window.showNotification) {
            window.showNotification('Error updating event', 'error');
        }

        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Filter functions
function filterAdminEvents() {
    displayAdminEvents();
}

function filterRSVPs() {
    displayAdminRSVPs();
    updateRSVPStats();
}

// Format time function (reuse from calendar.js)
function formatTime(timeStr) {
    if (!timeStr) return '';

    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    return `${displayHour}:${minutes} ${ampm}`;
}

// Copy RSVP link for an event (admin function)
function copyEventRSVPLink(eventId) {
    const event = adminCurrentEvents.find(e => e.id === eventId);
    if (!event) {
        alert('Event not found');
        return;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace('/admin.html', '/index.html');
    const params = new URLSearchParams();
    params.set('rsvp', event.id);
    params.set('date', event.date);

    const link = `${baseUrl}?${params.toString()}`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('RSVP link copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy link:', err);
            fallbackCopyToClipboard(link);
        });
    } else {
        fallbackCopyToClipboard(link);
    }
}

// Fallback copy method for older browsers (admin version)
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        showNotification('RSVP link copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy link:', err);
        showNotification('Failed to copy link. Link: ' + text, 'error');
    }

    document.body.removeChild(textArea);
}

// Expose functions to global scope
window.showAddEventModal = showAddEventModal;
window.editEvent = editEvent;
window.viewEventRSVPs = viewEventRSVPs;
window.deleteEvent = deleteEvent;
window.copyEventRSVPLink = copyEventRSVPLink;
window.filterAdminEvents = filterAdminEvents;
window.filterRSVPs = filterRSVPs;

// Hook into the admin panel's showSection function
document.addEventListener('DOMContentLoaded', () => {
    const waitForAdminPanel = () => {
        if (typeof window.showSection === 'function') {
            // Extend the showSection function to initialize calendar when needed
            const originalShowSection = window.showSection;
            window.showSection = function(sectionName) {
                originalShowSection(sectionName);

                if (sectionName === 'calendar') {
                    setTimeout(initializeAdminCalendar, 100);
                }
            };
            console.log('Admin calendar hook installed');
        } else {
            // Wait for admin panel to load
            setTimeout(waitForAdminPanel, 500);
        }
    };

    // Start waiting for admin panel
    setTimeout(waitForAdminPanel, 1000);
});

// Recurring Event Functions
function toggleRecurringOptions(show) {
    const recurringOptions = document.getElementById('recurringOptions');
    if (recurringOptions) {
        recurringOptions.style.display = show ? 'block' : 'none';

        // Make fields required/optional based on recurring setting
        const requiredFields = ['repeatUntil', 'repeatInterval', 'repeatDay'];
        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                field.required = show;
                // Also disable/enable to prevent validation issues
                field.disabled = !show;
            }
        });
    }
}

// Process recurring events when form is submitted
async function processRecurringEvent(formData) {
    const isRecurring = formData.get('recurring') === 'true';

    if (!isRecurring) {
        // Single event - process normally
        return [await createSingleEvent(formData)];
    }

    // Recurring event - generate multiple events
    const events = [];

    // Use date strings to avoid timezone issues
    const startDateStr = formData.get('date');
    const endDateStr = formData.get('repeatUntil');
    const repeatInterval = formData.get('repeatInterval');
    const repeatDay = parseInt(formData.get('repeatDay'));
    const skipHolidays = formData.get('skipHolidays') === 'true';

    // Parse holiday dates
    const holidayDates = [];
    if (skipHolidays && formData.get('holidayDates')) {
        const holidayLines = formData.get('holidayDates').split('\n');
        holidayLines.forEach(line => {
            const dateStr = line.trim();
            if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                holidayDates.push(dateStr);
            }
        });
    }

    // Parse dates using local date construction to avoid timezone shifts
    function parseLocalDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
    }

    function formatLocalDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const startDate = parseLocalDate(startDateStr);
    const endDate = parseLocalDate(endDateStr);

    // Find first occurrence on the correct day
    let currentDate = new Date(startDate);

    // If the start date is already the correct day, use it
    // Otherwise, find the next occurrence of that day
    if (currentDate.getDay() !== repeatDay) {
        // Calculate days to add to get to the target day
        let daysToAdd = (repeatDay - currentDate.getDay() + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // If same day, go to next week
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + daysToAdd);
    }

    console.log('Recurring event details:', {
        originalStartDate: startDateStr,
        repeatDay: repeatDay,
        firstOccurrence: formatLocalDate(currentDate),
        interval: repeatInterval
    });

    // Generate events based on interval
    while (currentDate <= endDate) {
        const dateStr = formatLocalDate(currentDate);

        // Skip if it's a holiday
        if (!holidayDates.includes(dateStr)) {
            const eventData = new FormData();

            // Copy all form data except recurring-specific fields
            for (let [key, value] of formData.entries()) {
                if (!['recurring', 'repeatInterval', 'repeatDay', 'repeatUntil', 'skipHolidays', 'holidayDates'].includes(key)) {
                    eventData.append(key, value);
                }
            }

            // Override the date
            eventData.set('date', dateStr);
            eventData.set('recurring', 'true'); // Mark as part of recurring series

            const event = await createSingleEvent(eventData);
            events.push(event);
        }

        // Calculate next occurrence using safer date arithmetic
        switch (repeatInterval) {
            case 'weekly':
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7);
                break;
            case 'biweekly':
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 14);
                break;
            case 'monthly':
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
                break;
        }
    }

    return events;
}

// Create a single event
async function createSingleEvent(formData) {
    const eventId = 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Fix timezone issue by ensuring date is treated as local date
    const dateInput = formData.get('date');

    // Parse and re-format the date to ensure it's handled correctly
    const correctedDate = formatLocalDate(parseLocalDate(dateInput));

    const eventData = {
        id: eventId,
        title: formData.get('title'),
        type: formData.get('type'),
        date: correctedDate,
        startTime: formData.get('startTime') || null,
        endTime: formData.get('endTime') || null,
        description: formData.get('description') || '',
        location: formData.get('location') || '',
        teamsInvited: formData.getAll('teamsInvited'),
        rsvpRequired: formData.get('rsvpRequired') === 'true',
        status: formData.get('status') || 'active',
        recurring: formData.get('recurring') === 'true',
        createdBy: 'admin',
        createdAt: Date.now()
    };

    // Save to Firebase
    await adminCalendarDatabase.ref(`calendar/events/${eventId}`).set(eventData);

    return eventData;
}

// Make functions globally available
window.toggleRecurringOptions = toggleRecurringOptions;
window.processRecurringEvent = processRecurringEvent;