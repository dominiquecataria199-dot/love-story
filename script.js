// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = 'https://yidbfjramyyvpqvbejdu.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGJmanJhbXl5dnBxdmJlamR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTIzNTcsImV4cCI6MjA4NjYyODM1N30.yM_g4rlfpQy_CmbPlH3QtJLltY70i45Rjy1BbQdB9rY'; 

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- VARIABLES GLOBALES ---
let questionCount = 0;
let quizData = null;
let currentQIndex = 0;
let localScore = 0;

const randomImages = [
    "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
    "https://media.giphy.com/media/l0HlPTbGpWEwjVxrW/giphy.gif",
    "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif"
];

const winGifs = [
    "https://media.giphy.com/media/l0amJzVHIAfl7jMDos/giphy.gif",
    "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif"
];

const loseGifs = [
    "https://media.giphy.com/media/14aUO0Mf7dWDXW/giphy.gif",
    "https://media.giphy.com/media/BEob5qvFkZ3UI/giphy.gif"
];

// ==========================================
// 1. PARTIE CRÉATION (index.html)
// ==========================================

function addQuestionField() {
    questionCount++;
    const container = document.getElementById('questions-container');
    if(!container) return;

    const html = `
    <div class="question-block" id="block-${questionCount}" style="background:#fff; padding:15px; border-radius:15px; margin-bottom:20px; border:1px solid #eee; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0; color:#ff4b69;">Question ${questionCount}</h3>
            ${questionCount > 1 ? `<button type="button" onclick="this.parentElement.parentElement.remove()" style="width:auto; background:#eee; color:#666; padding:5px 10px; font-size:0.7rem;">Supprimer</button>` : ''}
        </div>
        
        <input type="text" class="q-input" placeholder="Ta question..." required>
        
        <div style="background:#f9f9f9; padding:10px; border-radius:10px; margin:10px 0;">
            <label style="font-size:0.8rem; color:#ff4b69; font-weight:bold;">📸 Photo de ta galerie (Optionnel) :</label>
            <input type="file" class="img-file" accept="image/*" style="border:none; background:none;">
        </div>
        
        <input type="text" class="good-input" placeholder="✅ La BONNE réponse" style="border-left: 5px solid #2ecc71;">
        <input type="text" class="bad1-input" placeholder="❌ Mauvaise réponse 1">
        <input type="text" class="bad2-input" placeholder="❌ Mauvaise réponse 2">
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

// Fonction pour uploader l'image vers Supabase Storage
async function uploadFile(file) {
    if (!file) return randomImages[Math.floor(Math.random() * randomImages.length)];
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await db.storage.from('quiz-images').upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = db.storage.from('quiz-images').getPublicUrl(fileName);
    return urlData.publicUrl;
}

async function createQuiz() {
    const creator = document.getElementById('creator').value;
    const partner = document.getElementById('partner').value;
    const reward = document.getElementById('reward').value;
    const qBlocks = document.querySelectorAll('.question-block');

    if (!creator || !partner || qBlocks.length === 0) return alert("Remplis les prénoms ! ❤️");

    const btn = document.querySelector('.btn-create');
    btn.innerText = "Téléchargement des images... ⏳";
    btn.disabled = true;

    try {
        let questions = [];
        for (let block of qBlocks) {
            const file = block.querySelector('.img-file').files[0];
            const imgUrl = await uploadFile(file);

            questions.push({
                question: block.querySelector('.q-input').value,
                image: imgUrl,
                options: [
                    { text: block.querySelector('.good-input').value, isCorrect: true },
                    { text: block.querySelector('.bad1-input').value, isCorrect: false },
                    { text: block.querySelector('.bad2-input').value, isCorrect: false }
                ].sort(() => Math.random() - 0.5)
            });
        }

        const { data, error } = await db.from('fun_quizzes').insert([{ 
            creator_name: creator, 
            partner_name: partner, 
            questions: questions, 
            final_message: reward 
        }]).select();

        if (error) throw error;

        const quizId = data[0].id;
        document.getElementById('creation-form').classList.add('hidden');
        document.getElementById('result-area').classList.remove('hidden');
        document.getElementById('play-link-input').value = `${window.location.origin}${window.location.pathname.replace('index.html', '')}play.html?id=${quizId}`;
        document.getElementById('admin-link-input').value = `${window.location.origin}${window.location.pathname.replace('index.html', '')}dashboard.html?id=${quizId}`;

    } catch (err) {
        alert("Erreur: " + err.message);
        btn.disabled = false;
        btn.innerText = "GÉNÉRER LE QUIZ 🚀";
    }
}

// ==========================================
// 2. PARTIE JEU (play.html)
// ==========================================

async function initGame() {
    createFloatingHearts(); 
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    const { data, error } = await db.from('fun_quizzes').select('*').eq('id', id).single();
    if (error || !data) return document.body.innerHTML = "<h1>Quiz introuvable 😢</h1>";

    quizData = data;

    if (quizData.is_completed && !quizData.retry_allowed) {
        document.body.innerHTML = `
            <div class="container">
                <h1>⛔ STOP !</h1>
                <p>Tu as déjà joué. Score : <b>${quizData.player_score}/${quizData.questions.length}</b></p>
                <p>Demande à ${quizData.creator_name} de te donner une autre chance.</p>
                <img src="${loseGifs[0]}" style="width:100%; border-radius:15px; margin-top:15px;">
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

    updateProgressBar(); 
}

