// Firebase Configuration (Realtime Database Version)
const firebaseConfig = {
  apiKey: "AIzaSyATW5HErUw05Ij28L6974sR12lVO8Av_ew",
  authDomain: "sgsa-kids.firebaseapp.com",
  databaseURL: "https://sgsa-kids-default-rtdb.firebaseio.com",
  projectId: "sgsa-kids",
  storageBucket: "sgsa-kids.firebasestorage.app",
  messagingSenderId: "988633336020",
  appId: "1:988633336020:web:f9f2055d4dd7996ad51341",
  measurementId: "G-X98HHTS026"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Make database available globally for other modules
window.database = database;

// Global variables
let currentUser = null;
let scouts = [];
let attendanceData = {};
let currentDate = new Date();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');

    // Ensure all modals are hidden by default
    hideAllModals();

    initializeApp();
    setupEventListeners();
    setDefaultDate();

    // Initialize bulk import functionality
    initializeBulkImport();
});

// Function to hide all modals
function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.id !== 'loginModal') {
            modal.style.display = 'none';
        }
    });
}

// Initialize authentication state
function initializeApp() {
    console.log('Initializing authentication...');
    
    // Always show login modal first
    showLoginModal();
    
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            // User is signed in, but verify they have permission to access admin
            console.log('User authenticated:', user.email);
            console.log('User email verified:', user.emailVerified);
            
            try {
                showLoadingSpinner();
                console.log('Testing database access...');
                
                // Test database access by trying to read scouts
                const scoutsRef = database.ref('scouts');
                const snapshot = await scoutsRef.limitToFirst(1).once('value');
                console.log('Database access verified');
                
                currentUser = user;
                hideLoadingSpinner();
                showDashboard();
                loadDashboardData();
                updateAdminInfo();
                showNotification('Welcome back, ' + user.email, 'success');
                
            } catch (error) {
                console.error('Database access error details:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                hideLoadingSpinner();
                
                // Check specific error types
                if (error.code === 'PERMISSION_DENIED') {
                    await auth.signOut();
                    showLoginModal();
                    showNotification('Access denied. Your email (' + user.email + ') is not authorized for admin access.', 'error');
                } else {
                    showNotification('Database connection error: ' + error.message, 'error');
                }
            }
        } else {
            // No user signed in
            currentUser = null;
            hideLoadingSpinner();
            showLoginModal();
        }
    });
    
    // Also check for any existing authentication immediately
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser) {
        console.log('Found existing auth user:', currentAuthUser.email);
        showLoadingSpinner();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.sidebar') && !event.target.closest('.mobile-menu-toggle')) {
                closeMobileMenu();
            }
        });
    }

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
            updateActiveMenuItem(item);

            // Close mobile menu when item is clicked
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
    
    // Add scout form - handled by addScout function later in initialization

    // Edit scout form
    const editScoutForm = document.getElementById('editScoutForm');
    if (editScoutForm) {
        editScoutForm.addEventListener('submit', handleEditScout);
    }

    // Add announcement forms
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    if (addAnnouncementForm) {
        addAnnouncementForm.addEventListener('submit', handleAddAnnouncement);
    }

    // Download RSVP Report button
    const downloadRSVPButton = document.getElementById('downloadRSVPReport');
    if (downloadRSVPButton) {
        downloadRSVPButton.addEventListener('click', downloadRSVPReport);
    }

    const editAnnouncementForm = document.getElementById('editAnnouncementForm');
    if (editAnnouncementForm) {
        editAnnouncementForm.addEventListener('submit', handleEditAnnouncement);
    }

    // Announcement preview functionality
    setupAnnouncementPreview('addAnnouncementForm', 'announcementPreview');
    setupAnnouncementPreview('editAnnouncementForm', 'editAnnouncementPreview');

    // Curriculum form
    const editCurriculumForm = document.getElementById('editCurriculumForm');
    if (editCurriculumForm) {
        editCurriculumForm.addEventListener('submit', handleEditCurriculum);
    }

    // Program year selector
    const programYearSelect = document.getElementById('programYearSelect');
    if (programYearSelect) {
        programYearSelect.addEventListener('change', loadSelectedYear);
    }

    // Grid search and filter
    const gridSearchInput = document.getElementById('gridSearchInput');
    if (gridSearchInput) {
        gridSearchInput.addEventListener('input', filterGridWeeks);
    }

    const monthFilterSelect = document.getElementById('monthFilterSelect');
    if (monthFilterSelect) {
        monthFilterSelect.addEventListener('change', filterGridWeeks);
    }

    // Search functionality
    const scoutSearch = document.getElementById('scoutSearch');
    if (scoutSearch) {
        scoutSearch.addEventListener('input', filterScouts);
    }
    
    // Date picker for attendance
    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) {
        attendanceDate.addEventListener('change', loadAttendance);
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempt...');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    // Clear any previous errors
    errorDiv.style.display = 'none';
    showLoadingSpinner();
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        hideLoadingSpinner();
        showNotification('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        hideLoadingSpinner();
        errorDiv.textContent = getErrorMessage(error.code);
        errorDiv.style.display = 'block';
    }
}

async function logout() {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        showNotification('Error logging out', 'error');
        console.error('Logout error:', error);
    }
}

// UI Functions
function showLoginModal() {
    console.log('Showing login modal...');
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    console.log('Showing dashboard...');
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Welcome to SGSA Scouts Admin Portal' },
        scouts: { title: 'Scout Roster', subtitle: 'Manage scout enrollment and information' },
        attendance: { title: 'Attendance Tracking', subtitle: 'Weekly attendance management' },
        announcements: { title: 'Announcements', subtitle: 'Manage announcements displayed on the main website' },
        curriculum: { title: 'Curriculum Management', subtitle: 'Manage weekly curriculum content and activities' },
        yearOverview: { title: 'Year Overview', subtitle: 'SGSA Sea Scouts program structure and planning reference' },
        reports: { title: 'Reports & Analytics', subtitle: 'Generate and export attendance reports' },
        settings: { title: 'Admin Settings', subtitle: 'Manage admin preferences and system settings' }
    };
    
    const titleInfo = titles[sectionName] || { title: 'Dashboard', subtitle: 'Welcome to SGSA Scouts Admin Portal' };
    document.getElementById('pageTitle').textContent = titleInfo.title;
    document.getElementById('pageSubtitle').textContent = titleInfo.subtitle;
    
    // Load section-specific data
    switch(sectionName) {
        case 'scouts':
            loadScouts();
            break;
        case 'attendance':
            loadAttendance();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'curriculum':
            loadCurriculum();
            break;
        case 'yearOverview':
            // Year Overview section is static content, no data loading needed
            break;
        case 'reports':
            loadReportsData();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function updateActiveMenuItem(activeItem) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function updateAdminInfo() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.email;
    }
}

// Scout Management Functions (Realtime Database)
async function loadScouts() {
    showLoadingSpinner();
    
    try {
        console.log('Loading scouts from Realtime Database...');
        const scoutsRef = database.ref('scouts');
        const snapshot = await scoutsRef.once('value');
        
        scouts = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                scouts.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort scouts by last name, then first name
            scouts.sort((a, b) => {
                const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
                if (lastNameCompare !== 0) return lastNameCompare;
                return (a.firstName || '').localeCompare(b.firstName || '');
            });
        }
        
        console.log('Scouts loaded, count:', scouts.length);
        displayScouts(scouts);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading scouts details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'PERMISSION_DENIED') {
            showNotification('Permission denied. Check your admin access rights.', 'error');
        } else {
            showNotification('Error loading scouts: ' + error.message, 'error');
        }
    }
}

