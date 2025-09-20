// Announcement Image Management Functions
// GitHub Configuration for announcements
//
// IMPORTANT: The configuration is now loaded from config.js
// To update the GitHub token, edit the config.js file
//
// If the token expires, announcements will still work but images will be shown as local previews only
//
function getAnnouncementGitHubConfig() {
    // Use config from config.js if available, otherwise fall back to defaults
    if (window.GITHUB_CONFIG) {
        return window.GITHUB_CONFIG;
    }

    // Fallback configuration (for development or if config.js is missing)
    return {
        username: 'baskhairounm',
        repository: 'SGSA-Pics',
        token: '', // No token - will trigger placeholder mode
        baseUrl: 'https://api.github.com/repos/baskhairounm/SGSA-Pics/contents'
    };
}

// Global variables for announcement images
let selectedAnnouncementImages = [];
let editingAnnouncementImages = [];

// Initialize announcement image functionality
function initializeAnnouncementImages() {
    // Setup add announcement image upload
    const addUploadZone = document.getElementById('announcementUploadZone');
    const addFileInput = document.getElementById('announcementImageInput');

    if (addUploadZone && addFileInput) {
        addUploadZone.addEventListener('click', () => addFileInput.click());
        addFileInput.addEventListener('change', handleAnnouncementImageSelection);
    }

    // Setup edit announcement image upload
    const editUploadZone = document.getElementById('editAnnouncementUploadZone');
    const editFileInput = document.getElementById('editAnnouncementImageInput');

    if (editUploadZone && editFileInput) {
        editUploadZone.addEventListener('click', () => editFileInput.click());
        editFileInput.addEventListener('change', handleEditAnnouncementImageSelection);
    }

    // Setup form preview updates
    const titleInput = document.querySelector('#addAnnouncementForm input[name="title"]');
    const contentInput = document.querySelector('#addAnnouncementForm textarea[name="content"]');

    if (titleInput && contentInput) {
        titleInput.addEventListener('input', updateAnnouncementPreview);
        contentInput.addEventListener('input', updateAnnouncementPreview);
    }
}

// Handle image selection for new announcements
function handleAnnouncementImageSelection(event) {
    const files = Array.from(event.target.files);
    console.log('Files selected for announcement:', files.length);

    files.forEach(file => {
        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
        if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
            selectedAnnouncementImages.push(file);
            console.log('File added. Total selected images:', selectedAnnouncementImages.length);
        } else {
            console.error('Invalid file:', file.name, 'Type:', file.type, 'Size:', file.size);
            if (window.showNotification) {
                window.showNotification('Invalid file. Please select images under 10MB.', 'error');
            } else {
                alert('Invalid file. Please select images under 10MB.');
            }
        }
    });

    displayAnnouncementImagePreviews();
    updateAnnouncementPreview();

    console.log('Final selectedAnnouncementImages array:', selectedAnnouncementImages);
}

// Handle image selection for editing announcements
function handleEditAnnouncementImageSelection(event) {
    const files = Array.from(event.target.files);

    files.forEach(file => {
        if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
            editingAnnouncementImages.push({
                file: file,
                isNew: true
            });
        } else {
            showNotification('Invalid file. Please select images under 10MB.', 'error');
        }
    });

    displayEditAnnouncementImagePreviews();
}

