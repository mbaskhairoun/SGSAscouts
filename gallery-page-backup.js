// Gallery Page JavaScript - Enhanced with Navigation, Swipe, and Smart Sorting

// Firebase Configuration
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
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('Firebase initialized successfully for gallery');
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Try to get existing app
    try {
        database = firebase.app().database();
        console.log('Using existing Firebase app');
    } catch (err) {
        console.error('Could not initialize Firebase:', err);
    }
}

// Global variables
let galleryPhotos = [];
let filteredPhotos = [];
let currentGalleryFilter = 'all';
let currentSortOption = 'date-desc';
let currentModalIndex = 0;

// Touch/swipe handling
let startX = 0;
let startY = 0;
let isDragging = false;


// Global test function for debugging
window.debugGallery = function() {
    console.log('=== GALLERY DEBUG INFO ===');
    console.log('Firebase database:', !!database);
    console.log('Gallery photos:', galleryPhotos.length);
    console.log('Filtered photos:', filteredPhotos.length);
    console.log('Current filter:', currentGalleryFilter);
    console.log('Current sort:', currentSortOption);

    const filterBtns = document.querySelectorAll('.filter-btn');
    console.log('Filter buttons found:', filterBtns.length);

    filterBtns.forEach((btn, i) => {
        console.log(`Button ${i}:`, btn.getAttribute('data-category'), btn.classList.contains('active'));
    });

    return {
        database: !!database,
        photos: galleryPhotos.length,
        filtered: filteredPhotos.length,
        buttons: filterBtns.length
    };
};

// Force click test
window.testClick = function() {
    const firstBtn = document.querySelector('.filter-btn');
    if (firstBtn) {
        console.log('Simulating click on first filter button');
        firstBtn.click();
        return 'Click simulated';
    }
    return 'No button found';
};

// Force fix button overlay issues
window.fixButtons = function() {
    console.log('Forcing button fixes...');

    // Remove any overlaying elements
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
            if (style.zIndex && parseInt(style.zIndex) > 500) {
                console.log('Found high z-index element:', el, 'z-index:', style.zIndex);
            }
        }
    });

    // Force button styles
    const buttons = document.querySelectorAll('.filter-btn, .back-to-home, .nav-menu a');
    buttons.forEach((btn, i) => {
        btn.style.pointerEvents = 'auto';
        btn.style.position = 'relative';
        btn.style.zIndex = '999';
        btn.style.cursor = 'pointer';
        btn.style.userSelect = 'none';
        btn.style.backgroundColor = btn.classList.contains('active') ? '#1e40af' : '#f8f9fa';
        btn.style.border = '2px solid #e5e7eb';
        btn.style.padding = '0.75rem 1.5rem';
        btn.style.borderRadius = '8px';
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '0.5rem';
        btn.style.minHeight = '44px';
        btn.style.minWidth = '44px';
        console.log(`Fixed button ${i}:`, btn);
    });

    return `Fixed ${buttons.length} buttons`;
};

