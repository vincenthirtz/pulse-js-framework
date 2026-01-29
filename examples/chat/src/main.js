/**
 * Pulse Chat App
 * Real-time messaging demo with simulated users
 */

import {
  pulse,
  effect,
  el,
  mount,
} from '/runtime/index.js';

// =============================================================================
// Simulated Users & Rooms Data
// =============================================================================

const BOTS = [
  { id: 'bot1', name: 'Alice', avatar: '👩', status: 'online' },
  { id: 'bot2', name: 'Bob', avatar: '👨', status: 'online' },
  { id: 'bot3', name: 'Charlie', avatar: '🧑', status: 'away' },
  { id: 'bot4', name: 'Diana', avatar: '👩‍💻', status: 'online' },
  { id: 'bot5', name: 'Eve', avatar: '👱‍♀️', status: 'offline' },
];

const BOT_RESPONSES = [
  "That's interesting! Tell me more.",
  "I totally agree with you!",
  "Hmm, I'm not sure about that...",
  "Great point! 👍",
  "Haha, that's funny! 😄",
  "Really? I didn't know that!",
  "Let me think about it...",
  "Nice! I love that idea!",
  "That reminds me of something...",
  "Could you explain more?",
  "I was just thinking the same thing!",
  "Interesting perspective!",
  "Thanks for sharing! 🙏",
  "Oh wow, that's amazing!",
  "I see what you mean.",
];

