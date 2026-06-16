/**
 * GitHub OAuth shared module — security-hardened.
 * Loaded via <script src> in Layout.astro, attaches to window.
 */
(function() {
  'use strict';

  var GITHUB_CLIENT_ID = 'Ov23liGMe0MVlrDtZ07h';
  var GITHUB_REDIRECT_URI = 'https://small-rice-5955.me-d1b.workers.dev/callback';
  var GITHUB_API = 'https://api.github.com';
  var STORAGE_KEY_TOKEN = 'gh_token';
  var STORAGE_KEY_USER = 'gh_user';
  var STORAGE_KEY_STATE = 'gh_oauth_state';

  // --- Token management (sessionStorage) ---
  function getGitHubToken() {
    return sessionStorage.getItem(STORAGE_KEY_TOKEN);
  }
  function setGitHubToken(token) {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
  }
  function clearGitHubToken() {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_USER);
    sessionStorage.removeItem(STORAGE_KEY_STATE);
  }
  function getGitHubUser() {
    try {
      var s = sessionStorage.getItem(STORAGE_KEY_USER);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
  function setGitHubUser(user) {
    sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }

  // --- OAuth flow with state parameter ---
  function generateState() {
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function loginWithGitHub() {
    var state = generateState();
    sessionStorage.setItem(STORAGE_KEY_STATE, state);
    var authUrl = 'https://github.com/login/oauth/authorize'
      + '?client_id=' + GITHUB_CLIENT_ID
      + '&redirect_uri=' + encodeURIComponent(GITHUB_REDIRECT_URI)
      + '&scope=' + encodeURIComponent('public_repo')
      + '&state=' + state;
    window.location.href = authUrl;
  }

  function logoutGitHub() {
    clearGitHubToken();
    updateLoginUI();
    window.location.reload();
  }

  // --- UI update with null checks ---
  function updateLoginUI() {
    var token = getGitHubToken();
    var user = getGitHubUser();
    var loginBtn = document.getElementById('github-login-btn');
    var userInfo = document.getElementById('github-user-info');
    if (!loginBtn || !userInfo) return;

    if (token && user) {
      loginBtn.style.display = 'none';
      userInfo.style.display = 'inline-flex';
      var avatar = document.getElementById('github-avatar');
      var username = document.getElementById('github-username');
      if (avatar) avatar.src = user.avatar_url || '';
      if (username) username.textContent = user.login || '';
    } else {
      loginBtn.style.display = 'inline-flex';
      userInfo.style.display = 'none';
    }
  }

  // --- OAuth callback with state verification ---
  function handleOAuthCallback() {
    var hash = window.location.hash;
    if (!hash || hash.indexOf('#token=') !== 0) return;

    var params = new URLSearchParams(hash.substring(1));
    var token = params.get('token');
    var returnedState = params.get('state');

    // Verify state parameter (CSRF protection)
    var savedState = sessionStorage.getItem(STORAGE_KEY_STATE);
    if (savedState && returnedState !== savedState) {
      console.error('[OAuth] State mismatch — possible CSRF attack');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return;
    }
    sessionStorage.removeItem(STORAGE_KEY_STATE);

    if (!token) return;

    setGitHubToken(token);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    // Fetch user info
    fetch(GITHUB_API + '/user', {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
      },
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to fetch user info');
      return res.json();
    })
    .then(function(user) {
      setGitHubUser(user);
      updateLoginUI();
      if (typeof window.loadAllReactions === 'function') window.loadAllReactions();
    })
    .catch(function(err) {
      console.error('[OAuth] User info error:', err);
      updateLoginUI();
    });
  }

  // Expose globally
  window.GITHUB_CLIENT_ID = GITHUB_CLIENT_ID;
  window.GITHUB_API = GITHUB_API;
  window.getGitHubToken = getGitHubToken;
  window.setGitHubToken = setGitHubToken;
  window.clearGitHubToken = clearGitHubToken;
  window.getGitHubUser = getGitHubUser;
  window.loginWithGitHub = loginWithGitHub;
  window.logoutGitHub = logoutGitHub;
  window.updateLoginUI = updateLoginUI;
  window.handleOAuthCallback = handleOAuthCallback;

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    handleOAuthCallback();
    updateLoginUI();
  });
})();
