
// --- CONFIGURATION SUPABASE ---
// ⚠️ REMETS TES CLÉS ICI (Celles que tu avais avant)
const SUPABASE_URL = 'https://yidbfjramyyvpqvbejdu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGJmanJhbXl5dnBxdmJlamR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTIzNTcsImV4cCI6MjA4NjYyODM1N30.yM_g4rlfpQy_CmbPlH3QtJLltY70i45Rjy1BbQdB9rY';

// CORRECTION ICI : On nomme la variable 'db' pour ne pas créer de conflit
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DONNÉES GLOBALES ---
let quizData = { questions: [] };
let currentQIndex = 0;
let score = 0;

// Messages FUN (Aléatoires)
const goodVibes = ["T'es un(e) génie ! 😍", "L'amour rend intelligent ! 🧠", "Toi tu me connais ! 🔥", "Exactement ! 💖"];
const badVibes = ["Tu sors d'où ? 😭", "Tu dors sur le balcon ce soir 🛋️", "Rupture imminente... 💔", "Sérieux ?! 😱", "Tu ne m'écoutes jamais ! 🙉"];

// --- FONCTIONS CRÉATION ---
async function createQuiz() {
    // On récupère les valeurs
    const creator = document.getElementById('creator').value;
    const partner = document.getElementById('partner').value;
    const reward = document.getElementById('reward').value;

    if(!creator || !partner) return alert("Hé ! Il faut mettre vos prénoms ! ❤️");

    // Récupération des 3 questions
    const questions = [];
    for(let i=1; i<=3; i++) {
        const q = document.getElementById(`q${i}`).value;
        const img = document.getElementById(`img${i}`).value || "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif"; 
        const good = document.getElementById(`good${i}`).value;
        const bad1 = document.getElementById(`bad${i}_1`).value;
        const bad2 = document.getElementById(`bad${i}_2`).value;

        // Vérification que les champs question/réponse sont remplis
        if(!q || !good || !bad1 || !bad2) {
            return alert(`Il manque des infos à la question ${i} !`);
        }

        // On mélange les options
        let options = [
            { text: good, isCorrect: true },
            { text: bad1, isCorrect: false },
            { text: bad2, isCorrect: false }
        ];
        options = options.sort(() => Math.random() - 0.5);

        questions.push({ question: q, image: img, options: options });
    }

    // Changement du bouton pour montrer que ça charge
    const btn = document.querySelector('.btn');
    const originalText = btn.innerText;
    btn.innerText = "Création en cours... ⏳";
    btn.disabled = true;

    // Envoi à Supabase (On utilise 'db' ici maintenant)
    const { data, error } = await db
        .from('fun_quizzes')
        .insert([{ 
            creator_name: creator, 
            partner_name: partner, 
            questions: questions, 
            final_message: reward 
        }])
        .select();

    // On remet le bouton normal
    btn.innerText = originalText;
    btn.disabled = false;

    if(error) {
        console.error(error);
        alert("Oups, erreur technique : " + error.message);
    } else {
        // Succès !
        const link = `${window.location.origin}/play.html?id=${data[0].id}`;
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-end').classList.remove('hidden');
        document.getElementById('share-link').value = link;
    }
}

function copyLink() {
    const copyText = document.getElementById("share-link");
    copyText.select();
    copyText.setSelectionRange(0, 99999); // Pour mobile
    
    try {
        navigator.clipboard.writeText(copyText.value).then(() => {
            alert("Lien copié ! Envoie-le vite 💌");
        });
    } catch (err) {
        alert("Copie manuelle : " + copyText.value);
    }
}

// --- FONCTIONS JEU ---
async function initGame() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if(!id) return; // On n'est pas sur la page de jeu

    // On utilise 'db' ici aussi
    const { data, error } = await db.from('fun_quizzes').select('*').eq('id', id).single();

    if(error || !data) {
        document.body.innerHTML = "<div class='app-container'><h1>Quiz introuvable 😢</h1><p>Le lien est peut-être cassé.</p></div>";
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
    
    // Gestion de l'image
    const imgEl = document.getElementById('q-img');
    if(q.image) {
        imgEl.src = q.image;
        imgEl.classList.remove('hidden');
    } else {
        imgEl.classList.add('hidden');
    }
    
    document.getElementById('q-text').innerText = q.question;
    
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
    const feedbackEmoji = document.getElementById('feedback-emoji');

    feedback.classList.remove('hidden');

    if(isCorrect) {
        score++;
        feedbackEmoji.innerText = "😍";
        feedbackText.innerText = goodVibes[Math.floor(Math.random() * goodVibes.length)];
        // Confetti seulement si la librairie est chargée
        if(typeof confetti !== 'undefined') {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
    } else {
        feedbackEmoji.innerText = "😭";
        feedbackText.innerText = badVibes[Math.floor(Math.random() * badVibes.length)];
        document.querySelector('.app-container').classList.add('shake');
        setTimeout(() => document.querySelector('.app-container').classList.remove('shake'), 500);
    }

    setTimeout(() => {
        feedback.classList.add('hidden');
        nextQuestion();
    }, 2000);
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
        finalMsg.innerHTML = `<h2>100% de réussite ! 💍</h2><p>${quizData.final_message}</p>`;
        if(typeof confetti !== 'undefined') {
            confetti({ particleCount: 200, spread: 100 });
        }
    } else if (score === 0) {
        finalMsg.innerHTML = `<h2>0/${quizData.questions.length}... C'est la cata 😱</h2><p>Ton gage : Invite ${quizData.creator_name} au resto pour te faire pardonner !</p>`;
    } else {
        finalMsg.innerHTML = `<h2>${score}/${quizData.questions.length} - Pas mal !</h2><p>${quizData.final_message}</p>`;
    }
}
