// Troop Management Functions
let adminTroopsDatabase;
let currentTroops = [];
let currentScouts = [];
let selectedTeam = 'scouts';
let currentTroopForAssignment = null;

// Initialize troop management
function initializeTroopManagement() {
    try {
        // Use existing database instance from admin-script-realtime.js
        if (window.database) {
            adminTroopsDatabase = window.database;
            console.log('Using existing database connection for troop management');
        } else if (typeof firebase !== 'undefined' && firebase.database) {
            adminTroopsDatabase = firebase.database();
            console.log('Creating new database connection for troop management');
        } else {
            console.warn('Firebase not available for troop management');
            return;
        }

        setupTroopForms();
        setupColorSelectors();
        loadTroopsForTeam();
        loadScoutsData();

        console.log('Troop management initialized successfully');
    } catch (error) {
        console.error('Error initializing troop management:', error);
    }
}

// Setup form handlers
function setupTroopForms() {
    const addTroopForm = document.getElementById('addTroopForm');
    const editTroopForm = document.getElementById('editTroopForm');

    if (addTroopForm) {
        addTroopForm.addEventListener('submit', handleAddTroop);

        // Setup team selection to populate leaders
        const teamSelect = document.getElementById('troopTeamSelect');
        if (teamSelect) {
            teamSelect.addEventListener('change', () => {
                populateLeaderDropdowns('add', teamSelect.value);
            });
        }
    }

    if (editTroopForm) {
        editTroopForm.addEventListener('submit', handleEditTroop);
    }
}

// Setup color selectors
function setupColorSelectors() {
    document.querySelectorAll('.color-selector').forEach(selector => {
        const colorOptions = selector.querySelectorAll('.color-option');
        const hiddenInput = selector.parentNode.querySelector('input[type="hidden"]');

        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options in this selector
                colorOptions.forEach(opt => opt.classList.remove('selected'));

                // Add selected class to clicked option
                option.classList.add('selected');

                // Update hidden input value
                if (hiddenInput) {
                    hiddenInput.value = option.dataset.color;
                }
            });
        });

        // Set default selection
        if (hiddenInput && hiddenInput.value) {
            const defaultOption = selector.querySelector(`[data-color="${hiddenInput.value}"]`);
            if (defaultOption) {
                defaultOption.classList.add('selected');
            }
        }
    });
}

// Load troops for selected team
async function loadTroopsForTeam() {
    const teamFilter = document.getElementById('troopTeamFilter');
    selectedTeam = teamFilter ? teamFilter.value : 'scouts';

    if (!adminTroopsDatabase) return;

    try {
        const troopsRef = adminTroopsDatabase.ref('troops');
        const snapshot = await troopsRef.orderByChild('team').equalTo(selectedTeam).once('value');

        currentTroops = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const troop = childSnapshot.val();
                currentTroops.push({
                    id: childSnapshot.key,
                    ...troop
                });
            });
        }

        console.log(`Loaded ${currentTroops.length} troops for team ${selectedTeam}`);
        displayTroops();
        displayUnassignedScouts();
        updateTroopStats();
    } catch (error) {
        console.error('Error loading troops:', error);
    }
}

// Load scouts data
async function loadScoutsData() {
    if (!adminTroopsDatabase) return;

    try {
        const scoutsRef = adminTroopsDatabase.ref('scouts');
        const snapshot = await scoutsRef.once('value');

        console.log('Raw Firebase snapshot exists:', snapshot.exists());
        console.log('Raw Firebase data:', snapshot.val());

        currentScouts = [];
        if (snapshot.exists()) {
            let totalScouts = 0;
            let activeScouts = 0;

            snapshot.forEach(childSnapshot => {
                totalScouts++;
                const scout = childSnapshot.val();
                console.log(`Scout ${totalScouts}:`, childSnapshot.key, scout);

                if (scout.active !== false) {
                    activeScouts++;
                    currentScouts.push({
                        id: childSnapshot.key,
                        ...scout
                    });
                }
            });

            console.log(`Total scouts in database: ${totalScouts}`);
            console.log(`Active scouts loaded: ${activeScouts}`);
        }

        console.log(`Final loaded ${currentScouts.length} scouts`);
        console.log('Current scouts array:', currentScouts);
        displayUnassignedScouts();
        updateTroopStats();
    } catch (error) {
        console.error('Error loading scouts:', error);
    }
}