// Fix navigation specifically
window.fixNavigation = function() {
    console.log('Fixing navigation...');

    // Get all navigation links
    const allNavLinks = document.querySelectorAll('a[href]');
    console.log(`Found ${allNavLinks.length} links`);

    allNavLinks.forEach((link, i) => {
        // Force remove any overlays or blocking elements
        link.style.pointerEvents = 'auto';
        link.style.cursor = 'pointer';
        link.style.zIndex = '9999';
        link.style.position = 'relative';
        link.style.textDecoration = 'none';

        // Create a test click
        const testClick = function() {
            console.log(`Navigating to: ${link.href}`);
            window.location.href = link.href;
        };

        // Remove existing event listeners and add new one
        link.onclick = testClick;

        console.log(`Fixed link ${i}: ${link.href} - ${link.textContent.trim()}`);
    });

    return `Fixed ${allNavLinks.length} navigation links`;
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Gallery page loaded, initializing...');
    console.log('Call window.debugGallery() in console for debug info');
    console.log('Call window.testClick() to test button clicks');

    try {
        // Initialize in sequence with proper timing
        initializeMobileMenu();
        console.log('Mobile menu initialized');

        initializeGalleryControls();
        console.log('Gallery controls initialized');

        initializeModal();
        console.log('Modal initialized');

        // Force fix navigation immediately
        fixNavigationImmediately();

        // Wait a bit for Firebase to be ready
        setTimeout(() => {
            loadPhotoGallery();
            console.log('Photo gallery loading started');
        }, 500);

        // Force initialize buttons with direct event listeners as backup
        setTimeout(() => {
            console.log('Setting up backup button handlers...');
            setupBackupButtonHandlers();
            window.fixNavigation();
        }, 1000);

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Immediate navigation fix function
function fixNavigationImmediately() {
    console.log('Fixing navigation immediately...');

    // Remove any potential overlays
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        if (el.style.zIndex && parseInt(el.style.zIndex) > 1500) {
            el.style.zIndex = '1';
        }
    });

    // Fix all navigation links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.cursor = 'pointer';
        link.style.zIndex = '1001';
        link.style.position = 'relative';

        // Ensure click events work
        link.addEventListener('click', function(e) {
            console.log('Navigation clicked:', this.href);
            // Allow normal navigation
        }, {passive: true});
    });

    // Fix mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.style.pointerEvents = 'auto';
        mobileToggle.style.cursor = 'pointer';
        mobileToggle.style.zIndex = '1002';
    }
}

// Mobile Menu Functions (same as index.html)
function initializeMobileMenu() {
    console.log('Initializing mobile menu...');

    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-menu a');

    console.log('Mobile toggle found:', !!mobileToggle);
    console.log('Nav menu found:', !!navMenu);
    console.log('Nav links found:', navLinks.length);

    if (mobileToggle && navMenu) {
        // Clear any existing event listeners and add new ones
        mobileToggle.replaceWith(mobileToggle.cloneNode(true));
        const newMobileToggle = document.querySelector('.mobile-menu-toggle');

        newMobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile menu toggle clicked');
            toggleMobileMenu();
        });

        navLinks.forEach((link, index) => {
            console.log(`Nav link ${index}: ${link.href}`);

            // Force styles to make links clickable
            link.style.pointerEvents = 'auto';
            link.style.cursor = 'pointer';
            link.style.zIndex = '1001';
            link.style.position = 'relative';
            link.style.display = 'block';

            // Remove existing listeners and add new ones
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);

            newLink.addEventListener('click', function(e) {
                console.log('Nav link clicked:', this.href);
                closeMobileMenu();
                // Allow normal navigation - don't prevent default
            });
        });

        document.addEventListener('click', function(event) {
            if (!event.target.closest('.nav-container')) {
                closeMobileMenu();
            }
        });
    } else {
        console.error('Mobile menu elements not found');
    }
}

function toggleMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    mobileToggle.classList.toggle('active');
    navMenu.classList.toggle('active');

    if (navMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    mobileToggle.classList.remove('active');
    navMenu.classList.remove('active');
    document.body.style.overflow = '';
}

// Gallery Controls
function initializeGalleryControls() {
    console.log('Initializing gallery controls...');

    // Filter buttons - use more robust event handling
    const filterBtns = document.querySelectorAll('.filter-btn');
    console.log(`Found ${filterBtns.length} filter buttons`);

    filterBtns.forEach((btn, index) => {
        console.log(`Setting up filter button ${index}: ${btn.getAttribute('data-category')}`);

        // Ensure button is interactive
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '100';
        btn.style.position = 'relative';

        // Add multiple event types for better compatibility
        const handleFilterClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Filter button clicked:', btn.getAttribute('data-category'));

            // Update active filter
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentGalleryFilter = btn.getAttribute('data-category');
            console.log('New filter set to:', currentGalleryFilter);
            applyFiltersAndSort();
        };

        btn.addEventListener('click', handleFilterClick);
        btn.addEventListener('touchstart', handleFilterClick, {passive: false});
    });

    // Sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        console.log('Setting up sort dropdown');
        sortSelect.style.pointerEvents = 'auto';
        sortSelect.style.cursor = 'pointer';

        sortSelect.addEventListener('change', function() {
            console.log('Sort changed to:', this.value);
            currentSortOption = this.value;
            applyFiltersAndSort();
        });
    } else {
        console.error('Sort select element not found');
    }
}

