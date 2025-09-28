// Simple Gallery Page JavaScript

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
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    try {
        database = firebase.app().database();
        console.log('Using existing Firebase app');
    } catch (err) {
        console.error('Could not initialize Firebase:', err);
    }
}

// Global variables
let allPhotos = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let currentModalIndex = 0;
let filteredPhotos = [];

// Touch/swipe variables
let startX = 0;
let startY = 0;
let isDragging = false;

// Mobile Menu Functions
function toggleMobileMenu() {
    console.log('Toggle mobile menu clicked');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.classList.toggle('active');
        navMenu.classList.toggle('active');

        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Gallery Filter Function
function filterGallery(category) {
    console.log('Filter clicked:', category);

    // Update active button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));

    // Find and activate the clicked button
    filterButtons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(`'${category}'`)) {
            btn.classList.add('active');
        }
    });

    currentFilter = category;
    displayGallery();
}

// Gallery Sort Function
function sortGallery(sortType) {
    console.log('Sort changed to:', sortType);
    currentSort = sortType;
    displayGallery();
}

// Load Photos from Firebase
async function loadPhotos() {
    console.log('Loading photos from Firebase...');

    if (!database) {
        console.error('Database not available');
        showEmptyGallery();
        return;
    }

    try {
        const galleryRef = database.ref('gallery/photos');
        const snapshot = await galleryRef.orderByChild('uploadDate').once('value');

        allPhotos = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const photo = childSnapshot.val();
                if (photo.active) {
                    allPhotos.push({
                        id: childSnapshot.key,
                        ...photo
                    });
                }
            });
            console.log(`Loaded ${allPhotos.length} photos`);
        } else {
            console.log('No photos found');
        }

        displayGallery();
    } catch (error) {
        console.error('Error loading photos:', error);
        showEmptyGallery();
    }
}

// Display Gallery
function displayGallery() {
    console.log('Displaying gallery with filter:', currentFilter, 'sort:', currentSort);

    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) {
        console.error('Gallery grid not found');
        return;
    }

    // Filter photos
    filteredPhotos = allPhotos;
    if (currentFilter !== 'all') {
        filteredPhotos = allPhotos.filter(photo => photo.category === currentFilter);
    }

    // Sort photos
    filteredPhotos.sort((a, b) => {
        switch (currentSort) {
            case 'date-desc':
                return (b.uploadDate || 0) - (a.uploadDate || 0);
            case 'date-asc':
                return (a.uploadDate || 0) - (b.uploadDate || 0);
            case 'title-asc':
                return (a.title || '').localeCompare(b.title || '');
            case 'title-desc':
                return (b.title || '').localeCompare(a.title || '');
            default:
                return 0;
        }
    });

    // Display photos
    if (filteredPhotos.length === 0) {
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
                    <img src="${photo.githubUrl}" alt="${photo.title}" class="gallery-image"
                         loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='">
                    <div class="gallery-overlay">
                        <div class="gallery-info">
                            <h4 class="gallery-title">${photo.title}</h4>
                            <p class="gallery-description">${photo.description || 'No description'}</p>
                            <span class="gallery-date">
                                <i class="fas fa-calendar"></i>
                                ${uploadDate}
                            </span>
                        </div>
                    </div>
                    <button class="gallery-expand" onclick="openModal(${index})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Show empty gallery
function showEmptyGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div class="gallery-empty">
                <i class="fas fa-images"></i>
                <h3>No Photos Available</h3>
                <p>Photos will appear here when they are uploaded.</p>
            </div>
        `;
    }
}

// Modal Functions
function openModal(index) {
    console.log('Opening modal for image:', index);

    if (!filteredPhotos || filteredPhotos.length === 0) {
        console.error('No photos available');
        return;
    }

    currentModalIndex = index;
    updateModalContent();

    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Add touch event listeners for swipe
        modal.addEventListener('touchstart', handleTouchStart, {passive: true});
        modal.addEventListener('touchmove', handleTouchMove, {passive: false});
        modal.addEventListener('touchend', handleTouchEnd, {passive: true});
    }
}

function updateModalContent() {
    if (!filteredPhotos[currentModalIndex]) return;

    const photo = filteredPhotos[currentModalIndex];
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (modalImage && modalCounter) {
        modalImage.src = photo.githubUrl;
        modalImage.alt = photo.title;
        modalCounter.textContent = `${currentModalIndex + 1} / ${filteredPhotos.length}`;

        // Update navigation buttons
        if (prevBtn) {
            prevBtn.disabled = currentModalIndex === 0;
            prevBtn.style.opacity = currentModalIndex === 0 ? '0.5' : '1';
        }

        if (nextBtn) {
            nextBtn.disabled = currentModalIndex === filteredPhotos.length - 1;
            nextBtn.style.opacity = currentModalIndex === filteredPhotos.length - 1 ? '0.5' : '1';
        }
    }
}

function previousImage() {
    if (currentModalIndex > 0) {
        currentModalIndex--;
        updateModalContent();
        console.log('Previous image:', currentModalIndex);
    }
}

function nextImage() {
    if (currentModalIndex < filteredPhotos.length - 1) {
        currentModalIndex++;
        updateModalContent();
        console.log('Next image:', currentModalIndex);
    }
}

function closeModal(event) {
    // Only close if clicking on the modal background or close button
    if (!event || event.target.id === 'imageModal' || event.target.closest('.modal-close')) {
        console.log('Closing modal');

        const modal = document.getElementById('imageModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';

            // Remove touch event listeners
            modal.removeEventListener('touchstart', handleTouchStart);
            modal.removeEventListener('touchmove', handleTouchMove);
            modal.removeEventListener('touchend', handleTouchEnd);
        }
    }
}

// Touch/Swipe handling functions
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
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
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
            previousImage();
        } else {
            // Swipe left - next image
            nextImage();
        }
    }

    isDragging = false;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Gallery page loaded');

    // Load photos after a short delay to ensure Firebase is ready
    setTimeout(() => {
        loadPhotos();
    }, 500);

    // Handle keyboard navigation
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('imageModal');
        if (modal && modal.classList.contains('show')) {
            switch(e.key) {
                case 'Escape':
                    closeModal();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    previousImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextImage();
                    break;
            }
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        const navContainer = document.querySelector('.nav-container');
        const navMenu = document.getElementById('navMenu');

        if (navMenu && navMenu.classList.contains('active') &&
            !navContainer.contains(event.target)) {
            toggleMobileMenu();
        }
    });
});

// Debug function
window.debugGallery = function() {
    console.log('=== GALLERY DEBUG ===');
    console.log('Database available:', !!database);
    console.log('Total photos:', allPhotos.length);
    console.log('Current filter:', currentFilter);
    console.log('Current sort:', currentSort);
    console.log('Photos:', allPhotos);
    return {
        database: !!database,
        photos: allPhotos.length,
        filter: currentFilter,
        sort: currentSort
    };
};