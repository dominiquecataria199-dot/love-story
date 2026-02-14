// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = 'https://yidbfjramyyvpqvbejdu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGJmanJhbXl5dnBxdmJlamR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTIzNTcsImV4cCI6MjA4NjYyODM1N30.yM_g4rlfpQy_CmbPlH3QtJLltY70i45Rjy1BbQdB9rY';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- BANQUES DE DONNÉES FUN ---
const randomImages = [
    "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", // Cœur
    "https://media.giphy.com/media/l0HlPTbGpWEwjVxrW/giphy.gif", // Bisous
    "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif", // Amour
    "https://media.giphy.com/media/xT0xezQGU5xBeaKp56/giphy.gif", // Chat mignon
    "https://media.giphy.com/media/LpDmM2wSt6Hm5fKJVa/giphy.gif"  // Danse
];

const winGifs = [
    "https://media.giphy.com/media/l0amJzVHIAfl7jMDos/giphy.gif", // High five
    "https://media.giphy.com/media/artj9zzVshs1a/giphy.gif", // Celebration
    "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" // YES
];

const loseGifs = [
    "https://media.giphy.com/media/14aUO0Mf7dWDXW/giphy.gif", // NO GOD NO
    "https://media.giphy.com/media/BEob5qvFkZ3UI/giphy.gif", // Crying
    "https://media.giphy.com/media/l2JhtKtDWYNKdRpoA/giphy.gif" // Facepalm
];

const goodVibes = ["T'es un(e) génie ! 😍", "L'amour rend intelligent ! 🧠", "Toi tu me connais ! 🔥", "Exactement ! 💖"];
const badVibes = ["Tu sors d'où ? 😭", "Aïe... le canapé t'attend 🛋️", "C'est une blague ? 😱", "Tu ne m'écoutes jamais ! 🙉"];

// --- GLOBALS ---
let quizData = { questions: [] };
let currentQIndex = 0;
let score = 0;

// --- FONCTIONS CRÉATION ---

// Fonction pour remplir une image aléatoire
function setRandomImage(inputId) {
    const randomImg = randomImages[Math.floor(Math.random() * randomImages.length)];
    document.getElementById(inputId).value = randomImg;
}

async function createQuiz() {
    const creator = document.getElementById('creator').value;
    const partner = document.getElementById('partner').value;
    const reward = document.getElementById('reward').value;

    if(!creator || !partner) return alert("Il manque vos prénoms ! ❤️");

    const questions = [];
    for(let i=1; i<=3; i++) {
        const q = document.getElementById(`q${i}`).value;
        // Image par défaut si vide
        const img = document.getElementById(`img${i}`).value || "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif"; 
        const good = document.getElementById(`good${i}`).value;
        const bad1 = document.getElementById(`bad${i}_1`).value;
        const bad2 = document.getElementById(`bad${i}_2`).value;

        if(!q || !good || !bad1 || !bad2) {
            return alert(`Oups, tu as oublié de remplir la question ${i} !`);
        }

        // Mélange des réponses
        let options = [
            { text: good, isCorrect: true },
            { text: bad1, isCorrect: false },
            { text: bad2, isCorrect: false }
        ];
        options = options.sort(() => Math.random() - 0.5);

        questions.push({ question: q, image: img, options: options });
    }

    const btn = document.querySelector('.btn-create');
    btn.innerText = "Création en cours... ⏳";
    btn.disabled = true;

    const { data, error } = await db
        .from('fun_quizzes')
        .insert([{ 
            creator_name: creator, 
            partner_name: partner, 
            questions: questions, 
            final_message: reward 
        }])
        .select();

    btn.innerText = "GÉNÉRER LE QUIZ 🚀";
    btn.disabled = false;

    if(error) {
        alert("Erreur technique : " + error.message);
    } else {
        const link = `${window.location.origin}/play.html?id=${data[0].id}`;
        document.getElementById('creation-form').classList.add('hidden');
        document.getElementById('result-area').classList.remove('hidden');
        document.getElementById('share-link').value = link;
    }
}

function copyLink() {
    const copyText = document.getElementById("share-link");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert("Lien copié ! 💌");
    });
}

// --- FONCTIONS JEU ---
async function initGame() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if(!id) return; // Mode accueil

    const { data, error } = await db.from('fun_quizzes').select('*').eq('id', id).single();

    if(error || !data) {
        document.body.innerHTML = "<div class='container'><h1>Oups 😢</h1><p>Quiz introuvable.</p><a href='index.html' class='btn'>Créer le mien</a></div>";
        return;
    }

    quizData = data;
    document.getElementById('p-name').innerText = quizData.partner_name;
    document.getElementById('c-name').innerText = quizData.creator_name;
    
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('game-intro').classList.remove('hidden');
}

function startGame() {
    document.getElementById('game-intro').classList.add('hidden');
    document.getElementById('game-play').classList.remove('hidden');
    displayQuestion();
}

function displayQuestion() {
    const q = quizData.questions[currentQIndex];
    
    // Affichage Image
    document.getElementById('q-img').src = q.image;
    document.getElementById('q-text').innerText = q.question;
    document.getElementById('q-counter').innerText = `Question ${currentQIndex + 1} / 3`;
    
    const optsDiv = document.getElementById('q-options');
    optsDiv.innerHTML = "";

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.text;
        btn.onclick = () => handleAnswer(opt.isCorrect);
        optsDiv.appendChild(btn);
    });
}

function handleAnswer(isCorrect) {
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackGif = document.getElementById('feedback-gif');

    feedback.classList.remove('hidden');

    if(isCorrect) {
        score++;
        feedbackText.innerText = goodVibes[Math.floor(Math.random() * goodVibes.length)];
        feedbackText.style.color = "#2ecc71";
        feedbackGif.src = winGifs[Math.floor(Math.random() * winGifs.length)];
        if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
        feedbackText.innerText = badVibes[Math.floor(Math.random() * badVibes.length)];
        feedbackText.style.color = "#ff4b69";
        feedbackGif.src = loseGifs[Math.floor(Math.random() * loseGifs.length)];
        document.querySelector('.container').classList.add('shake');
        setTimeout(() => document.querySelector('.container').classList.remove('shake'), 500);
    }

    setTimeout(() => {
        feedback.classList.add('hidden');
        nextQuestion();
    }, 2500); // Un peu plus long pour voir le GIF
}

function nextQuestion() {
    currentQIndex++;
    if(currentQIndex < quizData.questions.length) {
        displayQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    document.getElementById('game-play').classList.add('hidden');
    document.getElementById('game-end').classList.remove('hidden');
    
    const finalMsg = document.getElementById('final-msg');
    
    if(score === quizData.questions.length) {
        finalMsg.innerHTML = `<h2>100% DE RÉUSSITE ! 💍</h2><p>${quizData.final_message}</p>`;
        if(typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 100 });
    } else if (score === 0) {
        finalMsg.innerHTML = `<h2>0/3... LA HONTE 😱</h2><p>Gage : Tu dois inviter ${quizData.creator_name} au resto !</p>`;
    } else {
        finalMsg.innerHTML = `<h2>Score : ${score}/3</h2><p>${quizData.final_message}</p>`;
    }
}
