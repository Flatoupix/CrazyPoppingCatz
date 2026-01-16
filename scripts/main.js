const LEADERBOARD_MODES = ["normal", "sudden death", "sorting frenzy", "target"];
const MAX_ENTRIES = 10;

function leaderboardCollectionName(gameModeIndex) {
  const mode = LEADERBOARD_MODES[gameModeIndex] || LEADERBOARD_MODES[0];
  return "scores_" + mode.toLowerCase().replace(" ", "_");
}

function readScores(gameModeIndex) {
  const key = leaderboardCollectionName(gameModeIndex);
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((entry) => ({
        username: String(entry.username || ""),
        score: Number(entry.score),
        ts: Number(entry.ts || 0),
      }))
      .filter((entry) => Number.isFinite(entry.score));
  } catch (error) {
    console.warn("Scores invalides en localStorage:", error);
    return [];
  }
}

function writeScores(gameModeIndex, entries) {
  const key = leaderboardCollectionName(gameModeIndex);
  localStorage.setItem(key, JSON.stringify(entries));
}

function formatScores(entries) {
  return entries.map((entry) => `${entry.username} ${entry.score}`).join("\n");
}

function ensureStorage() {
  LEADERBOARD_MODES.forEach((mode, index) => {
    const key = leaderboardCollectionName(index);
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "[]");
    }
  });
}

function submitScore(score, username, gameModeIndex) {
  const safeScore = Number(score);
  if (!Number.isFinite(safeScore)) {
    console.warn("Score invalide pour le leaderboard:", score);
    return getScoresForMode(gameModeIndex);
  }
  const safeUsername = String(username || "").trim();
  const entries = readScores(gameModeIndex);
  entries.push({ username: safeUsername, score: safeScore, ts: Date.now() });
  entries.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const topEntries = entries.slice(0, MAX_ENTRIES);
  writeScores(gameModeIndex, topEntries);
  return formatScores(topEntries);
}

function getScoresForMode(gameModeIndex) {
  return formatScores(readScores(gameModeIndex));
}

function getScoresAndStore() {
  ensureStorage();
  return LEADERBOARD_MODES.map((mode, index) => getScoresForMode(index));
}

window.leaderboard = {
  submitScore,
  getScoresForMode,
  getScoresAndStore,
};

runOnStartup(async () => {
  if (window.leaderboard && window.leaderboard.getScoresAndStore) {
    window.leaderboard.getScoresAndStore();
  }
});
