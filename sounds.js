// Simple sound effects using Web Audio API
// Plays click/open/login tones without requiring audio files.

const EMZY_Sound = (() => {
    let audioCtx = null;
    let hasInteracted = false;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;
            audioCtx = new AudioContext();
        }
        return audioCtx;
    }

    function playTone({ frequency = 440, duration = 0.14, type = 'sine', volume = 0.14, attack = 0.008, release = 0.09 }) {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + attack);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    function playClick() {
        playTone({ frequency: 480, duration: 0.08, type: 'triangle', volume: 1.0, attack: 0.01, release: 0.08 });
    }

    function playOpen() {
        playTone({ frequency: 280, duration: 0.18, type: 'sine', volume: 1.0, attack: 0.015, release: 0.12 });
    }

    function playLogin() {
        playTone({ frequency: 360, duration: 0.12, type: 'sine', volume: 1.0, attack: 0.012, release: 0.11 });
        setTimeout(() => playTone({ frequency: 440, duration: 0.1, type: 'sine', volume: 1.0, attack: 0.01, release: 0.08 }), 120);
    }

    function enableOpenOnFirstInteraction() {
        if (hasInteracted) return;
        hasInteracted = true;
        playOpen();
    }

    function bindGlobalInteractions() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!target) return;

            if (target.closest('button, a, input[type="submit"], input[type="button"], label')) {
                playClick();
                enableOpenOnFirstInteraction();
            }
        }, { capture: true });
    }

    return {
        bindGlobalInteractions,
        playClick,
        playOpen,
        playLogin
    };
})();

window.EMZY_Sound = EMZY_Sound;
