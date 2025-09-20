// GitHub API Helper with Firebase token integration
import { githubTokenService } from './github-token-service.js';

// Get GitHub token and make authenticated request
export async function makeGitHubRequest(url, options = {}) {
    const token = await githubTokenService.getToken();

    if (!token) {
        throw new Error('GitHub token not available');
    }

    const headers = {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    return fetch(url, {
        ...options,
        headers
    });
}

// Check if GitHub token is available
export async function isGitHubTokenAvailable() {
    try {
        const token = await githubTokenService.getToken();
        return token !== null && token !== '' && token !== 'your-github-token-here';
    } catch (error) {
        console.error('Error checking GitHub token availability:', error);
        return false;
    }
}

// Get current token (for compatibility with existing code)
export async function getGitHubToken() {
    return await githubTokenService.getToken();
}