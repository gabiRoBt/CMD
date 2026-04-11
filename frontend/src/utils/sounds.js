const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

export const isMusicMuted = () => {
    return localStorage.getItem('cmd_music_muted') === 'true';
};

export const isSfxMuted = () => {
    return localStorage.getItem('cmd_sfx_muted') === 'true';
};

export const toggleSfxMute = () => {
    const isMuted = !isSfxMuted();
    localStorage.setItem('cmd_sfx_muted', isMuted);
    if (isMuted && alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }
    return isMuted;
};

export const toggleMusicMute = () => {
    const isMuted = !isMusicMuted();
    localStorage.setItem('cmd_music_muted', isMuted);

    if (isMuted) {
        if (currentBgm) {
            currentBgm.pause();
        }
    } else {
        if (currentBgm && currentBgmId) {
            currentBgm.play().catch(e => console.warn('BGM could not auto-play: ' + e.message));
        }
    }
    return isMuted;
};

export const playTone = (frequency, type, duration, volume = 0.1) => {
    if (isSfxMuted()) return;
    try {
        const ctx = getCtx();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.error('Audio play error', e);
    }
};

export const playNoise = (duration, volume = 0.1) => {
    if (isSfxMuted()) return;
    try {
        const ctx = getCtx();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        noise.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.start();
    } catch (e) {
        console.error('Audio play error', e);
    }
};

let currentBgm = null;
let currentBgmId = null;

export const playBGM = (skinId) => {
    if (currentBgmId === skinId && currentBgm) {
        // Track is already playing, do not restart it
        if (!isMusicMuted() && currentBgm.paused) {
            currentBgm.play().catch(e => console.warn(e));
        }
        return;
    }

    if (currentBgm) {
        currentBgm.pause();
        currentBgm.currentTime = 0;
    }

    // You can add real music files in the public/assets/music folder
    // For example: public/assets/music/siberia.mp3
    const bgmUrls = {
        'lobby': '/assets/music/lobby.mp3',
        'classic': '/assets/music/siberia.mp3',
        'wasteland': '/assets/music/wasteland.mp3',
        'cyberpunk': '/assets/music/retro.mp3',
        'dev-mode': '/assets/music/dev-mode.mp3'
    };

    if (bgmUrls[skinId]) {
        currentBgmId = skinId;
        currentBgm = new Audio(bgmUrls[skinId]);
        currentBgm.loop = true;
        currentBgm.volume = 0.2;

        if (!isMusicMuted()) {
            currentBgm.play().catch(e => {
                // Autoplay might be blocked by browser until user interacts
                console.warn('BGM could not auto-play: ' + e.message);
            });
        }
    }
};

export const fadeOutBGM = (durationMs = 2000) => {
    if (!currentBgm || currentBgm.paused) return;

    const startVolume = currentBgm.volume;
    const steps = 20;
    const stepTime = durationMs / steps;
    const volumeStep = startVolume / steps;

    let step = 0;
    const fadeInterval = setInterval(() => {
        if (!currentBgm || currentBgm.paused) {
            clearInterval(fadeInterval);
            return;
        }
        step++;
        const newVol = Math.max(0, startVolume - volumeStep * step);
        currentBgm.volume = newVol;

        if (step >= steps || newVol === 0) {
            currentBgm.pause();
            currentBgm.volume = 0.2; // Reset volume for next manual playback
            clearInterval(fadeInterval);
            currentBgmId = null; // Clear so it can play anew when switching back
        }
    }, stepTime);
};

// Global interaction listener to bypass browser Audio Autoplay policies
if (typeof document !== 'undefined') {
    document.addEventListener('click', () => {
        if (!isMusicMuted() && currentBgm && currentBgm.paused) {
            currentBgm.play().catch(e => console.warn('Still cannot play BGM:', e));
        }
        const ctx = getCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    });
}

let alarmAudio = null;

export const sounds = {
    click: () => {
        // A much more subtle, less synthetic click (very short burst of noise and low tone)
        playTone(150, 'square', 0.05, 0.02);
        playNoise(0.02, 0.05);
    },
    ready: () => playTone(800, 'sine', 0.2, 0.1),
    countdownTick: () => playTone(100, 'square', 0.15, 0.1),
    countdownEnd: () => playTone(50, 'sawtooth', 0.8, 0.2),
    startAlarm: () => {
        if (isSfxMuted()) return;
        // You can add your nuke alarm file in the public/assets/sounds folder
        if (!alarmAudio) {
            alarmAudio = new Audio('/assets/music/nuke-alarm.mp3');
            alarmAudio.loop = false; // Does not loop, plays only once
            alarmAudio.volume = 0.5;
        }
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(e => console.warn('Alarm could not auto-play: ' + e.message));
    },
    stopAlarm: () => {
        if (alarmAudio) {
            alarmAudio.pause();
            alarmAudio.currentTime = 0;
        }
    },
    tvSwitch: () => {
        playNoise(0.3, 0.2);
        playTone(100, 'sawtooth', 0.2, 0.1);
    },
    abilityUse: () => {
        playTone(1200, 'square', 0.1, 0.05);
        setTimeout(() => playTone(800, 'square', 0.2, 0.05), 100);
    },
    win: () => {
        playTone(400, 'square', 0.2, 0.1);
        setTimeout(() => playTone(500, 'square', 0.2, 0.2), 200);
        setTimeout(() => playTone(600, 'square', 0.4, 0.2), 400);
    },
    lose: () => {
        playTone(300, 'sawtooth', 0.3, 0.1);
        setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 300);
        setTimeout(() => playTone(200, 'sawtooth', 0.5, 0.1), 600);
    },
    draw: () => {
        playTone(300, 'square', 0.5, 0.1);
        setTimeout(() => playTone(300, 'square', 0.5, 0.1), 500);
    }
};
