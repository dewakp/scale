/* ==========================================
   ORIGINS — Bidirectional Infinity
   script.js
   ========================================== */
'use strict';

/* ---------- Utilities ---------- */
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function sanitizeHTML(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ---------- Progress Bar ---------- */
const progressBar = qs('#progress-bar');
if (progressBar) {
  document.addEventListener('scroll', () => {
    const scrollEl = document.documentElement;
    const pct = (scrollEl.scrollTop / (scrollEl.scrollHeight - scrollEl.clientHeight)) * 100;
    progressBar.style.width = pct + '%';
  }, { passive: true });
}

/* ---------- Back to Top ---------- */
const backToTop = qs('#back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Toast ---------- */
const toast = qs('#toast');
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ---------- TOC Active Highlighting ---------- */
const tocLinks = qsa('.toc-link');
const sections = qsa('.article-section');
function updateTOC() {
  let active = null;
  sections.forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= 120) active = sec.id;
  });
  tocLinks.forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === '#' + active);
  });
}
window.addEventListener('scroll', updateTOC, { passive: true });
updateTOC();

/* ---------- Social Share ---------- */
const PAGE_URL = encodeURIComponent(window.location.href);
const PAGE_TITLE = encodeURIComponent(document.title);
const SHARE_URLS = {
  twitter:  'https://twitter.com/intent/tweet?text=' + PAGE_TITLE + '&url=' + PAGE_URL,
  linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + PAGE_URL,
  facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + PAGE_URL,
  email:    'mailto:?subject=' + PAGE_TITLE + '&body=I thought you might find this interesting: ' + decodeURIComponent(PAGE_URL)
};

function handleShare(network) {
  if (network === 'copy') {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast('Link copied to clipboard!'))
      .catch(() => showToast('Could not copy — try manually.'));
    return;
  }
  const url = SHARE_URLS[network];
  if (url) window.open(url, '_blank', 'noopener,width=600,height=480');
}

qsa('[data-network]').forEach(btn => {
  btn.addEventListener('click', () => handleShare(btn.dataset.network));
});

/* ---------- Emoji Reactions ---------- */
const STORAGE_KEY = 'origins_reactions';
function loadReactions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveReactions(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}

const reactionData = loadReactions();
qsa('.reaction-btn').forEach(btn => {
  const emoji = btn.dataset.emoji;
  const countEl = btn.querySelector('.reaction-count');
  if (!reactionData[emoji]) reactionData[emoji] = { count: 0, reacted: false };
  countEl.textContent = reactionData[emoji].count;
  if (reactionData[emoji].reacted) btn.classList.add('reacted');

  btn.addEventListener('click', () => {
    const d = reactionData[emoji];
    if (d.reacted) {
      d.count = Math.max(0, d.count - 1);
      d.reacted = false;
      btn.classList.remove('reacted');
    } else {
      d.count++;
      d.reacted = true;
      btn.classList.add('reacted');
      btn.style.transform = 'scale(1.28)';
      setTimeout(() => { btn.style.transform = ''; }, 220);
    }
    countEl.textContent = d.count;
    saveReactions(reactionData);
  });
});

/* ---------- Comments ---------- */
const COMMENTS_KEY = 'origins_comments';
let commentIdCounter = 100;

function loadComments() {
  try { return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || []; }
  catch { return []; }
}
function saveComments(arr) {
  try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(arr)); } catch (_) {}
}

const comments = loadComments();

const toneEmoji  = { curious: '\uD83D\uDD0D', supportive: '\uD83D\uDE4F', questioning: '\uD83E\uDD14', critical: '\u26A1' };
const toneLabel  = { curious: 'Curious', supportive: 'Supportive', questioning: 'Questioning', critical: 'Critical' };
const toneCssMap = { curious: 'tone-curious', supportive: 'tone-supportive', questioning: 'tone-questioning', critical: 'tone-critical' };

function renderReplyHTML(r) {
  return '<article class="comment-card reply-card" data-id="' + r.id + '">'
    + '<div class="comment-header">'
    + '<div class="comment-avatar" aria-hidden="true">' + sanitizeHTML(r.name[0].toUpperCase()) + '</div>'
    + '<div><strong class="comment-author">' + sanitizeHTML(r.name) + '</strong>'
    + '<time class="comment-time">' + sanitizeHTML(r.date) + '</time></div></div>'
    + '<span class="comment-tone ' + (toneCssMap[r.tone] || '') + '">' + (toneEmoji[r.tone] || '') + ' ' + (toneLabel[r.tone] || r.tone) + '</span>'
    + '<p class="comment-body">' + sanitizeHTML(r.text) + '</p>'
    + '<div class="comment-actions">'
    + '<button class="comment-like-btn" data-id="' + r.id + '">\uD83D\uDC4D <span>' + (r.likes || 0) + '</span></button>'
    + '</div></article>';
}

