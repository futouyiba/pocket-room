/**
 * Background Service Worker for Pocket Room Extension
 * 
 * This service worker handles:
 * - Communication between content script and web app
 * - Authentication state management
 * - Content capture and storage
 */

// Configuration
const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000';
const API_ENDPOINT = `${WEB_APP_URL}/api/extension/capture`;

interface CapturePayload {
  content: string;
  sourceTitle: string;
  sourceUrl: string;
  timestamp: string;
}

interface StoredAuth {
  accessToken: string;
  expiresAt: number;
}

/**
 * Get stored authentication token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get('auth');
    const auth = result.auth as StoredAuth | undefined;
    
    if (!auth || !auth.accessToken) {
      return null;
    }
    
    // Check if token is expired
    if (auth.expiresAt && Date.now() > auth.expiresAt) {
      // Token expired, clear it
      await chrome.storage.local.remove('auth');
      return null;
    }
    
    return auth.accessToken;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * Send captured content to web app
 */
async function sendToWebApp(payload: CapturePayload): Promise<{ success: boolean; error?: string }> {
  try {
    // Check authentication
    const token = await getAuthToken();
    
    if (!token) {
      return {
        success: false,
        error: 'Please log in to Pocket Room first',
      };
    }
    
    // Send to web app API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid, clear it
        await chrome.storage.local.remove('auth');
        return {
          success: false,
          error: 'Session expired. Please log in again',
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || 'Failed to save content',
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send to web app:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection',
    };
  }
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_CONTENT') {
    // Handle content capture
    const payload = message.payload as CapturePayload;
    
    sendToWebApp(payload).then((result) => {
      sendResponse(result);
    });
    
    // Return true to indicate async response
    return true;
  }
  
  if (message.type === 'CHECK_AUTH') {
    // Check authentication status
    isAuthenticated().then((authenticated) => {
      sendResponse({ authenticated });
    });
    
    return true;
  }
  
  if (message.type === 'SET_AUTH') {
    // Store authentication token
    const { accessToken, expiresIn } = message.payload;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    chrome.storage.local.set({
      auth: { accessToken, expiresAt },
    }).then(() => {
      sendResponse({ success: true });
    });
    
    return true;
  }
  
  if (message.type === 'CLEAR_AUTH') {
    // Clear authentication
    chrome.storage.local.remove('auth').then(() => {
      sendResponse({ success: true });
    });
    
    return true;
  }
  
  return false;
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Pocket Room extension installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: `${WEB_APP_URL}/extension/welcome`,
    });
  } else if (details.reason === 'update') {
    console.log('Pocket Room extension updated');
  }
});

/**
 * Handle browser action click (when popup is not available)
 */
chrome.action.onClicked.addListener((tab) => {
  // This will only fire if no popup is set
  // Currently we have a popup, so this won't be called
  console.log('Extension icon clicked', tab);
});

console.log('Pocket Room background service worker loaded');
