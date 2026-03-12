/**
 * Content Script for Pocket Room Extension
 * 
 * This script runs on all web pages and handles:
 * - Text selection detection
 * - "Send to Pocket Room" button display
 * - Communication with background service worker
 */

// State
let selectionButton: HTMLElement | null = null;
let currentSelection: string = '';

/**
 * Create and show the "Send to Pocket Room" button
 */
function showSelectionButton(x: number, y: number) {
  // Remove existing button if any
  hideSelectionButton();

  // Create button
  const button = document.createElement('div');
  button.id = 'pocket-room-selection-button';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
    <span>Send to Pocket Room</span>
  `;
  
  // Style the button
  Object.assign(button.style, {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: '999999',
    backgroundColor: '#ea580c',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'all 0.2s ease',
  });

  // Add hover effect
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#c2410c';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#ea580c';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  });

  // Handle click
  button.addEventListener('click', handleSendToPocket);

  // Add to page
  document.body.appendChild(button);
  selectionButton = button;
}

/**
 * Hide the selection button
 */
function hideSelectionButton() {
  if (selectionButton) {
    selectionButton.remove();
    selectionButton = null;
  }
}

/**
 * Handle text selection
 */
function handleSelection() {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (selectedText && selectedText.length > 0) {
    currentSelection = selectedText;
    
    // Get selection position
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    
    if (rect) {
      // Position button below the selection
      const x = rect.left + window.scrollX;
      const y = rect.bottom + window.scrollY + 8;
      showSelectionButton(x, y);
    }
  } else {
    hideSelectionButton();
    currentSelection = '';
  }
}

/**
 * Handle "Send to Pocket Room" button click
 */
async function handleSendToPocket() {
  if (!currentSelection) return;

  // Get page metadata
  const pageTitle = document.title;
  const pageUrl = window.location.href;

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'CAPTURE_CONTENT',
    payload: {
      content: currentSelection,
      sourceTitle: pageTitle,
      sourceUrl: pageUrl,
      timestamp: new Date().toISOString(),
    },
  }, (response) => {
    if (response?.success) {
      // Show success feedback
      showSuccessFeedback();
    } else {
      // Show error feedback
      showErrorFeedback(response?.error || 'Failed to save content');
    }
  });

  // Hide button immediately
  hideSelectionButton();
  currentSelection = '';
}

/**
 * Show success feedback
 */
function showSuccessFeedback() {
  const toast = document.createElement('div');
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>Saved to Pocket Room</span>
  `;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    backgroundColor: '#16a34a',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    animation: 'slideIn 0.3s ease',
  });

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show error feedback
 */
function showErrorFeedback(message: string) {
  const toast = document.createElement('div');
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  document.body.appendChild(toast);

  // Remove after 4 seconds
  setTimeout(() => toast.remove(), 4000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Listen for text selection
document.addEventListener('mouseup', () => {
  // Small delay to ensure selection is complete
  setTimeout(handleSelection, 10);
});

// Hide button when clicking outside
document.addEventListener('mousedown', (e) => {
  if (selectionButton && !selectionButton.contains(e.target as Node)) {
    hideSelectionButton();
  }
});

// Hide button on scroll
document.addEventListener('scroll', () => {
  hideSelectionButton();
});

console.log('Pocket Room content script loaded');