const ROOMS = [
  { id: 'general', name: 'General', icon: '💬', description: 'General discussion' },
  { id: 'random', name: 'Random', icon: '🎲', description: 'Random topics' },
  { id: 'tech', name: 'Tech Talk', icon: '💻', description: 'Technology discussion' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Gaming chat' },
  { id: 'music', name: 'Music', icon: '🎵', description: 'Music lovers' },
];

// =============================================================================
// State
// =============================================================================

const user = pulse(JSON.parse(localStorage.getItem('chat-user')) || null);
const currentRoom = pulse('general');
const messages = pulse(JSON.parse(localStorage.getItem('chat-messages')) || {});
const inputText = pulse('');
const onlineUsers = pulse(BOTS.filter(b => b.status === 'online'));
const typingUsers = pulse([]);
const showUserSetup = pulse(!localStorage.getItem('chat-user'));
const showEmojiPicker = pulse(false);
const sidebarOpen = pulse(true);

// =============================================================================
// Persistence
// =============================================================================

function saveUser() {
  localStorage.setItem('chat-user', JSON.stringify(user.peek()));
}

function saveMessages() {
  localStorage.setItem('chat-messages', JSON.stringify(messages.peek()));
}

// =============================================================================
// Actions
// =============================================================================

function setupUser(name, avatar) {
  const newUser = {
    id: 'user_' + Date.now(),
    name,
    avatar,
    status: 'online'
  };
  user.set(newUser);
  saveUser();
  showUserSetup.set(false);

  // Add welcome message
  addSystemMessage('general', `${name} joined the chat! Welcome! 🎉`);
}

function changeRoom(roomId) {
  currentRoom.set(roomId);
  typingUsers.set([]);
}

function sendMessage() {
  const text = inputText.peek().trim();
  if (!text || !user.peek()) return;

  const room = currentRoom.peek();
  const msg = {
    id: 'msg_' + Date.now(),
    userId: user.peek().id,
    userName: user.peek().name,
    userAvatar: user.peek().avatar,
    text,
    timestamp: Date.now(),
    type: 'user'
  };

  // Add message
  const allMessages = messages.peek();
  const roomMessages = allMessages[room] || [];
  messages.set({
    ...allMessages,
    [room]: [...roomMessages, msg]
  });
  saveMessages();

  inputText.set('');

  // Simulate bot response
  simulateBotResponse(room, text);
}

function addSystemMessage(room, text) {
  const msg = {
    id: 'sys_' + Date.now(),
    text,
    timestamp: Date.now(),
    type: 'system'
  };

  const allMessages = messages.peek();
  const roomMessages = allMessages[room] || [];
  messages.set({
    ...allMessages,
    [room]: [...roomMessages, msg]
  });
  saveMessages();
}

function simulateBotResponse(room, userMessage) {
  // Random chance of bot response
  if (Math.random() > 0.7) return;

  const activeBots = BOTS.filter(b => b.status === 'online');
  if (activeBots.length === 0) return;

  const bot = activeBots[Math.floor(Math.random() * activeBots.length)];

  // Show typing indicator
  setTimeout(() => {
    typingUsers.set([bot]);
  }, 500);

  // Send response after delay
  const delay = 1500 + Math.random() * 2000;
  setTimeout(() => {
    typingUsers.set([]);

    const response = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
    const msg = {
      id: 'msg_' + Date.now(),
      userId: bot.id,
      userName: bot.name,
      userAvatar: bot.avatar,
      text: response,
      timestamp: Date.now(),
      type: 'bot'
    };

    const allMessages = messages.peek();
    const roomMessages = allMessages[room] || [];
    messages.set({
      ...allMessages,
      [room]: [...roomMessages, msg]
    });
    saveMessages();
  }, delay);
}

function addEmoji(emoji) {
  inputText.update(text => text + emoji);
  showEmojiPicker.set(false);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function clearChat() {
  const room = currentRoom.peek();
  const allMessages = messages.peek();
  messages.set({
    ...allMessages,
    [room]: []
  });
  saveMessages();
}

function logout() {
  user.set(null);
  localStorage.removeItem('chat-user');
  showUserSetup.set(true);
}

// =============================================================================
// Components
// =============================================================================

function UserSetupModal() {
  const overlay = el('.modal-overlay');

  effect(() => {
    const show = showUserSetup.get();
    overlay.style.display = show ? 'flex' : 'none';
    overlay.innerHTML = '';

    if (!show) return;

    const modal = el('.modal.setup-modal');

    modal.appendChild(el('h2', '👋 Welcome to Pulse Chat!'));
    modal.appendChild(el('p.setup-subtitle', 'Choose your name and avatar to get started'));

    // Avatar selection
    const avatars = ['😀', '😎', '🤓', '😊', '🥳', '🤖', '👨', '👩', '🧑', '👨‍💻', '👩‍💻', '🦊', '🐱', '🐶', '🦁', '🐼'];
    let selectedAvatar = '😀';

    const avatarSection = el('.avatar-section');
    avatarSection.appendChild(el('label', 'Choose your avatar:'));

    const avatarGrid = el('.avatar-grid');
    for (const avatar of avatars) {
      const btn = el('button.avatar-option', avatar);
      if (avatar === selectedAvatar) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        selectedAvatar = avatar;
        avatarGrid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      avatarGrid.appendChild(btn);
    }
    avatarSection.appendChild(avatarGrid);
    modal.appendChild(avatarSection);

    // Name input
    const nameSection = el('.name-section');
    nameSection.appendChild(el('label', 'Your name:'));
    const nameInput = el('input.name-input[type=text][placeholder="Enter your name..."][maxlength=20]');
    nameSection.appendChild(nameInput);
    modal.appendChild(nameSection);

    // Join button
    const joinBtn = el('button.join-btn', '🚀 Join Chat');
    joinBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name.length >= 2) {
        setupUser(name, selectedAvatar);
      } else {
        nameInput.classList.add('error');
        nameInput.placeholder = 'Name must be at least 2 characters';
      }
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinBtn.click();
    });
    modal.appendChild(joinBtn);

    overlay.appendChild(modal);
  });

  return overlay;
}

