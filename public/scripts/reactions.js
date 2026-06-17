/**
 * GitHub Reactions shared module.
 * Loaded via <script src> in Layout.astro, attaches to window.
 * Depends on github-auth.js (getGitHubToken, loginWithGitHub, GITHUB_API).
 */
(function() {
  'use strict';

  var REPO = 'rebron1900/f5a-gallery';

  function fetchReactions(slug, issueNumber) {
    if (!issueNumber) return Promise.resolve(0);

    return fetch(window.GITHUB_API + '/repos/' + REPO + '/issues/' + issueNumber + '/reactions', {
      headers: {
        'Accept': 'application/vnd.github+json',
      },
    })
    .then(function(res) {
      if (!res.ok) return [];
      return res.json();
    })
    .then(function(reactions) {
      return Array.isArray(reactions) ? reactions.length : 0;
    })
    .catch(function(err) {
      console.warn('[Reactions] Fetch failed for', slug, err);
      return 0;
    });
  }

  function toggleReaction(slug, issueNumber) {
    var token = window.getGitHubToken && window.getGitHubToken();
    if (!token) {
      if (confirm('需要 GitHub 登录才能点赞，是否登录？')) {
        window.loginWithGitHub();
      }
      return;
    }
    if (!issueNumber) {
      alert('该主题暂无对应 issue');
      return;
    }

    var apiUrl = window.GITHUB_API + '/repos/' + REPO + '/issues/' + issueNumber + '/reactions';
    var headers = {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github+json',
    };

    // Check if user already reacted
    fetch(apiUrl, { headers: headers })
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to fetch reactions');
      return res.json();
    })
    .then(function(reactions) {
      var userReaction = reactions.find(function(r) { return r.content === 'heart'; });
      if (userReaction) {
        // Unlike
        return fetch(apiUrl + '/' + userReaction.id, {
          method: 'DELETE',
          headers: headers,
        }).catch(function() {});
      } else {
        // Like
        return fetch(apiUrl, {
          method: 'POST',
          headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ content: 'heart' }),
        });
      }
    })
    .then(function() {
      return fetchReactions(slug, issueNumber);
    })
    .then(function(count) {
      var countEl = document.querySelector('.reaction-count[data-slug="' + slug + '"]');
      if (countEl) countEl.textContent = count;
    })
    .catch(function(err) {
      console.error('[Reactions] Toggle failed:', err);
      alert('操作失败，请重试');
    });
  }

  function loadAllReactions() {
    var cards = document.querySelectorAll('.theme-card-likes[data-slug]');
    cards.forEach(function(card) {
      var slug = card.getAttribute('data-slug');
      var issue = card.getAttribute('data-issue');
      if (issue && issue !== '0' && issue !== '') {
        fetchReactions(slug, parseInt(issue)).then(function(count) {
          var countEl = card.querySelector('.reaction-count');
          if (countEl) countEl.textContent = count;
        });
      }
    });
  }

  // Expose globally
  window.fetchReactions = fetchReactions;
  window.toggleReaction = toggleReaction;
  window.loadAllReactions = loadAllReactions;

  // Auto-load reactions on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.loadAllReactions === 'function') {
      window.loadAllReactions();
    }
  });
})();
