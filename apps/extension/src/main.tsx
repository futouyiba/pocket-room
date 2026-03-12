import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  const [selection, setSelection] = useState<string>('');
  const [sourceTitle, setSourceTitle] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'capturing' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check authentication status
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
      setIsAuthenticated(response?.authenticated || false);
    });

    // Check if running in extension context
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          setSourceTitle(tab.title || '');
          setSourceUrl(tab.url || '');
          
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || ''
          }, (results) => {
            if (results && results[0]) {
              setSelection(results[0].result as string);
            }
          });
        }
      });
    } else {
      // Dev Mock
      setSelection("This is a mock selection for testing the UI without the browser API.");
      setSourceTitle("Mock Article Title");
      setSourceUrl("https://example.com/article");
      setIsAuthenticated(true);
    }
  }, []);

  const handleSave = () => {
    if (!selection) return;

    setStatus('capturing');
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'CAPTURE_CONTENT',
      payload: {
        content: selection,
        sourceTitle,
        sourceUrl,
        timestamp: new Date().toISOString(),
      },
    }, (response) => {
      if (response?.success) {
        setStatus('saved');
      } else {
        setStatus('error');
        setErrorMessage(response?.error || 'Failed to save content');
      }
    });
  };

  const handleOpenWebApp = () => {
    const webAppUrl = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000';
    chrome.tabs.create({ url: webAppUrl });
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 w-[320px] bg-orange-50 h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-4xl">
          🔒
        </div>
        <h2 className="font-bold text-lg mb-2 text-orange-900">Login Required</h2>
        <p className="text-sm text-orange-700 mb-6">Please log in to Pocket Room to capture content.</p>
        <button 
          onClick={handleOpenWebApp}
          className="bg-orange-600 text-white px-6 py-2 rounded-full font-medium hover:bg-orange-700 w-full"
        >
          Open Pocket Room
        </button>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="p-4 w-[320px] bg-green-50 h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
          ✓
        </div>
        <h2 className="font-bold text-lg mb-2 text-green-800">Saved to Pocket</h2>
        <p className="text-sm text-green-700 mb-6">This snippet is now available in your Pocket basket.</p>
        <button 
          onClick={() => window.close()}
          className="bg-green-600 text-white px-6 py-2 rounded-full font-medium hover:bg-green-700 w-full"
        >
          Close
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 w-[320px] bg-red-50 h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
          ✕
        </div>
        <h2 className="font-bold text-lg mb-2 text-red-800">Failed to Save</h2>
        <p className="text-sm text-red-700 mb-6">{errorMessage}</p>
        <div className="flex gap-2 w-full">
          <button 
            onClick={() => setStatus('idle')}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-full font-medium hover:bg-red-700"
          >
            Try Again
          </button>
          <button 
            onClick={() => window.close()}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-medium hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] bg-white h-auto min-h-[400px] flex flex-col">
      <header className="p-4 border-b bg-orange-50 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-orange-900">
          <span>📚</span> Pocket Room
        </div>
      </header>
      
      <main className="flex-1 p-4 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Source</label>
          <div className="text-sm font-medium truncate" title={sourceTitle}>{sourceTitle || 'Unknown Page'}</div>
          <div className="text-xs text-gray-400 truncate">{sourceUrl}</div>
        </div>

        <div className="flex-1 flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Selection</label>
          <div className="flex-1 bg-gray-50 border rounded-lg p-3 text-sm italic text-gray-600 overflow-y-auto max-h-[180px]">
            "{selection || 'No text selected. Highlight some text on the page first.'}"
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!selection || status === 'capturing'}
          className={`w-full py-3 rounded-lg font-bold shadow-sm transition flex items-center justify-center gap-2 ${
            selection && status !== 'capturing'
              ? 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {status === 'capturing' ? 'Saving...' : 'Save to Pocket'}
        </button>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