// Load photo gallery from Firebase
async function loadPhotoGallery() {
    console.log('loadPhotoGallery called');

    if (!database) {
        console.error('Database not initialized');
        displayGallery();
        return;
    }

    try {
        console.log('Fetching photos from Firebase...');
        const galleryRef = database.ref('gallery/photos');
        const snapshot = await galleryRef.orderByChild('uploadDate').once('value');

        galleryPhotos = [];
        if (snapshot.exists()) {
            console.log('Photos found, processing...');
            snapshot.forEach(childSnapshot => {
                const photo = childSnapshot.val();
                if (photo.active) { // Only show active photos
                    galleryPhotos.push({
                        id: childSnapshot.key,
                        ...photo
                    });
                }
            });
            console.log(`Loaded ${galleryPhotos.length} active photos`);
        } else {
            console.log('No photos found in database');
        }

        applyFiltersAndSort();
    } catch (error) {
        console.error('Error loading gallery:', error);
        displayGallery();
    }
}

// Apply filters and sorting
function applyFiltersAndSort() {
    console.log('Applying filters and sorting...');

    // Filter photos
    filteredPhotos = galleryPhotos.filter(photo => {
        if (currentGalleryFilter === 'all') return true;
        return photo.category === currentGalleryFilter;
    });

    console.log(`Filtered photos: ${filteredPhotos.length} (filter: ${currentGalleryFilter})`);

    // Sort photos
    filteredPhotos.sort((a, b) => {
        switch (currentSortOption) {
            case 'date-desc':
                return (b.uploadDate || 0) - (a.uploadDate || 0);
            case 'date-asc':
                return (a.uploadDate || 0) - (b.uploadDate || 0);
            case 'title-asc':
                return smartTitleSort(a.title, b.title);
            case 'title-desc':
                return smartTitleSort(b.title, a.title);
            default:
                return 0;
        }
    });

    console.log(`Sorted photos by: ${currentSortOption}`);
    displayGallery();
}

