// --- CONFIGURATION SUPABASE ---
// ⚠️ REMPLACE CES DEUX LIGNES PAR TES VRAIES INFOS ⚠️
const SUPABASE_URL = 'https://yidbfjramyyvpqvbejdu.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGJmanJhbXl5dnBxdmJlamR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTIzNTcsImV4cCI6MjA4NjYyODM1N30.yM_g4rlfpQy_CmbPlH3QtJLltY70i45Rjy1BbQdB9rY'; // Ta clé complète ici

// Initialisation sécurisée
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- VARIABLES GLOBALES (Déclarées tout en haut) ---
let questionCount = 0;
let quizData = null;
let currentQIndex = 0;
let localScore = 0;

const randomImages = [
    "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
    "https://media.giphy.com/media/l0HlPTbGpWEwjVxrW/giphy.gif",
    "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif",
    "https://media.giphy.com/media/xT0xezQGU5xBeaKp56/giphy.gif"
];

const goodVibes = ["T'es un(e) génie ! 😍", "L'amour rend intelligent ! 🧠", "Toi tu me connais ! 🔥"];
const badVibes = ["Tu sors d'où ? 😭", "Tu dors sur le balcon 🛋️", "Tu m'écoutes jamais ! 🙉"];

// ==========================================
// 1. PARTIE CRÉATION (index.html)
// ==========================================

