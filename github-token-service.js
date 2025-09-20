// GitHub Token Service - Fetches token from Firebase Realtime Database
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Firebase configuration
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

// Initialize Firebase app for this service
const app = initializeApp(firebaseConfig, 'github-token-service');

class GitHubTokenService {
    constructor() {
        this.cachedToken = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    async getToken() {
        // Return cached token if still valid
        if (this.cachedToken && this.isCacheValid()) {
            return this.cachedToken;
        }

        try {
            // Fetch token from Firebase Realtime Database
            const database = getDatabase(app);
            const tokenRef = ref(database, 'config/github/token');
            const snapshot = await get(tokenRef);

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

// Export singleton instance
export const githubTokenService = new GitHubTokenService();

// Make it globally available for non-module scripts
window.githubTokenService = githubTokenService;