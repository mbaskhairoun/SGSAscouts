// Import Firebase functions
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where,
    Timestamp,
    onSnapshot 
} from 'firebase/firestore';

// Global variables
let currentUser = null;
let scouts = [];
let attendanceData = {};
let currentDate = new Date();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setDefaultDate();
});

// Initialize authentication state
function initializeApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showDashboard();
            loadDashboardData();
            updateAdminInfo();
        } else {
            currentUser = null;
            showLoginModal();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
            updateActiveMenuItem(item);
        });
    });
    
    // Add scout form
    document.getElementById('addScoutForm').addEventListener('submit', handleAddScout);
    
    // Search functionality
    document.getElementById('scoutSearch').addEventListener('input', filterScouts);
    
    // Date picker for attendance
    document.getElementById('attendanceDate').addEventListener('change', loadAttendance);
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    showLoadingSpinner();
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideLoadingSpinner();
        showNotification('Login successful!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        errorDiv.textContent = getErrorMessage(error.code);
        errorDiv.style.display = 'block';
        console.error('Login error:', error);
    }
}

async function logout() {
    try {
        await signOut(auth);
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        showNotification('Error logging out', 'error');
        console.error('Logout error:', error);
    }
}

// UI Functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Welcome to SGSA Scouts Admin Portal' },
        scouts: { title: 'Scout Roster', subtitle: 'Manage scout enrollment and information' },
        attendance: { title: 'Attendance Tracking', subtitle: 'Weekly attendance management' },
        reports: { title: 'Reports & Analytics', subtitle: 'Generate and export attendance reports' },
        settings: { title: 'Admin Settings', subtitle: 'Manage admin preferences and system settings' }
    };
    
    document.getElementById('pageTitle').textContent = titles[sectionName].title;
    document.getElementById('pageSubtitle').textContent = titles[sectionName].subtitle;
    
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
        const scoutsRef = collection(db, 'scouts');
        const q = query(scoutsRef, orderBy('lastName'), orderBy('firstName'));
        const snapshot = await getDocs(q);
        
        scouts = [];
        snapshot.forEach(doc => {
            scouts.push({ id: doc.id, ...doc.data() });
        });
        
        displayScouts(scouts);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error loading scouts', 'error');
        console.error('Error loading scouts:', error);
    }
}

function displayScouts(scoutsToShow) {
    const scoutsGrid = document.getElementById('scoutsGrid');
    
    if (scoutsToShow.length === 0) {
        scoutsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
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
        dateAdded: Timestamp.now(),
        active: true
    };
    
    showLoadingSpinner();
    
    try {
        await addDoc(collection(db, 'scouts'), scoutData);
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
        await deleteDoc(doc(db, 'scouts', scoutId));
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
    const daysToTuesday = dayOfWeek === 2 ? 0 : (dayOfWeek > 2 ? 7 - dayOfWeek + 2 : 2 - dayOfWeek);
    const tuesday = new Date(today);
    tuesday.setDate(today.getDate() - (dayOfWeek > 2 ? dayOfWeek - 2 : dayOfWeek === 0 ? 5 : dayOfWeek + 5));
    
    document.getElementById('attendanceDate').value = tuesday.toISOString().split('T')[0];
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
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where('date', '==', selectedDate));
        const snapshot = await getDocs(q);
        
        attendanceData = {};
        snapshot.forEach(doc => {
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
            <div class="empty-state">
                <i class="fas fa-clipboard-check" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                <h3>No scouts enrolled</h3>
                <p>Add scouts to the roster first!</p>
            </div>
        `;
        return;
    }
    
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
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
        const batch = [];
        
        for (const row of attendanceRows) {
            const scoutId = row.dataset.scoutId;
            const radio = row.querySelector('input[type="radio"]:checked');
            
            if (radio) {
                const status = radio.value;
                const attendanceRecord = {
                    scoutId: scoutId,
                    date: selectedDate,
                    status: status,
                    timestamp: Timestamp.now(),
                    recordedBy: currentUser.email
                };
                
                // Check if attendance already exists for this scout and date
                const existingAttendance = attendanceData[scoutId];
                if (existingAttendance && existingAttendance.id) {
                    // Update existing record
                    batch.push(updateDoc(doc(db, 'attendance', existingAttendance.id), attendanceRecord));
                } else {
                    // Create new record
                    batch.push(addDoc(collection(db, 'attendance'), attendanceRecord));
                }
            }
        }
        
        await Promise.all(batch);
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
        const scoutsSnapshot = await getDocs(collection(db, 'scouts'));
        const totalScouts = scoutsSnapshot.size;
        document.getElementById('totalScouts').textContent = totalScouts;
        
        // Load today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('date', '==', today),
            where('status', '==', 'present')
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
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
    // This function can be expanded to load report-specific data
    console.log('Loading reports data...');
}

async function generateMonthlyReport() {
    showLoadingSpinner();
    
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('date', '>=', currentMonth + '-01'),
            where('date', '<=', currentMonth + '-31')
        );
        
        const snapshot = await getDocs(attendanceQuery);
        const monthlyData = [];
        
        snapshot.forEach(doc => {
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
        const scoutsSnapshot = await getDocs(collection(db, 'scouts'));
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
            getDocs(collection(db, 'scouts')),
            getDocs(collection(db, 'attendance'))
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
    // Load current settings from localStorage or Firebase
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
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
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

// Global functions for HTML onclick events
window.showSection = showSection;
window.logout = logout;
window.showAddScoutModal = showAddScoutModal;
window.closeModal = closeModal;
window.togglePassword = togglePassword;
window.filterScouts = filterScouts;
window.editScout = function(scoutId) {
    // TODO: Implement edit functionality
    showNotification('Edit functionality coming soon!', 'info');
};
window.deleteScout = deleteScout;
window.loadAttendance = loadAttendance;
window.saveAttendance = saveAttendance;
window.markAllPresent = markAllPresent;
window.generateMonthlyReport = generateMonthlyReport;
window.exportScoutList = exportScoutList;
window.exportAttendanceSummary = exportAttendanceSummary;
window.exportData = function() {
    showSection('reports');
};
window.saveSettings = saveSettings;