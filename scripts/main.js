const LEADERBOARD_MODES = ["normal", "sudden death", "sorting frenzy", "target"];
const MAX_ENTRIES = 10;
const leaderboardRoot =
  typeof globalThis !== "undefined" ? globalThis : window;

function leaderboardCollectionName(gameModeIndex) {
  const mode = LEADERBOARD_MODES[gameModeIndex] || LEADERBOARD_MODES[0];
  return "scores_" + mode.toLowerCase().replace(" ", "_");
}

function createLocalLeaderboard() {
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
    return entries
      .map((entry) => `${entry.username} ${entry.score}`)
      .join("\n");
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
      console.warn("[leaderboard] Score invalide:", score);
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

  return {
    submitScore,
    getScoresForMode,
    getScoresAndStore,
  };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Echec de chargement du script: " + src));
    document.body.appendChild(script);
  });
}

async function initializeFirebase() {
  try {
    await loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
    await loadScript(
      "https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"
    );
    await loadScript(
      "https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"
    );
  } catch (error) {
    console.error("Erreur lors du chargement de Firebase:", error);
    return null;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyAJRNZLdK_d8O2Yv4n5gIcNzzDgGMola5U",
    authDomain: "crazy-popping-catz.firebaseapp.com",
    databaseURL: "https://crazy-popping-catz-default-rtdb.firebaseio.com",
    projectId: "crazy-popping-catz",
    storageBucket: "crazy-popping-catz.appspot.com",
    messagingSenderId: "463085913535",
    appId: "1:463085913535:web:44f72a7983b152e8b44d0a",
  };

  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  return firebase.firestore();
}

function createFirestoreLeaderboard(db, fallbackLeaderboard) {
  function formatScores(querySnapshot) {
    let scores = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      scores = scores + data.username + " " + data.score + "\n";
    });
    return scores;
  }

  function fetchScoresForMode(gameModeIndex) {
    const collectionName = leaderboardCollectionName(gameModeIndex);
    const modeLabel = LEADERBOARD_MODES[gameModeIndex] || LEADERBOARD_MODES[0];
    return db
      .collection(collectionName)
      .orderBy("score", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => formatScores(querySnapshot))
      .catch((error) => {
        console.error(
          `Erreur lors de la récupération des scores pour ${modeLabel}: `,
          error
        );
        return fallbackLeaderboard.getScoresForMode(gameModeIndex);
      });
  }

  function submitScore(score, username, gameModeIndex) {
    const safeScore = Number(score);
    if (!Number.isFinite(safeScore)) {
      console.warn("[leaderboard] Score invalide:", score);
      return fallbackLeaderboard.getScoresForMode(gameModeIndex);
    }
    const safeUsername = String(username || "");
    const collectionName = leaderboardCollectionName(gameModeIndex);
    return db
      .collection(collectionName)
      .doc()
      .set({
        username: safeUsername,
        score: safeScore,
      })
      .then(() => fetchScoresForMode(gameModeIndex))
      .catch((error) => {
        console.error("Erreur lors de l'ajout du score: ", error);
        return fallbackLeaderboard.submitScore(
          score,
          username,
          gameModeIndex
        );
      });
  }

  function getScoresAndStore() {
    return Promise.all(
      LEADERBOARD_MODES.map((mode, index) => fetchScoresForMode(index))
    );
  }

  return {
    submitScore,
    getScoresForMode: fetchScoresForMode,
    getScoresAndStore,
  };
}

const localLeaderboard = createLocalLeaderboard();
leaderboardRoot.leaderboard = localLeaderboard;

async function bootstrapLeaderboard() {
  const db = await initializeFirebase();
  if (!db) {
    return;
  }
  leaderboardRoot.leaderboard = createFirestoreLeaderboard(db, localLeaderboard);
}

runOnStartup(async () => {
  localLeaderboard.getScoresAndStore();
  bootstrapLeaderboard();
});
