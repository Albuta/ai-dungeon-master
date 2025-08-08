# AI Dungeon Master (Local, Offline)

Free, offline text RPG where a local LLM (Ollama) is your DM. No API keys.

## Features
- Local LLM via Ollama (`llama3` or `mistral`)
- Web UI with chat + stats (HP, inventory, location, quests)
- Save/Load JSON
- Small, readable codebase

## Windows Setup
1. Install Node.js 18+
2. Install Ollama: `winget install -e --id Ollama.Ollama`
3. Pull a model: `ollama pull llama3`
4. Copy env: `cd server && copy .env.example .env` then set `MODEL=llama3`
5. Run:
   ```bash
   cd server
   npm install
   npm start
