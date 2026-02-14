// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGJmanJhbXl5dnBxdmJlamR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTIzNTcsImV4cCI6MjA4NjYyODM1N30.yM_g4rlfpQy_CmbPlH3QtJLltY70i45Rjy1BbQdB9rY'; // ⚠️ REMPLACE ICI
const SUPABASE_KEY = 'TA-CLE-ANON'; // ⚠️ REMPLACE ICI

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- BANQUES DE DONNÉES FUN ---
const randomImages = [
    "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
    "https://media.giphy.com/media/l0HlPTbGpWEwjVxrW/giphy.gif",
    "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif",
    "https://media.giphy.com/media/xT0xezQGU5xBeaKp56/giphy.gif"
];
const goodVibes = ["Génie ! 😍", "Tu me connais trop bien ! 🔥", "Exact ! 💖"];
const badVibes = ["N'importe quoi 😭", "Tu dors dehors ce soir 🛋️", "Sérieux ?! 😱"];

// --- VARIABLES GLOBALES ---
let quizData = null;
let currentQIndex = 0;
let localScore = 0;
let questionCount = 0;

// ==========================================
// 1. PARTIE CRÉATION (index.html)
// ==========================================

function addQuestionField() {
    questionCount++;
    const container = document.getElementById('questions-container');
    
    const html = `
    <div class="question-block" id="block-${questionCount}">
        <div class="q-header">
            <h3>Question ${questionCount}</h3>
            ${questionCount > 1 ? `<button class="btn-delete" onclick="this.parentElement.parentElement.remove()">Supprimer 🗑️</button>` : ''}
        </div>
        
        <div class="input-group">
            <input type="text" class="q-input" placeholder="La question ?" required>
            <div style="position:relative;">
                <input type="text" class="img-input" id="img-${questionCount}" placeholder="Lien image/GIF (Optionnel)">
                <button class="random-btn" onclick="setRandomImage('img-${questionCount}')">🎲</button>
            </div>
            
            <input type="text" class="good-input" placeholder="✅ La BONNE réponse" style="border-left: 5px solid #2ecc71;">
            <input type="text" class="bad1-input" placeholder="❌ Mauvaise réponse 1" style="border-left: 5px solid #ff4b69;">
            <input type="text" class="bad2-input" placeholder="❌ Mauvaise réponse 2" style="border-left: 5px solid #ff4b69;">
        </div>
        <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #ff4b69;">
    </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function setRandomImage(id) {
    document.getElementById(id).value = randomImages[Math.floor(Math.random() * randomImages.length)];
}

async function createQuiz() {
    const creator = document.getElementById('creator').value;
    const partner = document.getElementById('partner').value;
    const reward = document.getElementById('reward').value;

    // Récupérer toutes les questions dynamiques
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

    if (!creator || !partner || !isValid) return alert("Remplis tout !");

    const btn = document.querySelector('.btn-create');
    btn.innerText = "Création...";
    btn.disabled = true;

    const { data, error } = await db.from('fun_quizzes').insert([{ 
        creator_name: creator, 
        partner_name: partner, 
        questions: questions, 
        final_message: reward 
    }]).select();

    if (error) {
        alert("Erreur: " + error.message);
        btn.disabled = false;
    } else {
        const quizId = data[0].id;
        const playLink = `${window.location.origin}/play.html?id=${quizId}`;
        const adminLink = `${window.location.origin}/dashboard.html?id=${quizId}`; // Lien secret

        document.getElementById('creation-form').classList.add('hidden');
        document.getElementById('result-area').classList.remove('hidden');
        
        document.getElementById('play-link-input').value = playLink;
        document.getElementById('admin-link-input').value = adminLink;
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

    if (error || !data) return document.body.innerHTML = "<h1>Quiz introuvable 😢</h1>";

    quizData = data;

    // VÉRIFICATION : Est-ce que le jeu est fini ?
    if (quizData.is_completed && !quizData.retry_allowed) {
        // Jeu bloqué
        document.body.innerHTML = `
            <div class="container" style="text-align:center;">
                <h1>⛔ STOP !</h1>
                <p>Tu as déjà joué. Ton score est enregistré : <b>${quizData.player_score}/${quizData.questions.length}</b></p>
                <p>Demande à ${quizData.creator_name} de débloquer une nouvelle chance !</p>
                <img src="https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif" style="width:100%; border-radius:10px;">
            </div>
        `;
        return;
    }

    // Si on a le droit de rejouer, on reset
    if (quizData.retry_allowed) {
        // On pourrait reset en base ici, mais on le fera à la fin
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
        if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
        feedbackText.innerText = badVibes[Math.floor(Math.random() * badVibes.length)];
        feedbackText.style.color = "#ff4b69";
        document.querySelector('.container').classList.add('shake');
        setTimeout(() => document.querySelector('.container').classList.remove('shake'), 500);
    }

    setTimeout(() => {
        feedback.classList.add('hidden');
        nextQuestion();
    }, 2000);
}

function nextQuestion() {
    currentQIndex++;
    if (currentQIndex < quizData.questions.length) {
        displayQuestion();
    } else {
        endGame();
    }
}

async function endGame() {
    document.getElementById('game-play').classList.add('hidden');
    document.getElementById('game-end').classList.remove('hidden');

    const finalMsg = document.getElementById('final-msg');
    const scoreTitle = document.getElementById('score-title');

    scoreTitle.innerText = `Score : ${localScore} / ${quizData.questions.length}`;

    if (localScore === quizData.questions.length) {
        finalMsg.innerHTML = `<p>${quizData.final_message}</p>`;
        if(typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 100 });
    } else {
        finalMsg.innerHTML = `<p>Aïe... C'est pas ouf. Attends de voir si ${quizData.creator_name} te laisse recommencer.</p>`;
    }

    // SAUVEGARDE EN BASE (Bloque le jeu)
    await db.from('fun_quizzes')
        .update({ 
            player_score: localScore, 
            is_completed: true, 
            retry_allowed: false 
        })
        .eq('id', quizData.id);
}

