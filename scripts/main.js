const LEADERBOARD_MODES = ["normal", "sudden death", "sorting frenzy", "target"];

function leaderboardCollectionName(gameModeIndex) {
  const mode = LEADERBOARD_MODES[gameModeIndex] || LEADERBOARD_MODES[0];
  return "scores_" + mode.toLowerCase().replace(" ", "_");
}

function getScoresFromLocalStorage(gameModeIndex) {
  const collectionName = leaderboardCollectionName(gameModeIndex);
  const rawScores = localStorage.getItem(collectionName);
  if (!rawScores) {
    return "";
  }
  try {
    return JSON.parse(rawScores) || "";
  } catch (error) {
    console.warn("Scores invalides en localStorage:", error);
    return rawScores;
  }
}

let leaderboardImpl = null;
const leaderboardQueue = [];

function queueLeaderboardCall(callFn) {
  return new Promise((resolve, reject) => {
    leaderboardQueue.push(() => {
      Promise.resolve(callFn()).then(resolve).catch(reject);
    });
  });
}

function flushLeaderboardQueue() {
  while (leaderboardQueue.length) {
    leaderboardQueue.shift()();
  }
}

window.leaderboard = {
  submitScore(score, username, gameModeIndex) {
    if (!leaderboardImpl) {
      return queueLeaderboardCall(() =>
        leaderboardImpl.submitScore(score, username, gameModeIndex)
      );
    }
    return leaderboardImpl.submitScore(score, username, gameModeIndex);
  },
  getScoresAndStore() {
    if (!leaderboardImpl) {
      return queueLeaderboardCall(() => leaderboardImpl.getScoresAndStore());
    }
    return leaderboardImpl.getScoresAndStore();
  },
  getScoresFromLocalStorage,
};

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
    return;
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
  window.db = firebase.firestore();
  startFirebase();
}
function initializeLeaderboard(db) {
  function submitScore(score, username, gameModeIndex) {
    const collectionName = leaderboardCollectionName(gameModeIndex);
    const safeScore = Number(score);
    if (!Number.isFinite(safeScore)) {
      console.warn("Score invalide pour le leaderboard:", score);
      return;
    }
    const safeUsername = String(username || "");
    const newScoreRef = db.collection(collectionName).doc();
    return newScoreRef
      .set({
        username: safeUsername,
        score: safeScore,
      })
      .then(() => {
        console.log("Score ajouté avec succès!");
        return getScoresAndStore();
      })
      .catch((error) => {
        console.error("Erreur lors de l'ajout du score: ", error);
      });
  }

  function getScoresAndStore() {
    return Promise.all(
      LEADERBOARD_MODES.map((mode, index) => {
        const collectionName = leaderboardCollectionName(index);
        return db
          .collection(collectionName)
          .orderBy("score", "desc")
          .limit(10)
          .get()
          .then((querySnapshot) => {
            let scores = "";
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              scores = scores + data.username + " " + data.score + "\n";
            });
            localStorage.setItem(collectionName, JSON.stringify(scores));
            return scores;
          })
          .catch((error) => {
            console.error(
              `Erreur lors de la récupération des scores pour ${mode}: `,
              error
            );
            return "";
          });
      })
    );
  }

  leaderboardImpl = {
    submitScore,
    getScoresAndStore,
    getScoresFromLocalStorage,
  };
  flushLeaderboardQueue();
}

function startFirebase() {
  console.log("Firebase et Firestore sont prêts à l'emploi.");
  // Initialiser le leaderboard avec Firebase Firestore
  initializeLeaderboard(window.db);
}

runOnStartup(async (runtime) => {
  // Code to run on the loading screen.
  initializeFirebase();
  runtime.addEventListener("beforeprojectstart", () =>
    OnBeforeProjectStart(runtime)
  );
});

async function OnBeforeProjectStart(runtime) {
  // Code to run just before 'On start of layout' on the first layout.
  runtime.addEventListener("tick", () => Tick(runtime));
}

function Tick(runtime) {
  // Code to run every tick
}