// Display image previews for new announcements
function displayAnnouncementImagePreviews() {
    const previewContainer = document.getElementById('announcementImagePreviews');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    selectedAnnouncementImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview" class="preview-image">
                <button type="button" class="remove-image-btn" onclick="removeAnnouncementImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// Display image previews for editing announcements
function displayEditAnnouncementImagePreviews() {
    const previewContainer = document.getElementById('editAnnouncementImagePreviews');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    editingAnnouncementImages.forEach((imageData, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';

        if (imageData.isNew) {
            // New file preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <button type="button" class="remove-image-btn" onclick="removeEditAnnouncementImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            };
            reader.readAsDataURL(imageData.file);
        } else {
            // Existing image preview
            previewItem.innerHTML = `
                <img src="${imageData.url}" alt="Existing image" class="preview-image">
                <button type="button" class="remove-image-btn" onclick="removeEditAnnouncementImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }

        previewContainer.appendChild(previewItem);
    });
}

// Remove image from new announcement
function removeAnnouncementImage(index) {
    selectedAnnouncementImages.splice(index, 1);
    displayAnnouncementImagePreviews();
    updateAnnouncementPreview();
}

// Remove image from editing announcement
function removeEditAnnouncementImage(index) {
    editingAnnouncementImages.splice(index, 1);
    displayEditAnnouncementImagePreviews();
}

// Update announcement preview
function updateAnnouncementPreview() {
    const titleInput = document.querySelector('#addAnnouncementForm input[name="title"]');
    const contentInput = document.querySelector('#addAnnouncementForm textarea[name="content"]');
    const previewTitle = document.querySelector('#announcementPreview .preview-title');
    const previewContent = document.querySelector('#announcementPreview .preview-content');
    const previewImages = document.querySelector('#announcementPreview .preview-images');

    if (titleInput && previewTitle) {
        previewTitle.textContent = titleInput.value || 'Your announcement title will appear here';
    }

    if (contentInput && previewContent) {
        previewContent.textContent = contentInput.value || 'Your announcement content will appear here';
    }

    if (previewImages) {
        previewImages.innerHTML = '';

        if (selectedAnnouncementImages.length > 0) {
            const imagesContainer = document.createElement('div');
            imagesContainer.className = `announcement-images ${getImageLayoutClass(selectedAnnouncementImages.length)}`;

            selectedAnnouncementImages.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'announcement-image';

                    if (index === 3 && selectedAnnouncementImages.length > 4) {
                        // Show count overlay for 4+ images
                        imageDiv.innerHTML = `
                            <img src="${e.target.result}" alt="Preview">
                            <div class="image-count-overlay">+${selectedAnnouncementImages.length - 3}</div>
                        `;
                    } else if (index < 4) {
                        imageDiv.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    }

                    if (index < 4) {
                        imagesContainer.appendChild(imageDiv);
                    }
                };
                reader.readAsDataURL(file);
            });

            previewImages.appendChild(imagesContainer);
        }
    }
}

// Get CSS class for image layout based on count
function getImageLayoutClass(count) {
    if (count === 1) return 'single-image';
    if (count === 2) return 'two-images';
    if (count === 3) return 'three-images';
    return 'four-plus-images';
}

// Upload announcement images to GitHub
async function uploadAnnouncementImages(images) {
    console.log('uploadAnnouncementImages called with:', images.length, 'images');

    // Check if GitHub token is available and valid
    const config = getAnnouncementGitHubConfig();
    if (!config.token || config.token === '' || config.token === 'your-github-token-here') {
        console.warn('GitHub token not configured for image uploads');

        // Show user-friendly message
        if (window.showNotification) {
            window.showNotification(
                'Image upload not configured. Images will be shown as previews only. Contact the administrator to set up GitHub integration for permanent image hosting.',
                'warning'
            );
        } else {
            alert('Image upload not configured. Images will be shown as previews only.');
        }

        // Return placeholder data for local preview
        return await generatePlaceholderImageData(images);
    }

    const uploadedImages = [];

    for (let i = 0; i < images.length; i++) {
        const imageFile = images[i];
        console.log(`Uploading image ${i + 1}/${images.length}:`, imageFile.name);

        try {
            const filename = generateAnnouncementFilename(imageFile.name);
            console.log('Generated filename:', filename);

            const imageUrl = await uploadAnnouncementToGitHub(imageFile, filename);
            console.log('Upload successful, URL:', imageUrl);

            uploadedImages.push({
                url: imageUrl,
                filename: filename,
                uploadDate: Date.now()
            });
        } catch (error) {
            console.error('Error uploading announcement image:', imageFile.name, error);

            // Handle authentication errors specifically
            if (error.message.includes('401') || error.message.includes('Bad credentials')) {
                console.error('GitHub authentication failed - token may be expired or invalid');

                if (window.showNotification) {
                    window.showNotification(
                        'GitHub authentication failed. The access token has expired or is invalid. Images will be shown as local previews only. Contact the administrator to update the GitHub token.',
                        'error'
                    );
                } else {
                    alert('GitHub authentication failed. Token expired or invalid. Images will be shown as previews only.');
                }

                // Return placeholder data instead of throwing error
                console.log('Falling back to placeholder images due to authentication failure');
                return await generatePlaceholderImageData(images);
            }

            // Handle other GitHub API errors (rate limits, network issues, etc.)
            if (error.message.includes('403')) {
                console.error('GitHub API rate limit or forbidden error');

                if (window.showNotification) {
                    window.showNotification(
                        'GitHub API access denied. This may be due to rate limits or repository permissions. Images will be shown as local previews.',
                        'warning'
                    );
                }

                // Return placeholder data for rate limit issues
                return await generatePlaceholderImageData(images);
            }

            throw new Error(`Failed to upload image: ${imageFile.name} - ${error.message}`);
        }
    }

    console.log('All announcement images uploaded successfully:', uploadedImages);
    return uploadedImages;
}

// Generate filename for announcement images
function generateAnnouncementFilename(originalName) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '-');
    return `announcements/${timestamp}-${cleanName}.${extension}`;
}

// Generate placeholder image data for local preview when GitHub is not available
async function generatePlaceholderImageData(images) {
    console.log('Generating placeholder image data for', images.length, 'images');

    const placeholderImages = [];

    for (let i = 0; i < images.length; i++) {
        const imageFile = images[i];

        try {
            // Create a local blob URL for preview
            const blobUrl = URL.createObjectURL(imageFile);

            placeholderImages.push({
                url: blobUrl,
                filename: `local-preview-${i}-${imageFile.name}`,
                uploadDate: Date.now(),
                isPlaceholder: true
            });
        } catch (error) {
            console.error('Error creating placeholder for image:', imageFile.name, error);

            // Create a basic placeholder image
            const placeholderUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIFByZXZpZXc8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPihHaXRIdWIgbm90IGNvbmZpZ3VyZWQpPC90ZXh0Pjwvc3ZnPg==';

            placeholderImages.push({
                url: placeholderUrl,
                filename: `placeholder-${i}-${imageFile.name}`,
                uploadDate: Date.now(),
                isPlaceholder: true
            });
        }
    }

    console.log('Generated placeholder images:', placeholderImages);
    return placeholderImages;
}

// File to Base64 conversion for announcements
function announcementFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Upload announcement image to GitHub
async function uploadAnnouncementToGitHub(imageFile, filename) {
    try {
        // Extract directory from filename and ensure it exists
        const directory = filename.split('/')[0];
        if (directory && directory !== filename) {
            await ensureAnnouncementDirectoryExists(directory);
        }

        const base64Data = await announcementFileToBase64(imageFile);
        const base64Content = base64Data.split(',')[1]; // Remove data:image prefix

        const config = getAnnouncementGitHubConfig();
        const response = await fetch(`${config.baseUrl}/${filename}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Add announcement image: ${filename}`,
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

        console.log('Announcement image upload successful:', {
            filename,
            workingUrl
        });

        return workingUrl;
    } catch (error) {
        console.error('Error uploading announcement image to GitHub:', error);
        throw error;
    }
}

// Create directory in GitHub if it doesn't exist for announcements
async function ensureAnnouncementDirectoryExists(directory) {
    try {
        // Create a .gitkeep file in the directory to ensure it exists
        const gitkeepPath = `${directory}/.gitkeep`;

        // Check if directory already has files
        const config = getAnnouncementGitHubConfig();
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
                    message: `Create ${directory} directory for announcements`,
                    content: '' // Empty .gitkeep file
                })
            });

            if (!createResponse.ok) {
                console.warn(`Could not create directory ${directory}:`, createResponse.status);
            }
        }
    } catch (error) {
        console.warn('Error ensuring announcement directory exists:', error);
        // Don't throw - continue with upload attempt
    }
}

// Reset announcement images
function resetAnnouncementImages() {
    selectedAnnouncementImages = [];
    editingAnnouncementImages = [];

    const previewContainer = document.getElementById('announcementImagePreviews');
    if (previewContainer) previewContainer.innerHTML = '';

    const editPreviewContainer = document.getElementById('editAnnouncementImagePreviews');
    if (editPreviewContainer) editPreviewContainer.innerHTML = '';

    const fileInput = document.getElementById('announcementImageInput');
    if (fileInput) fileInput.value = '';

    const editFileInput = document.getElementById('editAnnouncementImageInput');
    if (editFileInput) editFileInput.value = '';
}

// Display announcement images in the main feed
function displayAnnouncementImages(images, container) {
    if (!images || images.length === 0) return;

    const imagesContainer = document.createElement('div');
    imagesContainer.className = `announcement-images ${getImageLayoutClass(images.length)}`;

    images.forEach((image, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'announcement-image';
        imageDiv.onclick = () => openAnnouncementImageModal(images, index);

        if (index === 3 && images.length > 4) {
            // Show count overlay for 4+ images
            const imgElement = document.createElement('img');
            imgElement.src = image.url;
            imgElement.alt = "Announcement image";
            imgElement.onerror = () => handleAnnouncementImageError(imgElement, image.url);
            imgElement.onload = () => {
                // Store the successful URL for modal use
                image.workingUrl = imgElement.src;
            };

            imageDiv.innerHTML = `
                <div class="image-count-overlay">+${images.length - 3}</div>
            `;
            imageDiv.insertBefore(imgElement, imageDiv.firstChild);
        } else if (index < 4) {
            const imgElement = document.createElement('img');
            imgElement.src = image.url;
            imgElement.alt = "Announcement image";
            imgElement.onerror = () => handleAnnouncementImageError(imgElement, image.url);
            imgElement.onload = () => {
                // Store the successful URL for modal use
                image.workingUrl = imgElement.src;
            };

            imageDiv.appendChild(imgElement);
        }

        if (index < 4) {
            imagesContainer.appendChild(imageDiv);
        }
    });

    container.appendChild(imagesContainer);
}

// Open announcement image modal with enhanced navigation and swipe support
function openAnnouncementImageModal(images, startIndex = 0) {
    // Use working URL if available, otherwise use original URL
    const currentImage = images[startIndex];
    const imageUrl = currentImage.workingUrl || currentImage.url;

    // Create modal for viewing announcement images
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeAnnouncementImageModal()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="closeAnnouncementImageModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="image-gallery-viewer" id="announcementImageViewer">
                <button class="gallery-nav gallery-prev" onclick="prevAnnouncementImage()" style="display: ${images.length > 1 ? 'flex' : 'none'}">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <img id="announcementModalImage" src="${imageUrl}" alt="Announcement image" class="modal-image"
                     onerror="handleAnnouncementImageError(this, '${currentImage.url}')">
                <button class="gallery-nav gallery-next" onclick="nextAnnouncementImage()" style="display: ${images.length > 1 ? 'flex' : 'none'}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="image-counter" style="display: ${images.length > 1 ? 'block' : 'none'}">
                <span id="announcementImageCounter">${startIndex + 1} / ${images.length}</span>
            </div>
        </div>
    `;

    // Store images and current index for navigation
    modal.announcementImages = images;
    modal.currentIndex = startIndex;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Add swipe gesture support
    if (images.length > 1) {
        setupAnnouncementSwipeGestures(modal);
    }

    // Add keyboard navigation
    setupAnnouncementKeyboardNavigation(modal);
}

// Close announcement image modal
function closeAnnouncementImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        // Remove event listeners before removing modal
        document.removeEventListener('keydown', modal.keydownHandler);
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Navigate to previous image
function prevAnnouncementImage() {
    const modal = document.querySelector('.image-modal');
    if (!modal || !modal.announcementImages) return;

    modal.currentIndex = modal.currentIndex > 0 ? modal.currentIndex - 1 : modal.announcementImages.length - 1;
    updateAnnouncementModalImage(modal);
}

// Navigate to next image
function nextAnnouncementImage() {
    const modal = document.querySelector('.image-modal');
    if (!modal || !modal.announcementImages) return;

    modal.currentIndex = modal.currentIndex < modal.announcementImages.length - 1 ? modal.currentIndex + 1 : 0;
    updateAnnouncementModalImage(modal);
}

// Update the image and counter in the modal
function updateAnnouncementModalImage(modal) {
    const img = document.getElementById('announcementModalImage');
    const counter = document.getElementById('announcementImageCounter');
    const currentImage = modal.announcementImages[modal.currentIndex];

    // Use working URL if available, otherwise use original URL
    const imageUrl = currentImage.workingUrl || currentImage.url;
    img.src = imageUrl;
    img.onerror = () => handleAnnouncementImageError(img, currentImage.url);

    if (counter) {
        counter.textContent = `${modal.currentIndex + 1} / ${modal.announcementImages.length}`;
    }
}

// Setup swipe gestures for announcement modal
function setupAnnouncementSwipeGestures(modal) {
    const imageViewer = modal.querySelector('#announcementImageViewer');
    if (!imageViewer) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    // Touch events for mobile
    imageViewer.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
    }, { passive: true });

    imageViewer.addEventListener('touchend', (e) => {
        if (!e.changedTouches.length) return;

        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const endTime = Date.now();

        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const deltaTime = endTime - startTime;

        // Check if it's a valid swipe (horizontal, fast enough, long enough)
        if (Math.abs(deltaX) > Math.abs(deltaY) &&
            Math.abs(deltaX) > minSwipeDistance &&
            deltaTime < maxSwipeTime) {

            if (deltaX > 0) {
                // Swipe right - previous image
                prevAnnouncementImage();
            } else {
                // Swipe left - next image
                nextAnnouncementImage();
            }
        }
    }, { passive: true });

    // Mouse events for desktop
    let isMouseDown = false;

    imageViewer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
        isMouseDown = true;
    });

    imageViewer.addEventListener('mouseup', (e) => {
        if (!isMouseDown) return;
        isMouseDown = false;

        const endX = e.clientX;
        const endY = e.clientY;
        const endTime = Date.now();

        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const deltaTime = endTime - startTime;

        // Check if it's a valid swipe (horizontal, fast enough, long enough)
        if (Math.abs(deltaX) > Math.abs(deltaY) &&
            Math.abs(deltaX) > minSwipeDistance &&
            deltaTime < maxSwipeTime) {

            if (deltaX > 0) {
                // Swipe right - previous image
                prevAnnouncementImage();
            } else {
                // Swipe left - next image
                nextAnnouncementImage();
            }
        }
    });

    imageViewer.addEventListener('mouseleave', () => {
        isMouseDown = false;
    });
}

