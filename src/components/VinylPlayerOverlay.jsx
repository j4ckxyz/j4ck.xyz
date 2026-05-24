import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VinylPlayerOverlay = ({ isOpen, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(33); // 33 or 45 RPM
    const [volume, setVolume] = useState(0.5); // 0 to 1
    const [isMuted, setIsMuted] = useState(false);
    const [particles, setParticles] = useState([]);
    
    const audioCtxRef = useRef(null);
    const synthIntervalRef = useRef(null);
    const loopStartTimeRef = useRef(0);
    const activeOscillatorsRef = useRef([]);

    // Trigger Queen bassline play
    const stopAudio = () => {
        if (synthIntervalRef.current) {
            clearInterval(synthIntervalRef.current);
            synthIntervalRef.current = null;
        }
        activeOscillatorsRef.current.forEach(osc => {
            try { osc.stop(); } catch (e) {}
        });
        activeOscillatorsRef.current = [];
    };

    const playChiptune = () => {
        stopAudio();

        if (!isPlaying) return;

        // Initialize AudioContext
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const tempo = speed === 33 ? 108 : 144; // BPM changes based on record speed!
        const beatDuration = 60 / tempo;
        
        // Notes for "Another One Bites the Dust" chiptune bass
        const notes = [
            { freq: 87.31, dur: 0.25, time: 0 },         // F2
            { freq: 87.31, dur: 0.25, time: 0.5 },       // F2
            { freq: 87.31, dur: 0.25, time: 1.0 },       // F2
            { freq: 87.31, dur: 0.15, time: 1.75 },      // F2
            { freq: 87.31, dur: 0.25, time: 2.25 },      // F2
            { freq: 87.31, dur: 0.25, time: 2.5 },       // F2
            { freq: 103.83, dur: 0.35, time: 3.0 },      // Ab2
            { freq: 87.31, dur: 0.25, time: 3.5 },       // F2
            { freq: 116.54, dur: 0.5, time: 3.75 }       // Bb2
        ];
        const loopDuration = 4.5; // total loop duration in seconds

        loopStartTimeRef.current = audioCtx.currentTime;

        const scheduleNextLoop = () => {
            const currentVol = isMuted ? 0 : volume;
            notes.forEach(n => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'triangle'; // Retro triangle chiptune bass
                osc.frequency.setValueAtTime(n.freq, loopStartTimeRef.current + n.time);

                gain.gain.setValueAtTime(currentVol * 0.35, loopStartTimeRef.current + n.time);
                gain.gain.exponentialRampToValueAtTime(0.001, loopStartTimeRef.current + n.time + n.dur);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(loopStartTimeRef.current + n.time);
                osc.stop(loopStartTimeRef.current + n.time + n.dur);

                activeOscillatorsRef.current.push(osc);
            });
            loopStartTimeRef.current += loopDuration;
        };

        scheduleNextLoop();

        // Check and schedule next loop ahead of time
        synthIntervalRef.current = setInterval(() => {
            if (audioCtx.currentTime > loopStartTimeRef.current - 1.0) {
                scheduleNextLoop();
            }
            // Clean up old oscillators
            activeOscillatorsRef.current = activeOscillatorsRef.current.filter(osc => {
                try {
                    return osc.playbackState !== 'finished';
                } catch (e) {
                    return true;
                }
            });
        }, 1000);
    };

    // Effect to start/stop audio play based on toggles
    useEffect(() => {
        if (isOpen && isPlaying) {
            playChiptune();
        } else {
            stopAudio();
        }
        return () => stopAudio();
    }, [isPlaying, speed, volume, isMuted, isOpen]);

    // Handle floating note particles when playing
    useEffect(() => {
        if (!isPlaying || !isOpen) return;

        const emojis = ['🎵', '🎶', '👑', '🎸', '🎹'];
        const interval = setInterval(() => {
            setParticles(prev => [
                ...prev,
                {
                    id: Math.random(),
                    emoji: emojis[Math.floor(Math.random() * emojis.length)],
                    x: Math.random() * 40 - 20, // offset
                    y: 0,
                    scale: Math.random() * 0.5 + 0.8,
                    rotate: Math.random() * 60 - 30
                }
            ].slice(-15)); // Cap at 15 particles
        }, 400);

        return () => clearInterval(interval);
    }, [isPlaying, isOpen]);

    // Cleanup particles on exit
    useEffect(() => {
        if (!isOpen) {
            setIsPlaying(false);
            setParticles([]);
            stopAudio();
        }
    }, [isOpen]);

    // Close vinyl on esc key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Calculate spin duration based on speed selection
    const spinDuration = speed === 33 ? '1.8s' : '1.33s';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-md bg-black/90 p-4 font-mono select-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Header Diagnostics */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-xs tracking-widest text-[#555]">
                        <div>SYSTEM_LINK // VINYL_PLAYER_V1.0</div>
                        <button 
                            onClick={onClose}
                            className="text-[#999] hover:text-[var(--accent-red)] transition-colors border border-[#333] px-3 py-1.5 rounded bg-[oklch(18%_0.012_15)] focus:outline-none"
                        >
                            [X] SHUTDOWN SYSTEM
                        </button>
                    </div>

                    {/* Turntable Platter Deck Container */}
                    <motion.div 
                        className="bg-[oklch(18%_0.012_15)] border border-[oklch(26%_0.018_15)] p-8 rounded-2xl relative shadow-2xl flex flex-col md:flex-row items-center gap-10 max-w-3xl w-full"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        {/* Turntable Platter (Vinyl Record) */}
                        <div className="relative w-64 h-64 md:w-80 md:h-80 bg-[oklch(14%_0.008_15)] rounded-full flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8),_0_10px_30px_rgba(0,0,0,0.5)] border-4 border-[oklch(22%_0.015_15)] overflow-hidden">
                            
                            {/* Vinyl Grooves Graphic */}
                            <motion.div 
                                className="w-full h-full rounded-full relative flex items-center justify-center border border-neutral-900"
                                style={{
                                    backgroundImage: 'repeating-radial-gradient(circle at center, #0f0f0f, #0f0f0f 1px, #181818 2px, #080808 3px)',
                                    animation: isPlaying ? `spin ${spinDuration} linear infinite` : 'none'
                                }}
                            >
                                {/* Record center label */}
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-[oklch(40%_0.15_15)] border-4 border-[#121212] flex flex-col items-center justify-center text-center p-2 relative shadow-inner">
                                    {/* Record track label text */}
                                    <div className="text-[7px] text-white/40 tracking-widest uppercase mb-1 font-bold">QUEEN IN CONCERT</div>
                                    <div className="text-[8px] md:text-[9px] text-[#ff3333] font-bold tracking-tighter uppercase leading-tight font-sans">
                                        ANOTHER ONE BITES THE DUST
                                    </div>
                                    <div className="text-[7px] text-white/50 tracking-wider uppercase mt-1">CHIPTUNE SYNTH</div>
                                    
                                    {/* Record center spindle hole */}
                                    <div className="w-3 h-3 bg-black border border-white/20 rounded-full mt-2 shadow-inner"></div>
                                </div>
                            </motion.div>

                            {/* Stylus floating particle notes emitter point (Bottom Right edge of center label area) */}
                            {isPlaying && (
                                <div className="absolute top-[35%] right-[22%] pointer-events-none z-30">
                                    {particles.map(p => (
                                        <motion.div
                                            key={p.id}
                                            className="absolute text-sm font-sans pointer-events-none select-none text-red-500/80 drop-shadow-[0_0_6px_rgba(255,51,51,0.6)]"
                                            initial={{ opacity: 1, y: 0, x: p.x, scale: 0.4, rotate: p.rotate }}
                                            animate={{ opacity: 0, y: -90, x: p.x + (Math.random() * 30 - 15), scale: p.scale * 1.3, rotate: p.rotate + 45 }}
                                            transition={{ duration: 1.8, ease: "easeOut" }}
                                        >
                                            {p.emoji}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mechanical Tonearm Assembly */}
                        <div className="absolute top-0 right-16 md:right-32 w-16 h-40 pointer-events-none z-20">
                            {/* Tonearm base ring */}
                            <div className="absolute top-10 right-2 w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-700 shadow-md"></div>
                            
                            {/* Rotational pivot arm */}
                            <motion.div 
                                className="absolute top-14 right-[18px] w-2.5 h-36 origin-[5px_0px] bg-gradient-to-b from-neutral-600 to-neutral-400 rounded shadow-sm flex flex-col justify-end items-center"
                                animate={{ rotate: isPlaying ? 24 : 0 }}
                                transition={{ type: "spring", stiffness: 60, damping: 12 }}
                            >
                                {/* Mechanical pick-up cartridge/needle head */}
                                <div className="w-4 h-6 bg-[oklch(58%_0.18_15)] border border-black shadow rounded-sm transform translate-y-3 relative flex items-center justify-center">
                                    <div className="w-0.5 h-3 bg-neutral-900 absolute left-1"></div>
                                    <div className="text-[6px] text-white/50 origin-center rotate-90 scale-[0.8] font-sans font-bold">SHURE</div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Deck Dashboard Controls Panel */}
                        <div className="flex-1 flex flex-col justify-between gap-6 w-full relative z-10">
                            {/* Digital HUD Screen */}
                            <div className="bg-[oklch(11%_0.006_15)] border border-[oklch(26%_0.018_15)] rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                                <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-widest border-b border-neutral-900 pb-2 mb-2">
                                    <span>DECK_STATUS</span>
                                    <span className={isPlaying ? "text-green-500 animate-pulse font-bold" : "text-neutral-600 font-bold"}>
                                        {isPlaying ? `PLAYING @ ${speed}RPM` : "OFFLINE // STANDBY"}
                                    </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">FORMAT:</span>
                                        <span className="text-[#85A1FF] font-bold">12" VINYL LP // MONO</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">MELODY:</span>
                                        <span className="text-[#ccc] font-bold">ANOTHER ONE BITES THE DUST</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">SYNTH:</span>
                                        <span className="text-green-500 font-bold">TRIANGLE_WAVE_OSC</span>
                                    </div>
                                </div>
                            </div>

                            {/* Play / Stop Switch Selector */}
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <label className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold">POWER CONTROLLER</label>
                                    <button 
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        className={`w-full py-4 rounded-xl border font-bold text-sm transition-all duration-200 shadow-md ${
                                            isPlaying 
                                                ? "bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(255,51,51,0.2)]" 
                                                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                                        }`}
                                    >
                                        {isPlaying ? "⏺ DISENGAGE PLATTER" : "▶ ACTIVATE TURNTABLE"}
                                    </button>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold text-center">SPEED</label>
                                    <div className="flex bg-[oklch(14%_0.008_15)] border border-[oklch(26%_0.018_15)] p-1 rounded-xl gap-1">
                                        {[33, 45].map(rpm => (
                                            <button
                                                key={rpm}
                                                onClick={() => setSpeed(rpm)}
                                                className={`px-3.5 py-2 text-xs rounded-lg font-bold transition-all ${
                                                    speed === rpm 
                                                        ? "bg-[oklch(58%_0.18_15)] text-white shadow" 
                                                        : "text-neutral-500 hover:text-neutral-300"
                                                }`}
                                            >
                                                {rpm}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Volume and Audio Toggles */}
                            <div className="border-t border-neutral-900 pt-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                                    <span>VOLUME DECAY_LEVEL</span>
                                    <span>{isMuted ? "MUTED" : `${Math.round(volume * 100)}%`}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setIsMuted(!isMuted)}
                                        className={`w-12 h-10 border rounded-lg flex items-center justify-center text-xs transition-colors ${
                                            isMuted 
                                                ? "bg-red-500/10 border-red-500 text-red-500" 
                                                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
                                        }`}
                                        title={isMuted ? "Unmute audio" : "Mute audio"}
                                    >
                                        {isMuted ? "🔇" : "🔊"}
                                    </button>
                                    <input 
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volume}
                                        onChange={(e) => {
                                            setVolume(parseFloat(e.target.value));
                                            if (isMuted) setIsMuted(false);
                                        }}
                                        className="flex-1 accent-[oklch(58%_0.18_15)] cursor-pointer bg-neutral-800 h-1 rounded"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* CSS Spin Keyframes */}
                    <style>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VinylPlayerOverlay;
