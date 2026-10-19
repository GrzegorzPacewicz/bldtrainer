// Czytanie memo na głos (Web Speech API)

const speechSupported = 'speechSynthesis' in window;
let speechVoice = null;
let speechToken = 0;

function pickSpeechVoice() {
    const voices = speechSynthesis.getVoices();
    speechVoice = voices.find(v => v.lang === 'pl-PL' && v.localService)
        || voices.find(v => v.lang.toLowerCase().startsWith('pl'))
        || null;
}

if (speechSupported) {
    pickSpeechVoice();
    speechSynthesis.addEventListener('voiceschanged', pickSpeechVoice);
}

function isSpeechEnabled() {
    if (!speechSupported) return false;
    return localStorage.getItem('speakMemo') === 'on' || getCaseDisplayMode() === 'audio';
}

function getSpeechRate() {
    return parseFloat(localStorage.getItem('speechRate') ?? '1.2');
}

// Czyta memo case'a; onDone woła po skończeniu (lub od razu, gdy nie ma czego czytać)
function speakCase(info, onDone) {
    const token = ++speechToken;
    let fallback = null;
    const done = () => {
        if (token !== speechToken) return;
        speechToken++;
        clearTimeout(fallback);
        if (onDone) onDone();
    };

    if (!isSpeechEnabled() || !info?.memo) {
        if (onDone) onDone();
        return;
    }

    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(info.memo);
    u.lang = 'pl-PL';
    if (speechVoice) u.voice = speechVoice;
    u.rate = getSpeechRate();
    u.onend = done;
    u.onerror = done;
    // Android potrafi nie wywołać onend — zabezpieczenie
    fallback = setTimeout(done, 4000);
    speechSynthesis.speak(u);
}

function cancelSpeech() {
    speechToken++;
    if (speechSupported) speechSynthesis.cancel();
}

function initSpeechSetting() {
    const row = document.getElementById('speech-setting');
    if (!speechSupported) {
        row.style.display = 'none';
        return;
    }
    const buttons = row.querySelectorAll('button');
    const rateSelect = document.getElementById('speech-rate');
    const update = () => {
        const mode = localStorage.getItem('speakMemo') || 'off';
        buttons.forEach(b => b.classList.toggle('active', b.dataset.speak === mode));
    };
    buttons.forEach(b => b.addEventListener('click', () => {
        localStorage.setItem('speakMemo', b.dataset.speak);
        update();
    }));
    rateSelect.value = String(getSpeechRate());
    rateSelect.addEventListener('change', () => {
        localStorage.setItem('speechRate', rateSelect.value);
        speakCase({ memo: 'próba' });
    });
    update();
}