// ==========================================
// 3. PARTIE DASHBOARD (dashboard.html)
// ==========================================

async function initDashboard() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    // Rafraîchir les données toutes les 5 secondes pour voir si l'autre a joué
    loadDashboardData(id);
    setInterval(() => loadDashboardData(id), 5000); 
}

async function loadDashboardData(id) {
    const { data, error } = await db.from('fun_quizzes').select('*').eq('id', id).single();
    if(error) return;

    const statusDiv = document.getElementById('status-area');
    
    if(!data.is_completed) {
        statusDiv.innerHTML = `
            <div class="waiting-box">
                <h3>⏳ En attente...</h3>
                <p>${data.partner_name} n'a pas encore fini le quiz.</p>
            </div>`;
    } else {
        statusDiv.innerHTML = `
            <div class="result-box">
                <h1>Score : ${data.player_score} / ${data.questions.length}</h1>
                <p>${data.partner_name} a terminé.</p>
                <hr>
                <p>Est-ce que tu lui accordes une autre chance ?</p>
                <button class="btn" onclick="allowRetry('${id}')" ${data.retry_allowed ? 'disabled' : ''}>
                    ${data.retry_allowed ? 'Chance déjà accordée ✅' : '♻️ ACCORDER UNE CHANCE'}
                </button>
            </div>`;
    }
}

async function allowRetry(id) {
    if(confirm("Sûr ? L'ancien score sera effacé.")) {
        await db.from('fun_quizzes').update({ retry_allowed: true }).eq('id', id);
        alert("C'est bon, dis-lui de rafraîchir sa page !");
        loadDashboardData(id);
    }
}

function copyToClipboard(id) {
    const el = document.getElementById(id);
    el.select();
    el.setSelectionRange(0,99999);
    navigator.clipboard.writeText(el.value);
    alert("Copié !");
}