function Sidebar() {
  const sidebar = el('aside.sidebar');

  effect(() => {
    const isOpen = sidebarOpen.get();
    sidebar.className = `sidebar ${isOpen ? 'open' : 'closed'}`;
  });

  // User info
  const userSection = el('.user-section');

  effect(() => {
    userSection.innerHTML = '';
    const u = user.get();
    if (!u) return;

    const userInfo = el('.user-info');
    userInfo.appendChild(el('.user-avatar', u.avatar));
    const details = el('.user-details');
    details.appendChild(el('.user-name', u.name));
    details.appendChild(el('.user-status.online', '● Online'));
    userInfo.appendChild(details);

    const logoutBtn = el('button.logout-btn', '🚪');
    logoutBtn.title = 'Logout';
    logoutBtn.addEventListener('click', logout);
    userInfo.appendChild(logoutBtn);

    userSection.appendChild(userInfo);
  });
  sidebar.appendChild(userSection);

  // Rooms list
  const roomsSection = el('.rooms-section');
  roomsSection.appendChild(el('h3', '📢 Channels'));

  const roomsList = el('.rooms-list');
  effect(() => {
    roomsList.innerHTML = '';
    const activeRoom = currentRoom.get();
    const allMessages = messages.get();

    for (const room of ROOMS) {
      const roomEl = el(`.room-item${activeRoom === room.id ? '.active' : ''}`);
      roomEl.addEventListener('click', () => changeRoom(room.id));

      roomEl.appendChild(el('.room-icon', room.icon));
      const info = el('.room-info');
      info.appendChild(el('.room-name', room.name));

      const roomMsgs = allMessages[room.id] || [];
      const unread = roomMsgs.length > 0 && activeRoom !== room.id;
      if (unread) {
        info.appendChild(el('.room-preview', roomMsgs[roomMsgs.length - 1].text?.slice(0, 30) + '...'));
      }

      roomEl.appendChild(info);
      roomsList.appendChild(roomEl);
    }
  });
  roomsSection.appendChild(roomsList);
  sidebar.appendChild(roomsSection);

  // Online users
  const usersSection = el('.users-section');
  usersSection.appendChild(el('h3', '👥 Online'));

  const usersList = el('.users-list');
  effect(() => {
    usersList.innerHTML = '';
    const online = onlineUsers.get();

    for (const u of online) {
      const userEl = el('.online-user');
      userEl.appendChild(el('.online-avatar', u.avatar));
      userEl.appendChild(el('.online-name', u.name));
      userEl.appendChild(el(`.status-dot.${u.status}`));
      usersList.appendChild(userEl);
    }
  });
  usersSection.appendChild(usersList);
  sidebar.appendChild(usersSection);

  return sidebar;
}

function ChatHeader() {
  const header = el('.chat-header');

  // Toggle sidebar button
  const toggleBtn = el('button.toggle-sidebar', '☰');
  toggleBtn.addEventListener('click', () => sidebarOpen.update(v => !v));
  header.appendChild(toggleBtn);

  // Room info
  const roomInfo = el('.room-info-header');
  effect(() => {
    roomInfo.innerHTML = '';
    const room = ROOMS.find(r => r.id === currentRoom.get());
    if (room) {
      roomInfo.appendChild(el('.room-title', `${room.icon} ${room.name}`));
      roomInfo.appendChild(el('.room-description', room.description));
    }
  });
  header.appendChild(roomInfo);

  // Actions
  const actions = el('.header-actions');

  const clearBtn = el('button.action-btn', '🗑️');
  clearBtn.title = 'Clear chat';
  clearBtn.addEventListener('click', clearChat);
  actions.appendChild(clearBtn);

  header.appendChild(actions);

  return header;
}

function MessageList() {
  const container = el('.message-list');

  effect(() => {
    container.innerHTML = '';
    const room = currentRoom.get();
    const allMessages = messages.get();
    const roomMessages = allMessages[room] || [];
    const typing = typingUsers.get();

    if (roomMessages.length === 0) {
      const empty = el('.empty-chat');
      empty.innerHTML = `
        <span class="empty-icon">💬</span>
        <span class="empty-text">No messages yet</span>
        <span class="empty-hint">Be the first to say something!</span>
      `;
      container.appendChild(empty);
    } else {
      let lastDate = null;

      for (const msg of roomMessages) {
        // Date separator
        const msgDate = formatDate(msg.timestamp);
        if (msgDate !== lastDate) {
          const dateSep = el('.date-separator');
          dateSep.appendChild(el('span', msgDate));
          container.appendChild(dateSep);
          lastDate = msgDate;
        }

        if (msg.type === 'system') {
          const sysMsg = el('.system-message', msg.text);
          container.appendChild(sysMsg);
        } else {
          const isOwn = msg.userId === user.peek()?.id;
          const msgEl = el(`.message${isOwn ? '.own' : ''}`);

          if (!isOwn) {
            msgEl.appendChild(el('.message-avatar', msg.userAvatar));
          }

          const content = el('.message-content');
          if (!isOwn) {
            content.appendChild(el('.message-author', msg.userName));
          }
          content.appendChild(el('.message-text', msg.text));
          content.appendChild(el('.message-time', formatTime(msg.timestamp)));
          msgEl.appendChild(content);

          container.appendChild(msgEl);
        }
      }
    }

    // Typing indicator
    if (typing.length > 0) {
      const typingEl = el('.typing-indicator');
      const names = typing.map(u => u.name).join(', ');
      typingEl.innerHTML = `
        <span class="typing-avatar">${typing[0].avatar}</span>
        <span class="typing-text">${names} is typing</span>
        <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
      `;
      container.appendChild(typingEl);
    }

    // Scroll to bottom
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 10);
  });

  return container;
}