// Setup keyboard navigation for announcement modal
function setupAnnouncementKeyboardNavigation(modal) {
    const keydownHandler = (e) => {
        // Only handle if this modal is open
        if (!document.querySelector('.image-modal')) return;

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                prevAnnouncementImage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextAnnouncementImage();
                break;
            case 'Escape':
                e.preventDefault();
                closeAnnouncementImageModal();
                break;
        }
    };

    // Store the handler on the modal so we can remove it later
    modal.keydownHandler = keydownHandler;
    document.addEventListener('keydown', keydownHandler);
}

// Handle announcement image loading errors
function handleAnnouncementImageError(img, originalUrl) {
    console.error('Announcement image failed to load:', originalUrl);

    // Try alternative URLs
    const config = getAnnouncementGitHubConfig();
    const filename = originalUrl.split('/').slice(-2).join('/'); // Get announcements/filename
    const alternativeUrls = [
        // Primary working format with ?raw=true
        `https://github.com/${config.username}/${config.repository}/blob/main/${filename}?raw=true`,
        // Standard raw GitHub URLs
        `https://raw.githubusercontent.com/${config.username}/${config.repository}/main/${filename}`,
        `https://github.com/${config.username}/${config.repository}/raw/main/${filename}`,
        // Try master branch alternatives
        `https://github.com/${config.username}/${config.repository}/blob/master/${filename}?raw=true`,
        `https://raw.githubusercontent.com/${config.username}/${config.repository}/master/${filename}`
    ];

    // Try each alternative URL
    let currentIndex = 0;
    const tryNextUrl = () => {
        if (currentIndex < alternativeUrls.length) {
            const nextUrl = alternativeUrls[currentIndex];
            console.log(`Trying alternative announcement image URL ${currentIndex + 1}:`, nextUrl);

            img.onerror = () => {
                currentIndex++;
                setTimeout(tryNextUrl, 1000); // Wait 1 second before trying next
            };

            img.src = nextUrl;
            currentIndex++;
        } else {
            // All alternatives failed, show placeholder
            console.error('All announcement image URLs failed, showing placeholder');
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
            img.alt = 'Image not found';
        }
    };

    // Start trying alternatives after a brief delay
    setTimeout(tryNextUrl, 1000);
}


// Expose functions and variables to global window object
window.getSelectedAnnouncementImages = () => selectedAnnouncementImages;
window.getEditingAnnouncementImages = () => editingAnnouncementImages;
window.uploadAnnouncementImages = uploadAnnouncementImages;
window.resetAnnouncementImages = resetAnnouncementImages;
window.displayAnnouncementImages = displayAnnouncementImages;
window.removeAnnouncementImage = removeAnnouncementImage;
window.removeEditAnnouncementImage = removeEditAnnouncementImage;
window.handleAnnouncementImageError = handleAnnouncementImageError;

// Make selectedAnnouncementImages accessible
Object.defineProperty(window, 'selectedAnnouncementImages', {
    get: () => selectedAnnouncementImages,
    set: (value) => { selectedAnnouncementImages = value; }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAnnouncementImages);