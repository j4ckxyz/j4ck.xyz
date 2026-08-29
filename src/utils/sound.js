// Short mechanical "thock" click, synthesized via Web Audio on each call —
// no asset to load, no base64 blob to ship.
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
