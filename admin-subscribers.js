// Subscribers Management
let subscribers = [];

async function loadSubscribers() {
    showLoadingSpinner();
    try {
        // Use the same database reference as other admin scripts
        const db = window.database || firebase.database();
        const subscribersRef = db.ref('subscribers');
        const snapshot = await subscribersRef.once('value');
        const data = snapshot.val();

        subscribers = [];
        if (data) {
            Object.keys(data).forEach(key => {
                subscribers.push({
                    id: key,
                    ...data[key]
                });
            });
        }

        // Sort by date joined (newest first)
        subscribers.sort((a, b) => new Date(b.dateJoined) - new Date(a.dateJoined));

        displaySubscribers(subscribers);
        updateSubscriberStats();
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading subscribers:', error);
        showNotification('Error loading subscribers: ' + error.message, 'error');
    }
}

function displaySubscribers(subscribersToShow) {
    const tableBody = document.getElementById('subscribersTableBody');
    const emptyState = document.getElementById('subscribersEmptyState');

    if (subscribersToShow.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tableBody.innerHTML = subscribersToShow.map(subscriber => {
        const statusClass = subscriber.status === 'active' ? 'status-active' : 'status-inactive';
        const dateJoined = new Date(subscriber.dateJoined).toLocaleDateString();

        return `
            <tr>
                <td>${subscriber.firstName}</td>
                <td>${subscriber.lastName}</td>
                <td>${subscriber.email}</td>
                <td>${dateJoined}</td>
                <td><span class="status-badge ${statusClass}">${subscriber.status}</span></td>
                <td class="actions-cell">
                    <button class="action-btn small" onclick="editSubscriber('${subscriber.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn small danger" onclick="deleteSubscriber('${subscriber.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSubscriberStats() {
    const total = subscribers.length;
    const now = new Date();
    const thisMonth = subscribers.filter(s => {
        const joinDate = new Date(s.dateJoined);
        return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    }).length;

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = subscribers.filter(s => new Date(s.dateJoined) >= oneWeekAgo).length;

    document.getElementById('totalSubscribers').textContent = total;
    document.getElementById('subscribersThisMonth').textContent = thisMonth;
    document.getElementById('subscribersThisWeek').textContent = thisWeek;
}

function filterSubscribers() {
    const searchTerm = document.getElementById('subscriberSearch').value.toLowerCase();
    const filtered = subscribers.filter(subscriber =>
        subscriber.firstName.toLowerCase().includes(searchTerm) ||
        subscriber.lastName.toLowerCase().includes(searchTerm) ||
        subscriber.email.toLowerCase().includes(searchTerm)
    );
    displaySubscribers(filtered);
}

function editSubscriber(subscriberId) {
    const subscriber = subscribers.find(s => s.id === subscriberId);
    if (!subscriber) return;

    const form = document.getElementById('editSubscriberForm');
    form.querySelector('input[name="subscriberId"]').value = subscriberId;
    form.querySelector('input[name="firstName"]').value = subscriber.firstName;
    form.querySelector('input[name="lastName"]').value = subscriber.lastName;
    form.querySelector('input[name="email"]').value = subscriber.email;
    form.querySelector('select[name="status"]').value = subscriber.status;

    document.getElementById('editSubscriberModal').style.display = 'flex';
}

async function handleEditSubscriber(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    const subscriberId = formData.get('subscriberId');
    const subscriberData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        status: formData.get('status'),
        lastModified: Date.now()
    };

    try {
        const db = window.database || firebase.database();
        const subscriberRef = db.ref(`subscribers/${subscriberId}`);
        await subscriberRef.update(subscriberData);

        hideLoadingSpinner();
        closeModal('editSubscriberModal');
        showNotification('Subscriber updated successfully!', 'success');
        loadSubscribers();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error updating subscriber:', error);
        showNotification('Error updating subscriber: ' + error.message, 'error');
    }
}

async function deleteSubscriber(subscriberId) {
    const subscriber = subscribers.find(s => s.id === subscriberId);
    if (!subscriber) return;

    const confirmed = confirm(`Are you sure you want to delete ${subscriber.firstName} ${subscriber.lastName}? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingSpinner();

    try {
        const db = window.database || firebase.database();
        const subscriberRef = db.ref(`subscribers/${subscriberId}`);
        await subscriberRef.remove();

        hideLoadingSpinner();
        showNotification('Subscriber deleted successfully!', 'success');
        loadSubscribers();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error deleting subscriber:', error);
        showNotification('Error deleting subscriber: ' + error.message, 'error');
    }
}

function exportSubscribers() {
    if (subscribers.length === 0) {
        showNotification('No subscribers to export', 'info');
        return;
    }

    const csvContent = [
        ['First Name', 'Last Name', 'Email', 'Date Joined', 'Status'],
        ...subscribers.map(s => [
            s.firstName,
            s.lastName,
            s.email,
            s.dateJoined,
            s.status
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    showNotification('Subscribers exported successfully!', 'success');
}

// Add event listener for edit subscriber form
document.addEventListener('DOMContentLoaded', function() {
    const editSubscriberForm = document.getElementById('editSubscriberForm');
    if (editSubscriberForm) {
        editSubscriberForm.addEventListener('submit', handleEditSubscriber);
    }
});

// Setup when DOM is ready and after a short delay to ensure other scripts load
document.addEventListener('DOMContentLoaded', function() {
    // Ensure all functions are available globally
    window.loadSubscribers = loadSubscribers;
    window.filterSubscribers = filterSubscribers;
    window.editSubscriber = editSubscriber;
    window.deleteSubscriber = deleteSubscriber;
    window.exportSubscribers = exportSubscribers;

    // Wait a bit for other scripts to load, then override showSection
    setTimeout(() => {
        if (typeof window.showSection === 'function') {
            const originalShowSection = window.showSection;
            window.showSection = function(sectionName) {
                originalShowSection(sectionName);

                if (sectionName === 'subscribers') {
                    console.log('Loading subscribers section...');
                    loadSubscribers();
                }
            };
            console.log('Subscribers section override installed');
        } else {
            console.log('showSection function not found, trying again...');
            // Try again after another delay
            setTimeout(() => {
                if (typeof window.showSection === 'function') {
                    const originalShowSection = window.showSection;
                    window.showSection = function(sectionName) {
                        originalShowSection(sectionName);

                        if (sectionName === 'subscribers') {
                            console.log('Loading subscribers section...');
                            loadSubscribers();
                        }
                    };
                    console.log('Subscribers section override installed (second try)');
                }
            }, 1000);
        }
    }, 100);
});

// Make functions available globally
window.loadSubscribers = loadSubscribers;
window.filterSubscribers = filterSubscribers;
window.editSubscriber = editSubscriber;
window.deleteSubscriber = deleteSubscriber;
window.exportSubscribers = exportSubscribers;