import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { systemPrompt, buildStatePrimer, initialStorySeed } from './prompts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'llama3';
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

const sessions = new Map();

function newGameState(character) {
  return {
    sessionId: uuidv4(),
    hp: 20,
    inventory: ['Bedroll', 'Waterskin'],
    location: 'Emberbrook crossroads',
    quests: [],
    history: [],
    character: {
      name: character.name || 'Arin',
      className: character.className || 'Ranger',
      backstory: character.backstory || ''
    }
  };
}
function trimHistory(history, maxTurns = 10) {
  return history.length > maxTurns ? history.slice(history.length - maxTurns) : history;
}

async function callOllama(messages) {
  const body = { model: MODEL, messages, stream: false, options: { temperature: 0.8, top_p: 0.95 } };
  const res = await fetch(OLLAMA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text().catch(()=> '')}`);
  const data = await res.json();
  return data.message?.content?.trim() || '(no response)';
}

app.post('/api/start', async (req, res) => {
  try {
    const character = req.body?.character || {};
    const state = newGameState(character);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: buildStatePrimer(state) },
      { role: 'user', content: `Begin the adventure:\n${initialStorySeed(state.character)}\nEnd with 2–3 choices.` }
    ];
    const dmText = await callOllama(messages);
    state.history.push({ role: 'assistant', text: dmText });
    sessions.set(state.sessionId, state);
    res.json({ sessionId: state.sessionId, state, dmText });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post('/api/act', async (req, res) => {
  try {
    const { sessionId, action } = req.body;
    if (!sessionId || !action) return res.status(400).json({ error: 'Missing sessionId or action' });
    const state = sessions.get(sessionId);
    if (!state) return res.status(404).json({ error: 'Session not found' });

    const lower = action.toLowerCase();
    if (lower.includes('rest')) state.hp = Math.min(state.hp + 2, 20);
    if (lower.includes('forest')) state.location = 'Forest Edge';
    if (lower.includes('market')) state.location = 'Emberbrook Market';

    state.history = trimHistory([...state.history, { role: 'user', text: action }], 12);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: buildStatePrimer(state) },
      ...state.history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: 'Continue the scene. End with 2–3 choices.' }
    ];
    const dmText = await callOllama(messages);
    state.history.push({ role: 'assistant', text: dmText });
    res.json({ state, dmText });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get('/api/export/:sessionId', (req, res) => {
  const state = sessions.get(req.params.sessionId);
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.json(state);
});
app.post('/api/import', (req, res) => {
  const state = req.body;
  if (!state?.sessionId) return res.status(400).json({ error: 'Invalid state' });
  sessions.set(state.sessionId, state);
  res.json({ ok: true, sessionId: state.sessionId });
});

app.listen(PORT, () => {
  console.log(`AI Dungeon Master running on http://localhost:${PORT}`);
  console.log(`Using model: ${MODEL}`);
});
