// Minimal "Thock" sound (short mechanical click)
// Base64 encoded WAV or MP3 is best for immediate playback without external fetching.
const CLICK_SOUND = "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICAf39/gYGBg4ODhISEhYWFhoaGh4eHiIiIiYmJiYmJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYCAgH9/f35+fn19fXx8fHt7e3p6enl5eXh4eHd3d3V1dXR0dHNzc3JycHFxcXBwcG9vb25ubm1tbWxsbGtraw==";

// Actually, let's use a slightly more real synthesized "thock" or simply a filtered short noise burst.
// For simplicity in a file, we can use the Web Audio API to synthesize a pleasant thock without a large base64 string.

let audioContext = null;

export const playKeySound = () => {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const t = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        // "Thock" characteristics: Low freq, short decay, filtered noise-like
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

        // Filter to dampen it
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        // Amplitude Envelope
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(t);
        osc.stop(t + 0.1);

        // Add a tiny bit of high freq noise for "click"
        const noiseBufferSize = audioContext.sampleRate * 0.05; // 0.05s
        const buffer = audioContext.createBuffer(1, noiseBufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;

        noiseGain.gain.setValueAtTime(0.05, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noise.start(t);

    } catch (e) {
        console.warn("Audio playback failed", e);
    }
};
