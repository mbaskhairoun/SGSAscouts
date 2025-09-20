// GitHub Token Service - Compatible with Firebase v8 compat SDK

class GitHubTokenServiceCompat {
    constructor() {
        this.cachedToken = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.initialized = false;

        // Wait for Firebase to be available
        this.waitForFirebase();
    }

    async waitForFirebase() {
        // Wait for Firebase database to be available
        const maxAttempts = 50;
        let attempts = 0;

        while (!window.database && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.database) {
            this.initialized = true;
        } else {
            console.error('GitHub Token Service failed to initialize - Firebase database not available');
        }
    }

    async getToken() {
        // Wait for initialization
        if (!this.initialized) {
            await this.waitForFirebase();
        }

        if (!this.initialized) {
            console.error('GitHub Token Service not initialized');
            return null;
        }

        // Return cached token if still valid
        if (this.cachedToken && this.isCacheValid()) {
            return this.cachedToken;
        }

        try {
            // Fetch token from Firebase Realtime Database using compat SDK
            const snapshot = await window.database.ref('config/github/token').once('value');

            if (snapshot.exists()) {
                this.cachedToken = snapshot.val();
                this.cacheTimestamp = Date.now();
                return this.cachedToken;
            } else {
                console.error('GitHub token not found in Firebase Realtime Database');
                return null;
            }
        } catch (error) {
            console.error('Error fetching GitHub token from Firebase:', error);
            return null;
        }
    }

    isCacheValid() {
        return this.cacheTimestamp &&
               (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
    }

    clearCache() {
        this.cachedToken = null;
        this.cacheTimestamp = null;
    }
}

// Create singleton instance
const githubTokenServiceCompat = new GitHubTokenServiceCompat();

// Make it globally available
window.githubTokenService = githubTokenServiceCompat;