function displayScouts(scoutsToShow) {
    const scoutsGrid = document.getElementById('scoutsGrid');
    
    if (scoutsToShow.length === 0) {
        scoutsGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3>No scouts found</h3>
                <p>Add your first scout to get started!</p>
            </div>
        `;
        return;
    }
    
    scoutsGrid.innerHTML = scoutsToShow.map(scout => `
        <div class="scout-card" data-scout-id="${scout.id}">
            <div class="scout-header">
                <div>
                    <div class="scout-name">${scout.firstName} ${scout.lastName}</div>
                    <div class="scout-grade">Grade ${scout.grade}</div>
                </div>
                <div class="scout-actions">
                    <button class="scout-btn edit" onclick="editScout('${scout.id}')" title="Edit Scout">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="scout-btn delete" onclick="deleteScout('${scout.id}')" title="Delete Scout">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="scout-info">
                <div><strong>Parent:</strong> ${scout.parentName || 'Not provided'}</div>
                <div><strong>Phone:</strong> ${scout.parentPhone || 'Not provided'}</div>
                <div><strong>Email:</strong> ${scout.parentEmail || 'Not provided'}</div>
                ${scout.birthDate ? `<div><strong>Age:</strong> ${calculateAge(scout.birthDate)} years</div>` : ''}
                ${scout.notes ? `<div><strong>Notes:</strong> ${scout.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function filterScouts() {
    const searchTerm = document.getElementById('scoutSearch').value.toLowerCase();
    const filteredScouts = scouts.filter(scout => 
        scout.firstName.toLowerCase().includes(searchTerm) ||
        scout.lastName.toLowerCase().includes(searchTerm) ||
        scout.grade.toString().includes(searchTerm) ||
        (scout.parentName && scout.parentName.toLowerCase().includes(searchTerm))
    );
    displayScouts(filteredScouts);
}

async function handleAddScout(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scoutData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        grade: parseInt(formData.get('grade')),
        birthDate: formData.get('birthDate') || null,
        parentName: formData.get('parentName'),
        parentEmail: formData.get('parentEmail') || null,
        parentPhone: formData.get('parentPhone'),
        emergencyContact: formData.get('emergencyContact') || null,
        notes: formData.get('notes') || null,
        dateAdded: new Date().toISOString(),
        active: true
    };
    
    showLoadingSpinner();
    
    try {
        const scoutsRef = database.ref('scouts');
        await scoutsRef.push(scoutData);
        
        hideLoadingSpinner();
        closeModal('addScoutModal');
        showNotification('Scout added successfully!', 'success');
        loadScouts();
        loadDashboardData();
        e.target.reset();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error adding scout', 'error');
        console.error('Error adding scout:', error);
    }
}

async function handleEditScout(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const scoutId = formData.get('scoutId');

    const scoutData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        grade: parseInt(formData.get('grade')),
        birthDate: formData.get('birthDate') || null,
        parentName: formData.get('parentName'),
        parentEmail: formData.get('parentEmail') || null,
        parentPhone: formData.get('parentPhone'),
        emergencyContact: formData.get('emergencyContact') || null,
        notes: formData.get('notes') || null,
        team: formData.get('team'),
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.email || 'admin'
    };

    showLoadingSpinner();

    try {
        // Update scout data in database
        await database.ref(`scouts/${scoutId}`).update(scoutData);

        hideLoadingSpinner();
        closeModal('editScoutModal');
        showNotification('Scout updated successfully!', 'success');

        // Refresh displays
        loadScouts();
        updateDashboardStats();

        // Reset form
        e.target.reset();

    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error updating scout: ' + error.message, 'error');
        console.error('Error updating scout:', error);
    }
}

async function deleteScout(scoutId) {
    if (!confirm('Are you sure you want to delete this scout? This action cannot be undone.')) {
        return;
    }
    
    showLoadingSpinner();
    
    try {
        await database.ref('scouts/' + scoutId).remove();
        hideLoadingSpinner();
        showNotification('Scout deleted successfully', 'success');
        loadScouts();
        loadDashboardData();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error deleting scout', 'error');
        console.error('Error deleting scout:', error);
    }
}

// Attendance Functions (Realtime Database)
function setDefaultDate() {
    const today = new Date();
    // Set to most recent Tuesday (or today if it's Tuesday)
    const dayOfWeek = today.getDay();
    const tuesday = new Date(today);
    
    if (dayOfWeek === 2) {
        // Today is Tuesday
        tuesday.setDate(today.getDate());
    } else if (dayOfWeek > 2) {
        // Past Tuesday this week
        tuesday.setDate(today.getDate() - (dayOfWeek - 2));
    } else {
        // Tuesday is next week (if today is Sunday or Monday)
        tuesday.setDate(today.getDate() - (dayOfWeek + 5));
    }
    
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = tuesday.toISOString().split('T')[0];
    }
}

async function loadAttendance() {
    const dateInput = document.getElementById('attendanceDate');
    const teamFilter = document.getElementById('attendanceTeamFilter');
    const selectedDate = dateInput.value;
    const selectedTeam = teamFilter ? teamFilter.value : 'scouts';

    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }

    // Use the team-based loading function
    try {
        showLoadingSpinner();

        // Load scouts for the specific team
        const scoutsSnapshot = await database.ref('scouts').once('value');
        const scouts = scoutsSnapshot.val() || {};

        const teamScouts = Object.entries(scouts)
            .map(([id, scout]) => ({
                id,
                ...scout,
                team: scout.team || getTeamFromGrade(scout.grade)
            }))
            .filter(scout => scout.team === selectedTeam);

        // Load attendance for this date and team
        const attendanceRef = database.ref(`attendance/${selectedTeam}/${selectedDate.replace(/-/g, '_')}`);
        const snapshot = await attendanceRef.once('value');

        const attendanceData = {};
        if (snapshot.exists()) {
            const data = snapshot.val() || {};
            // Process attendance data for each scout
            teamScouts.forEach(scout => {
                if (data[scout.id]) {
                    attendanceData[scout.id] = data[scout.id];
                }
            });
        }

        displayAttendanceSheet(teamScouts, selectedDate, selectedTeam, attendanceData);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading attendance:', error);
        showNotification('Error loading attendance: ' + error.message, 'error');
    }
}

// Old displayAttendanceSheet function removed - now using team-based version

async function saveAttendance() {
    const dateInput = document.getElementById('attendanceDate');
    const teamFilter = document.getElementById('attendanceTeamFilter');
    const selectedDate = dateInput.value;
    const selectedTeam = teamFilter ? teamFilter.value : 'scouts';

    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }

    showLoadingSpinner();

    try {
        const attendanceRows = document.querySelectorAll('.attendance-item');
        const attendanceRecord = {};

        for (const row of attendanceRows) {
            const scoutId = row.dataset.scoutId;
            const radio = row.querySelector('input[type="radio"]:checked');

            if (radio) {
                attendanceRecord[scoutId] = {
                    status: radio.value,
                    timestamp: new Date().toISOString(),
                    recordedBy: currentUser.email || 'admin'
                };
            }
        }

        // Save to team and date-specific node
        const dateKey = selectedDate.replace(/-/g, '_');
        await database.ref(`attendance/${selectedTeam}/${dateKey}`).set(attendanceRecord);

        hideLoadingSpinner();
        showNotification(`Attendance saved successfully for ${getTeamName(selectedTeam)}!`, 'success');
        updateDashboardStats();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error saving attendance', 'error');
        console.error('Error saving attendance:', error);
    }
}

function markAllPresent() {
    const presentRadios = document.querySelectorAll('input[value="present"]');
    presentRadios.forEach(radio => {
        radio.checked = true;
    });
    showNotification('All scouts marked present', 'success');
}

// Dashboard Functions (Realtime Database)
async function loadDashboardData() {
    try {
        // Load scouts count
        const scoutsSnapshot = await database.ref('scouts').once('value');
        const totalScouts = scoutsSnapshot.exists() ? Object.keys(scoutsSnapshot.val()).length : 0;
        document.getElementById('totalScouts').textContent = totalScouts;
        
        // Load today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayKey = today.replace(/-/g, '_');
        const attendanceSnapshot = await database.ref('attendance/' + todayKey).once('value');
        
        let presentToday = 0;
        if (attendanceSnapshot.exists()) {
            const todayAttendance = attendanceSnapshot.val();
            presentToday = Object.values(todayAttendance).filter(record => record.status === 'present').length;
        }
        document.getElementById('presentToday').textContent = presentToday;
        
        // Calculate attendance rate
        const attendanceRate = totalScouts > 0 ? Math.round((presentToday / totalScouts) * 100) : 0;
        document.getElementById('attendanceRate').textContent = attendanceRate + '%';
        
        // Calculate weeks so far (from September)
        const programStart = new Date(new Date().getFullYear(), 8, 1); // September 1st
        const now = new Date();
        const weeksSoFar = Math.floor((now - programStart) / (7 * 24 * 60 * 60 * 1000));
        document.getElementById('weeksSoFar').textContent = Math.max(0, weeksSoFar);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Report Functions
function loadReportsData() {
    console.log('Loading reports data...');
}

async function generateMonthlyReport() {
    showLoadingSpinner();

    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const [attendanceSnapshot, scoutsSnapshot] = await Promise.all([
            database.ref('attendance').once('value'),
            database.ref('scouts').once('value')
        ]);

        // Get scouts data for names
        const scoutsData = {};
        if (scoutsSnapshot.exists()) {
            scoutsSnapshot.forEach(childSnapshot => {
                const scout = childSnapshot.val();
                scoutsData[childSnapshot.key] = `${scout.firstName} ${scout.lastName}`;
            });
        }

        const monthlyData = [];
        if (attendanceSnapshot.exists()) {
            const allAttendance = attendanceSnapshot.val();

            // Process team-based attendance structure
            Object.keys(allAttendance).forEach(team => {
                const teamAttendance = allAttendance[team];
                Object.keys(teamAttendance).forEach(dateKey => {
                    const date = dateKey.replace(/_/g, '-');
                    if (date.startsWith(currentMonth)) {
                        const dayData = teamAttendance[dateKey];
                        Object.keys(dayData).forEach(scoutId => {
                            monthlyData.push({
                                date: date,
                                team: team,
                                scoutId: scoutId,
                                scoutName: scoutsData[scoutId] || 'Unknown Scout',
                                ...dayData[scoutId]
                            });
                        });
                    }
                });
            });
        }

        // Generate CSV content
        const csvContent = generateAttendanceCSV(monthlyData);
        downloadCSV(csvContent, `attendance-report-${currentMonth}.csv`);

        hideLoadingSpinner();
        showNotification('Monthly report generated!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error generating report', 'error');
        console.error('Error generating report:', error);
    }
}

async function exportScoutList() {
    showLoadingSpinner();
    
    try {
        const scoutsSnapshot = await database.ref('scouts').once('value');
        const scoutsData = [];
        
        if (scoutsSnapshot.exists()) {
            scoutsSnapshot.forEach(childSnapshot => {
                scoutsData.push(childSnapshot.val());
            });
        }
        
        const csvContent = generateScoutsCSV(scoutsData);
        downloadCSV(csvContent, `scout-roster-${new Date().toISOString().split('T')[0]}.csv`);
        
        hideLoadingSpinner();
        showNotification('Scout list exported!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error exporting scout list', 'error');
        console.error('Error exporting scout list:', error);
    }
}

async function exportAttendanceSummary() {
    showLoadingSpinner();
    
    try {
        // Get all scouts and attendance records
        const [scoutsSnapshot, attendanceSnapshot] = await Promise.all([
            database.ref('scouts').once('value'),
            database.ref('attendance').once('value')
        ]);
        
        const scoutsData = {};
        if (scoutsSnapshot.exists()) {
            scoutsSnapshot.forEach(childSnapshot => {
                scoutsData[childSnapshot.key] = childSnapshot.val();
            });
        }
        
        const attendanceSummary = {};
        if (attendanceSnapshot.exists()) {
            const allAttendance = attendanceSnapshot.val();

            // Process team-based attendance structure
            Object.keys(allAttendance).forEach(team => {
                const teamAttendance = allAttendance[team];
                Object.keys(teamAttendance).forEach(dateKey => {
                    const dayData = teamAttendance[dateKey];
                    Object.keys(dayData).forEach(scoutId => {
                        if (!attendanceSummary[scoutId]) {
                            attendanceSummary[scoutId] = { present: 0, absent: 0, excused: 0, total: 0 };
                        }
                        const status = dayData[scoutId].status;
                        if (attendanceSummary[scoutId][status] !== undefined) {
                            attendanceSummary[scoutId][status]++;
                        }
                        attendanceSummary[scoutId].total++;
                    });
                });
            });
        }
        
        const csvContent = generateAttendanceSummaryCSV(scoutsData, attendanceSummary);
        downloadCSV(csvContent, `attendance-summary-${new Date().toISOString().split('T')[0]}.csv`);
        
        hideLoadingSpinner();
        showNotification('Attendance summary exported!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error exporting attendance summary', 'error');
        console.error('Error exporting attendance summary:', error);
    }
}

// Settings Functions
function loadSettings() {
    const meetingDay = localStorage.getItem('meetingDay') || 'tuesday';
    const meetingTime = localStorage.getItem('meetingTime') || '18:15';
    const programStart = localStorage.getItem('programStart') || new Date().getFullYear() + '-09-01';
    const programEnd = localStorage.getItem('programEnd') || (new Date().getFullYear() + 1) + '-06-30';
    
    document.getElementById('meetingDay').value = meetingDay;
    document.getElementById('meetingTime').value = meetingTime;
    document.getElementById('programStart').value = programStart;
    document.getElementById('programEnd').value = programEnd;
}

function saveSettings() {
    const meetingDay = document.getElementById('meetingDay').value;
    const meetingTime = document.getElementById('meetingTime').value;
    const programStart = document.getElementById('programStart').value;
    const programEnd = document.getElementById('programEnd').value;
    
    localStorage.setItem('meetingDay', meetingDay);
    localStorage.setItem('meetingTime', meetingTime);
    localStorage.setItem('programStart', programStart);
    localStorage.setItem('programEnd', programEnd);
    
    showNotification('Settings saved successfully!', 'success');
}

// Session management functions
async function clearAuthSession() {
    console.log('Clearing authentication session...');
    showLoadingSpinner();
    
    try {
        // Sign out any existing user
        await auth.signOut();
        
        // Clear any cached data
        currentUser = null;
        scouts = [];
        attendanceData = {};
        
        // Clear local storage
        localStorage.removeItem('firebase:authUser:' + firebaseConfig.apiKey + ':[DEFAULT]');
        localStorage.removeItem('firebase:host:' + firebaseConfig.authDomain);
        
        // Clear session storage
        sessionStorage.clear();
        
        hideLoadingSpinner();
        showLoginModal();
        showNotification('Session cleared. Please login again.', 'success');
        
        // Clear form
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
        
    } catch (error) {
        console.error('Error clearing session:', error);
        hideLoadingSpinner();
        showNotification('Error clearing session. Please refresh the page.', 'error');
    }
}

// Utility Functions
function calculateAge(birthDate) {
    if (!birthDate) return 'Unknown';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    notification.className = `notification ${type}`;
    messageSpan.textContent = message;
    
    // Set appropriate icon
    if (type === 'success') {
        icon.className = 'notification-icon fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'notification-icon fas fa-exclamation-circle';
    } else {
        icon.className = 'notification-icon fas fa-info-circle';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function showAddScoutModal() {
    document.getElementById('addScoutModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No admin account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/invalid-credential':
            return 'Invalid login credentials. Please check your email and password.';
        default:
            return 'Login failed. Please check your credentials and try again.';
    }
}

// CSV Generation Functions
function generateAttendanceCSV(attendanceData) {
    const headers = ['Date', 'Team', 'Scout ID', 'Scout Name', 'Status', 'Recorded By'];
    const rows = attendanceData.map(record => [
        record.date,
        getTeamName(record.team || 'scouts'),
        record.scoutId,
        record.scoutName || 'Unknown Scout',
        record.status,
        record.recordedBy || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateScoutsCSV(scoutsData) {
    const headers = ['First Name', 'Last Name', 'Grade', 'Birth Date', 'Parent Name', 'Parent Email', 'Parent Phone', 'Emergency Contact', 'Notes'];
    const rows = scoutsData.map(scout => [
        scout.firstName,
        scout.lastName,
        scout.grade,
        scout.birthDate || '',
        scout.parentName || '',
        scout.parentEmail || '',
        scout.parentPhone || '',
        scout.emergencyContact || '',
        scout.notes || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateAttendanceSummaryCSV(scoutsData, attendanceSummary) {
    const headers = ['Scout Name', 'Grade', 'Team', 'Total Sessions', 'Present', 'Absent', 'Excused', 'Attendance Rate'];
    const rows = Object.keys(scoutsData).map(scoutId => {
        const scout = scoutsData[scoutId];
        const summary = attendanceSummary[scoutId] || { present: 0, absent: 0, excused: 0, total: 0 };
        const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
        const team = scout.team || getTeamFromGrade(scout.grade);

        return [
            `${scout.firstName} ${scout.lastName}`,
            scout.grade,
            getTeamName(team),
            summary.total,
            summary.present,
            summary.absent,
            summary.excused,
            rate + '%'
        ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
}


// Announcement Management Functions
let announcements = [];

async function loadAnnouncements() {
    showLoadingSpinner();

    try {
        console.log('Loading announcements from Realtime Database...');
        const announcementsRef = database.ref('announcements');
        const snapshot = await announcementsRef.once('value');

        announcements = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                announcements.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            // Sort announcements by timestamp (newest first)
            announcements.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        console.log('Announcements loaded, count:', announcements.length);
        displayAnnouncements(announcements);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading announcements:', error);
        showNotification('Error loading announcements: ' + error.message, 'error');
    }
}

function displayAnnouncements(announcementsToShow) {
    const announcementsGrid = document.getElementById('announcementsGrid');

    if (announcementsToShow.length === 0) {
        announcementsGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-bullhorn" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3>No Announcements Yet</h3>
                <p>Start by creating your first announcement to inform scouts and parents.</p>
            </div>
        `;
        return;
    }

    announcementsGrid.innerHTML = announcementsToShow.map(announcement => {
        const priorityClass = `priority-${announcement.priority || 'medium'}`;
        const statusClass = announcement.active ? 'status-active' : 'status-draft';
        const dateCreated = new Date(announcement.timestamp).toLocaleDateString();

        return `
            <div class="announcement-card ${priorityClass} ${statusClass}">
                <div class="announcement-header">
                    <div class="announcement-meta">
                        <span class="announcement-priority ${priorityClass}">${(announcement.priority || 'medium').toUpperCase()}</span>
                        <span class="announcement-status ${statusClass}">${announcement.active ? 'ACTIVE' : 'DRAFT'}</span>
                    </div>
                    <div class="announcement-actions">
                        <button class="action-btn small" onclick="editAnnouncement('${announcement.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" onclick="deleteAnnouncement('${announcement.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="announcement-content">
                    <h3 class="announcement-title">${announcement.title}</h3>
                    <p class="announcement-text" style="white-space: pre-wrap;">${announcement.content}</p>
                    ${announcement.images && announcement.images.length > 0 ? `
                        <div class="announcement-images-container" id="announcement-images-${announcement.id}"></div>
                    ` : ''}
                    <div class="announcement-footer">
                        <span class="announcement-date">Created: ${dateCreated}</span>
                        <span class="announcement-author">By: ${announcement.author}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Display images for each announcement after HTML is rendered
    setTimeout(() => {
        announcements.forEach(announcement => {
            if (announcement.images && announcement.images.length > 0) {
                const container = document.getElementById(`announcement-images-${announcement.id}`);
                if (container && window.displayAnnouncementImages) {
                    window.displayAnnouncementImages(announcement.images, container);
                }
            }
        });
    }, 100);
}

function showAddAnnouncementModal() {
    document.getElementById('addAnnouncementModal').style.display = 'flex';
    // Reset form
    document.getElementById('addAnnouncementForm').reset();
    // Reset images
    if (window.resetAnnouncementImages) {
        window.resetAnnouncementImages();
    }
    updateAnnouncementPreview('announcementPreview', '', '');
}

function setupAnnouncementPreview(formId, previewId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const titleInput = form.querySelector('input[name="title"]');
    const contentInput = form.querySelector('textarea[name="content"]');

    if (titleInput && contentInput) {
        titleInput.addEventListener('input', () => updateAnnouncementPreview(previewId, titleInput.value, contentInput.value));
        contentInput.addEventListener('input', () => updateAnnouncementPreview(previewId, titleInput.value, contentInput.value));
    }
}

function updateAnnouncementPreview(previewId, title, content) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const previewTitle = preview.querySelector('.preview-title');
    const previewContent = preview.querySelector('.preview-content');

    previewTitle.textContent = title || 'Your announcement title will appear here';
    previewContent.style.whiteSpace = 'pre-wrap';
    previewContent.textContent = content || 'Your announcement content will appear here';
}

async function handleAddAnnouncement(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    try {
        // Upload images if any are selected
        let uploadedImages = [];
        if (window.selectedAnnouncementImages && window.selectedAnnouncementImages.length > 0) {
            showNotification('Uploading images...', 'info');
            console.log('Uploading', window.selectedAnnouncementImages.length, 'images...');

            // Check if upload function exists
            if (typeof window.uploadAnnouncementImages === 'function') {
                uploadedImages = await window.uploadAnnouncementImages(window.selectedAnnouncementImages);
                console.log('Images uploaded successfully:', uploadedImages);
            } else {
                console.error('uploadAnnouncementImages function not found');
                throw new Error('Image upload function not available');
            }
        }

        const announcementData = {
            title: formData.get('title'),
            content: formData.get('content'),
            priority: formData.get('priority'),
            active: formData.get('active') === 'true',
            timestamp: Date.now(),
            author: currentUser.email,
            dateCreated: new Date().toISOString().split('T')[0],
            images: uploadedImages // Add images array
        };

        const announcementsRef = database.ref('announcements');
        await announcementsRef.push(announcementData);

        hideLoadingSpinner();
        closeModal('addAnnouncementModal');
        showNotification('Announcement created successfully!', 'success');
        loadAnnouncements(); // Reload the announcements
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error adding announcement:', error);
        showNotification('Error creating announcement: ' + error.message, 'error');
    }
}

function editAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const form = document.getElementById('editAnnouncementForm');
    form.querySelector('input[name="announcementId"]').value = announcementId;
    form.querySelector('input[name="title"]').value = announcement.title;
    form.querySelector('textarea[name="content"]').value = announcement.content;
    form.querySelector('select[name="priority"]').value = announcement.priority;
    form.querySelector('select[name="active"]').value = announcement.active.toString();

    updateAnnouncementPreview('editAnnouncementPreview', announcement.title, announcement.content);
    document.getElementById('editAnnouncementModal').style.display = 'flex';
}

async function handleEditAnnouncement(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    const announcementId = formData.get('announcementId');
    const announcementData = {
        title: formData.get('title'),
        content: formData.get('content'),
        priority: formData.get('priority'),
        active: formData.get('active') === 'true',
        timestamp: Date.now(),
        author: currentUser.email,
        dateCreated: new Date().toISOString().split('T')[0]
    };

    try {
        const announcementRef = database.ref(`announcements/${announcementId}`);
        await announcementRef.update(announcementData);

        hideLoadingSpinner();
        closeModal('editAnnouncementModal');
        showNotification('Announcement updated successfully!', 'success');
        loadAnnouncements(); // Reload the announcements
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error updating announcement:', error);
        showNotification('Error updating announcement: ' + error.message, 'error');
    }
}

async function deleteAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const confirmed = confirm(`Are you sure you want to delete the announcement "${announcement.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingSpinner();

    try {
        const announcementRef = database.ref(`announcements/${announcementId}`);
        await announcementRef.remove();

        hideLoadingSpinner();
        showNotification('Announcement deleted successfully!', 'success');
        loadAnnouncements(); // Reload the announcements
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error deleting announcement:', error);
        showNotification('Error deleting announcement: ' + error.message, 'error');
    }
}

// Curriculum Management Functions
let currentProgramYear = null;
let currentWeekData = null;
let currentWeekNumber = 1;
let totalWeeks = 40; // Full school year including all of June
let allWeeksData = {}; // Store all weeks for grid view
let currentViewMode = 'week'; // 'week' or 'grid'

async function loadCurriculum() {
    try {
        await loadProgramYears();
    } catch (error) {
        console.error('Error loading curriculum:', error);
        showNotification('Error loading curriculum: ' + error.message, 'error');
    }
}

async function loadProgramYears() {
    try {
        const team = document.getElementById('curriculumTeamSelect').value || 'scouts';
        const curriculumRef = database.ref(`curriculum/${team}`);
        const snapshot = await curriculumRef.once('value');

        const yearSelect = document.getElementById('programYearSelect');
        yearSelect.innerHTML = '<option value="">Select Program Year</option>';

        if (snapshot.exists()) {
            const years = Object.keys(snapshot.val()).sort((a, b) => b.localeCompare(a));
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}-${parseInt(year) + 1} Program Year`;
                yearSelect.appendChild(option);
            });
        }

        // Add current year option
        const currentYear = new Date().getFullYear();
        const currentYearOption = document.createElement('option');
        currentYearOption.value = currentYear.toString();
        currentYearOption.textContent = `${currentYear}-${currentYear + 1} Program Year (Current)`;

        // Check if current year already exists in the list
        const existingOption = Array.from(yearSelect.options).find(opt => opt.value === currentYear.toString());
        if (!existingOption) {
            yearSelect.insertBefore(currentYearOption, yearSelect.children[1]);
        }

    } catch (error) {
        console.error('Error loading program years:', error);
        showNotification('Error loading program years: ' + error.message, 'error');
    }
}

async function initializeCurrentYear() {
    const currentYear = new Date().getFullYear();
    const team = document.getElementById('curriculumTeamSelect').value || 'scouts';
    const programYearRef = database.ref(`curriculum/${team}/${currentYear}`);

    try {
        showLoadingSpinner();

        // Check if year already exists
        const snapshot = await programYearRef.once('value');
        if (snapshot.exists()) {
            showNotification(`Program year ${currentYear}-${currentYear + 1} already exists for ${getTeamName(team)}!`, 'info');
            hideLoadingSpinner();
            return;
        }

        // Create default curriculum structure for the year
        const defaultCurriculum = {};
        for (let week = 1; week <= totalWeeks; week++) {
            defaultCurriculum[`week${week}`] = {
                weekNumber: week,
                theme: '',
                meetingDate: '',
                objectives: '',
                activities: [],
                materials: '',
                assessment: '',
                notes: '',
                lastModified: Date.now(),
                modifiedBy: currentUser.email
            };
        }

        await programYearRef.set(defaultCurriculum);

        hideLoadingSpinner();
        showNotification(`Program year ${currentYear}-${currentYear + 1} initialized successfully!`, 'success');

        // Reload the year selector and select the new year
        await loadProgramYears();
        document.getElementById('programYearSelect').value = currentYear.toString();
        loadSelectedYear();

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error initializing current year:', error);
        showNotification('Error initializing year: ' + error.message, 'error');
    }
}

async function loadSelectedYear() {
    const yearSelect = document.getElementById('programYearSelect');
    const selectedYear = yearSelect.value;

    if (!selectedYear) {
        currentProgramYear = null;
        showCurriculumPlaceholder();
        return;
    }

    currentProgramYear = selectedYear;
    currentWeekNumber = 1;

    try {
        showLoadingSpinner();
        await loadAllWeeksData();

        if (currentViewMode === 'week') {
            await loadWeekData(currentWeekNumber);
            updateCurriculumNavigation();
        } else {
            displayGridView();
        }
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading selected year:', error);
        showNotification('Error loading curriculum data: ' + error.message, 'error');
    }
}

async function loadAllWeeksData() {
    if (!currentProgramYear) return;

    try {
        const team = document.getElementById('curriculumTeamSelect').value || 'scouts';
        const curriculumRef = database.ref(`curriculum/${team}/${currentProgramYear}`);
        const snapshot = await curriculumRef.once('value');

        allWeeksData = {};
        if (snapshot.exists()) {
            allWeeksData = snapshot.val();
        }

        // Ensure all weeks exist with default data
        for (let week = 1; week <= totalWeeks; week++) {
            if (!allWeeksData[`week${week}`]) {
                allWeeksData[`week${week}`] = getDefaultWeekData(week);
            }
        }
    } catch (error) {
        console.error('Error loading all weeks data:', error);
        showNotification('Error loading curriculum data: ' + error.message, 'error');
    }
}

async function loadWeekData(weekNumber) {
    if (!currentProgramYear) return;

    try {
        const team = document.getElementById('curriculumTeamSelect').value || 'scouts';
        const weekRef = database.ref(`curriculum/${team}/${currentProgramYear}/week${weekNumber}`);
        const snapshot = await weekRef.once('value');

        currentWeekData = snapshot.exists() ? snapshot.val() : getDefaultWeekData(weekNumber);
        displayWeekData();
    } catch (error) {
        console.error('Error loading week data:', error);
        showNotification('Error loading week data: ' + error.message, 'error');
    }
}

function getDefaultWeekData(weekNumber) {
    return {
        weekNumber: weekNumber,
        theme: '',
        meetingDate: '',
        objectives: '',
        activities: [],
        materials: '',
        assessment: '',
        notes: '',
        lastModified: Date.now(),
        modifiedBy: currentUser.email
    };
}

function displayWeekData() {
    const display = document.getElementById('curriculumDisplay');

    if (!currentWeekData) {
        showCurriculumPlaceholder();
        return;
    }

    // Calculate meeting date for the week - find first Tuesday of September
    const year = parseInt(currentProgramYear);
    const programStart = new Date(year, 8, 1); // September 1st
    // Find the first Tuesday of September
    while (programStart.getDay() !== 2) { // 2 = Tuesday
        programStart.setDate(programStart.getDate() + 1);
    }
    const meetingDate = new Date(programStart);
    meetingDate.setDate(meetingDate.getDate() + (currentWeekNumber - 1) * 7);

    const totalDuration = currentWeekData.activities ?
        currentWeekData.activities.reduce((sum, activity) => sum + (activity.duration || 0), 0) : 0;

    display.innerHTML = `
        <div class="curriculum-week-view">
            <div class="week-header">
                <div class="week-info">
                    <h3>Week ${currentWeekData.weekNumber}</h3>
                    <p class="week-theme">${currentWeekData.theme || 'No theme set'}</p>
                    <p class="week-date">${currentWeekData.meetingDate || meetingDate.toLocaleDateString()}</p>
                    ${totalDuration > 0 ? `<p class="week-duration"><i class="fas fa-clock"></i> ${totalDuration} minutes total</p>` : ''}
                </div>
                <div class="week-status">
                    ${currentWeekData.lastModified ? `
                        <span class="last-modified">
                            <i class="fas fa-clock"></i>
                            Modified: ${new Date(currentWeekData.lastModified).toLocaleDateString()}
                        </span>
                        <span class="modified-by">
                            <i class="fas fa-user"></i>
                            By: ${currentWeekData.modifiedBy || 'Unknown'}
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="lesson-plan-view">
                <!-- Lesson Plan Header -->
                <div class="lesson-plan-header">
                    <div class="lesson-overview">
                        <div class="lesson-summary">
                            <div class="summary-item">
                                <span class="summary-label">Meeting Duration:</span>
                                <span class="summary-value">${totalDuration > 0 ? totalDuration : 90} minutes</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Activities Planned:</span>
                                <span class="summary-value">${currentWeekData.activities ? currentWeekData.activities.length : 0}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Grade Level:</span>
                                <span class="summary-value">7-8</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Learning Objectives Section -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-bullseye"></i> Learning Objectives</h3>
                        <span class="section-description">What scouts will learn and achieve this week</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.objectives ? `
                            <div class="objectives-list">
                                ${currentWeekData.objectives.split('\n').map(objective => objective.trim()).filter(obj => obj).map(objective => `
                                    <div class="objective-item">
                                        <i class="fas fa-check-circle"></i>
                                        <span>${objective}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-lightbulb"></i>
                                <p>No learning objectives have been set for this week yet.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Detailed Activity Timeline -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-clock"></i> Meeting Timeline & Activities</h3>
                        <span class="section-description">Detailed schedule and activity breakdown</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.activities && currentWeekData.activities.length > 0 ? `
                            <div class="activity-timeline">
                                ${currentWeekData.activities.map((activity, index) => {
                                    // Calculate start time (assuming meeting starts at 6:15 PM)
                                    const startMinutes = currentWeekData.activities.slice(0, index).reduce((sum, act) => sum + (act.duration || 0), 0);
                                    const startTime = new Date();
                                    startTime.setHours(18, 15 + startMinutes, 0); // 6:15 PM + accumulated minutes
                                    const endTime = new Date(startTime);
                                    endTime.setMinutes(endTime.getMinutes() + (activity.duration || 0));

                                    return `
                                        <div class="timeline-activity">
                                            <div class="activity-time">
                                                <div class="time-start">${startTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</div>
                                                <div class="time-duration">${activity.duration || 0} min</div>
                                                <div class="time-end">${endTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</div>
                                            </div>
                                            <div class="activity-content">
                                                <h4 class="activity-title">
                                                    <span class="activity-number">${index + 1}</span>
                                                    ${activity.name || 'Unnamed Activity'}
                                                </h4>
                                                <div class="activity-description">
                                                    ${activity.description ? `
                                                        <div class="description-text">${activity.description.replace(/\n/g, '<br>')}</div>
                                                    ` : `
                                                        <div class="no-description">
                                                            <i class="fas fa-info-circle"></i>
                                                            <span>No detailed description provided for this activity.</span>
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-calendar-plus"></i>
                                <p>No activities have been planned for this meeting yet.</p>
                                <small>A typical 90-minute meeting usually includes 4-6 activities.</small>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Materials & Preparation -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-tools"></i> Materials & Preparation</h3>
                        <span class="section-description">Everything needed to run this meeting</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.materials ? `
                            <div class="materials-list">
                                ${currentWeekData.materials.split('\n').map(material => material.trim()).filter(mat => mat).map(material => `
                                    <div class="material-item">
                                        <i class="fas fa-check-square"></i>
                                        <span>${material}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-box"></i>
                                <p>No materials or preparation requirements listed yet.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Assessment & Reflection -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-clipboard-check"></i> Assessment & Reflection</h3>
                        <span class="section-description">How to evaluate learning and gather feedback</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.assessment ? `
                            <div class="assessment-content">
                                <div class="assessment-text">${currentWeekData.assessment.replace(/\n/g, '<br>')}</div>
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-question-circle"></i>
                                <p>No assessment or reflection activities planned yet.</p>
                                <small>Consider adding reflection questions or assessment criteria.</small>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Notes & Safety Reminders -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-sticky-note"></i> Important Notes & Safety</h3>
                        <span class="section-description">Key reminders and safety considerations</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.notes ? `
                            <div class="notes-content">
                                <div class="notes-text">${currentWeekData.notes.replace(/\n/g, '<br>')}</div>
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-exclamation-triangle"></i>
                                <p>No special notes or safety reminders for this week.</p>
                                <small>Consider adding any safety considerations or special instructions.</small>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="lesson-actions">
                    <div class="action-buttons">
                        <button class="lesson-action-btn print" onclick="printLessonPlan()">
                            <i class="fas fa-print"></i>
                            Print Lesson Plan
                        </button>
                        <button class="lesson-action-btn edit" onclick="editCurrentWeek()">
                            <i class="fas fa-edit"></i>
                            Edit This Week
                        </button>
                        <button class="lesson-action-btn copy" onclick="copyFromPreviousWeek()">
                            <i class="fas fa-copy"></i>
                            Copy Previous Week
                        </button>
                    </div>
                </div>

                ${!currentWeekData.objectives && !currentWeekData.activities?.length && !currentWeekData.materials && !currentWeekData.assessment && !currentWeekData.notes ? `
                    <div class="empty-lesson-plan">
                        <div class="empty-lesson-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <h3>Empty Lesson Plan</h3>
                        <p>This week's lesson plan hasn't been created yet. Click "Edit This Week" to start planning detailed activities, objectives, and materials.</p>
                        <button class="start-planning-btn" onclick="editCurrentWeek()">
                            <i class="fas fa-plus"></i>
                            Start Planning This Week
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function showCurriculumPlaceholder() {
    const display = document.getElementById('curriculumDisplay');
    display.innerHTML = `
        <div class="curriculum-placeholder">
            <i class="fas fa-book-open"></i>
            <h3>Select a Program Year</h3>
            <p>Choose a program year to view and edit curriculum content</p>
        </div>
    `;
}

function updateCurriculumNavigation() {
    document.getElementById('currentWeekNumber').textContent = currentWeekNumber;

    if (currentProgramYear) {
        const year = parseInt(currentProgramYear);
        const programStart = new Date(year, 8, 1); // September 1st
        // Find the first Tuesday of September
        while (programStart.getDay() !== 2) { // 2 = Tuesday
            programStart.setDate(programStart.getDate() + 1);
        }
        const weekDate = new Date(programStart);
        weekDate.setDate(weekDate.getDate() + (currentWeekNumber - 1) * 7);
        document.getElementById('currentWeekDate').textContent = weekDate.toLocaleDateString();

        // Enable/disable navigation buttons
        document.getElementById('prevWeekBtn').disabled = currentWeekNumber <= 1;
        document.getElementById('nextWeekBtn').disabled = currentWeekNumber >= totalWeeks;
        document.getElementById('editWeekBtn').disabled = false;
        document.getElementById('copyWeekBtn').disabled = currentWeekNumber <= 1;
    } else {
        document.getElementById('currentWeekDate').textContent = 'Select a year';
        document.getElementById('editWeekBtn').disabled = true;
        document.getElementById('copyWeekBtn').disabled = true;
    }
}

function navigateWeek(direction) {
    if (!currentProgramYear) return;

    const newWeek = currentWeekNumber + direction;
    if (newWeek < 1 || newWeek > totalWeeks) return;

    currentWeekNumber = newWeek;
    loadWeekData(currentWeekNumber);
    updateCurriculumNavigation();
}

function editCurrentWeek() {
    if (!currentProgramYear || !currentWeekData) return;

    // Populate the edit form
    const form = document.getElementById('editCurriculumForm');
    form.querySelector('input[name="programYear"]').value = currentProgramYear;
    form.querySelector('input[name="weekNumber"]').value = currentWeekNumber;
    form.querySelector('input[name="displayWeek"]').value = currentWeekNumber;
    form.querySelector('input[name="theme"]').value = currentWeekData.theme || '';
    form.querySelector('input[name="meetingDate"]').value = currentWeekData.meetingDate || '';
    form.querySelector('textarea[name="objectives"]').value = currentWeekData.objectives || '';
    form.querySelector('textarea[name="materials"]').value = currentWeekData.materials || '';
    form.querySelector('textarea[name="assessment"]').value = currentWeekData.assessment || '';
    form.querySelector('textarea[name="notes"]').value = currentWeekData.notes || '';

    // Populate activities
    populateActivitiesList(currentWeekData.activities || []);

    // Update modal title
    document.getElementById('curriculumModalTitle').textContent = `Edit Week ${currentWeekNumber} Curriculum`;

    // Show modal
    document.getElementById('editCurriculumModal').style.display = 'flex';
}

function populateActivitiesList(activities) {
    const activitiesList = document.getElementById('activitiesList');
    activitiesList.innerHTML = '';

    if (activities.length === 0) {
        addActivity(); // Add one empty activity
        return;
    }

    activities.forEach(activity => {
        const activityHtml = `
            <div class="activity-item">
                <input type="text" placeholder="Activity name" class="activity-name" value="${activity.name || ''}">
                <input type="number" placeholder="Duration (min)" class="activity-duration" min="1" max="90" value="${activity.duration || ''}">
                <textarea placeholder="Activity description" class="activity-description" rows="2">${activity.description || ''}</textarea>
                <button type="button" class="remove-activity-btn" onclick="removeActivity(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        activitiesList.insertAdjacentHTML('beforeend', activityHtml);
    });
}

function addActivity() {
    const activitiesList = document.getElementById('activitiesList');
    const activityHtml = `
        <div class="activity-item">
            <input type="text" placeholder="Activity name" class="activity-name">
            <input type="number" placeholder="Duration (min)" class="activity-duration" min="1" max="90">
            <textarea placeholder="Activity description" class="activity-description" rows="2"></textarea>
            <button type="button" class="remove-activity-btn" onclick="removeActivity(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    activitiesList.insertAdjacentHTML('beforeend', activityHtml);
}

function removeActivity(button) {
    const activitiesList = document.getElementById('activitiesList');
    if (activitiesList.children.length > 1) {
        button.closest('.activity-item').remove();
    }
}

async function handleEditCurriculum(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    const programYear = formData.get('programYear');
    const weekNumber = formData.get('weekNumber');

    // Collect activities
    const activities = [];
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        const name = item.querySelector('.activity-name').value.trim();
        const duration = item.querySelector('.activity-duration').value;
        const description = item.querySelector('.activity-description').value.trim();

        if (name) {
            activities.push({
                name: name,
                duration: parseInt(duration) || 0,
                description: description
            });
        }
    });

    const curriculumData = {
        weekNumber: parseInt(weekNumber),
        theme: formData.get('theme'),
        meetingDate: formData.get('meetingDate'),
        objectives: formData.get('objectives'),
        activities: activities,
        materials: formData.get('materials'),
        assessment: formData.get('assessment'),
        notes: formData.get('notes'),
        lastModified: Date.now(),
        modifiedBy: currentUser.email
    };

    try {
        const team = document.getElementById('curriculumTeamSelect').value || 'scouts';
        const weekRef = database.ref(`curriculum/${team}/${programYear}/week${weekNumber}`);
        await weekRef.set(curriculumData);

        hideLoadingSpinner();
        closeModal('editCurriculumModal');
        showNotification('Curriculum updated successfully!', 'success');

        // Reload the current week data
        await loadWeekData(currentWeekNumber);

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error updating curriculum:', error);
        showNotification('Error updating curriculum: ' + error.message, 'error');
    }
}

async function copyFromPreviousWeek() {
    if (!currentProgramYear || currentWeekNumber <= 1) return;

    const confirmed = confirm(`Copy curriculum content from Week ${currentWeekNumber - 1} to Week ${currentWeekNumber}?`);
    if (!confirmed) return;

    try {
        showLoadingSpinner();

        const team = document.getElementById('curriculumTeamSelect').value || 'scouts';
        const prevWeekRef = database.ref(`curriculum/${team}/${currentProgramYear}/week${currentWeekNumber - 1}`);
        const snapshot = await prevWeekRef.once('value');

        if (!snapshot.exists()) {
            showNotification('Previous week has no content to copy', 'info');
            hideLoadingSpinner();
            return;
        }

        const prevWeekData = snapshot.val();
        const newWeekData = {
            ...prevWeekData,
            weekNumber: currentWeekNumber,
            meetingDate: '', // Clear the date
            lastModified: Date.now(),
            modifiedBy: currentUser.email
        };

        const currentWeekRef = database.ref(`curriculum/${team}/${currentProgramYear}/week${currentWeekNumber}`);
        await currentWeekRef.set(newWeekData);

        hideLoadingSpinner();
        showNotification(`Content copied from Week ${currentWeekNumber - 1}!`, 'success');

        // Reload the current week data
        await loadWeekData(currentWeekNumber);

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error copying from previous week:', error);
        showNotification('Error copying content: ' + error.message, 'error');
    }
}

// View switching functions
function switchToWeekView() {
    currentViewMode = 'week';
    document.getElementById('weekViewContainer').style.display = 'block';
    document.getElementById('gridViewContainer').style.display = 'none';
    document.getElementById('weekViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');

    if (currentProgramYear) {
        loadWeekData(currentWeekNumber);
        updateCurriculumNavigation();
    }
}

function switchToGridView() {
    currentViewMode = 'grid';
    document.getElementById('weekViewContainer').style.display = 'none';
    document.getElementById('gridViewContainer').style.display = 'block';
    document.getElementById('weekViewBtn').classList.remove('active');
    document.getElementById('gridViewBtn').classList.add('active');

    if (currentProgramYear) {
        displayGridView();
    }
}

function displayGridView() {
    const gridContainer = document.getElementById('curriculumGrid');

    if (!currentProgramYear || !allWeeksData) {
        gridContainer.innerHTML = `
            <div class="grid-placeholder">
                <i class="fas fa-calendar-alt"></i>
                <h3>No Program Year Selected</h3>
                <p>Select a program year to view the curriculum overview</p>
            </div>
        `;
        return;
    }

    const weeks = [];
    for (let week = 1; week <= totalWeeks; week++) {
        const weekData = allWeeksData[`week${week}`] || getDefaultWeekData(week);
        weeks.push(weekData);
    }

    gridContainer.innerHTML = weeks.map(week => {
        const year = parseInt(currentProgramYear);
        const programStart = new Date(year, 8, 1); // September 1st
        // Find the first Tuesday of September
        while (programStart.getDay() !== 2) { // 2 = Tuesday
            programStart.setDate(programStart.getDate() + 1);
        }
        const weekDate = new Date(programStart);
        weekDate.setDate(weekDate.getDate() + (week.weekNumber - 1) * 7);

        const hasContent = week.theme || week.objectives ||
                          (week.activities && week.activities.length > 0) ||
                          week.materials || week.assessment || week.notes;

        const totalDuration = week.activities ?
            week.activities.reduce((sum, activity) => sum + (activity.duration || 0), 0) : 0;

        return `
            <div class="grid-week-card ${hasContent ? 'has-content' : 'empty'}"
                 onclick="selectWeekFromGrid(${week.weekNumber})"
                 data-week="${week.weekNumber}"
                 data-month="${weekDate.getMonth() + 1}"
                 data-search-text="${(week.theme || '').toLowerCase()} ${(week.objectives || '').toLowerCase()}">
                <div class="grid-week-header">
                    <span class="grid-week-number">Week ${week.weekNumber}</span>
                    <span class="grid-week-date">${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div class="grid-week-content">
                    <h4 class="grid-week-theme">${week.theme || 'No theme set'}</h4>
                    ${week.activities && week.activities.length > 0 ? `
                        <div class="grid-week-activities">
                            <span class="activity-count">${week.activities.length} activities</span>
                            ${totalDuration > 0 ? `<span class="activity-duration">${totalDuration} min</span>` : ''}
                        </div>
                        <div class="grid-activity-list">
                            ${week.activities.slice(0, 3).map(activity => `
                                <div class="grid-activity-item">${activity.name}</div>
                            `).join('')}
                            ${week.activities.length > 3 ? `<div class="grid-activity-more">+${week.activities.length - 3} more</div>` : ''}
                        </div>
                    ` : `
                        <div class="grid-no-content">
                            <i class="fas fa-plus-circle"></i>
                            <span>Click to add content</span>
                        </div>
                    `}
                </div>
                <div class="grid-week-actions">
                    <button class="grid-edit-btn" onclick="event.stopPropagation(); editWeekFromGrid(${week.weekNumber})" title="Edit Week">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${hasContent ? `
                        <div class="grid-content-status">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function selectWeekFromGrid(weekNumber) {
    currentWeekNumber = weekNumber;
    switchToWeekView();
}

function editWeekFromGrid(weekNumber) {
    currentWeekNumber = weekNumber;
    currentWeekData = allWeeksData[`week${weekNumber}`] || getDefaultWeekData(weekNumber);
    editCurrentWeek();
}

function filterGridWeeks() {
    const searchTerm = document.getElementById('gridSearchInput').value.toLowerCase();
    const monthFilter = document.getElementById('monthFilterSelect').value;
    const weekCards = document.querySelectorAll('.grid-week-card');

    weekCards.forEach(card => {
        const searchText = card.getAttribute('data-search-text') || '';
        const cardMonth = card.getAttribute('data-month');

        const matchesSearch = !searchTerm || searchText.includes(searchTerm);
        const matchesMonth = !monthFilter || cardMonth === monthFilter;

        if (matchesSearch && matchesMonth) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Print lesson plan function
function printLessonPlan() {
    const lessonPlanContent = document.querySelector('.lesson-plan-view');
    if (!lessonPlanContent) {
        showNotification('No lesson plan to print', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Week ${currentWeekNumber} Lesson Plan - ${currentWeekData?.theme || 'SGSA Scouts'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .lesson-section { margin-bottom: 30px; page-break-inside: avoid; }
                .lesson-section-header h3 { color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px; }
                .section-description { font-style: italic; color: #666; font-size: 0.9em; }
                .activity-timeline { margin-top: 15px; }
                .timeline-activity { margin-bottom: 20px; border-left: 3px solid #2c5aa0; padding-left: 15px; }
                .activity-time { font-weight: bold; color: #2c5aa0; margin-bottom: 8px; }
                .activity-title { margin-bottom: 8px; }
                .activity-number { background: #2c5aa0; color: white; border-radius: 50%; width: 25px; height: 25px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; }
                .objective-item, .material-item { margin-bottom: 8px; }
                .lesson-plan-header { border-bottom: 3px solid #2c5aa0; margin-bottom: 30px; padding-bottom: 15px; }
                .lesson-summary { display: flex; gap: 30px; }
                .summary-item { display: flex; flex-direction: column; }
                .summary-label { font-weight: bold; color: #666; font-size: 0.9em; }
                .summary-value { font-size: 1.1em; color: #2c5aa0; font-weight: bold; }
                .lesson-actions, .empty-lesson-plan { display: none; }
                @media print { .lesson-actions, .empty-lesson-plan { display: none !important; } }
            </style>
        </head>
        <body>
            <h1>SGSA Scouts - Week ${currentWeekNumber} Lesson Plan</h1>
            <h2>${currentWeekData?.theme || 'Weekly Meeting Plan'}</h2>
            <p><strong>Date:</strong> ${document.getElementById('currentWeekDate')?.textContent || 'TBD'}</p>
            ${lessonPlanContent.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Bulk Import Functions
let importData = [];

function showBulkImportModal() {
    document.getElementById('bulkImportModal').style.display = 'flex';
    resetImportModal();
}

function resetImportModal() {
    importData = [];
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importScoutsBtn').disabled = true;
    document.getElementById('excelFileInput').value = '';

    // Reset upload area
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('file-selected');
}

// File upload event listeners - need to be added after DOM loads
function initializeBulkImport() {
    const fileInput = document.getElementById('excelFileInput');
    const uploadArea = document.getElementById('uploadArea');

    if (fileInput && uploadArea) {
        fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect({ target: { files: files } });
            }
        });
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        showNotification('Please select an Excel file (.xlsx or .xls)', 'error');
        return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
    }

    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('file-selected');
    uploadArea.querySelector('h4').textContent = `Selected: ${file.name}`;
    uploadArea.querySelector('p').textContent = `Size: ${(file.size / 1024).toFixed(1)} KB`;

    processExcelFile(file);
}

function processExcelFile(file) {
    showLoadingSpinner();

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first worksheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                hideLoadingSpinner();
                showNotification('The Excel file is empty', 'error');
                return;
            }

            parseScoutData(jsonData);
            hideLoadingSpinner();

        } catch (error) {
            hideLoadingSpinner();
            console.error('Error processing Excel file:', error);
            showNotification('Error reading Excel file. Please check the file format.', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

function parseScoutData(rawData) {
    if (rawData.length < 2) {
        showNotification('Excel file must have at least a header row and one data row', 'error');
        return;
    }

    const headers = rawData[0].map(header => header ? header.toString().toLowerCase().trim() : '');
    const dataRows = rawData.slice(1);

    // Find column indices
    const columnMap = {
        firstName: findColumnIndex(headers, ['first name', 'firstname', 'first']),
        lastName: findColumnIndex(headers, ['last name', 'lastname', 'last']),
        grade: findColumnIndex(headers, ['grade', 'level']),
        birthDate: findColumnIndex(headers, ['birth date', 'birthdate', 'dob', 'date of birth']),
        parentName: findColumnIndex(headers, ['parent name', 'parentname', 'parent', 'guardian']),
        parentEmail: findColumnIndex(headers, ['parent email', 'parentemail', 'email']),
        parentPhone: findColumnIndex(headers, ['parent phone', 'parentphone', 'phone']),
        emergencyContact: findColumnIndex(headers, ['emergency contact', 'emergency', 'emergency phone']),
        notes: findColumnIndex(headers, ['notes', 'comments', 'additional info'])
    };

    // Check required columns
    const requiredColumns = ['firstName', 'lastName', 'grade', 'parentName', 'parentPhone'];
    const missingColumns = requiredColumns.filter(col => columnMap[col] === -1);

    if (missingColumns.length > 0) {
        const readableColumns = missingColumns.map(col =>
            col.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, c => c.toUpperCase())
        );
        showNotification(`Missing required columns: ${readableColumns.join(', ')}`, 'error');
        return;
    }

    // Process each row
    importData = dataRows.map((row, index) => {
        const scout = {
            rowNumber: index + 2, // +2 because we skip header and arrays are 0-indexed
            firstName: getCellValue(row, columnMap.firstName),
            lastName: getCellValue(row, columnMap.lastName),
            grade: getCellValue(row, columnMap.grade),
            birthDate: getCellValue(row, columnMap.birthDate),
            parentName: getCellValue(row, columnMap.parentName),
            parentEmail: getCellValue(row, columnMap.parentEmail),
            parentPhone: getCellValue(row, columnMap.parentPhone),
            emergencyContact: getCellValue(row, columnMap.emergencyContact),
            notes: getCellValue(row, columnMap.notes),
            errors: []
        };

        // Validate data
        validateScoutData(scout);

        return scout;
    }).filter(scout => scout.firstName || scout.lastName); // Remove completely empty rows

    displayImportPreview();
}

function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(header => header.includes(name));
        if (index !== -1) return index;
    }
    return -1;
}

function getCellValue(row, columnIndex) {
    if (columnIndex === -1 || !row[columnIndex]) return '';
    return row[columnIndex].toString().trim();
}

function validateScoutData(scout) {
    // Required field validation
    if (!scout.firstName) scout.errors.push('Missing first name');
    if (!scout.lastName) scout.errors.push('Missing last name');
    if (!scout.parentName) scout.errors.push('Missing parent name');
    if (!scout.parentPhone) scout.errors.push('Missing parent phone');

    // Grade validation
    const gradeInput = scout.grade?.toString().toLowerCase().trim();

    if (!gradeInput) {
        scout.errors.push('Grade is required');
    } else {
        // Handle post-secondary entries
        const postSecondaryTerms = ['post-secondary', 'post secondary', 'postsecondary', 'college', 'university', 'adult'];
        const isPostSecondary = postSecondaryTerms.some(term => gradeInput.includes(term));

        if (isPostSecondary) {
            scout.grade = 'Post-Secondary';
        } else {
            // Handle numeric grades
            const grade = parseInt(gradeInput);
            if (grade && grade >= 3 && grade <= 12) {
                scout.grade = grade;
            } else {
                scout.errors.push('Grade must be 3-12 or Post-Secondary');
            }
        }
    }

    // Phone validation
    if (scout.parentPhone && !/^[\d\s\-\(\)\+]+$/.test(scout.parentPhone)) {
        scout.errors.push('Invalid phone number format');
    }

    // Email validation
    if (scout.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(scout.parentEmail)) {
        scout.errors.push('Invalid email format');
    }

    // Birth date validation
    if (scout.birthDate && scout.birthDate !== '') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(scout.birthDate)) {
            scout.errors.push('Birth date must be in YYYY-MM-DD format');
        }
    }
}

function displayImportPreview() {
    const previewDiv = document.getElementById('importPreview');
    const tableBody = document.querySelector('#previewTable tbody');

    const totalRows = importData.length;
    const validRows = importData.filter(scout => scout.errors.length === 0).length;
    const errorRows = totalRows - validRows;

    // Update stats
    document.getElementById('totalRows').textContent = totalRows;
    document.getElementById('validRows').textContent = validRows;
    document.getElementById('errorRows').textContent = errorRows;

    // Generate table rows
    tableBody.innerHTML = importData.map(scout => {
        const statusIcon = scout.errors.length === 0 ?
            '<i class="fas fa-check-circle" style="color: #28a745;"></i>' :
            '<i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>';

        return `
            <tr class="${scout.errors.length > 0 ? 'error-row' : 'valid-row'}">
                <td>${statusIcon}</td>
                <td>${scout.firstName}</td>
                <td>${scout.lastName}</td>
                <td>${scout.grade}</td>
                <td>${scout.parentName}</td>
                <td>${scout.parentPhone}</td>
                <td class="error-cell">${scout.errors.join(', ') || 'Valid'}</td>
            </tr>
        `;
    }).join('');

    previewDiv.style.display = 'block';
    document.getElementById('importScoutsBtn').disabled = validRows === 0;
}

async function importScouts() {
    const validScouts = importData.filter(scout => scout.errors.length === 0);

    if (validScouts.length === 0) {
        showNotification('No valid scouts to import', 'error');
        return;
    }

    const confirmed = confirm(`Import ${validScouts.length} valid scouts to the database?`);
    if (!confirmed) return;

    showLoadingSpinner();

    try {
        const scoutsRef = database.ref('scouts');
        const batch = {};

        validScouts.forEach(scout => {
            const scoutId = scoutsRef.push().key;
            batch[`scouts/${scoutId}`] = {
                firstName: scout.firstName,
                lastName: scout.lastName,
                grade: scout.grade,
                birthDate: scout.birthDate || '',
                parentName: scout.parentName,
                parentEmail: scout.parentEmail || '',
                parentPhone: scout.parentPhone,
                emergencyContact: scout.emergencyContact || '',
                notes: scout.notes || '',
                dateAdded: new Date().toISOString(),
                addedBy: currentUser.email || 'bulk-import'
            };
        });

        await database.ref().update(batch);

        hideLoadingSpinner();
        closeModal('bulkImportModal');
        showNotification(`Successfully imported ${validScouts.length} scouts!`, 'success');

        // Reload scouts list
        loadScouts();

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error importing scouts:', error);
        showNotification('Error importing scouts: ' + error.message, 'error');
    }
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Global functions for HTML onclick events
async function editScout(scoutId) {
    try {
        showLoadingSpinner();

        // Load scout data from database
        const snapshot = await database.ref(`scouts/${scoutId}`).once('value');

        if (!snapshot.exists()) {
            showNotification('Scout not found!', 'error');
            hideLoadingSpinner();
            return;
        }

        const scout = snapshot.val();

        // Populate the edit form
        const form = document.getElementById('editScoutForm');
        form.scoutId.value = scoutId;
        form.firstName.value = scout.firstName || '';
        form.lastName.value = scout.lastName || '';
        form.grade.value = scout.grade || '';
        form.birthDate.value = scout.birthDate || '';
        form.parentName.value = scout.parentName || '';
        form.parentEmail.value = scout.parentEmail || '';
        form.parentPhone.value = scout.parentPhone || '';
        form.emergencyContact.value = scout.emergencyContact || '';
        form.notes.value = scout.notes || '';

        // Update team dropdown based on grade
        if (scout.grade) {
            updateTeamFromGradeEdit(form.grade);
        }

        hideLoadingSpinner();

        // Show the modal
        document.getElementById('editScoutModal').style.display = 'flex';

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading scout for edit:', error);
        showNotification('Error loading scout data: ' + error.message, 'error');
    }
}

// ===== TEAM-BASED FUNCTIONALITY =====

// Team utility functions
function getTeamFromGrade(grade) {
    const gradeNum = parseInt(grade);
    if (grade === 'post-secondary' || gradeNum >= 11) {
        return 'rovers';
    } else if (gradeNum >= 7 && gradeNum <= 10) {
        return 'scouts';
    } else if (gradeNum >= 3 && gradeNum <= 6) {
        return 'cubs';
    }
    return 'unknown';
}

function getTeamName(teamCode) {
    const teams = {
        'cubs': 'Cubs & Brownies',
        'scouts': 'Scouts',
        'rovers': 'Rovers'
    };
    return teams[teamCode] || 'Unknown Team';
}

function getGradeRange(teamCode) {
    const ranges = {
        'cubs': '3-6',
        'scouts': '7-10',
        'rovers': '11+'
    };
    return ranges[teamCode] || '';
}

// Update team field when grade is selected
function updateTeamFromGrade(gradeSelect) {
    const teamSelect = gradeSelect.closest('form').querySelector('select[name="team"]');
    const grade = gradeSelect.value;

    if (grade && teamSelect) {
        const team = getTeamFromGrade(grade);
        const teamName = getTeamName(team);

        // Clear existing options
        teamSelect.innerHTML = '';

        // Add the assigned team option
        const option = document.createElement('option');
        option.value = team;
        option.textContent = teamName;
        option.selected = true;
        teamSelect.appendChild(option);

        // Update visual feedback
        teamSelect.style.backgroundColor = '#e8f5e8';
    }
}

function updateTeamFromGradeEdit(gradeSelect) {
    const teamSelect = gradeSelect.closest('form').querySelector('select[name="team"]');
    const grade = gradeSelect.value;

    if (grade && teamSelect) {
        const team = getTeamFromGrade(grade);
        const teamName = getTeamName(team);

        // Clear existing options
        teamSelect.innerHTML = '';

        // Add the assigned team option
        const option = document.createElement('option');
        option.value = team;
        option.textContent = teamName;
        option.selected = true;
        teamSelect.appendChild(option);

        // Update visual feedback
        teamSelect.style.backgroundColor = '#e8f5e8';
        teamSelect.style.color = '#2d5016';
    }
}

// Filter scouts by team
function filterScoutsByTeam() {
    const teamFilter = document.getElementById('teamFilter').value;
    loadScoutsForTeam(teamFilter);
}

// Load scouts for specific team
async function loadScoutsForTeam(teamFilter = 'all') {
    try {
        showLoadingSpinner();

        const snapshot = await database.ref('scouts').once('value');
        const scouts = snapshot.val() || {};

        const scoutsArray = Object.entries(scouts).map(([id, scout]) => ({
            id,
            ...scout,
            team: scout.team || getTeamFromGrade(scout.grade)
        }));

        // Filter by team if specified
        let filteredScouts = scoutsArray;
        if (teamFilter !== 'all') {
            filteredScouts = scoutsArray.filter(scout => scout.team === teamFilter);
        }

        // Update team statistics
        updateTeamStatistics(scoutsArray);

        // Display scouts
        displayScouts(filteredScouts);

        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading scouts by team:', error);
        showNotification('Error loading scouts: ' + error.message, 'error');
    }
}

// Update team statistics display
function updateTeamStatistics(scouts) {
    const teamCounts = {
        cubs: 0,
        scouts: 0,
        rovers: 0
    };

    scouts.forEach(scout => {
        const team = scout.team || getTeamFromGrade(scout.grade);
        if (team === 'cubs') {
            teamCounts.cubs++;
        } else if (team === 'scouts') {
            teamCounts.scouts++;
        } else if (team === 'rovers') {
            teamCounts.rovers++;
        }
    });

    // Update UI
    document.getElementById('cubsCount').textContent = teamCounts.cubs;
    document.getElementById('scoutsCount').textContent = teamCounts.scouts;
    document.getElementById('roversCount').textContent = teamCounts.rovers;

    // Update active state
    const teamFilter = document.getElementById('teamFilter').value;
    document.querySelectorAll('.team-stat-card').forEach(card => {
        card.classList.remove('active');
    });

    if (teamFilter !== 'all') {
        const activeCard = document.getElementById(teamFilter + 'Stats');
        if (activeCard) {
            activeCard.classList.add('active');
        }
    }
}

// Enhanced display scouts function with team badges
function displayScouts(scouts) {
    const grid = document.getElementById('scoutsGrid');
    if (!grid) return;

    if (scouts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Scouts Found</h3>
                <p>No scouts match the current filter criteria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = scouts.map(scout => {
        const team = scout.team || getTeamFromGrade(scout.grade);
        const teamName = getTeamName(team);

        return `
            <div class="scout-card" data-team="${team}">
                <div class="scout-header">
                    <div class="scout-name">
                        <h3>${scout.firstName} ${scout.lastName}</h3>
                        <span class="team-badge ${team}">${teamName}</span>
                    </div>
                    <div class="scout-actions">
                        <button class="action-btn small" onclick="editScout('${scout.id}')" title="Edit Scout">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" onclick="deleteScout('${scout.id}')" title="Delete Scout">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="scout-details">
                    <div class="detail-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Grade ${scout.grade}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-user"></i>
                        <span>${scout.parentName}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <span>${scout.parentPhone}</span>
                    </div>
                    ${scout.parentEmail ? `
                        <div class="detail-item">
                            <i class="fas fa-envelope"></i>
                            <span>${scout.parentEmail}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Load attendance for specific team
function loadAttendanceForTeam() {
    const team = document.getElementById('attendanceTeamFilter').value;
    loadAttendanceByTeam(team);
}

async function loadAttendanceByTeam(team) {
    try {
        showLoadingSpinner();

        // Load scouts for the specific team
        const scoutsSnapshot = await database.ref('scouts').once('value');
        const scouts = scoutsSnapshot.val() || {};

        const teamScouts = Object.entries(scouts)
            .map(([id, scout]) => ({
                id,
                ...scout,
                team: scout.team || getTeamFromGrade(scout.grade)
            }))
            .filter(scout => scout.team === team);

        // Get selected date
        const dateInput = document.getElementById('attendanceDate');
        const selectedDate = dateInput.value;
        const dateToUse = selectedDate || new Date().toISOString().split('T')[0];

        if (!selectedDate) {
            // Set today's date as default
            dateInput.value = dateToUse;
        }

        // Load attendance data for this date and team
        const attendanceData = {};
        if (selectedDate) {
            const attendanceRef = database.ref(`attendance/${team}/${selectedDate.replace(/-/g, '_')}`);
            const snapshot = await attendanceRef.once('value');

            if (snapshot.exists()) {
                const data = snapshot.val() || {};
                teamScouts.forEach(scout => {
                    if (data[scout.id]) {
                        attendanceData[scout.id] = data[scout.id];
                    }
                });
            }
        }

        displayAttendanceSheet(teamScouts, dateToUse, team, attendanceData);

        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading team attendance:', error);
        showNotification('Error loading attendance: ' + error.message, 'error');
    }
}

function displayAttendanceSheet(scouts, date, team, attendanceData = {}) {
    const sheet = document.getElementById('attendanceSheet');
    if (!sheet) return;

    if (scouts.length === 0) {
        sheet.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Scouts in ${getTeamName(team)}</h3>
                <p>Add scouts to this team to track attendance.</p>
            </div>
        `;
        return;
    }

    const dateFormatted = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    sheet.innerHTML = `
        <div class="attendance-header">
            <h3>${getTeamName(team)} Attendance</h3>
            <p>${dateFormatted}</p>
        </div>
        <div class="attendance-list">
            ${scouts.map(scout => {
                const savedAttendance = attendanceData[scout.id];
                const savedStatus = savedAttendance ? savedAttendance.status : '';

                return `
                <div class="attendance-item" data-scout-id="${scout.id}">
                    <div class="scout-info">
                        <span class="scout-name">${scout.firstName} ${scout.lastName}</span>
                        <span class="scout-grade">Grade ${scout.grade}</span>
                    </div>
                    <div class="attendance-controls">
                        <label class="attendance-option">
                            <input type="radio" name="attendance_${scout.id}" value="present" ${savedStatus === 'present' ? 'checked' : ''}>
                            <span class="checkmark present">Present</span>
                        </label>
                        <label class="attendance-option">
                            <input type="radio" name="attendance_${scout.id}" value="absent" ${savedStatus === 'absent' ? 'checked' : ''}>
                            <span class="checkmark absent">Absent</span>
                        </label>
                        <label class="attendance-option">
                            <input type="radio" name="attendance_${scout.id}" value="excused" ${savedStatus === 'excused' ? 'checked' : ''}>
                            <span class="checkmark excused">Excused</span>
                        </label>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

// Load curriculum for specific team
function loadCurriculumForTeam() {
    const team = document.getElementById('curriculumTeamSelect').value;
    // Update curriculum loading to be team-specific
    loadCurriculumByTeam(team);
}

async function loadCurriculumByTeam(team) {
    try {
        // Load team-specific curriculum
        const snapshot = await database.ref(`curriculum/${team}`).once('value');
        const curriculum = snapshot.val() || {};

        // Update program year options for this team
        populateProgramYearsForTeam(team);

        // Reload program years for the selected team
        await loadProgramYears();

        showNotification(`Loaded curriculum for ${getTeamName(team)}`, 'info');
    } catch (error) {
        console.error('Error loading team curriculum:', error);
        showNotification('Error loading curriculum: ' + error.message, 'error');
    }
}

function populateProgramYearsForTeam(team) {
    const select = document.getElementById('programYearSelect');
    const currentYear = new Date().getFullYear();
    const teamName = getTeamName(team);

    select.innerHTML = `
        <option value="">Select Program Year for ${teamName}</option>
        <option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>
        <option value="${currentYear - 1}-${currentYear}">${currentYear - 1}-${currentYear}</option>
    `;
}

// Enhanced scout validation for team assignment
function validateScoutsArray(scouts) {
    const validScouts = [];
    const errors = [];

    scouts.forEach((scout, index) => {
        const rowErrors = [];

        // Validate required fields
        if (!scout.firstName?.trim()) rowErrors.push('Missing first name');
        if (!scout.lastName?.trim()) rowErrors.push('Missing last name');
        if (!scout.grade) rowErrors.push('Missing grade');
        if (!scout.parentName?.trim()) rowErrors.push('Missing parent name');
        if (!scout.parentPhone?.trim()) rowErrors.push('Missing parent phone');

        // Validate grade range
        const validGrades = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'post-secondary'];
        if (scout.grade && !validGrades.includes(scout.grade.toString())) {
            rowErrors.push('Invalid grade (must be 3-12 or Post-Secondary)');
        }

        // Auto-assign team based on grade
        if (scout.grade) {
            scout.team = getTeamFromGrade(scout.grade);
        }

        if (rowErrors.length === 0) {
            validScouts.push(scout);
        } else {
            errors.push({
                row: index + 1,
                scout: scout,
                errors: rowErrors
            });
        }
    });

    return { validScouts, errors };
}

// Override the original loadScouts function to include team functionality
const originalLoadScouts = window.loadScouts;
window.loadScouts = function() {
    loadScoutsForTeam('all');
};

// Update dashboard with team statistics
async function updateDashboardStats() {
    try {
        const snapshot = await database.ref('scouts').once('value');
        const scouts = snapshot.val() || {};

        const scoutsArray = Object.entries(scouts).map(([id, scout]) => ({
            id,
            ...scout,
            team: scout.team || getTeamFromGrade(scout.grade)
        }));

        const teamCounts = {
            cubs: 0,
            scouts: 0,
            rovers: 0,
            total: scoutsArray.length
        };

        scoutsArray.forEach(scout => {
            const team = scout.team || getTeamFromGrade(scout.grade);
            console.log(`Scout: ${scout.firstName} ${scout.lastName}, Grade: ${scout.grade}, Team: ${team}`);
            if (team === 'cubs') {
                teamCounts.cubs++;
            } else if (team === 'scouts') {
                teamCounts.scouts++;
            } else if (team === 'rovers') {
                teamCounts.rovers++;
            }
        });

        console.log('Team counts:', teamCounts);

        // Update dashboard statistics
        document.getElementById('totalScouts').textContent = teamCounts.total;
        document.getElementById('dashboardCubsCount').textContent = teamCounts.cubs;
        document.getElementById('dashboardScoutsCount').textContent = teamCounts.scouts;
        document.getElementById('dashboardRoversCount').textContent = teamCounts.rovers;

        // Calculate weeks this year (September to current date)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-based (0 = January)

        // If we're before September, use previous year's start
        const yearStart = currentMonth >= 8 ? currentYear : currentYear - 1;
        const startOfYear = new Date(yearStart, 8, 1); // September 1st
        const now = new Date();

        const weeksSoFar = Math.ceil((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
        document.getElementById('weeksSoFar').textContent = Math.max(1, weeksSoFar);

    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Enhanced add scout function with team assignment
async function addScout(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const scoutData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        grade: formData.get('grade'),
        team: formData.get('team'),
        birthDate: formData.get('birthDate') || '',
        parentName: formData.get('parentName').trim(),
        parentEmail: formData.get('parentEmail').trim(),
        parentPhone: formData.get('parentPhone').trim(),
        emergencyContact: formData.get('emergencyContact').trim(),
        notes: formData.get('notes').trim()
    };

    try {
        showLoadingSpinner();

        // Auto-assign team if not already set
        if (!scoutData.team && scoutData.grade) {
            scoutData.team = getTeamFromGrade(scoutData.grade);
        }

        // Add to database
        const newScoutRef = database.ref('scouts').push();
        await newScoutRef.set({
            ...scoutData,
            dateAdded: new Date().toISOString(),
            addedBy: currentUser.email || 'admin'
        });

        hideLoadingSpinner();
        closeModal('addScoutModal');
        form.reset();

        showNotification(`Scout added successfully to ${getTeamName(scoutData.team)}!`, 'success');

        // Reload scouts and update dashboard
        loadScoutsForTeam('all');
        updateDashboardStats();

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error adding scout:', error);
        showNotification('Error adding scout: ' + error.message, 'error');
    }
}

// Initialize team-based functionality on page load
document.addEventListener('DOMContentLoaded', function() {
    // Override form submission for add scout
    const addScoutForm = document.getElementById('addScoutForm');
    if (addScoutForm) {
        addScoutForm.addEventListener('submit', addScout);
    }

    // Update dashboard stats when authenticated
    if (currentUser) {
        updateDashboardStats();
    }
});

// Override dashboard section loading
const originalShowSection = window.showSection;
window.showSection = function(sectionName) {
    originalShowSection(sectionName);

    if (sectionName === 'dashboard') {
        updateDashboardStats();
    } else if (sectionName === 'troops') {
        // Initialize troop management when troops section is shown
        if (window.loadTroopsForTeam && window.loadScoutsData) {
            setTimeout(() => {
                window.loadTroopsForTeam();
                window.loadScoutsData();
            }, 100);
        }
    }
};

// Mobile Menu Functions
function toggleMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.classList.toggle('active');
        sidebar.classList.toggle('open');

        // Prevent body scroll when menu is open
        if (sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

function closeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.classList.remove('active');
        sidebar.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Download RSVP Report Function
async function downloadRSVPReport() {
    try {
        const button = document.getElementById('downloadRSVPReport');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        button.disabled = true;

        // Get all events and RSVPs
        const eventsSnapshot = await database.ref('calendar/events').once('value');
        const rsvpsSnapshot = await database.ref('calendar/rsvps').once('value');

        const events = eventsSnapshot.val() || {};
        const rsvps = rsvpsSnapshot.val() || {};

        // Prepare CSV data
        let csvContent = "Event Title,Event Date,Event Type,Scout Name,RSVP Status,Contact Name,Contact Email,Emergency Contact,Emergency Phone,OHIP Number,Payment Acknowledged,Payment Received,Payment Date,Recorded By\n";

        let rowCount = 0;

        // Process RSVPs
        Object.keys(rsvps).forEach(rsvpKey => {
            const rsvp = rsvps[rsvpKey];
            const event = events[rsvp.eventId];

            if (!event || !rsvp) return;

            rowCount++;

            // Basic info
            const eventTitle = (event.title || '').replace(/"/g, '""');
            const eventDate = rsvp.eventDate || event.date || '';
            const eventType = event.type || '';
            const scoutName = (rsvp.childName || rsvp.scoutName || '').replace(/"/g, '""');
            const status = rsvp.attendanceStatus || rsvp.status || '';
            const contactName = (rsvp.parentName || rsvp.contactName || '').replace(/"/g, '""');
            const contactEmail = (rsvp.parentEmail || rsvp.contactEmail || '').replace(/"/g, '""');

            // Emergency contact
            const emergencyContact = rsvp.campingDetails?.emergencyContact?.name ? (rsvp.campingDetails.emergencyContact.name || '').replace(/"/g, '""') : '';
            const emergencyPhone = rsvp.campingDetails?.emergencyContact?.phone || '';

            // New simplified camping fields
            const ohipNumber = rsvp.campingDetails?.ohipNumber || '';
            const paymentAcknowledged = rsvp.campingDetails?.paymentAcknowledged ? 'Yes' : 'No';
            const paymentReceived = rsvp.campingDetails?.paymentReceived ? 'Yes' : 'No';
            const paymentDate = rsvp.campingDetails?.paymentReceivedDate ?
                new Date(rsvp.campingDetails.paymentReceivedDate).toLocaleDateString() : '';
            const recordedBy = (rsvp.campingDetails?.paymentReceivedBy || '').replace(/"/g, '""');

            // Add row to CSV
            csvContent += `"${eventTitle}","${eventDate}","${eventType}","${scoutName}","${status}","${contactName}","${contactEmail}","${emergencyContact}","${emergencyPhone}","${ohipNumber}","${paymentAcknowledged}","${paymentReceived}","${paymentDate}","${recordedBy}"\n`;
        });

        if (rowCount === 0) {
            alert('No RSVP data found. Make sure there are events with RSVPs in the database.');
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `SGSA_RSVP_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

    } catch (error) {
        console.error('Error downloading RSVP report:', error);
        alert('Error generating report. Please try again.');

        // Reset button
        const button = document.getElementById('downloadRSVPReport');
        button.innerHTML = '<i class="fas fa-download"></i> Download RSVP Report';
        button.disabled = false;
    }
}