function EmojiPicker() {
  const picker = el('.emoji-picker');

  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
    '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
    '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒',
    '🙄', '😬', '😮', '😯', '😲', '😳', '🥺', '😦',
    '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🎉',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯',
  ];

  effect(() => {
    picker.innerHTML = '';
    picker.style.display = showEmojiPicker.get() ? 'grid' : 'none';

    for (const emoji of emojis) {
      const btn = el('button.emoji-btn', emoji);
      btn.addEventListener('click', () => addEmoji(emoji));
      picker.appendChild(btn);
    }
  });

  return picker;
}

function MessageInput() {
  const container = el('.message-input-container');

  container.appendChild(EmojiPicker());

  const inputRow = el('.input-row');

  // Emoji button
  const emojiBtn = el('button.emoji-toggle', '😊');
  emojiBtn.addEventListener('click', () => showEmojiPicker.update(v => !v));
  inputRow.appendChild(emojiBtn);

  // Text input
  const input = el('input.message-input[type=text][placeholder="Type a message..."]');
  effect(() => {
    input.value = inputText.get();
  });
  input.addEventListener('input', (e) => {
    inputText.set(e.target.value);
    showEmojiPicker.set(false);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  inputRow.appendChild(input);

  // Send button
  const sendBtn = el('button.send-btn', '📤');
  sendBtn.addEventListener('click', sendMessage);
  inputRow.appendChild(sendBtn);

  container.appendChild(inputRow);

  return container;
}

function ChatArea() {
  const chat = el('.chat-area');

  chat.appendChild(ChatHeader());
  chat.appendChild(MessageList());
  chat.appendChild(MessageInput());

  return chat;
}

function App() {
  const app = el('.chat-app');

  app.appendChild(Sidebar());
  app.appendChild(ChatArea());
  app.appendChild(UserSetupModal());

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --primary: #5865f2;
  --primary-dark: #4752c4;
  --bg-dark: #1e1f22;
  --bg-medium: #2b2d31;
  --bg-light: #313338;
  --bg-lighter: #383a40;
  --text: #f2f3f5;
  --text-muted: #949ba4;
  --text-dim: #6d6f78;
  --online: #23a559;
  --away: #f0b232;
  --offline: #6d6f78;
  --border: #3f4147;
  --radius: 8px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: var(--bg-dark);
  color: var(--text);
  height: 100vh;
  overflow: hidden;
}

.chat-app {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: var(--bg-medium);
  display: flex;
  flex-direction: column;
  transition: width 0.2s, transform 0.2s;
  overflow: hidden;
}

.sidebar.closed {
  width: 0;
  transform: translateX(-280px);
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    z-index: 100;
    height: 100%;
  }
  .sidebar.closed {
    transform: translateX(-100%);
  }
}

.user-section {
  padding: 16px;
  background: var(--bg-dark);
  border-bottom: 1px solid var(--border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  font-size: 2em;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-lighter);
  border-radius: 50%;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.user-status {
  font-size: 0.8em;
  color: var(--text-muted);
}

.user-status.online {
  color: var(--online);
}

.logout-btn {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.logout-btn:hover {
  opacity: 1;
}

/* Rooms */
.rooms-section, .users-section {
  padding: 16px;
}

.rooms-section h3, .users-section h3 {
  font-size: 0.75em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.2s;
}

.room-item:hover {
  background: var(--bg-lighter);
}

.room-item.active {
  background: var(--bg-lighter);
  color: var(--text);
}

.room-icon {
  font-size: 1.3em;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  font-weight: 500;
}

.room-preview {
  font-size: 0.8em;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Online users */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.online-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: var(--radius);
}

.online-avatar {
  font-size: 1.2em;
}

.online-name {
  flex: 1;
  font-size: 0.9em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online { background: var(--online); }
.status-dot.away { background: var(--away); }
.status-dot.offline { background: var(--offline); }

/* Chat Area */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-light);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.toggle-sidebar {
  background: none;
  border: none;
  font-size: 1.3em;
  color: var(--text-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius);
  transition: background 0.2s;
}

.toggle-sidebar:hover {
  background: var(--bg-lighter);
  color: var(--text);
}

.room-info-header {
  flex: 1;
}

.room-title {
  font-size: 1.1em;
  font-weight: 600;
}

.room-description {
  font-size: 0.85em;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius);
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--bg-lighter);
}

/* Message List */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.2em;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.9em;
  opacity: 0.7;
}

