// Photo Gallery Management Functions
// GitHub Configuration - Dynamic token from Firebase
async function getGalleryGitHubConfig() {
    // Use config from config.js if available, otherwise fall back to defaults
    if (window.GITHUB_CONFIG) {
        const config = { ...window.GITHUB_CONFIG };

        // Fetch token from Firebase if not already set
        if (!config.token && window.githubTokenService) {
            try {
                config.token = await window.githubTokenService.getToken();
                if (!config.token) {
                    console.error('Gallery: No token returned from token service');
                }
            } catch (error) {
                console.error('Gallery: Error fetching token from Firebase:', error);
            }
        } else if (!config.token) {
            console.error('Gallery: No token and githubTokenService not available');
        }

        return config;
    }

    // Fallback configuration (for development or if config.js is missing)
    return {
        username: 'mbaskhairoun',
        repository: 'SGSA-Pics',
        token: null, // Will be fetched from Firebase
        baseUrl: 'https://api.github.com/repos/mbaskhairoun/SGSA-Pics/contents'
    };
}

// Global variables for photo management
let adminGalleryPhotos = [];
let currentAdminFilter = 'all';
let galleryConfig = null;

// Initialize gallery config on page load
async function initializeGalleryConfig() {
    try {
        // Wait a bit for GitHub token service to be ready
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max

        while (!window.githubTokenService && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.githubTokenService) {
            console.warn('Gallery: GitHub token service not available after waiting');
        }

        galleryConfig = await getGalleryGitHubConfig();
        console.log('Gallery config initialized successfully');
    } catch (error) {
        console.error('Failed to initialize gallery config:', error);
    }
}

// Call initialization when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add a small delay to ensure other scripts are loaded
        setTimeout(initializeGalleryConfig, 500);
    });
} else {
    setTimeout(initializeGalleryConfig, 500);
}

// File to Base64 conversion
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Generate unique filename
function generateFilename(originalName, category) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '-');
    return `${category}/${timestamp}-${cleanName}.${extension}`;
}

// Create directory in GitHub if it doesn't exist
async function ensureDirectoryExists(directory) {
    try {
        const config = await getGalleryGitHubConfig();

        // Create a .gitkeep file in the directory to ensure it exists
        const gitkeepPath = `${directory}/.gitkeep`;

        // Check if directory already has files
        const checkResponse = await fetch(`${config.baseUrl}/${directory}`, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        // If directory doesn't exist (404), create it
        if (checkResponse.status === 404) {
            const createResponse = await fetch(`${config.baseUrl}/${gitkeepPath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Create ${directory} directory`,
                    content: '' // Empty .gitkeep file
                })
            });

            if (!createResponse.ok) {
                console.warn(`Could not create directory ${directory}:`, createResponse.status);
            }
        }
    } catch (error) {
        console.warn('Error ensuring directory exists:', error);
        // Don't throw - continue with upload attempt
    }
}