// Smart title sorting that handles numbered titles from multiple uploads
function smartTitleSort(titleA, titleB) {
    // Extract base title and number for comparison
    const parseTitle = (title) => {
        // Handle titles like "Event Name - 1", "Event Name - 2", etc.
        const match = title.match(/^(.+?)\s*-\s*(\d+)$/);
        if (match) {
            return {
                base: match[1].trim(),
                number: parseInt(match[2]),
                hasNumber: true
            };
        }
        return {
            base: title,
            number: 0,
            hasNumber: false
        };
    };

    const parsedA = parseTitle(titleA);
    const parsedB = parseTitle(titleB);

    // First compare base titles
    const baseComparison = parsedA.base.localeCompare(parsedB.base, undefined, {
        numeric: true,
        sensitivity: 'base'
    });

    if (baseComparison !== 0) {
        return baseComparison;
    }

    // If base titles are the same, compare numbers
    if (parsedA.hasNumber && parsedB.hasNumber) {
        return parsedA.number - parsedB.number;
    }

    // If only one has a number, prioritize the one without number
    if (parsedA.hasNumber && !parsedB.hasNumber) return 1;
    if (!parsedA.hasNumber && parsedB.hasNumber) return -1;

    // Both don't have numbers, do normal string comparison
    return titleA.localeCompare(titleB, undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}

// Display gallery
function displayGallery() {
    console.log('displayGallery called');
    const galleryGrid = document.getElementById('galleryGrid');

    if (!galleryGrid) {
        console.error('Gallery grid element not found!');
        return;
    }

    console.log(`Displaying ${filteredPhotos?.length || 0} photos`);

    if (!filteredPhotos || filteredPhotos.length === 0) {
        galleryGrid.innerHTML = `
            <div class="gallery-empty">
                <i class="fas fa-images"></i>
                <h3>No Photos Found</h3>
                <p>No photos match your current filter selection.</p>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = filteredPhotos.map((photo, index) => {
        const uploadDate = new Date(photo.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="gallery-item" data-category="${photo.category}">
                <div class="gallery-image-container">
                    <img src="${photo.githubUrl}" alt="${photo.title}" class="gallery-image" loading="lazy"
                         onerror="handleImageError(this, '${photo.githubUrl}')">
                    <div class="gallery-overlay">
                        <div class="gallery-info">
                            <h4 class="gallery-title">${photo.title}</h4>
                            <p class="gallery-description">${photo.description}</p>
                            <span class="gallery-date">
                                <i class="fas fa-calendar"></i>
                                ${uploadDate}
                            </span>
                        </div>
                        <button class="gallery-expand" onclick="window.openImageModal(${index})">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Handle image loading errors
function handleImageError(img, originalUrl) {
    console.error('Image failed to load:', originalUrl);

    // Try alternative URLs
    const filename = originalUrl.split('/').slice(-2).join('/');
    const alternativeUrls = [
        `https://raw.githubusercontent.com/mbaskhairoun/SGSA-Pics/main/${filename}`,
        `https://github.com/mbaskhairoun/SGSA-Pics/raw/main/${filename}`,
        `https://github.com/mbaskhairoun/SGSA-Pics/blob/master/${filename}?raw=true`,
        `https://raw.githubusercontent.com/mbaskhairoun/SGSA-Pics/master/${filename}`
    ];

    let currentIndex = 0;
    const tryNextUrl = () => {
        if (currentIndex < alternativeUrls.length) {
            const nextUrl = alternativeUrls[currentIndex];

            img.onerror = () => {
                currentIndex++;
                setTimeout(tryNextUrl, 1000);
            };

            img.src = nextUrl;
            currentIndex++;
        } else {
            // Show placeholder
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
            img.alt = 'Image not found';
        }
    };

    setTimeout(tryNextUrl, 1000);
}

// Modal functionality
function initializeModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // Close modal events
    closeBtn.addEventListener('click', window.closeImageModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            window.closeImageModal();
        }
    });

    // Navigation events
    prevBtn.addEventListener('click', window.showPreviousImage);
    nextBtn.addEventListener('click', window.showNextImage);

    // Keyboard events
    document.addEventListener('keydown', function(e) {
        if (!modal.classList.contains('show')) return;

        switch(e.key) {
            case 'Escape':
                window.closeImageModal();
                break;
            case 'ArrowLeft':
                window.showPreviousImage();
                break;
            case 'ArrowRight':
                window.showNextImage();
                break;
        }
    });

    // Fullscreen toggle
    fullscreenBtn.addEventListener('click', window.toggleFullscreen);

    // Touch/swipe events
    modal.addEventListener('touchstart', handleTouchStart, { passive: true });
    modal.addEventListener('touchmove', handleTouchMove, { passive: true });
    modal.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse drag events for desktop
    modal.addEventListener('mousedown', handleMouseDown);
    modal.addEventListener('mousemove', handleMouseMove);
    modal.addEventListener('mouseup', handleMouseUp);
    modal.addEventListener('mouseleave', handleMouseUp);
}

// Open image modal - make it globally accessible
window.openImageModal = function(index) {
    const modal = document.getElementById('imageModal');
    currentModalIndex = index;

    updateModalContent();
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
};

// Close image modal - make it globally accessible
window.closeImageModal = function() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';

    // Reset fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
};

// Update modal content
function updateModalContent() {
    if (!filteredPhotos[currentModalIndex]) return;

    const photo = filteredPhotos[currentModalIndex];
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalCounter = document.getElementById('modalCounter');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Update image and info
    modalImage.src = photo.githubUrl;
    modalImage.alt = photo.title;
    modalTitle.textContent = photo.title;
    modalDescription.textContent = photo.description || 'No description available';
    modalCounter.textContent = `${currentModalIndex + 1} / ${filteredPhotos.length}`;

    // Update navigation buttons
    prevBtn.disabled = currentModalIndex === 0;
    nextBtn.disabled = currentModalIndex === filteredPhotos.length - 1;

    // Handle image error in modal
    modalImage.onerror = () => handleImageError(modalImage, photo.githubUrl);
}