// Display troops in grid
function displayTroops() {
    const troopsGrid = document.getElementById('troopsGrid');
    if (!troopsGrid) return;

    if (currentTroops.length === 0) {
        troopsGrid.innerHTML = `
            <div class="empty-troops">
                <i class="fas fa-flag"></i>
                <h3>No Troops Found</h3>
                <p>Create your first troop to organize ${selectedTeam} scouts into smaller groups.</p>
            </div>
        `;
        return;
    }

    troopsGrid.innerHTML = currentTroops.map(troop => {
        const members = troop.members || [];
        const memberCount = members.length;

        return `
            <div class="troop-card ${troop.troopColor || 'blue'}">
                <div class="troop-header">
                    <div class="troop-info">
                        <h3>${troop.troopName}</h3>
                        <span class="troop-team">${getTeamDisplayName(troop.team)}</span>
                    </div>
                    <div class="troop-actions">
                        <button class="action-btn sm secondary" onclick="editTroop('${troop.id}')" title="Edit Troop">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn sm primary" onclick="assignScouts('${troop.id}')" title="Manage Members">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="action-btn sm danger" onclick="deleteTroop('${troop.id}')" title="Delete Troop">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="troop-leadership">
                    <div class="leadership-item">
                        <i class="fas fa-crown"></i>
                        <span class="role">Leader:</span>
                        <span class="name">${troop.troopLeader || 'Not assigned'}</span>
                    </div>
                    <div class="leadership-item">
                        <i class="fas fa-user-tie"></i>
                        <span class="role">Assistant:</span>
                        <span class="name">${troop.assistantLeader || 'Not assigned'}</span>
                    </div>
                </div>

                <div class="troop-points">
                    <div class="points-header">
                        <span><i class="fas fa-star"></i> Points</span>
                        <span class="points-count">${troop.points || 0}</span>
                    </div>
                    <div class="points-actions">
                        <button class="points-btn add" onclick="adjustTroopPoints('${troop.id}', 1)" title="Add Point">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="points-btn subtract" onclick="adjustTroopPoints('${troop.id}', -1)" title="Remove Point">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="points-btn edit" onclick="editTroopPoints('${troop.id}')" title="Set Points">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>

                <div class="troop-members">
                    <div class="members-header">
                        <span><i class="fas fa-users"></i> Members</span>
                        <span class="members-count">${memberCount}</span>
                    </div>
                    <div class="members-list">
                        ${memberCount > 0 ?
                            members.slice(0, 8).map(memberId => {
                                const scout = currentScouts.find(s => s.id === memberId);
                                return scout ? `<span class="member-tag">${scout.firstName} ${scout.lastName}</span>` : '';
                            }).join('') :
                            '<span class="member-tag">No members assigned</span>'
                        }
                        ${memberCount > 8 ? `<span class="member-tag">+${memberCount - 8} more</span>` : ''}
                    </div>
                </div>

                ${troop.description ? `<div class="troop-description">${troop.description}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Display unassigned scouts
function displayUnassignedScouts() {
    const unassignedScouts = getUnassignedScouts();
    const unassignedPanel = document.getElementById('unassignedScouts');
    const unassignedCount = document.getElementById('unassignedCount');

    if (unassignedCount) {
        unassignedCount.textContent = unassignedScouts.length;
    }

    if (!unassignedPanel) return;

    if (unassignedScouts.length === 0) {
        unassignedPanel.innerHTML = `
            <div class="empty-unassigned">
                <i class="fas fa-check-circle"></i>
                <p>All scouts are assigned to troops!</p>
            </div>
        `;
        return;
    }

    unassignedPanel.innerHTML = unassignedScouts.map(scout => `
        <div class="unassigned-scout">
            <div class="scout-info">
                <div class="scout-name">${scout.firstName} ${scout.lastName}</div>
                <div class="scout-grade">Grade ${scout.grade || 'N/A'}</div>
            </div>
            <button class="assign-btn" onclick="quickAssignScout('${scout.id}')" title="Quick assign to a troop">
                <i class="fas fa-plus"></i>
                Assign
            </button>
        </div>
    `).join('');
}

// Get scout team based on grade
function getScoutTeamFromGrade(grade) {
    if (!grade) return 'scouts'; // Default to scouts if no grade

    const gradeNum = parseInt(grade);
    if (gradeNum >= 3 && gradeNum <= 6) {
        return 'cubs'; // Cubs & Brownies: Grades 3-6
    } else if (gradeNum >= 7 && gradeNum <= 10) {
        return 'scouts'; // Scouts: Grades 7-10
    } else if (gradeNum >= 11) {
        return 'rovers'; // Rovers: Grade 11+
    } else {
        return 'scouts'; // Default fallback
    }
}

// Get unassigned scouts for current team
function getUnassignedScouts() {
    console.log('Getting unassigned scouts for team:', selectedTeam);
    console.log('All current scouts:', currentScouts.length);

    // Filter scouts based on grade instead of team attribute
    const teamScouts = currentScouts.filter(scout => {
        const scoutTeam = scout.team || getScoutTeamFromGrade(scout.grade);
        return scoutTeam === selectedTeam;
    });
    console.log('Team scouts found (by grade):', teamScouts.length, teamScouts);

    const assignedScoutIds = new Set();

    // Collect all assigned scout IDs
    currentTroops.forEach(troop => {
        if (troop.members) {
            troop.members.forEach(memberId => assignedScoutIds.add(memberId));
        }
    });

    console.log('Assigned scout IDs:', Array.from(assignedScoutIds));

    // Return scouts not in any troop
    const unassignedScouts = teamScouts.filter(scout => !assignedScoutIds.has(scout.id));
    console.log('Final unassigned scouts:', unassignedScouts.length);

    return unassignedScouts;
}

// Update troop statistics
function updateTroopStats() {
    const totalTroopsCount = document.getElementById('totalTroopsCount');
    const unassignedScoutsCount = document.getElementById('unassignedScoutsCount');

    if (totalTroopsCount) {
        totalTroopsCount.textContent = currentTroops.length;
    }

    if (unassignedScoutsCount) {
        unassignedScoutsCount.textContent = getUnassignedScouts().length;
    }
}

// Handle add troop form submission
async function handleAddTroop(e) {
    e.preventDefault();

    if (!adminTroopsDatabase) {
        console.error('Database not available');
        return;
    }

    const formData = new FormData(e.target);
    const troopData = {
        team: formData.get('team'),
        troopName: formData.get('troopName'),
        troopLeader: formData.get('troopLeader') || null,
        assistantLeader: formData.get('assistantLeader') || null,
        troopColor: formData.get('troopColor') || 'blue',
        description: formData.get('description') || '',
        members: [],
        points: 0,
        createdAt: Date.now(),
        createdBy: 'admin'
    };

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        await adminTroopsDatabase.ref('troops').push(troopData);

        if (window.showNotification) {
            window.showNotification('Troop created successfully', 'success');
        }

        // Close modal and reload troops
        closeModal('addTroopModal');
        e.target.reset();

        // Reset color selector
        const colorSelector = e.target.querySelector('.color-selector');
        if (colorSelector) {
            colorSelector.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            colorSelector.querySelector('[data-color="blue"]').classList.add('selected');
            document.getElementById('selectedColor').value = 'blue';
        }

        await loadTroopsForTeam();

    } catch (error) {
        console.error('Error creating troop:', error);
        if (window.showNotification) {
            window.showNotification('Error creating troop', 'error');
        }

        // Restore button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Troop';
        submitBtn.disabled = false;
    }
}

// Handle edit troop form submission
async function handleEditTroop(e) {
    e.preventDefault();

    if (!adminTroopsDatabase) {
        console.error('Database not available');
        return;
    }

    const formData = new FormData(e.target);
    const troopId = formData.get('troopId');

    const updateData = {
        troopName: formData.get('troopName'),
        troopLeader: formData.get('troopLeader') || null,
        assistantLeader: formData.get('assistantLeader') || null,
        troopColor: formData.get('troopColor') || 'blue',
        description: formData.get('description') || '',
        updatedAt: Date.now()
    };

    try {
        await adminTroopsDatabase.ref(`troops/${troopId}`).update(updateData);

        if (window.showNotification) {
            window.showNotification('Troop updated successfully', 'success');
        }

        closeModal('editTroopModal');
        await loadTroopsForTeam();

    } catch (error) {
        console.error('Error updating troop:', error);
        if (window.showNotification) {
            window.showNotification('Error updating troop', 'error');
        }
    }
}

// Show add troop modal
function showAddTroopModal() {
    const modal = document.getElementById('addTroopModal');
    const teamSelect = document.getElementById('troopTeamSelect');

    if (modal && teamSelect) {
        teamSelect.value = selectedTeam;
        populateLeaderDropdowns('add', selectedTeam);
        modal.style.display = 'flex';
    }
}

// Edit troop
function editTroop(troopId) {
    const troop = currentTroops.find(t => t.id === troopId);
    if (!troop) return;

    const modal = document.getElementById('editTroopModal');
    if (!modal) return;

    // Populate form
    document.getElementById('editTroopId').value = troopId;
    document.getElementById('editTroopTeamSelect').value = troop.team;
    document.getElementById('editTroopName').value = troop.troopName;
    document.getElementById('editTroopDescription').value = troop.description || '';
    document.getElementById('editSelectedColor').value = troop.troopColor || 'blue';

    // Set color selection
    const colorSelector = modal.querySelector('.color-selector');
    if (colorSelector) {
        colorSelector.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        const selectedColor = colorSelector.querySelector(`[data-color="${troop.troopColor || 'blue'}"]`);
        if (selectedColor) {
            selectedColor.classList.add('selected');
        }
    }

    // Populate leader dropdowns
    populateLeaderDropdowns('edit', troop.team, troop.troopLeader, troop.assistantLeader);

    modal.style.display = 'flex';
}

// Delete troop
async function deleteTroop(troopId) {
    const troop = currentTroops.find(t => t.id === troopId);
    if (!troop) return;

    const memberCount = troop.members ? troop.members.length : 0;
    const confirmMessage = memberCount > 0 ?
        `Are you sure you want to delete "${troop.troopName}"? This will unassign ${memberCount} scout(s) from the troop.` :
        `Are you sure you want to delete "${troop.troopName}"?`;

    if (confirm(confirmMessage)) {
        try {
            await adminTroopsDatabase.ref(`troops/${troopId}`).remove();

            if (window.showNotification) {
                window.showNotification('Troop deleted successfully', 'success');
            }

            await loadTroopsForTeam();
            await loadScoutsData(); // Refresh to show newly unassigned scouts

        } catch (error) {
            console.error('Error deleting troop:', error);
            if (window.showNotification) {
                window.showNotification('Error deleting troop', 'error');
            }
        }
    }
}

// Populate leader dropdowns with scouts from the selected team
function populateLeaderDropdowns(mode, team, currentLeader = '', currentAssistant = '') {
    const leaderSelect = document.getElementById(mode === 'add' ? 'troopLeaderSelect' : 'editTroopLeaderSelect');
    const assistantSelect = document.getElementById(mode === 'add' ? 'assistantLeaderSelect' : 'editAssistantLeaderSelect');

    if (!leaderSelect || !assistantSelect) return;

    // Filter scouts based on grade instead of team attribute
    const teamScouts = currentScouts.filter(scout => {
        const scoutTeam = scout.team || getScoutTeamFromGrade(scout.grade);
        return scoutTeam === team;
    });

    // Populate leader dropdown
    leaderSelect.innerHTML = '<option value="">Select Leader (Optional)</option>';
    teamScouts.forEach(scout => {
        const option = document.createElement('option');
        option.value = `${scout.firstName} ${scout.lastName}`;
        option.textContent = `${scout.firstName} ${scout.lastName} (Grade ${scout.grade || 'N/A'})`;
        option.selected = option.value === currentLeader;
        leaderSelect.appendChild(option);
    });

    // Populate assistant dropdown
    assistantSelect.innerHTML = '<option value="">Select Assistant (Optional)</option>';
    teamScouts.forEach(scout => {
        const option = document.createElement('option');
        option.value = `${scout.firstName} ${scout.lastName}`;
        option.textContent = `${scout.firstName} ${scout.lastName} (Grade ${scout.grade || 'N/A'})`;
        option.selected = option.value === currentAssistant;
        assistantSelect.appendChild(option);
    });
}

// Get team display name
function getTeamDisplayName(team) {
    const names = {
        cubs: 'Cubs & Brownies',
        scouts: 'Scouts',
        rovers: 'Rovers'
    };
    return names[team] || team;
}

// Quick assign scout to a troop (shows selection modal)
function quickAssignScout(scoutId) {
    if (currentTroops.length === 0) {
        alert('Please create at least one troop first before assigning scouts.');
        return;
    }

    const troopOptions = currentTroops.map(troop =>
        `${troop.troopName} (${troop.members ? troop.members.length : 0} members)`
    );

    const selection = prompt(`Select a troop for this scout:\n\n${troopOptions.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nEnter the number:`);

    if (selection && !isNaN(selection)) {
        const troopIndex = parseInt(selection) - 1;
        if (troopIndex >= 0 && troopIndex < currentTroops.length) {
            assignScoutToTroop(scoutId, currentTroops[troopIndex].id);
        }
    }
}

// Assign scout to troop
async function assignScoutToTroop(scoutId, troopId) {
    try {
        const troop = currentTroops.find(t => t.id === troopId);
        if (!troop) return;

        const members = troop.members || [];
        if (!members.includes(scoutId)) {
            members.push(scoutId);

            await adminTroopsDatabase.ref(`troops/${troopId}/members`).set(members);

            if (window.showNotification) {
                window.showNotification('Scout assigned successfully', 'success');
            }

            await loadTroopsForTeam();
            await loadScoutsData();
        }
    } catch (error) {
        console.error('Error assigning scout:', error);
        if (window.showNotification) {
            window.showNotification('Error assigning scout', 'error');
        }
    }
}

// Assign scouts modal functions
function assignScouts(troopId) {
    currentTroopForAssignment = troopId;
    const troop = currentTroops.find(t => t.id === troopId);

    if (!troop) return;

    document.getElementById('assignModalTitle').textContent = `Assign Scouts to ${troop.troopName}`;

    loadAvailableScouts();
    loadCurrentMembers(troopId);

    document.getElementById('assignScoutsModal').style.display = 'flex';
}

// Load available scouts for assignment
function loadAvailableScouts() {
    const availableScoutsList = document.getElementById('availableScoutsList');
    const unassignedScouts = getUnassignedScouts();

    if (!availableScoutsList) return;

    if (unassignedScouts.length === 0) {
        availableScoutsList.innerHTML = '<div class="scout-item">No unassigned scouts available</div>';
        return;
    }

    availableScoutsList.innerHTML = unassignedScouts.map(scout => `
        <div class="scout-item" data-scout-id="${scout.id}">
            <div class="scout-info">
                <div class="scout-name">${scout.firstName} ${scout.lastName}</div>
                <div class="scout-grade">Grade ${scout.grade || 'N/A'}</div>
            </div>
            <input type="checkbox" onchange="toggleScoutSelection('${scout.id}', this.checked)">
        </div>
    `).join('');
}

// Load current troop members
function loadCurrentMembers(troopId) {
    const currentMembersList = document.getElementById('currentMembersList');
    const troop = currentTroops.find(t => t.id === troopId);

    if (!currentMembersList || !troop) return;

    const members = troop.members || [];

    if (members.length === 0) {
        currentMembersList.innerHTML = '<div class="scout-item">No scouts assigned to this troop</div>';
        return;
    }

    currentMembersList.innerHTML = members.map(memberId => {
        const scout = currentScouts.find(s => s.id === memberId);
        if (!scout) return '';

        return `
            <div class="scout-item" data-scout-id="${scout.id}">
                <div class="scout-info">
                    <div class="scout-name">${scout.firstName} ${scout.lastName}</div>
                    <div class="scout-grade">Grade ${scout.grade || 'N/A'}</div>
                </div>
                <button class="action-btn sm danger" onclick="removeScoutFromTroop('${scout.id}')">
                    <i class="fas fa-times"></i>
                    Remove
                </button>
            </div>
        `;
    }).filter(html => html).join('');
}

// Toggle scout selection for assignment
function toggleScoutSelection(scoutId, isSelected) {
    const scoutItem = document.querySelector(`[data-scout-id="${scoutId}"]`);
    if (scoutItem) {
        if (isSelected) {
            scoutItem.classList.add('selected');
        } else {
            scoutItem.classList.remove('selected');
        }
    }
}

// Select all scouts
function selectAllScouts() {
    const checkboxes = document.querySelectorAll('#availableScoutsList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        toggleScoutSelection(checkbox.parentNode.dataset.scoutId, true);
    });
}

// Deselect all scouts
function deselectAllScouts() {
    const checkboxes = document.querySelectorAll('#availableScoutsList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        toggleScoutSelection(checkbox.parentNode.dataset.scoutId, false);
    });
}

