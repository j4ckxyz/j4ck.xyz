import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ProfileCard = () => {
    const navigate = useNavigate();
    const [displayText, setDisplayText] = useState('j4ck');
    const [scrambling, setScrambling] = useState(false);
    const [terminalActive, setTerminalActive] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [history, setHistory] = useState([
        { text: 'Initializing j4ck.xyz terminal kernel...', type: 'system' },
        { text: 'Dynamic DID endpoint resolved: operational [100%]', type: 'system' },
        { text: "Type 'help' for available modules.", type: 'system' }
    ]);

    const roles = ['CREATIVE DEVELOPER', 'PHOTOGRAPHER', 'AT PROTOCOL GROWER', 'CREATIVE CODER'];
    const [roleText, setRoleText] = useState('');
    const [roleIndex, setRoleIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [typingSpeed, setTypingSpeed] = useState(150);

    useEffect(() => {
        let timer;
        const handleType = () => {
            const fullText = roles[roleIndex];
            if (!isDeleting) {
                // Typing
                setRoleText(fullText.substring(0, roleText.length + 1));
                setTypingSpeed(100 + Math.random() * 50); // slight variance

                if (roleText.length + 1 === fullText.length) {
                    // Fully typed, pause
                    setTypingSpeed(2000);
                    setIsDeleting(true);
                }
            } else {
                // Deleting
                setRoleText(fullText.substring(0, roleText.length - 1));
                setTypingSpeed(50);

                if (roleText.length === 0) {
                    setIsDeleting(false);
                    setRoleIndex((prev) => (prev + 1) % roles.length);
                    setTypingSpeed(500); // pause before starting next
                }
            }
        };

        timer = setTimeout(handleType, typingSpeed);
        return () => clearTimeout(timer);
    }, [roleText, isDeleting, roleIndex]);

    const terminalEndRef = useRef(null);
    const inputRef = useRef(null);

    const chars = '!@#$%^&*()_+{}:"<>?|[];\',./~`=-';
    const originalText = 'j4ck';

    // Scrambler trigger
    const scramble = () => {
        if (scrambling) return;
        setScrambling(true);
        let iterations = 0;
        const interval = setInterval(() => {
            setDisplayText(
                originalText
                    .split('')
                    .map((char, index) => {
                        if (index < iterations) {
                            return originalText[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('')
            );
            iterations += 1 / 3;
            if (iterations >= originalText.length) {
                clearInterval(interval);
                setDisplayText(originalText);
                setScrambling(false);
            }
        }, 35);
    };

    // Auto-scroll terminal to bottom
    useEffect(() => {
        if (terminalActive && terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, terminalActive]);

    // Handle terminal inputs
    const handleCommandSubmit = (e) => {
        e.preventDefault();
        const cmd = inputVal.trim().toLowerCase();
        if (!cmd) return;

        const newHistory = [...history, { text: `root@j4ck-xyz:~$ ${inputVal}`, type: 'input' }];

        switch (cmd) {
            case 'help':
                newHistory.push({
                    text: 'HELP MENU // AVAILABLE COMMANDS:\n  [neofetch] - Display system details & logo\n  [about]    - Print biography summary\n  [photos]   - Navigate to /photos\n  [posts]    - Navigate to /posts\n  [blogs]    - Navigate to /blogs\n  [clear]    - Wipe console log history\n  [exit]     - Collapse terminal emulator',
                    type: 'output'
                });
                break;
            case 'neofetch':
                newHistory.push({
                    text: '   _   _  _    ___ _  __ \n  | | | || |  / __| |/ / \n _| | |_  _| | (__| \' <  \n\\___/   |_|   \\___|_|\\_\\ \n--------------------\nOS: JackOS V3.0\nSHELL: Zsh (Tactile Mode)\nHOST: j4ck.xyz\nSTATUS: 100% OPERATIONAL\nACCENT: Crimson OKLCH\nFONT: Geist Sans & JetBrains Mono',
                    type: 'output'
                });
                break;
            case 'about':
                newHistory.push({
                    text: 'Jack is a designer, photographer, and creative coder growing custom digital gardens inside the ATmosphere protocol networks.',
                    type: 'output'
                });
                break;
            case 'photos':
                newHistory.push({ text: 'Redirecting to photography vault...', type: 'system' });
                setTimeout(() => navigate('/photos'), 800);
                break;
            case 'posts':
                newHistory.push({ text: 'Accessing latest micro-transmissions feed...', type: 'system' });
                setTimeout(() => navigate('/posts'), 800);
                break;
            case 'blogs':
                newHistory.push({ text: 'Opening articles and journals log...', type: 'system' });
                setTimeout(() => navigate('/blogs'), 800);
                break;
            case 'clear':
                setHistory([]);
                setInputVal('');
                return;
            case 'exit':
                setTerminalActive(false);
                setInputVal('');
                return;
            default:
                newHistory.push({ text: `command not found: ${cmd}. Type 'help' for suggestions.`, type: 'error' });
                break;
        }

        setHistory(newHistory);
        setInputVal('');
    };

    // Auto-focus input when console is clicked
    const focusConsole = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <motion.div
            className="bg-[var(--card-bg)] border border-[var(--border-color)] p-8 md:p-10 h-full flex flex-col justify-center relative overflow-hidden rounded-lg min-h-[256px] transition-all duration-300"
            layout
        >
            <AnimatePresence mode="wait">
                {!terminalActive ? (
                    /* STATIC RESTING SCREEN */
                    <motion.div
                        key="static"
                        className="z-10 relative flex flex-col justify-center h-full"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        <h1 
                            className="text-5xl md:text-8xl font-black tracking-tighter mb-2 uppercase leading-none select-none cursor-pointer"
                            onMouseEnter={scramble}
                            onClick={scramble}
                        >
                            {displayText}<span className="text-transparent font-extrabold" style={{ WebkitTextStroke: '2px var(--accent-red)', textStroke: '2px var(--accent-red)' }}>.xyz</span>
                        </h1>

                        <div className="font-mono text-[11px] md:text-xs text-[#888] mb-4 h-6 flex items-center select-none uppercase tracking-widest">
                            <span className="text-[var(--accent-red)] mr-2 font-bold">&gt;</span>
                            <span>{roleText}</span>
                            <span className="w-1.5 h-3.5 bg-[var(--accent-red)] ml-0.5 animate-pulse"></span>
                        </div>
                        
                        <div 
                            className="flex items-center gap-2 mb-6 cursor-pointer group/prompt w-fit"
                            onClick={() => setTerminalActive(true)}
                            title="Click prompt to initialize CLI terminal"
                        >
                            <div className="bg-[var(--accent-red)] h-1.5 w-24 group-hover/prompt:w-32 transition-all duration-300"></div>
                            <span className="text-[var(--accent-red)] text-xl font-bold animate-pulse">_</span>
                            <span className="text-[10px] font-mono text-[#444] group-hover/prompt:text-[var(--accent-red)] transition-colors duration-300 ml-2 uppercase tracking-widest opacity-0 group-hover/prompt:opacity-100">
                                [BOOT CLI]
                            </span>
                        </div>

                        <div className="inline-flex items-center bg-[oklch(11%_0.006_15)] px-4 py-2 rounded-lg border border-[var(--border-color)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] w-fit">
                            <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-3 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                            <span className="text-xs font-mono text-green-500 uppercase tracking-widest font-bold">
                                SYS_STATUS // OPERATIONAL
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    /* INTERACTIVE RETRO CLI SCREEN */
                    <motion.div
                        key="terminal"
                        className="z-10 relative flex flex-col h-full justify-between"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        onClick={focusConsole}
                    >
                        {/* Terminal Header */}
                        <div className="flex justify-between items-center border-b border-[oklch(20%_0.012_15)] pb-2 mb-3">
                            <div className="flex items-center gap-2 text-[#999] font-mono uppercase text-xs tracking-widest select-none">
                                <span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse"></span>
                                <span>CONSOLE_LINK // ACTIVE</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTerminalActive(false);
                                }}
                                className="text-xs text-[#555] hover:text-[var(--accent-red)] font-mono uppercase tracking-widest transition-colors focus:outline-none"
                                title="Exit console"
                            >
                                [X] CLOSE
                            </button>
                        </div>

                        {/* Console Readout logs */}
                        <div className="flex-1 overflow-y-auto max-h-[140px] font-mono text-[10px] space-y-1.5 pr-2 mb-3 scrollbar-thin select-text">
                            {history.map((log, index) => (
                                <div 
                                    key={index} 
                                    className={`whitespace-pre-wrap leading-relaxed ${
                                        log.type === 'system' ? 'text-green-500/80' :
                                        log.type === 'error' ? 'text-red-500/90 font-bold' :
                                        log.type === 'input' ? 'text-[#aaa]' : 'text-[#85A1FF]'
                                    }`}
                                >
                                    {log.text}
                                </div>
                            ))}
                            <div ref={terminalEndRef} />
                        </div>

                        {/* Interactive prompt line */}
                        <form onSubmit={handleCommandSubmit} className="flex items-center gap-1 border-t border-[oklch(20%_0.012_15)] pt-2 mt-auto font-mono text-xs">
                            <span className="text-[var(--accent-red)] select-none">root@j4ck-xyz:~$</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                className="flex-1 bg-transparent text-white focus:outline-none border-none caret-[var(--accent-red)] font-mono p-0"
                                autoFocus
                                placeholder="type command..."
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Decorative background elements */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-radial from-[#ff333315] to-transparent opacity-50 blur-3xl rounded-full transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style={{
                backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>
        </motion.div>
    );
};

export default ProfileCard;
