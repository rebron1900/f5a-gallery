/**
 * f5a-gallery Reactions — Cloudflare KV backend
 * All data stored in Cloudflare KV via Worker API.
 * GitHub OAuth only for user identity.
 */
(function() {
  'use strict';

  var API_BASE = 'https://small-rice-5955.me-d1b.workers.dev';

  function authHeaders() {
    var token = window.getGitHubToken && window.getGitHubToken();
    var h = { 'Accept': 'application/json' };
    if (token) h['Authorization'] = 'token ' + token;
    return h;
  }

  // --- Bulk fetch all reactions (called on page load) ---
  function fetchAllReactions(slugs) {
    if (!slugs || slugs.length === 0) return Promise.resolve({});
    return fetch(API_BASE + '/api/reactions?slugs=' + slugs.join(','), {
      headers: authHeaders(),
    })
    .then(function(res) { return res.ok ? res.json() : {}; })
    .catch(function(err) { console.warn('[Reactions] Bulk fetch failed:', err); return {}; });
  }

  // --- Toggle like ---
  function toggleReaction(slug, issueNumber) {
    var token = window.getGitHubToken && window.getGitHubToken();
    if (!token) {
      if (confirm('需要 GitHub 登录才能点赞，是否登录？')) window.loginWithGitHub();
      return;
    }

    fetch(API_BASE + '/api/likes/' + slug + '/toggle', {
      method: 'POST',
      headers: authHeaders(),
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Toggle failed');
      return res.json();
    })
    .then(function(data) {
      var btn = document.querySelector('.theme-card-likes[data-slug="' + slug + '"]');
      if (btn) btn.classList.toggle('liked', data.liked);
      var countEl = document.querySelector('.reaction-count[data-slug="' + slug + '"]');
      if (countEl) countEl.textContent = data.count;
    })
    .catch(function(err) {
      console.error('[Reactions] Toggle like failed:', err);
      alert('操作失败，请重试');
    });
  }

  // --- Toggle favorite ---
  function toggleFavorite(slug, issueNumber) {
    var token = window.getGitHubToken && window.getGitHubToken();
    if (!token) {
      if (confirm('需要 GitHub 登录才能收藏，是否登录？')) window.loginWithGitHub();
      return;
    }

    fetch(API_BASE + '/api/favorites/' + slug + '/toggle', {
      method: 'POST',
      headers: authHeaders(),
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Toggle failed');
      return res.json();
    })
    .then(function(data) {
      var btn = document.querySelector('.theme-card-fav[data-slug="' + slug + '"]');
      if (btn) btn.classList.toggle('favorited', data.favorited);
      var countEl = document.querySelector('.fav-count[data-slug="' + slug + '"]');
      if (countEl) countEl.textContent = data.count > 0 ? data.count : '';
    })
    .catch(function(err) {
      console.error('[Reactions] Toggle favorite failed:', err);
      alert('操作失败，请重试');
    });
  }

  // --- Init: load all counts + user state ---
  function initReactions() {
    var cards = document.querySelectorAll('.theme-card-likes[data-slug]');
    var slugs = [];
    cards.forEach(function(card) {
      var slug = card.getAttribute('data-slug');
      if (slug) slugs.push(slug);
    });
    if (slugs.length === 0) return;

    fetchAllReactions(slugs).then(function(data) {
      cards.forEach(function(card) {
        var slug = card.getAttribute('data-slug');
        var d = data[slug];
        if (!d) return;

        // Update counts
        var likeCountEl = card.querySelector('.reaction-count');
        if (likeCountEl) likeCountEl.textContent = d.likes || 0;
        var favCountEl = card.querySelector('.fav-count');
        if (favCountEl) favCountEl.textContent = d.favorites > 0 ? d.favorites : '';

        // Update user state
        if (d.userLiked) card.classList.add('liked');
        if (d.userFavorited) {
          var favBtn = card.parentElement.querySelector('.theme-card-fav[data-slug="' + slug + '"]');
          if (favBtn) favBtn.classList.add('favorited');
        }
      });
    });
  }

  // Expose globally
  window.toggleReaction = toggleReaction;
  window.toggleFavorite = toggleFavorite;
  window.fetchAllReactions = fetchAllReactions;

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initReactions, 100);
  });
})();