// Save scout assignments
async function saveScoutAssignments() {
    if (!currentTroopForAssignment) return;

    const selectedCheckboxes = document.querySelectorAll('#availableScoutsList input[type="checkbox"]:checked');
    const scoutsToAssign = Array.from(selectedCheckboxes).map(cb => {
        return cb.parentNode.dataset.scoutId;
    });

    if (scoutsToAssign.length === 0) {
        closeModal('assignScoutsModal');
        return;
    }

    try {
        const troop = currentTroops.find(t => t.id === currentTroopForAssignment);
        if (!troop) return;

        const currentMembers = troop.members || [];
        const newMembers = [...new Set([...currentMembers, ...scoutsToAssign])];

        await adminTroopsDatabase.ref(`troops/${currentTroopForAssignment}/members`).set(newMembers);

        if (window.showNotification) {
            window.showNotification(`${scoutsToAssign.length} scout(s) assigned successfully`, 'success');
        }

        closeModal('assignScoutsModal');
        await loadTroopsForTeam();
        await loadScoutsData();

    } catch (error) {
        console.error('Error saving assignments:', error);
        if (window.showNotification) {
            window.showNotification('Error saving assignments', 'error');
        }
    }
}

// Remove scout from troop
async function removeScoutFromTroop(scoutId) {
    if (!currentTroopForAssignment) return;

    try {
        const troop = currentTroops.find(t => t.id === currentTroopForAssignment);
        if (!troop) return;

        const members = (troop.members || []).filter(id => id !== scoutId);

        await adminTroopsDatabase.ref(`troops/${currentTroopForAssignment}/members`).set(members);

        loadCurrentMembers(currentTroopForAssignment);
        loadAvailableScouts();

        if (window.showNotification) {
            window.showNotification('Scout removed from troop', 'success');
        }

    } catch (error) {
        console.error('Error removing scout:', error);
        if (window.showNotification) {
            window.showNotification('Error removing scout', 'error');
        }
    }
}

