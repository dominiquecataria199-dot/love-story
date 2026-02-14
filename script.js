// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "TON_URL_SUPABASE";
const SUPABASE_KEY = "TA_CLE_ANON_SUPABASE";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DONNÉES GLOBALES ---
let quizData = { questions: [] };
let currentQIndex = 0;
let score = 0;

// Messages FUN (Aléatoires)
const goodVibes = [
  "T'es un(e) génie ! 😍",
  "L'amour rend intelligent ! 🧠",
  "Toi tu me connais ! 🔥",
  "Exactement ! 💖",
];
const badVibes = [
  "Tu sors d'où ? 😭",
  "Tu dors sur le balcon ce soir 🛋️",
  "Rupture imminente... 💔",
  "Sérieux ?! 😱",
  "Tu ne m'écoutes jamais ! 🙉",
];

// --- FONCTIONS CRÉATION ---
function addQuestionToForm() {
  // Cette fonction sert juste à valider le formulaire visuel dans index.html
  // Pour simplifier le code, on va lire directement les inputs fixes dans createQuiz()
}

async function createQuiz() {
  const creator = document.getElementById("creator").value;
  const partner = document.getElementById("partner").value;
  const reward = document.getElementById("reward").value;

  if (!creator || !partner) return alert("Mets les prénoms !");

  // Récupération des 3 questions (hardcodées pour simplifier l'UI)
  const questions = [];
  for (let i = 1; i <= 3; i++) {
    const q = document.getElementById(`q${i}`).value;
    const img =
      document.getElementById(`img${i}`).value ||
      "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif"; // Image par défaut si vide
    const good = document.getElementById(`good${i}`).value;
    const bad1 = document.getElementById(`bad${i}_1`).value;
    const bad2 = document.getElementById(`bad${i}_2`).value;

    // On mélange les options pour que la bonne réponse ne soit pas toujours la première
    let options = [
      { text: good, isCorrect: true },
      { text: bad1, isCorrect: false },
      { text: bad2, isCorrect: false },
    ];
    options = options.sort(() => Math.random() - 0.5);

    questions.push({ question: q, image: img, options: options });
  }

  const btn = document.querySelector(".btn");
  btn.innerText = "Création en cours...";

  const { data, error } = await supabase
    .from("fun_quizzes")
    .insert([
      {
        creator_name: creator,
        partner_name: partner,
        questions: questions,
        final_message: reward,
      },
    ])
    .select();

  if (error) {
    alert("Erreur: " + error.message);
  } else {
    const link = `${window.location.origin}/play.html?id=${data[0].id}`;
    document.getElementById("step-1").classList.add("hidden");
    document.getElementById("step-end").classList.remove("hidden");
    document.getElementById("share-link").value = link;
  }
}

// --- FONCTIONS JEU ---
async function initGame() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return alert("Pas d'ID de jeu !");

  const { data, error } = await supabase
    .from("fun_quizzes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return (document.body.innerHTML = "<h1>Quiz introuvable 😢</h1>");

  quizData = data;
  document.getElementById("p-name").innerText = quizData.partner_name;
  document.getElementById("c-name").innerText = quizData.creator_name;

  document.getElementById("loader").classList.add("hidden");
  document.getElementById("game-intro").classList.remove("hidden");
}

function startGame() {
  document.getElementById("game-intro").classList.add("hidden");
  document.getElementById("game-play").classList.remove("hidden");
  displayQuestion();
}

function displayQuestion() {
  const q = quizData.questions[currentQIndex];
  document.getElementById("q-img").src = q.image;
  document.getElementById("q-text").innerText = q.question;

  const optsDiv = document.getElementById("q-options");
  optsDiv.innerHTML = "";

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerText = opt.text;
    btn.onclick = () => handleAnswer(opt.isCorrect);
    optsDiv.appendChild(btn);
  });
}

function handleAnswer(isCorrect) {
  const feedback = document.getElementById("feedback");
  const feedbackText = document.getElementById("feedback-text");
  const feedbackEmoji = document.getElementById("feedback-emoji");

  feedback.classList.remove("hidden");

  if (isCorrect) {
    score++;
    feedbackEmoji.innerText = "😍";
    feedbackText.innerText =
      goodVibes[Math.floor(Math.random() * goodVibes.length)];
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  } else {
    feedbackEmoji.innerText = "😭";
    feedbackText.innerText =
      badVibes[Math.floor(Math.random() * badVibes.length)];
    document.querySelector(".app-container").classList.add("shake");
    setTimeout(
      () => document.querySelector(".app-container").classList.remove("shake"),
      500,
    );
  }

  setTimeout(() => {
    feedback.classList.add("hidden");
    nextQuestion();
  }, 2000); // 2 secondes pour lire le message fun
}

function nextQuestion() {
  currentQIndex++;
  if (currentQIndex < quizData.questions.length) {
    displayQuestion();
  } else {
    endGame();
  }
}

function endGame() {
  document.getElementById("game-play").classList.add("hidden");
  document.getElementById("game-end").classList.remove("hidden");

  const finalMsg = document.getElementById("final-msg");

  if (score === quizData.questions.length) {
    finalMsg.innerHTML = `<h2>100% de réussite ! 💍</h2><p>${quizData.final_message}</p>`;
    confetti({ particleCount: 200, spread: 100 });
  } else if (score === 0) {
    finalMsg.innerHTML = `<h2>0/${quizData.questions.length}... C'est la cata 😱</h2><p>Ton gage : Invite ${quizData.creator_name} au resto pour te faire pardonner !</p>`;
  } else {
    finalMsg.innerHTML = `<h2>${score}/${quizData.questions.length} - Pas mal !</h2><p>${quizData.final_message}</p>`;
  }
}

function copyLink() {
  const copyText = document.getElementById("share-link");
  copyText.select();
  document.execCommand("copy");
  alert("Copié ! Envoie-le sur WhatsApp 💌");
}