function addQuestionField() {
    questionCount++; // On incrémente
    const container = document.getElementById('questions-container');
    if(!container) return;

    const html = `
    <div class="question-block" id="block-${questionCount}" style="animation: fadeIn 0.5s ease;">
        <div class="q-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0; color:#ff4b69;">Question ${questionCount}</h3>
            ${questionCount > 1 ? `<button type="button" onclick="document.getElementById('block-${questionCount}').remove()" style="width:auto; background:#ccc; padding:5px 10px; font-size:0.7rem; margin:0;">Supprimer 🗑️</button>` : ''}
        </div>
        
        <input type="text" class="q-input" placeholder="Ta question (ex: Quel est mon dessert favori ?)" required>
        
        <div style="position:relative; display:flex; gap:5px;">
            <input type="text" class="img-input" id="img-${questionCount}" placeholder="Lien image ou GIF (Optionnel)">
            <button type="button" onclick="setRandomImage('img-${questionCount}')" style="width:auto; margin:8px 0; padding:0 15px;">🎲</button>
        </div>
        
        <input type="text" class="good-input" placeholder="✅ La BONNE réponse" style="border-left: 5px solid #2ecc71;">
        <input type="text" class="bad1-input" placeholder="❌ Mauvaise réponse 1">
        <input type="text" class="bad2-input" placeholder="❌ Mauvaise réponse 2">
    </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function setRandomImage(id) {
    const randomImg = randomImages[Math.floor(Math.random() * randomImages.length)];
    document.getElementById(id).value = randomImg;
}

async function createQuiz() {
    const creator = document.getElementById('creator').value;
    const partner = document.getElementById('partner').value;
    const reward = document.getElementById('reward').value;

    const qBlocks = document.querySelectorAll('.question-block');
    let questions = [];
    let isValid = true;

    qBlocks.forEach(block => {
        const q = block.querySelector('.q-input').value;
        const img = block.querySelector('.img-input').value || randomImages[0];
        const good = block.querySelector('.good-input').value;
        const bad1 = block.querySelector('.bad1-input').value;
        const bad2 = block.querySelector('.bad2-input').value;

        if (!q || !good || !bad1 || !bad2) isValid = false;

        let options = [
            { text: good, isCorrect: true },
            { text: bad1, isCorrect: false },
            { text: bad2, isCorrect: false }
        ].sort(() => Math.random() - 0.5);

        questions.push({ question: q, image: img, options: options });
    });

    if (!creator || !partner || !isValid) return alert("Hé ! Remplis tout le formulaire stp ❤️");

    const btn = document.querySelector('.btn-create');
    btn.innerText = "Création du lien... ⏳";
    btn.disabled = true;

    try {
        const { data, error } = await db.from('fun_quizzes').insert([{ 
            creator_name: creator, 
            partner_name: partner, 
            questions: questions, 
            final_message: reward 
        }]).select();

        if (error) throw error;

        const quizId = data[0].id;
        const playLink = `${window.location.origin}${window.location.pathname.replace('index.html', '')}play.html?id=${quizId}`;
        const adminLink = `${window.location.origin}${window.location.pathname.replace('index.html', '')}dashboard.html?id=${quizId}`;

        document.getElementById('creation-form').classList.add('hidden');
        document.getElementById('result-area').classList.remove('hidden');
        
        document.getElementById('play-link-input').value = playLink;
        document.getElementById('admin-link-input').value = adminLink;
    } catch (err) {
        alert("Erreur Supabase: " + err.message);
        btn.disabled = false;
        btn.innerText = "GÉNÉRER LE QUIZ 🚀";
    }
}

// ==========================================
// 2. PARTIE JEU (play.html)
// ==========================================
async function initGame() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    const { data, error } = await db.from('fun_quizzes').select('*').eq('id', id).single();

    if (error || !data) {
        document.body.innerHTML = "<div class='container'><h1>Quiz introuvable 😢</h1></div>";
        return;
    }

    quizData = data;

    if (quizData.is_completed && !quizData.retry_allowed) {
        document.body.innerHTML = `
            <div class="container">
                <h1>⛔ STOP !</h1>
                <p>Tu as déjà joué. Score : <b>${quizData.player_score}/${quizData.questions.length}</b></p>
                <p>Demande à ${quizData.creator_name} de te donner une autre chance.</p>
            </div>`;
        return;
    }

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
    document.getElementById('q-img').src = q.image;
    document.getElementById('q-text').innerText = q.question;
    document.getElementById('q-counter').innerText = `Question ${currentQIndex + 1} / ${quizData.questions.length}`;
    
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
    feedback.classList.remove('hidden');

    if (isCorrect) {
        localScore++;
        feedbackText.innerText = goodVibes[Math.floor(Math.random() * goodVibes.length)];
        feedbackText.style.color = "#2ecc71";
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
        feedbackText.innerText = badVibes[Math.floor(Math.random() * badVibes.length)];
        feedbackText.style.color = "#ff4b69";
        document.querySelector('.container').classList.add('shake');
        setTimeout(() => document.querySelector('.container').classList.remove('shake'), 500);
    }

    setTimeout(() => {
        feedback.classList.add('hidden');
        currentQIndex++;
        if (currentQIndex < quizData.questions.length) displayQuestion();
        else endGame();
    }, 2000);
}

async function endGame() {
    document.getElementById('game-play').classList.add('hidden');
    document.getElementById('game-end').classList.remove('hidden');
    document.getElementById('score-title').innerText = `Score : ${localScore} / ${quizData.questions.length}`;
    document.getElementById('final-msg').innerText = quizData.final_message;

    await db.from('fun_quizzes').update({ 
        player_score: localScore, 
        is_completed: true, 
        retry_allowed: false 
    }).eq('id', quizData.id);
}

// ==========================================
// 3. PARTIE DASHBOARD (dashboard.html)
// ==========================================
async function initDashboard() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    loadDashboardData(id);
    setInterval(() => loadDashboardData(id), 5000); 
}

async function loadDashboardData(id) {
    const { data, error } = await db.from('fun_quizzes').select('*').eq('id', id).single();
    if(error) return;
    const statusDiv = document.getElementById('status-area');
    if(!data.is_completed) {
        statusDiv.innerHTML = `<div class="waiting">⏳ En attente de ${data.partner_name}...</div>`;
    } else {
        statusDiv.innerHTML = `
            <div class="result">
                <h2>Score : ${data.player_score} / ${data.questions.length}</h2>
                <button class="btn" onclick="allowRetry('${id}')" ${data.retry_allowed ? 'disabled' : ''}>
                    ${data.retry_allowed ? 'Chance accordée ✅' : '♻️ Donner une autre chance'}
                </button>
            </div>`;
    }
}

async function allowRetry(id) {
    await db.from('fun_quizzes').update({ retry_allowed: true, is_completed: false }).eq('id', id);
    alert("Autorisé ! Dis-lui de rafraîchir !");
}

function copyToClipboard(id) {
    const el = document.getElementById(id);
    el.select();
    document.execCommand("copy");
    alert("Copié !");
}