// Filter assignable scouts
function filterAssignableScouts() {
    const searchTerm = document.getElementById('scoutAssignSearch').value.toLowerCase();
    const scoutItems = document.querySelectorAll('#availableScoutsList .scout-item');

    scoutItems.forEach(item => {
        const scoutName = item.querySelector('.scout-name').textContent.toLowerCase();
        const scoutGrade = item.querySelector('.scout-grade').textContent.toLowerCase();

        if (scoutName.includes(searchTerm) || scoutGrade.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Adjust troop points by a specific amount
async function adjustTroopPoints(troopId, adjustment) {
    try {
        const troop = currentTroops.find(t => t.id === troopId);
        if (!troop) return;

        const currentPoints = troop.points || 0;
        const newPoints = Math.max(0, currentPoints + adjustment); // Don't allow negative points

        await adminTroopsDatabase.ref(`troops/${troopId}/points`).set(newPoints);

        if (window.showNotification) {
            const action = adjustment > 0 ? 'added to' : 'removed from';
            window.showNotification(`Points ${action} ${troop.troopName}`, 'success');
        }

        await loadTroopsForTeam();

    } catch (error) {
        console.error('Error adjusting troop points:', error);
        if (window.showNotification) {
            window.showNotification('Error adjusting points', 'error');
        }
    }
}

// Edit troop points directly
function editTroopPoints(troopId) {
    const troop = currentTroops.find(t => t.id === troopId);
    if (!troop) return;

    const currentPoints = troop.points || 0;
    const newPoints = prompt(`Set points for ${troop.troopName}:\n\nCurrent points: ${currentPoints}`, currentPoints);

    if (newPoints !== null && !isNaN(newPoints)) {
        const points = Math.max(0, parseInt(newPoints)); // Don't allow negative points
        setTroopPoints(troopId, points);
    }
}

// Set troop points to a specific value
async function setTroopPoints(troopId, points) {
    try {
        const troop = currentTroops.find(t => t.id === troopId);
        if (!troop) return;

        await adminTroopsDatabase.ref(`troops/${troopId}/points`).set(points);

        if (window.showNotification) {
            window.showNotification(`Points set for ${troop.troopName}: ${points}`, 'success');
        }

        await loadTroopsForTeam();

    } catch (error) {
        console.error('Error setting troop points:', error);
        if (window.showNotification) {
            window.showNotification('Error setting points', 'error');
        }
    }
}

// Make functions globally available
window.showAddTroopModal = showAddTroopModal;
window.loadTroopsForTeam = loadTroopsForTeam;
window.editTroop = editTroop;
window.deleteTroop = deleteTroop;
window.assignScouts = assignScouts;
window.quickAssignScout = quickAssignScout;
window.assignScoutToTroop = assignScoutToTroop;
window.saveScoutAssignments = saveScoutAssignments;
window.removeScoutFromTroop = removeScoutFromTroop;
window.selectAllScouts = selectAllScouts;
window.deselectAllScouts = deselectAllScouts;
window.filterAssignableScouts = filterAssignableScouts;
window.toggleScoutSelection = toggleScoutSelection;
window.adjustTroopPoints = adjustTroopPoints;
window.editTroopPoints = editTroopPoints;
window.setTroopPoints = setTroopPoints;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase and admin panel to initialize
    setTimeout(() => {
        if (typeof firebase !== 'undefined') {
            initializeTroopManagement();
        }
    }, 2000);
});