// Upload image to GitHub
async function uploadToGitHub(imageFile, filename) {
    try {
        const config = await getGalleryGitHubConfig();

        // Check if we have a valid token
        if (!config.token) {
            throw new Error('No GitHub token available. Please check your configuration.');
        }

        console.log('Gallery upload: Using token starting with:', config.token.substring(0, 8) + '...');

        // Extract directory from filename and ensure it exists
        const directory = filename.split('/')[0];
        if (directory && directory !== filename) {
            await ensureDirectoryExists(directory);
        }

        const base64Data = await fileToBase64(imageFile);
        const base64Content = base64Data.split(',')[1]; // Remove data:image prefix

        const response = await fetch(`${config.baseUrl}/${filename}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Add photo: ${filename}`,
                content: base64Content
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // Use the GitHub blob URL with ?raw=true for immediate access
        const workingUrl = `https://github.com/${config.username}/${config.repository}/blob/main/${filename}?raw=true`;
        const downloadUrl = result.content.download_url;

        console.log('Upload successful:', {
            filename,
            workingUrl,
            downloadUrl
        });

        // Return the working URL format that's immediately available
        return workingUrl;
    } catch (error) {
        console.error('Error uploading to GitHub:', error);
        throw error;
    }
}

// Delete image from GitHub
async function deleteFromGitHub(filename) {
    try {
        const config = await getGalleryGitHubConfig();

        // First get the file SHA
        const getResponse = await fetch(`${config.baseUrl}/${filename}`, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            throw new Error(`Error getting file SHA: ${getResponse.status}`);
        }

        const fileData = await getResponse.json();

        // Now delete the file
        const deleteResponse = await fetch(`${config.baseUrl}/${filename}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Delete photo: ${filename}`,
                sha: fileData.sha
            })
        });

        if (!deleteResponse.ok) {
            throw new Error(`Error deleting file: ${deleteResponse.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error deleting from GitHub:', error);
        throw error;
    }
}

// Show add photo modal
function showAddPhotoModal() {
    const modal = document.getElementById('addPhotoModal');
    modal.style.display = 'flex';
    resetPhotoForm();
    setupPhotoUpload();
}

// Setup photo upload drag and drop
function setupPhotoUpload() {
    const uploadZone = document.getElementById('photoUploadZone');
    const fileInput = document.getElementById('photoFileInput');

    // Check if already set up to prevent duplicate event listeners
    if (uploadZone.dataset.setupComplete === 'true') {
        return;
    }

    // Drag and drop events
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleMultiplePhotoSelection(files);
        }
    });

    uploadZone.addEventListener('click', (e) => {
        // Prevent double-clicking issues
        if (e.detail > 1) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleMultiplePhotoSelection(e.target.files);
            // Clear the input so the same files can be selected again if needed
            e.target.value = '';
        }
    });

    // Mark as set up
    uploadZone.dataset.setupComplete = 'true';
}

// Handle multiple photo selection
function handleMultiplePhotoSelection(files) {
    const validFiles = [];
    const errors = [];

    // Validate each file
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            errors.push(`File ${index + 1}: Please select an image file`);
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            errors.push(`File ${index + 1}: File size must be less than 10MB`);
            return;
        }

        validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
        showNotification(errors.join('\n'), 'error');
    }

    // If no valid files, return
    if (validFiles.length === 0) {
        return;
    }

    // Store files for upload
    const form = document.getElementById('addPhotoForm');
    if (!form.selectedFiles) {
        form.selectedFiles = [];
    }

    // Add new files to existing selection
    form.selectedFiles.push(...validFiles);

    // Show previews
    displayPhotoPreviews();
}

// Handle single photo selection (for backward compatibility)
function handlePhotoSelection(file) {
    handleMultiplePhotoSelection([file]);
}

// Display photo previews
function displayPhotoPreviews() {
    const form = document.getElementById('addPhotoForm');
    const selectedFiles = form.selectedFiles || [];

    if (selectedFiles.length === 0) {
        showUploadZone();
        return;
    }

    const photosPreview = document.getElementById('photosPreview');
    const photosGrid = document.getElementById('photosGrid');
    const uploadZone = document.getElementById('photoUploadZone');

    // Show preview area, hide upload zone
    photosPreview.style.display = 'block';
    uploadZone.style.display = 'none';

    // Clear existing previews
    photosGrid.innerHTML = '';

    // Create preview elements for each file
    selectedFiles.forEach((file, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'photo-preview-item';
        previewDiv.id = `preview-${index}`;

        previewDiv.innerHTML = `
            <div class="preview-image-container">
                <img class="preview-image" alt="Preview" style="opacity: 0;">
                <div class="preview-overlay">
                    <button type="button" class="remove-photo-btn" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="preview-info">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            </div>
        `;

        // Append to grid
        photosGrid.appendChild(previewDiv);

        // Load and display the image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = previewDiv.querySelector('.preview-image');
            img.src = e.target.result;
            img.style.opacity = '1';
        };
        reader.readAsDataURL(file);
    });
}

// Remove photo from selection
function removePhotoFromSelection(index) {
    const form = document.getElementById('addPhotoForm');
    if (form.selectedFiles && form.selectedFiles[index] !== undefined) {
        form.selectedFiles.splice(index, 1);
        displayPhotoPreviews();
    }
}

// Clear all selected photos
function clearAllPhotos() {
    const form = document.getElementById('addPhotoForm');
    form.selectedFiles = [];
    showUploadZone();
}

// Show upload zone
function showUploadZone() {
    const photosPreview = document.getElementById('photosPreview');
    const uploadZone = document.getElementById('photoUploadZone');

    photosPreview.style.display = 'none';
    uploadZone.style.display = 'flex';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove photo preview (legacy function - now redirects to clearAllPhotos)
function removePhotoPreview() {
    clearAllPhotos();
}

// Reset photo form
function resetPhotoForm() {
    const form = document.getElementById('addPhotoForm');
    const uploadZone = document.getElementById('photoUploadZone');

    form.reset();
    form.selectedFiles = [];
    document.getElementById('photoFileInput').value = '';

    // Reset the setup flag so the upload zone can be re-initialized
    if (uploadZone) {
        uploadZone.dataset.setupComplete = 'false';
    }

    showUploadZone();
    hideUploadProgress();
}

// Show upload progress
function showUploadProgress() {
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadPhotoBtn').disabled = true;
}

// Hide upload progress
function hideUploadProgress() {
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadPhotoBtn').disabled = false;
    updateUploadProgress(0, 'Ready to upload');
}

// Update upload progress
function updateUploadProgress(percent, text) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
}

// Handle photo form submission
async function handlePhotoUpload(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const selectedFiles = form.selectedFiles || [];

    if (!selectedFiles || selectedFiles.length === 0) {
        showNotification('Please select photos to upload', 'error');
        return;
    }

    try {
        showUploadProgress();
        updateUploadProgress(5, 'Preparing uploads...');

        const totalFiles = selectedFiles.length;
        let uploadedCount = 0;
        const errors = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            try {
                // Update progress
                const progressPercent = 5 + (i / totalFiles) * 85; // 5% to 90%
                updateUploadProgress(progressPercent, `Uploading ${i + 1} of ${totalFiles}: ${file.name}`);

                // Generate filename
                const filename = generateFilename(file.name, formData.get('category'));

                // Upload to GitHub
                const githubUrl = await uploadToGitHub(file, filename);

                // Prepare photo data
                const photoData = {
                    title: totalFiles === 1 ? formData.get('title') : `${formData.get('title')} - ${i + 1}`,
                    description: formData.get('description') || '',
                    category: formData.get('category'),
                    githubUrl: githubUrl,
                    filename: filename,
                    uploadDate: Date.now() + i, // Add small offset to maintain order
                    active: formData.get('active') === 'true',
                    adminId: getCurrentUser()?.uid || 'admin'
                };

                // Save to Firebase
                const database = window.adminDatabase || window.firebase?.database?.() || null;
                if (database) {
                    const photosRef = database.ref('gallery/photos');
                    await photosRef.push(photoData);
                    uploadedCount++;
                } else {
                    throw new Error('Firebase database not available');
                }

            } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                errors.push(`${file.name}: ${fileError.message}`);
            }
        }

        updateUploadProgress(100, 'Uploads complete!');

        setTimeout(() => {
            closeModal('addPhotoModal');

            if (errors.length === 0) {
                showNotification(`All ${uploadedCount} photos uploaded successfully!`, 'success');
            } else if (uploadedCount > 0) {
                showNotification(`${uploadedCount} photos uploaded successfully. ${errors.length} failed:\n${errors.join('\n')}`, 'warning');
            } else {
                showNotification(`Upload failed:\n${errors.join('\n')}`, 'error');
            }

            loadAdminGallery();
        }, 1000);

    } catch (error) {
        console.error('Error during upload process:', error);
        showNotification('Error during upload process: ' + error.message, 'error');
        hideUploadProgress();
    }
}

// Load admin gallery
async function loadAdminGallery() {
    // Check for Firebase database - use the same reference as admin script
    const database = window.adminDatabase || window.firebase?.database?.() || null;

    if (!database) {
        console.warn('Firebase not initialized for gallery');
        return;
    }

    try {
        const galleryRef = database.ref('gallery/photos');
        const snapshot = await galleryRef.orderByChild('uploadDate').once('value');

        adminGalleryPhotos = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const photo = childSnapshot.val();
                adminGalleryPhotos.push({
                    id: childSnapshot.key,
                    ...photo
                });
            });

            // Sort by upload date (newest first)
            adminGalleryPhotos.sort((a, b) => (b.uploadDate || 0) - (a.uploadDate || 0));
        }

        displayAdminGallery();
        updateGalleryStats();
    } catch (error) {
        console.error('Error loading admin gallery:', error);
        displayAdminGallery([]);
    }
}

// Display admin gallery
function displayAdminGallery() {
    const galleryGrid = document.getElementById('adminGalleryGrid');

    // Filter photos
    let filteredPhotos = adminGalleryPhotos;

    if (currentAdminFilter !== 'all') {
        filteredPhotos = filteredPhotos.filter(photo => photo.category === currentAdminFilter);
    }

    // Search filter
    const searchTerm = document.getElementById('gallerySearchInput')?.value.toLowerCase();
    if (searchTerm) {
        filteredPhotos = filteredPhotos.filter(photo =>
            photo.title.toLowerCase().includes(searchTerm) ||
            photo.description.toLowerCase().includes(searchTerm)
        );
    }

    if (filteredPhotos.length === 0) {
        galleryGrid.innerHTML = `
            <div class="gallery-empty">
                <i class="fas fa-images"></i>
                <h3>No Photos Found</h3>
                <p>Upload some photos to get started!</p>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = filteredPhotos.map(photo => {
        const uploadDate = new Date(photo.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const statusClass = photo.active ? 'active' : 'draft';
        const statusText = photo.active ? 'Active' : 'Draft';

        return `
            <div class="admin-gallery-item ${statusClass}">
                <div class="admin-photo-container">
                    <img src="${photo.githubUrl}" alt="${photo.title}" class="admin-photo"
                         onerror="handleImageError(this, '${photo.githubUrl}')"
                         onload="console.log('Image loaded successfully:', '${photo.githubUrl}')">
                    <div class="admin-photo-overlay">
                        <button class="edit-photo-btn" onclick="editPhoto('${photo.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="view-photo-btn" onclick="viewPhotoLarge('${photo.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="admin-photo-info">
                    <h4 class="admin-photo-title">${photo.title}</h4>
                    <p class="admin-photo-description">${photo.description || 'No description'}</p>
                    <div class="admin-photo-meta">
                        <span class="photo-category ${photo.category}">
                            ${getCategoryIcon(photo.category)}
                            ${getCategoryName(photo.category)}
                        </span>
                        <span class="photo-date">${uploadDate}</span>
                        <span class="photo-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter admin gallery
function filterAdminGallery() {
    const filterSelect = document.getElementById('adminGalleryFilter');
    currentAdminFilter = filterSelect.value;
    displayAdminGallery();
}

// Update gallery stats
function updateGalleryStats() {
    const totalCount = adminGalleryPhotos.length;
    const activeCount = adminGalleryPhotos.filter(photo => photo.active).length;

    document.getElementById('totalPhotosCount').textContent = totalCount;
    document.getElementById('activePhotosCount').textContent = activeCount;
}

// Edit photo
function editPhoto(photoId) {
    const photo = adminGalleryPhotos.find(p => p.id === photoId);
    if (!photo) return;

    // Populate edit form
    const form = document.getElementById('editPhotoForm');
    form.elements.photoId.value = photoId;
    form.elements.title.value = photo.title;
    form.elements.description.value = photo.description || '';
    form.elements.category.value = photo.category;
    form.elements.active.value = photo.active.toString();

    // Show current photo
    document.getElementById('editPhotoPreview').src = photo.githubUrl;

    // Show modal
    document.getElementById('editPhotoModal').style.display = 'flex';
}

// Handle photo edit submission
async function handlePhotoEdit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const photoId = formData.get('photoId');

    try {
        const updatedData = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            category: formData.get('category'),
            active: formData.get('active') === 'true'
        };

        // Update in Firebase
        const database = window.adminDatabase || window.firebase?.database?.() || null;
        if (database) {
            const photoRef = database.ref(`gallery/photos/${photoId}`);
            await photoRef.update(updatedData);
        } else {
            throw new Error('Firebase database not available');
        }

        closeModal('editPhotoModal');
        showNotification('Photo updated successfully!', 'success');
        loadAdminGallery();

    } catch (error) {
        console.error('Error updating photo:', error);
        showNotification('Error updating photo: ' + error.message, 'error');
    }
}

// Delete photo
async function deletePhoto() {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
        return;
    }

    const form = document.getElementById('editPhotoForm');
    const photoId = form.elements.photoId.value;
    const photo = adminGalleryPhotos.find(p => p.id === photoId);

    if (!photo) return;

    try {
        // Delete from GitHub
        await deleteFromGitHub(photo.filename);

        // Delete from Firebase
        const database = window.adminDatabase || window.firebase?.database?.() || null;
        if (database) {
            const photoRef = database.ref(`gallery/photos/${photoId}`);
            await photoRef.remove();
        } else {
            throw new Error('Firebase database not available');
        }

        closeModal('editPhotoModal');
        showNotification('Photo deleted successfully!', 'success');
        loadAdminGallery();

    } catch (error) {
        console.error('Error deleting photo:', error);
        showNotification('Error deleting photo: ' + error.message, 'error');
    }
}

// View photo in large modal (reuse existing function)
function viewPhotoLarge(photoId) {
    const photo = adminGalleryPhotos.find(p => p.id === photoId);
    if (photo) {
        openImageModal(photoId);
    }
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        cubs: '<i class="fas fa-baby"></i>',
        scouts: '<i class="fas fa-child"></i>',
        rovers: '<i class="fas fa-user-graduate"></i>',
        events: '<i class="fas fa-calendar-star"></i>',
        activities: '<i class="fas fa-anchor"></i>'
    };
    return icons[category] || '<i class="fas fa-image"></i>';
}

// Get category display name
function getCategoryName(category) {
    const names = {
        cubs: 'Cubs & Brownies',
        scouts: 'Scouts',
        rovers: 'Rovers',
        events: 'Events',
        activities: 'Activities'
    };
    return names[category] || 'Gallery';
}

// Handle image loading errors
function handleImageError(img, originalUrl) {
    console.error('Image failed to load:', originalUrl);

    if (!galleryConfig) {
        console.error('Gallery config not initialized');
        return;
    }

    // Try alternative URLs
    const filename = originalUrl.split('/').slice(-2).join('/'); // Get category/filename
    const alternativeUrls = [
        // Primary working format with ?raw=true
        `https://github.com/${galleryConfig.username}/${galleryConfig.repository}/blob/main/${filename}?raw=true`,
        // Standard raw GitHub URLs
        `https://raw.githubusercontent.com/${galleryConfig.username}/${galleryConfig.repository}/main/${filename}`,
        `https://github.com/${galleryConfig.username}/${galleryConfig.repository}/raw/main/${filename}`,
        // Try master branch alternatives
        `https://github.com/${galleryConfig.username}/${galleryConfig.repository}/blob/master/${filename}?raw=true`,
        `https://raw.githubusercontent.com/${galleryConfig.username}/${galleryConfig.repository}/master/${filename}`
    ];

    // Try each alternative URL
    let currentIndex = 0;
    const tryNextUrl = () => {
        if (currentIndex < alternativeUrls.length) {
            const nextUrl = alternativeUrls[currentIndex];
            console.log(`Trying alternative URL ${currentIndex + 1}:`, nextUrl);

            img.onerror = () => {
                currentIndex++;
                setTimeout(tryNextUrl, 1000); // Wait 1 second before trying next
            };

            img.src = nextUrl;
            currentIndex++;
        } else {
            // All alternatives failed, show placeholder
            console.error('All image URLs failed, showing placeholder');
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
            img.alt = 'Image not found';
        }
    };

    // Start trying alternatives after a brief delay
    setTimeout(tryNextUrl, 1000);
}

// Helper function to get current user
function getCurrentUser() {
    return window.firebase?.auth()?.currentUser || null;
}

// Initialize photo gallery management
function initializePhotoGallery() {
    // Setup form event listeners
    const addPhotoForm = document.getElementById('addPhotoForm');
    if (addPhotoForm) {
        addPhotoForm.addEventListener('submit', handlePhotoUpload);
    }

    const editPhotoForm = document.getElementById('editPhotoForm');
    if (editPhotoForm) {
        editPhotoForm.addEventListener('submit', handlePhotoEdit);
    }

    // Setup event delegation for remove photo buttons
    const photosGrid = document.getElementById('photosGrid');
    if (photosGrid) {
        photosGrid.addEventListener('click', (e) => {
            if (e.target.closest('.remove-photo-btn')) {
                const button = e.target.closest('.remove-photo-btn');
                const index = parseInt(button.getAttribute('data-index'));
                removePhotoFromSelection(index);
            }
        });
    }

    // Wait for Firebase to be initialized before loading gallery
    if (document.getElementById('adminGalleryGrid')) {
        // Check if Firebase is already initialized
        if (window.adminDatabase || window.firebase?.database) {
            loadAdminGallery();
        } else {
            // Wait for Firebase initialization
            const checkFirebase = setInterval(() => {
                if (window.adminDatabase || window.firebase?.database) {
                    clearInterval(checkFirebase);
                    loadAdminGallery();
                }
            }, 100);

            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkFirebase), 10000);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializePhotoGallery);

// Also initialize when Firebase becomes available
window.addEventListener('firebaseInitialized', initializePhotoGallery);