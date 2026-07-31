/**
 * iRAM Scopus - Pageview Analytics Tracker
 * Automatically tracks page views and sends them to the Cloudflare API.
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 1. Generate or Retrieve Session ID
        let sessionId = sessionStorage.getItem('iram_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            sessionStorage.setItem('iram_session_id', sessionId);
        }

        // 2. Gather Data
        const domain = window.location.hostname || 'localhost';
        const path = window.location.pathname || '/';
        const userAgent = navigator.userAgent;

        // 3. Send Analytics Data
        const API_URL = 'https://iram-backend.tinnakornh.workers.dev/api/analytics/view';
        
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domain: domain,
                path: path,
                sessionId: sessionId,
                userAgent: userAgent
            })
        }).catch(err => console.warn('Analytics tracking failed:', err));
    } catch (e) {
        console.warn('Analytics initialization failed:', e);
    }
});