function handleAnswer(isCorrect) {
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackGif = document.getElementById('feedback-gif');
    feedback.classList.remove('hidden');

    if (isCorrect) {
        localScore++;
        feedbackText.innerText = "Correct ! 😍";
        feedbackGif.src = winGifs[Math.floor(Math.random() * winGifs.length)];
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
        feedbackText.innerText = "Faux... 😭";
        feedbackGif.src = loseGifs[Math.floor(Math.random() * loseGifs.length)];
        document.querySelector('.container').classList.add('shake');
        setTimeout(() => document.querySelector('.container').classList.remove('shake'), 500);
    }

    setTimeout(() => {
        feedback.classList.add('hidden');
        currentQIndex++;
        if (currentQIndex < quizData.questions.length) displayQuestion();
        else endGame();
    }, 2500);
}






async function endGame() {
    // 1. Bascule d'affichage des zones
    document.getElementById('game-play').classList.add('hidden');
    document.getElementById('game-end').classList.remove('hidden');
    
    const scorePercent = (localScore / quizData.questions.length) * 100;
    const finalMsg = document.getElementById('final-msg');
    const scratchCard = document.getElementById('scratch-card'); // L'élément container du secret
    const scoreTitle = document.getElementById('score-title');

    // Affichage du score brut
    scoreTitle.innerText = `${localScore} / ${quizData.questions.length}`;

    // 2. RÈGLE DES 90% + INTERACTION CARTE À GRATTER
    if (scorePercent >= 90) {
        // CAS SUCCÈS : On affiche le message de félicitations et on prépare le secret
        finalMsg.innerHTML = `
            <h2 style="color:#2ecc71">FÉLICITATIONS ! 🎉</h2>
            <p>Prouvé à 100% ! Tu as gagné le droit de voir mon secret.</p>
            <p class="text-small">Gratte l'image ci-dessous avec ton doigt ou ta souris :</p>
        `;
        
        // On injecte le secret dans la zone de texte cachée
        document.getElementById('final-reward').innerText = quizData.final_message;
        
        // On s'assure que la carte à gratter est visible
        scratchCard.classList.remove('hidden');
        
        // Grand bouquet de confettis
        confetti({ 
            particleCount: 200, 
            spread: 100, 
            origin: { y: 0.6 },
            colors: ['#ff4b69', '#2ecc71', '#ffffff']
        });
    } else {
        // CAS ÉCHEC : On affiche le message de déception et on cache le secret
        finalMsg.innerHTML = `
            <h2 style="color:#ff4b69">ÉCHEC... 💔</h2>
            <p>Tu n'as que ${Math.round(scorePercent)}%. Il faut au moins 90% pour voir mon secret.</p>
            <div class="reward-box" style="background: #fdfdfd; color: #999;">
                🔒 Secret verrouillé. Tu ne me connais pas encore assez bien...
            </div>
        `;
        
        // On cache la carte à gratter pour qu'il ne puisse rien voir
        scratchCard.classList.add('hidden');
    }

    // 3. SAUVEGARDE ET VERROUILLAGE DANS SUPABASE
    try {
        await db.from('fun_quizzes').update({ 
            player_score: localScore, 
            is_completed: true,
            retry_allowed: false // Bloqué par défaut jusqu'à ce que tu autorises dans ton dashboard
        }).eq('id', quizData.id);
    } catch (err) {
        console.error("Erreur lors de la sauvegarde du score:", err);
    }
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
        statusDiv.innerHTML = `<p>⌛ ${data.partner_name} n'a pas encore fini...</p>`;
    } else {
        const percent = (data.player_score / data.questions.length) * 100;
        statusDiv.innerHTML = `
            <div style="background:#f9f9f9; padding:20px; border-radius:15px;">
                <h2>Score : ${data.player_score} / ${data.questions.length} (${Math.round(percent)}%)</h2>
                <p>${percent >= 90 ? '✅ Secret débloqué !' : '❌ Secret resté caché.'}</p>
                <button class="btn" onclick="allowRetry('${id}')" style="background:#6c5ce7;">
                    ♻️ Lui donner une autre chance
                </button>
            </div>`;
    }
}

async function allowRetry(id) {
    await db.from('fun_quizzes').update({ retry_allowed: true, is_completed: false }).eq('id', id);
    alert("Autorisé ! Il/Elle peut recommencer.");
}

function copyToClipboard(id) {
    const el = document.getElementById(id);
    el.select();
    document.execCommand("copy");
    alert("Copié !");
}



// --- EFFETS VISUELS ET INTERACTIONS ---

// 1. Fonction pour générer les cœurs volants
function createFloatingHearts() {
    setInterval(() => {
        const heart = document.createElement('div');
        // On varie les plaisirs avec plusieurs emojis
        heart.innerHTML = ['❤️', '💖', '💘', '💕', '✨'][Math.floor(Math.random() * 5)];
        heart.className = 'heart-bg';
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.animationDuration = (Math.random() * 3 + 2) + 's'; // Vitesse entre 2 et 5s
        heart.style.opacity = Math.random();
        heart.style.fontSize = (Math.random() * 15 + 15) + 'px'; // Taille variée
        document.body.appendChild(heart);
        
        // On supprime l'élément après l'animation pour ne pas alourdir le navigateur
        setTimeout(() => heart.remove(), 5000);
    }, 400); // Un nouveau cœur toutes les 400ms
}

// 2. Fonction pour mettre à jour la barre de progression
function updateProgressBar() {
    if (!quizData) return;
    const percent = (currentQIndex / quizData.questions.length) * 100;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = percent + '%';
}

// 3. Fonction pour révéler le secret à gratter
function revealSecret() {
    const card = document.getElementById('scratch-card');
    if (card) {
        card.classList.add('revealed');
        // Explosion de joie !
        confetti({ 
            particleCount: 150, 
            spread: 70, 
            origin: { y: 0.6 },
            colors: ['#ff4b69', '#ff9a9e', '#ffffff']
        });
    }
}
