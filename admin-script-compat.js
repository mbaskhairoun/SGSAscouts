// Firebase Configuration (Compatible Version)
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
const db = firebase.firestore();

// Global variables
let currentUser = null;
let scouts = [];
let attendanceData = {};
let currentDate = new Date();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
    setupEventListeners();
    setDefaultDate();
});

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
                
                // Test database access by trying to read scouts collection
                const testQuery = await db.collection('scouts').limit(1).get();
                console.log('Database access verified, docs found:', testQuery.size);
                
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
                if (error.code === 'permission-denied') {
                    await auth.signOut();
                    showLoginModal();
                    showNotification('Access denied. Your email (' + user.email + ') is not authorized for admin access.', 'error');
                } else if (error.code === 'unavailable') {
                    showNotification('Database temporarily unavailable. Please try again.', 'error');
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
    
    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
            updateActiveMenuItem(item);
        });
    });
    
    // Add scout form
    const addScoutForm = document.getElementById('addScoutForm');
    if (addScoutForm) {
        addScoutForm.addEventListener('submit', handleAddScout);
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

// Scout Management Functions
async function loadScouts() {
    showLoadingSpinner();
    
    try {
        console.log('Loading scouts from Firestore...');
        const scoutsSnapshot = await db.collection('scouts')
            .orderBy('lastName')
            .orderBy('firstName')
            .get();
        
        console.log('Scouts loaded, count:', scoutsSnapshot.size);
        scouts = [];
        scoutsSnapshot.forEach(doc => {
            scouts.push({ id: doc.id, ...doc.data() });
        });
        
        displayScouts(scouts);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading scouts details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'permission-denied') {
            showNotification('Permission denied. Check your admin access rights.', 'error');
        } else if (error.code === 'unavailable') {
            showNotification('Database unavailable. Check your internet connection.', 'error');
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
        dateAdded: firebase.firestore.Timestamp.now(),
        active: true
    };
    
    showLoadingSpinner();
    
    try {
        await db.collection('scouts').add(scoutData);
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

async function deleteScout(scoutId) {
    if (!confirm('Are you sure you want to delete this scout? This action cannot be undone.')) {
        return;
    }
    
    showLoadingSpinner();
    
    try {
        await db.collection('scouts').doc(scoutId).delete();
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

// Attendance Functions
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
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        // Load scouts
        if (scouts.length === 0) {
            await loadScouts();
        }
        
        // Load attendance for this date
        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '==', selectedDate)
            .get();
        
        attendanceData = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            attendanceData[data.scoutId] = {
                id: doc.id,
                status: data.status,
                notes: data.notes || ''
            };
        });
        
        displayAttendanceSheet(selectedDate);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error loading attendance', 'error');
        console.error('Error loading attendance:', error);
    }
}

