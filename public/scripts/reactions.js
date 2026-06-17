/**
 * GitHub Reactions shared module.
 * Likes = heart reaction, Favorites = rocket reaction on the same issue.
 * Build-time reactions.json provides initial counts.
 * User-specific state (liked/favorited) checked on demand after login.
 */
(function() {
  'use strict';

  var REPO = 'rebron1900/f5a-gallery';

  // --- Count fetchers (unauthenticated, for build-time fallback) ---

  function fetchReactionCount(issueNumber, content) {
    if (!issueNumber) return Promise.resolve(0);
    return fetch(window.GITHUB_API + '/repos/' + REPO + '/issues/' + issueNumber + '/reactions', {
      headers: { 'Accept': 'application/vnd.github+json' },
    })
    .then(function(res) {
      if (!res.ok) return [];
      return res.json();
    })
    .then(function(reactions) {
      if (!Array.isArray(reactions)) return 0;
      return reactions.filter(function(r) { return r.content === content; }).length;
    })
    .catch(function() { return 0; });
  }

  function fetchLikes(issueNumber) { return fetchReactionCount(issueNumber, 'heart'); }
  function fetchFavorites(issueNumber) { return fetchReactionCount(issueNumber, 'rocket'); }

  // --- Check current user's reactions for a specific issue ---

  function checkUserReactions(issueNumber) {
    var token = window.getGitHubToken && window.getGitHubToken();
    var user = window.getGitHubUser && window.getGitHubUser();
    if (!token || !user || !issueNumber) return Promise.resolve({ liked: false, favorited: false });

    return fetch(window.GITHUB_API + '/repos/' + REPO + '/issues/' + issueNumber + '/reactions', {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json',
      },
    })
    .then(function(res) {
      if (!res.ok) return [];
      return res.json();
    })
    .then(function(reactions) {
      var liked = false, favorited = false;
      reactions.forEach(function(r) {
        if (r.user && r.user.login === user.login) {
          if (r.content === 'heart') liked = true;
          if (r.content === 'rocket') favorited = true;
        }
      });
      return { liked: liked, favorited: favorited };
    })
    .catch(function() { return { liked: false, favorited: false }; });
  }

  // --- Toggle like (heart) ---

  function toggleReaction(slug, issueNumber) {
    var token = window.getGitHubToken && window.getGitHubToken();
    if (!token) {
      if (confirm('需要 GitHub 登录才能点赞，是否登录？')) window.loginWithGitHub();
      return;
    }
    if (!issueNumber) { alert('该主题暂无对应 issue'); return; }

    var apiUrl = window.GITHUB_API + '/repos/' + REPO + '/issues/' + issueNumber + '/reactions';
    var headers = { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json' };
    var user = window.getGitHubUser && window.getGitHubUser();
    var userLogin = user ? user.login : null;

    fetch(apiUrl, { headers: headers })
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to fetch reactions');
      return res.json();
    })
    .then(function(reactions) {
      var userReaction = userLogin
        ? reactions.find(function(r) { return r.content === 'heart' && r.user && r.user.login === userLogin; })
        : null;
      if (userReaction) {
        return fetch(apiUrl + '/' + userReaction.id, { method: 'DELETE', headers: headers })
          .then(function() { return false; });
      } else {
        return fetch(apiUrl, {
          method: 'POST',
          headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ content: 'heart' }),
        }).then(function() { return true; });
      }
    })
    .then(function(isLiked) {
      // Update UI
      var btn = document.querySelector('.theme-card-likes[data-slug="' + slug + '"]');
      if (btn) btn.classList.toggle('liked', isLiked);
      return fetchLikes(issueNumber);
    })
    .then(function(count) {
      var countEl = document.querySelector('.reaction-count[data-slug="' + slug + '"]');
      if (countEl) countEl.textContent = count;
    })
    .catch(function(err) {
      console.error('[Reactions] Toggle like failed:', err);
      alert('操作失败，请重试');
    });
  }

  // --- Toggle favorite (rocket) ---

  function toggleFavorite(slug, issueNumber) {
    var token = window.getGitHubToken && window.getGitHubToken();
    if (!token) {
      if (confirm('需要 GitHub 登录才能收藏，是否登录？')) window.loginWithGitHub();
      return;
    }
    if (!issueNumber) { alert('该主题暂无对应 issue'); return; }

    var apiUrl = window.GITHUB_API + '/repos/' + REPO + '/issues/' + issueNumber + '/reactions';
    var headers = { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json' };
    var user = window.getGitHubUser && window.getGitHubUser();
    var userLogin = user ? user.login : null;

    fetch(apiUrl, { headers: headers })
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to fetch reactions');
      return res.json();
    })
    .then(function(reactions) {
      var userReaction = userLogin
        ? reactions.find(function(r) { return r.content === 'rocket' && r.user && r.user.login === userLogin; })
        : null;
      if (userReaction) {
        return fetch(apiUrl + '/' + userReaction.id, { method: 'DELETE', headers: headers })
          .then(function() { return false; });
      } else {
        return fetch(apiUrl, {
          method: 'POST',
          headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ content: 'rocket' }),
        }).then(function() { return true; });
      }
    })
    .then(function(isFavorited) {
      // Update UI
      var btn = document.querySelector('.theme-card-fav[data-slug="' + slug + '"]');
      if (btn) btn.classList.toggle('favorited', isFavorited);
      return fetchFavorites(issueNumber);
    })
    .then(function(count) {
      var countEl = document.querySelector('.fav-count[data-slug="' + slug + '"]');
      if (countEl) countEl.textContent = count;
    })
    .catch(function(err) {
      console.error('[Reactions] Toggle favorite failed:', err);
      alert('操作失败，请重试');
    });
  }

  // --- Init: load counts + check user state ---

  function initReactions() {
    var cards = document.querySelectorAll('.theme-card-likes[data-slug]');
    var token = window.getGitHubToken && window.getGitHubToken();
    var user = window.getGitHubUser && window.getGitHubUser();

    var queue = [];
    cards.forEach(function(card) {
      var slug = card.getAttribute('data-slug');
      var issue = parseInt(card.getAttribute('data-issue'));
      if (!issue) return;
      queue.push({ slug: slug, issue: issue, card: card });
    });

    var idx = 0;
    function processNext() {
      if (idx >= queue.length) return;
      var item = queue[idx++];

      // Fetch ALL reactions for this issue, then split by type
      fetch(window.GITHUB_API + '/repos/' + REPO + '/issues/' + item.issue + '/reactions', {
        headers: { 'Accept': 'application/vnd.github+json' },
      })
      .then(function(res) {
        if (!res.ok) {
          console.warn('[Reactions] HTTP ' + res.status + ' for issue #' + item.issue);
          return [];
        }
        return res.json();
      })
      .then(function(reactions) {
        if (!Array.isArray(reactions)) return;
        var likes = reactions.filter(function(r) { return r.content === 'heart'; }).length;
        var favs = reactions.filter(function(r) { return r.content === 'rocket'; }).length;

        var likeCountEl = item.card.querySelector('.reaction-count');
        if (likeCountEl) likeCountEl.textContent = likes;

        var favCountEl = item.card.querySelector('.fav-count');
        if (favCountEl) favCountEl.textContent = favs > 0 ? favs : '';

        // Check user state
        if (token && user) {
          reactions.forEach(function(r) {
            if (r.user && r.user.login === user.login) {
              if (r.content === 'heart') item.card.classList.add('liked');
              if (r.content === 'rocket') {
                var favBtn = item.card.parentElement.querySelector('.theme-card-fav[data-slug="' + item.slug + '"]');
                if (favBtn) favBtn.classList.add('favorited');
              }
            }
          });
        }
      })
      .catch(function(err) {
        console.warn('[Reactions] Failed for issue #' + item.issue, err);
      });

      setTimeout(processNext, 300);
    }
    processNext();
  }

  // Expose globally
  window.toggleReaction = toggleReaction;
  window.toggleFavorite = toggleFavorite;
  window.checkUserReactions = checkUserReactions;
  window.fetchLikes = fetchLikes;
  window.fetchFavorites = fetchFavorites;

  // Auto-load reactions on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initReactions, 200);
  });
})();