// Navigation functions - make them globally accessible
window.showPreviousImage = function() {
    if (currentModalIndex > 0) {
        currentModalIndex--;
        updateModalContent();
        showSwipeIndicator('left');
    }
};

window.showNextImage = function() {
    if (currentModalIndex < filteredPhotos.length - 1) {
        currentModalIndex++;
        updateModalContent();
        showSwipeIndicator('right');
    }
};

// Show swipe indicator
function showSwipeIndicator(direction) {
    const indicator = document.getElementById(direction === 'left' ? 'swipeLeft' : 'swipeRight');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 500);
}

// Touch/Swipe handling
function handleTouchStart(e) {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    isDragging = true;
}

function handleTouchMove(e) {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Prevent scrolling if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    if (!isDragging) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Check if it's a horizontal swipe (minimum distance and dominant direction)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            // Swipe right - previous image
            window.showPreviousImage();
        } else {
            // Swipe left - next image
            window.showNextImage();
        }
    }

    isDragging = false;
}

// Mouse drag handling (for desktop)
function handleMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;
}

function handleMouseMove(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Visual feedback for drag
    if (Math.abs(deltaX) > 10) {
        document.body.style.cursor = deltaX > 0 ? 'w-resize' : 'e-resize';
    }
}

function handleMouseUp(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Check if it's a horizontal drag
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            window.showPreviousImage();
        } else {
            window.showNextImage();
        }
    }

    isDragging = false;
    document.body.style.cursor = '';
}

// Fullscreen toggle - make it globally accessible
window.toggleFullscreen = function() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const icon = fullscreenBtn.querySelector('i');

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            icon.className = 'fas fa-compress';
            fullscreenBtn.title = 'Exit Fullscreen';
        });
    } else {
        document.exitFullscreen().then(() => {
            icon.className = 'fas fa-expand';
            fullscreenBtn.title = 'Toggle Fullscreen';
        });
    }
};

// Handle fullscreen change events
document.addEventListener('fullscreenchange', function() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const icon = fullscreenBtn.querySelector('i');

    if (!document.fullscreenElement) {
        icon.className = 'fas fa-expand';
        fullscreenBtn.title = 'Toggle Fullscreen';
    }
});

// Backup button handlers
function setupBackupButtonHandlers() {
    console.log('Setting up backup button handlers...');

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    console.log(`Found ${filterBtns.length} filter buttons for backup setup`);

    filterBtns.forEach((btn, index) => {
        console.log(`Setting up backup handler for button ${index}`);

        // Remove existing listeners and add new ones
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';

        // Create new click handler
        const clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('BACKUP: Filter button clicked:', btn.getAttribute('data-category'));

            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update filter
            currentGalleryFilter = btn.getAttribute('data-category');
            console.log('BACKUP: Filter changed to:', currentGalleryFilter);

            // Apply filter
            applyFiltersAndSort();
        };

        // Add multiple event types to ensure it works
        btn.addEventListener('click', clickHandler, true);
        btn.addEventListener('mousedown', clickHandler, true);

        // Also add touch events for mobile
        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            clickHandler(e);
        }, true);
    });

    // Sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        console.log('Setting up backup sort handler');
        sortSelect.addEventListener('change', function() {
            console.log('BACKUP: Sort changed to:', this.value);
            currentSortOption = this.value;
            applyFiltersAndSort();
        }, true);
    }

    // Navigation links - force them to be clickable
    const navLinks = document.querySelectorAll('.nav-menu a, .back-to-home');
    navLinks.forEach((link, index) => {
        console.log(`Setting up nav link ${index}: ${link.href}`);

        // Force link styles
        link.style.cursor = 'pointer';
        link.style.pointerEvents = 'auto';
        link.style.zIndex = '1000';
        link.style.position = 'relative';
        link.style.display = 'inline-flex';
        link.style.alignItems = 'center';

        // Remove any event listeners that might prevent navigation
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        // Add simple click handler that allows navigation
        newLink.addEventListener('click', function(e) {
            console.log('Navigation link clicked:', this.href);
            // Don't prevent default - allow normal navigation
        });
    });

    console.log('Backup handlers setup complete');
}

// Prevent image dragging
document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});