function displayAttendanceSheet(date) {
    const attendanceSheet = document.getElementById('attendanceSheet');
    
    if (scouts.length === 0) {
        attendanceSheet.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-clipboard-check" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3>No scouts enrolled</h3>
                <p>Add scouts to the roster first!</p>
            </div>
        `;
        return;
    }
    
    attendanceSheet.innerHTML = `
        <div class="attendance-header">
            <div>Scout Name</div>
            <div>Present</div>
            <div>Absent</div>
        </div>
        ${scouts.map(scout => {
            const attendance = attendanceData[scout.id];
            const isPresent = attendance?.status === 'present';
            const isAbsent = attendance?.status === 'absent';
            
            return `
                <div class="attendance-row" data-scout-id="${scout.id}">
                    <div class="scout-attendance-name">${scout.firstName} ${scout.lastName}</div>
                    <div class="attendance-toggle">
                        <div class="attendance-radio">
                            <input type="radio" id="present_${scout.id}" name="attendance_${scout.id}" value="present" ${isPresent ? 'checked' : ''}>
                            <label for="present_${scout.id}">
                                <i class="fas fa-check-circle"></i>
                                Present
                            </label>
                        </div>
                    </div>
                    <div class="attendance-toggle">
                        <div class="attendance-radio absent">
                            <input type="radio" id="absent_${scout.id}" name="attendance_${scout.id}" value="absent" ${isAbsent ? 'checked' : ''}>
                            <label for="absent_${scout.id}">
                                <i class="fas fa-times-circle"></i>
                                Absent
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

async function saveAttendance() {
    const dateInput = document.getElementById('attendanceDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        const attendanceRows = document.querySelectorAll('.attendance-row');
        const batch = db.batch();
        
        for (const row of attendanceRows) {
            const scoutId = row.dataset.scoutId;
            const radio = row.querySelector('input[type="radio"]:checked');
            
            if (radio) {
                const status = radio.value;
                const attendanceRecord = {
                    scoutId: scoutId,
                    date: selectedDate,
                    status: status,
                    timestamp: firebase.firestore.Timestamp.now(),
                    recordedBy: currentUser.email
                };
                
                // Check if attendance already exists for this scout and date
                const existingAttendance = attendanceData[scoutId];
                if (existingAttendance && existingAttendance.id) {
                    // Update existing record
                    const docRef = db.collection('attendance').doc(existingAttendance.id);
                    batch.update(docRef, attendanceRecord);
                } else {
                    // Create new record
                    const docRef = db.collection('attendance').doc();
                    batch.set(docRef, attendanceRecord);
                }
            }
        }
        
        await batch.commit();
        hideLoadingSpinner();
        showNotification('Attendance saved successfully!', 'success');
        loadDashboardData();
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

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Load scouts count
        const scoutsSnapshot = await db.collection('scouts').get();
        const totalScouts = scoutsSnapshot.size;
        document.getElementById('totalScouts').textContent = totalScouts;
        
        // Load today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '==', today)
            .where('status', '==', 'present')
            .get();
        const presentToday = attendanceSnapshot.size;
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
        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '>=', currentMonth + '-01')
            .where('date', '<=', currentMonth + '-31')
            .get();
        
        const monthlyData = [];
        attendanceSnapshot.forEach(doc => {
            monthlyData.push(doc.data());
        });
        
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
        const scoutsSnapshot = await db.collection('scouts').get();
        const scoutsData = [];
        
        scoutsSnapshot.forEach(doc => {
            scoutsData.push(doc.data());
        });
        
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
            db.collection('scouts').get(),
            db.collection('attendance').get()
        ]);
        
        const scoutsData = {};
        scoutsSnapshot.forEach(doc => {
            scoutsData[doc.id] = doc.data();
        });
        
        const attendanceSummary = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            if (!attendanceSummary[data.scoutId]) {
                attendanceSummary[data.scoutId] = { present: 0, absent: 0, total: 0 };
            }
            attendanceSummary[data.scoutId][data.status]++;
            attendanceSummary[data.scoutId].total++;
        });
        
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
    const headers = ['Date', 'Scout ID', 'Scout Name', 'Status', 'Recorded By'];
    const rows = attendanceData.map(record => [
        record.date,
        record.scoutId,
        getScoutName(record.scoutId),
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
    const headers = ['Scout Name', 'Grade', 'Total Sessions', 'Present', 'Absent', 'Attendance Rate'];
    const rows = Object.keys(scoutsData).map(scoutId => {
        const scout = scoutsData[scoutId];
        const summary = attendanceSummary[scoutId] || { present: 0, absent: 0, total: 0 };
        const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
        
        return [
            `${scout.firstName} ${scout.lastName}`,
            scout.grade,
            summary.total,
            summary.present,
            summary.absent,
            rate + '%'
        ];
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function getScoutName(scoutId) {
    const scout = scouts.find(s => s.id === scoutId);
    return scout ? `${scout.firstName} ${scout.lastName}` : 'Unknown Scout';
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

// Global functions for HTML onclick events
function editScout(scoutId) {
    showNotification('Edit functionality coming soon!', 'info');
}