function renderCommentHTML(c) {
  const repliesHtml = (c.replies || []).map(renderReplyHTML).join('');
  return '<article class="comment-card" data-id="' + c.id + '">'
    + '<div class="comment-header">'
    + '<div class="comment-avatar" aria-hidden="true">' + sanitizeHTML(c.name[0].toUpperCase()) + '</div>'
    + '<div><strong class="comment-author">' + sanitizeHTML(c.name) + '</strong>'
    + '<time class="comment-time">' + sanitizeHTML(c.date) + '</time></div></div>'
    + '<span class="comment-tone ' + (toneCssMap[c.tone] || '') + '">' + (toneEmoji[c.tone] || '') + ' ' + (toneLabel[c.tone] || c.tone) + '</span>'
    + '<p class="comment-body">' + sanitizeHTML(c.text) + '</p>'
    + '<div class="comment-actions">'
    + '<button class="comment-like-btn" data-id="' + c.id + '">\uD83D\uDC4D <span>' + (c.likes || 0) + '</span></button>'
    + '<button class="comment-reply-btn" data-id="' + c.id + '">Reply</button>'
    + '</div>'
    + repliesHtml
    + '</article>';
}

const commentsList = qs('#comments-list');

function flattenComments(arr) {
  const out = [];
  arr.forEach(c => { out.push(c); (c.replies || []).forEach(r => out.push(r)); });
  return out;
}

function reattachCommentListeners() {
  qsa('.comment-like-btn', commentsList).forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const countSpan = btn.querySelector('span');
      const all = flattenComments(comments);
      const c = all.find(x => x.id === id);
      if (c && countSpan) {
        c.likes = (c.likes || 0) + 1;
        countSpan.textContent = c.likes;
        saveComments(comments);
      }
    });
  });

  qsa('.comment-reply-btn', commentsList).forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      openReplyForm(id, btn);
    });
  });
}

function renderAllComments() {
  // Remove dynamically-added comment cards (keep seeded one with data-id="0")
  qsa('.comment-card:not([data-id="0"])', commentsList).forEach(el => el.remove());
  qsa('.inline-reply-form', commentsList).forEach(el => el.remove());
  comments.forEach(c => {
    commentsList.insertAdjacentHTML('beforeend', renderCommentHTML(c));
  });
  reattachCommentListeners();
}

function openReplyForm(parentId, triggerBtn) {
  const existing = qs('.inline-reply-form');
  if (existing) existing.remove();
  if (triggerBtn.dataset.open === '1') {
    triggerBtn.dataset.open = '';
    return;
  }
  qsa('.comment-reply-btn').forEach(b => { b.dataset.open = ''; });
  triggerBtn.dataset.open = '1';

  const form = document.createElement('div');
  form.className = 'inline-reply-form';
  form.innerHTML = '<div class="form-row"><label>Name *</label>'
    + '<input type="text" class="reply-name" placeholder="Your name" maxlength="80" /></div>'
    + '<div class="form-row"><label>Reply *</label>'
    + '<textarea class="reply-text" rows="3" placeholder="Your reply\u2026" maxlength="1000"></textarea></div>'
    + '<div style="display:flex;gap:.6rem">'
    + '<button class="submit-btn reply-submit" style="padding:.5rem 1.2rem;font-size:.9rem">Post Reply</button>'
    + '<button class="comment-reply-btn reply-cancel" style="font-size:.9rem">Cancel</button>'
    + '</div><div class="form-error reply-error"></div>';

  triggerBtn.closest('.comment-card').appendChild(form);

  form.querySelector('.reply-cancel').addEventListener('click', () => {
    form.remove();
    triggerBtn.dataset.open = '';
  });

  form.querySelector('.reply-submit').addEventListener('click', () => {
    const name = form.querySelector('.reply-name').value.trim();
    const text = form.querySelector('.reply-text').value.trim();
    const errEl = form.querySelector('.reply-error');
    if (!name || !text) { errEl.textContent = 'Name and reply are required.'; return; }
    errEl.textContent = '';
    const parent = comments.find(c => c.id === parentId);
    if (!parent) return;
    if (!parent.replies) parent.replies = [];
    parent.replies.push({
      id: ++commentIdCounter,
      name, text, tone: 'curious',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      likes: 0
    });
    saveComments(comments);
    form.remove();
    triggerBtn.dataset.open = '';
    renderAllComments();
    showToast('Reply posted!');
  });
}

renderAllComments();

/* ---------- Comment Form ---------- */
const commentForm    = qs('#comment-form');
const charRemaining  = qs('#char-remaining');
const commentTextEl  = qs('#comment-text');
const formError      = qs('#form-error');

if (commentTextEl && charRemaining) {
  commentTextEl.addEventListener('input', () => {
    const rem = 2000 - commentTextEl.value.length;
    charRemaining.textContent = rem;
    charRemaining.style.color = rem < 100 ? 'var(--accent)' : '';
  });
}

if (commentForm) {
  commentForm.addEventListener('submit', e => {
    e.preventDefault();
    formError.textContent = '';

    const name  = qs('#comment-name').value.trim();
    const email = qs('#comment-email').value.trim();
    const text  = commentTextEl.value.trim();
    const tone  = (qs('input[name="tone"]:checked') || {}).value || 'curious';

    if (!name)  { formError.textContent = 'Please enter your name.'; return; }
    if (!email) { formError.textContent = 'Please enter your email.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formError.textContent = 'Please enter a valid email address.';
      return;
    }
    if (text.length < 5) { formError.textContent = 'Comment is too short.'; return; }

    comments.push({
      id: ++commentIdCounter,
      name, text, tone,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      likes: 0,
      replies: []
    });
    saveComments(comments);
    renderAllComments();
    commentForm.reset();
    charRemaining.textContent = '2000';
    showToast('Comment posted! Thank you.');
    commentsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
