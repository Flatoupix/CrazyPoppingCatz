function initializeFirebase() {
  var script1 = document.createElement("script");
  var script2 = document.createElement("script");
  var script3 = document.createElement("script");

  script1.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js";
  script2.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js";
  script3.src =
    "https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js";

  document.body.appendChild(script1);
  document.body.appendChild(script2);
  document.body.appendChild(script3);

  script3.onload = function () {
    const firebaseConfig = {
      apiKey: "AIzaSyAJRNZLdK_d8O2Yv4n5gIcNzzDgGMola5U",
      authDomain: "crazy-popping-catz.firebaseapp.com",
      databaseURL: "https://crazy-popping-catz-default-rtdb.firebaseio.com",
      projectId: "crazy-popping-catz",
      storageBucket: "crazy-popping-catz.appspot.com",
      messagingSenderId: "463085913535",
      appId: "1:463085913535:web:44f72a7983b152e8b44d0a",
    };

    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    startFirebase();
  };
}
function initializeLeaderboard(db) {
  const levelsModes = ["normal", "sudden death", "sorting frenzy", "target"];
  let gameModeText = "";

  function submitScore(score, username, gameModeIndex) {
    gameModeText = levelsModes[gameModeIndex];
    const collectionName =
      "scores_" + gameModeText.toLowerCase().replace(" ", "_");
    const newScoreRef = db.collection(collectionName).doc();
    newScoreRef
      .set({
        username: username,
        score: score,
      })
      .then(() => {
        console.log("Score ajouté avec succès!");
        getScoresAndStore();
      })
      .catch((error) => {
        console.error("Erreur lors de l'ajout du score: ", error);
      });
  }

  function getScoresAndStore(callback) {
    levelsModes.map((mode) => {
      const collectionName = "scores_" + mode.toLowerCase().replace(" ", "_");
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
          return [];
        });
    });
  }

  function getScoresFromLocalStorage(gameModeIndex) {
    gameModeText = levelsModes[gameModeIndex];
    const collectionName =
      "scores_" + gameModeText.toLowerCase().replace(" ", "_");
    const scores = JSON.parse(localStorage.getItem(collectionName));
    return scores || [];
  }

  window.leaderboard = {
    submitScore,
    getScoresAndStore,
    getScoresFromLocalStorage,
  };
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
