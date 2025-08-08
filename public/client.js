let sessionId = null;
let state = null;

const $ = (s) => document.querySelector(s);
const log = $('#log');
const hpEl = $('#hp');
const locEl = $('#loc');
const invEl = $('#inventory');
const questsEl = $('#quests');

function renderState() {
  if (!state) return;
  hpEl.textContent = state.hp;
  locEl.textContent = state.location;
  invEl.innerHTML = (state.inventory || []).map(i => `<li>${i}</li>`).join('');
  questsEl.innerHTML = (state.quests || []).map(q => `<li>${q}</li>`).join('');
}

function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'user' ? 'user' : 'dm');
  div.innerText = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function startGame() {
  log.innerHTML = '';
  const character = {
    name: $('#name').value.trim() || 'Arin',
    className: $('#className').value.trim() || 'Ranger',
    backstory: $('#backstory').value.trim()
  };

  appendMsg('user', `New game as ${character.name}, a ${character.className}.`);

  const res = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ character })
  });
  const data = await res.json();
  if (data.error) {
    appendMsg('dm', 'Error starting game: ' + data.error);
    return;
  }
  sessionId = data.sessionId;
  state = data.state;
  renderState();
  appendMsg('dm', data.dmText);
}

async function act(text) {
  if (!sessionId) return;
  appendMsg('user', text);
  const res = await fetch('/api/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, action: text })
  });
  const data = await res.json();
  if (data.error) {
    appendMsg('dm', 'Error: ' + data.error);
    return;
  }
  state = data.state;
  renderState();
  appendMsg('dm', data.dmText);
}

$('#startBtn').addEventListener('click', startGame);

$('#actionForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = $('#actionInput').value.trim();
  if (!val) return;
  $('#actionInput').value = '';
  act(val);
});

$('#exportBtn').addEventListener('click', async () => {
  if (!sessionId) return alert('No session to export.');
  const res = await fetch(`/api/export/${sessionId}`);
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `save_${sessionId}.json`;
  a.click();
});

$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const save = JSON.parse(text);
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(save)
  });
  const data = await res.json();
  if (data.ok) {
    sessionId = save.sessionId;
    state = save;
    log.innerHTML = '';
    (save.history || []).forEach(h => appendMsg(h.role, h.text));
    renderState();
  } else {
    alert('Import failed: ' + (data.error || 'unknown'));
  }
});