.date-separator {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-muted);
  font-size: 0.8em;
  margin: 8px 0;
}

.date-separator::before,
.date-separator::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.system-message {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9em;
  padding: 8px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.own {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  font-size: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-lighter);
  border-radius: 50%;
  flex-shrink: 0;
}

.message-content {
  background: var(--bg-medium);
  padding: 12px 16px;
  border-radius: var(--radius);
  max-width: 100%;
}

.message.own .message-content {
  background: var(--primary);
}

.message-author {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 4px;
}

.message.own .message-author {
  color: rgba(255,255,255,0.8);
}

.message-text {
  word-wrap: break-word;
  line-height: 1.4;
}

.message-time {
  font-size: 0.7em;
  color: var(--text-dim);
  margin-top: 4px;
}

.message.own .message-time {
  color: rgba(255,255,255,0.6);
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.9em;
  padding: 8px 0;
}

.typing-avatar {
  font-size: 1.2em;
}

.typing-dots span {
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

/* Message Input */
.message-input-container {
  padding: 16px 20px;
  background: var(--bg-light);
  position: relative;
}

.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 20px;
  background: var(--bg-medium);
  border-radius: var(--radius);
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  max-height: 200px;
  overflow-y: auto;
}

.emoji-btn {
  background: none;
  border: none;
  font-size: 1.3em;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.emoji-btn:hover {
  background: var(--bg-lighter);
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.emoji-toggle {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.emoji-toggle:hover {
  opacity: 1;
}

.message-input {
  flex: 1;
  padding: 14px 18px;
  background: var(--bg-lighter);
  border: none;
  border-radius: var(--radius);
  color: var(--text);
  font-size: 1em;
  outline: none;
}

.message-input::placeholder {
  color: var(--text-muted);
}

.message-input:focus {
  box-shadow: 0 0 0 2px var(--primary);
}

.send-btn {
  background: var(--primary);
  border: none;
  font-size: 1.3em;
  padding: 12px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover {
  background: var(--primary-dark);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--bg-medium);
  border-radius: 12px;
  padding: 32px;
  max-width: 450px;
  width: 90%;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.setup-modal h2 {
  text-align: center;
  margin-bottom: 8px;
}

.setup-subtitle {
  text-align: center;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.avatar-section, .name-section {
  margin-bottom: 24px;
}

.avatar-section label, .name-section label {
  display: block;
  font-size: 0.9em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.avatar-option {
  font-size: 1.5em;
  padding: 10px;
  background: var(--bg-lighter);
  border: 2px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-option:hover {
  background: var(--bg-light);
}

.avatar-option.selected {
  border-color: var(--primary);
  background: rgba(88, 101, 242, 0.2);
}

.name-input {
  width: 100%;
  padding: 14px 18px;
  background: var(--bg-lighter);
  border: 2px solid transparent;
  border-radius: var(--radius);
  color: var(--text);
  font-size: 1em;
  outline: none;
  transition: border-color 0.2s;
}

.name-input:focus {
  border-color: var(--primary);
}

.name-input.error {
  border-color: #ed4245;
}

.name-input.error::placeholder {
  color: #ed4245;
}

.join-btn {
  width: 100%;
  padding: 16px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  color: white;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.join-btn:hover {
  background: var(--primary-dark);
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Mount
// =============================================================================

mount('#app', App());

console.log('💬 Pulse Chat App loaded!');
