export const systemPrompt = `
You are the Dungeon Master for a text adventure. You must:
- Keep responses concise (4–8 sentences).
- Always end with 2–3 actionable choices for the player, each starting with a verb.
- Respect and update the game state facts provided by the system: HP, inventory, location, quest log.
- Never rewrite the full state; just continue the story.
- Avoid modern slang; use a fantasy tone.
Tone: immersive, descriptive, and reactive. No meta talk about tokens or models.
`;

export function buildStatePrimer(state) {
  const inv = state.inventory.length ? state.inventory.join(", ") : "empty";
  const quests = state.quests.length ? state.quests.map(q => `- ${q}`).join("\n") : "None";
  return `
[GAME STATE]
Location: ${state.location}
HP: ${state.hp}
Inventory: ${inv}
Quests:
${quests}
`;
}

export function initialStorySeed(character) {
  const { name, className, backstory } = character;
  return `
The hero ${name}, a ${className}, begins their journey near the village of Emberbrook.
Backstory: ${backstory || "A mysterious traveler drawn by whispers of an ancient ruin in the nearby forest."}
The wind carries the smell of pine and old stone. A dirt path splits toward the market square and the forest edge.
`;
}