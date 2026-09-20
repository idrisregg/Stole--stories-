(() => {
  const API = window.STOLE_API_URL || '/graphql';
  const IMAGE_MS = 5000;
  const $ = id => document.getElementById(id);
  const el = {
    refresh: $('refresh'), meName: $('meName'), meAvatar: $('meAvatar'), tray: $('tray'),
    viewer: $('viewer'), media: $('media'), caption: $('caption'), views: $('views'), progress: $('progress'),
    signup: $('signup'), create: $('create'), username: $('username'), createUser: $('createUser'),
    type: $('type'), url: $('url'), text: $('text'), publish: $('publish'), status: $('status')
  };

  const DATA = `query Data {
    users { id username avatarUrl }
    activeStories { id userId mediaUrl mediaType caption createdAt user { id username avatarUrl } views { viewerId } }
  }`;
  const CREATE_USER = `mutation ($input: CreateUserInput!) { createUser(input: $input) { id username avatarUrl } }`;
  const CREATE_STORY = `mutation ($input: CreateStoryInput!) { createStory(input: $input) { id } }`;
  const RECORD_VIEW = `mutation ($input: RecordViewInput!) { recordView(input: $input) }`;

  const state = { users: [], stories: [], me: null, queue: [], at: -1, timer: null };

  async function gql(query, variables) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
    return json.data;
  }

  const say = (message, bad) => {
    el.status.textContent = message || '';
    el.status.className = bad ? 'status error' : 'status';
  };
  const avatar = user => (user && user.avatarUrl) ||
    'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(user ? user.username : 'anon');

  // Users with at least one active story, each group ordered oldest -> newest.
  function groups() {
    const map = new Map();
    for (const story of state.stories) {
      const user = story.user || { id: story.userId, username: 'unknown', avatarUrl: '' };
      if (!map.has(user.id)) map.set(user.id, { user, stories: [] });
      map.get(user.id).stories.push(story);
    }
    for (const group of map.values()) {
      group.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    return [...map.values()];
  }

  function renderTray() {
    el.tray.innerHTML = '';
    for (const group of groups()) {
      const latest = group.stories[group.stories.length - 1];
      const circle = document.createElement('div');
      circle.className = 'story-circle';
      circle.title = group.user.username + ' — ' + group.stories.length + ' active';
      circle.innerHTML = '<div class="story-ring"><img alt="" /></div><span></span>';
      const thumb = circle.querySelector('img');
      thumb.src = latest.mediaType === 'IMAGE' ? latest.mediaUrl : avatar(group.user);
      thumb.onerror = () => { thumb.src = avatar(group.user); };
      circle.querySelector('span').textContent = group.user.username;
      circle.onclick = () => play(group.user.id);
      el.tray.appendChild(circle);
    }
  }

  const setProgress = (value = 0) => {
    el.progress.style.width = Math.min(100, Math.max(0, value * 100)) + '%';
  };

  function stop() {
    clearInterval(state.timer);
    state.timer = null;
    const video = el.media.querySelector('video');
    if (video) video.pause();
  }

  function empty(message) {
    stop();
    state.queue = [];
    state.at = -1;
    setProgress();
    el.viewer.hidden = true;
    el.caption.textContent = '';
    el.views.hidden = true;
    say(message || (state.me ? 'Tap a story in the tray to play it.' : 'Create a profile to start.'));
  }

  function play(userId) {
    const group = groups().find(g => g.user.id === userId);
    if (!group) return empty();
    state.queue = group.stories;
    show(0);
  }

  function countViews(story) {
    const total = story.views.length;
    el.views.textContent = total + (total === 1 ? ' view' : ' views');
    el.views.hidden = false;
  }

  function recordView(story) {
    if (!state.me || story.userId === state.me.id) return;
    if (story.views.some(v => v.viewerId === state.me.id)) return;
    story.views.push({ viewerId: state.me.id });
    countViews(story);
    gql(RECORD_VIEW, { input: { storyId: story.id, viewerId: state.me.id } })
      .catch(err => say(err.message, true));
  }

  function show(index) {
    stop();
    say('');
    const story = state.queue[index];
    if (!story) return empty();
    state.at = index;

    el.viewer.hidden = false;
    el.media.innerHTML = '';
    setProgress();

    if (story.mediaType === 'VIDEO') {
      const video = document.createElement('video');
      video.src = story.mediaUrl;
      video.autoplay = true;
      video.playsInline = true;
      video.onended = () => show(index + 1);
      video.ontimeupdate = () => setProgress(video.duration ? video.currentTime / video.duration : 0);
      el.media.appendChild(video);
    } else {
      const image = document.createElement('img');
      image.src = story.mediaUrl;
      el.media.appendChild(image);
      const started = performance.now();
      state.timer = setInterval(() => {
        const elapsed = (performance.now() - started) / IMAGE_MS;
        setProgress(elapsed);
        if (elapsed >= 1) show(index + 1);
      }, 100);
    }

    const user = story.user || { username: 'unknown', avatarUrl: '' };
    const meta = document.createElement('div');
    meta.className = 'viewer-meta';
    meta.innerHTML = '<img alt="" /><span class="username"></span><span class="time"></span>';
    meta.querySelector('img').src = avatar(user);
    meta.querySelector('.username').textContent = user.username;
    meta.querySelector('.time').textContent = new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    el.media.appendChild(meta);

    el.caption.textContent = story.caption || '';
    countViews(story);
    recordView(story);
  }
  async function load() {
    const data = await gql(DATA);
    state.users = data.users;
    state.stories = data.activeStories;
    if (!state.me || !state.users.some(u => u.id === state.me.id)) state.me = state.users[0] || null;

    el.meName.textContent = state.me ? '@' + state.me.username : 'no profile';
    el.meAvatar.src = avatar(state.me);
    el.signup.hidden = state.users.length > 0;
    el.create.hidden = state.users.length === 0;
    renderTray();

    const playing = state.at >= 0 ? state.queue[state.at] : null;
    if (!playing) return empty();
    const group = groups().find(g => g.stories.some(s => s.id === playing.id));
    if (!group) return empty();
    state.queue = group.stories;
    show(group.stories.findIndex(s => s.id === playing.id));
  }

  async function publish() {
    if (!state.me) return say('Create a profile before publishing.', true);
    const mediaUrl = el.url.value.trim();
    if (!mediaUrl) return say('Paste an image or video URL.', true);

    el.publish.disabled = true;
    say('Publishing…');
    try {
      await gql(CREATE_STORY, {
        input: {
          userId: state.me.id,
          mediaUrl,
          mediaType: el.type.value,
          caption: el.text.value.trim() || null
        }
      });
      el.url.value = '';
      el.text.value = '';
      await load();
      play(state.me.id);
      say('Story published — it expires in 24 hours.');
    } catch (err) {
      say(err.message, true);
    } finally {
      el.publish.disabled = false;
    }
  }

  async function createProfile() {
    const username = el.username.value.trim();
    if (!username) return say('Enter a display name.', true);

    el.createUser.disabled = true;
    try {
      const data = await gql(CREATE_USER, { input: { username, avatarUrl: null } });
      state.me = data.createUser;
      el.username.value = '';
      await load();
      say('Profile @' + state.me.username + ' is ready.');
    } catch (err) {
      say(err.message, true);
    } finally {
      el.createUser.disabled = false;
    }
  }

  el.publish.onclick = publish;
  el.createUser.onclick = createProfile;
  el.refresh.onclick = () => load().catch(err => say(err.message, true));
  el.username.onkeydown = event => { if (event.key === 'Enter') createProfile(); };
  el.text.onkeydown = event => { if (event.key === 'Enter') publish(); };
  document.onkeydown = event => { if (event.key === 'Escape' && state.at >= 0) empty(); };

  load().catch(err => {
    empty();
    say(err.message, true);
  });
})();