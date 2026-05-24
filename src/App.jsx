import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Home from './pages/Home'
import Blogs from './pages/Blogs'
import Posts from './pages/Posts'
import Photos from './pages/Photos'
import Repos from './pages/Repos'
import Navigation from './components/Navigation'
import CursorTrail from './components/CursorTrail'
import VinylPlayerOverlay from './components/VinylPlayerOverlay'
import './App.css'

// Page Transition Wrapper
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="w-full"
  >
    {children}
  </motion.div>
);

function App() {
  const location = useLocation();
  const [vinylOpen, setVinylOpen] = React.useState(false);

  const getCommand = (path) => {
    switch (path) {
      case '/posts': return './posts.sh --verbose';
      case '/photos': return './photos.sh --verbose';
      case '/blogs': return './blogs.sh --verbose';
      case '/repos': return './repos.sh --verbose';
      default: return './home.sh --verbose';
    }
  };

  // Input method tracking for focus styles
  React.useEffect(() => {
    const handleMouseDown = () => document.body.classList.remove('keyboard-nav');
    const handleKeyDown = (e) => {
      // Add class for navigation keys
      if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'j', 'k', '[', ']'].includes(e.key)) {
        document.body.classList.add('keyboard-nav');
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Developer Console CLI Easter Eggs & Konami Code Delight
  React.useEffect(() => {
    // 1. Welcome console printout
    console.log(
      `%c   _   _  _    ___ _  __ \n  | | | || |  / __| |/ / \n _| | |_  _| | (__| ' <  \n\\___/   |_|   \\___|_|\\_\\ \n`,
      'color: #ff3333; font-weight: bold;'
    );
    console.log(
      `%c》 Welcome fellow hacker! Curious how this digital garden is built?\nExplore console diagnostics: type %cjackHelp()%c in this console to initialize!`,
      'color: #85A1FF;',
      'color: #ff3333; font-weight: bold; background: #151515; padding: 2px 5px; border-radius: 4px; border: 1px solid #333;',
      'color: #85A1FF;'
    );

    // 2. Global Console Functions
    window.jackHelp = () => {
      console.log(
        `%cAVAILABLE CONSOLE MODULES:\n  %cneofetch()%c - Print system client diagnostics\n  %chire()%c     - Print contact credentials\n  %cmatrix()%c   - Toggle green code rain canvas overlay on the webpage!\n  %cglitch()%c   - Trigger a temporary webpage CRT glitch static shake!\n  %cvinyl()%c     - Activate fullscreen retro spinning turntable deck!`,
        'color: #888;',
        'color: #ff3333; font-weight: bold;', 'color: #888;',
        'color: #ff3333; font-weight: bold;', 'color: #888;',
        'color: #ff3333; font-weight: bold;', 'color: #888;',
        'color: #ff3333; font-weight: bold;', 'color: #888;',
        'color: #ff3333; font-weight: bold;', 'color: #888;'
      );
      return 'SYSTEM_INFO_READY';
    };

    window.vinyl = () => {
      setVinylOpen(true);
      return 'BOOTING RETRO TURNTABLE KERNEL...';
    };

    window.neofetch = () => {
      console.log(
        `%cOS: %cJackOS V3.0\n%cSHELL: %cZsh (Console Tactile Edition)\n%cRESOLUTION: %c${window.screen.width}x${window.screen.height}\n%cSTATUS: %c100% OPERATIONAL\n%cDID: %cdid:plc:4hawmtgzjx3vclfyphbhfn7v`,
        'color: #555;', 'color: #fff; font-weight: bold;',
        'color: #555;', 'color: #85A1FF; font-weight: bold;',
        'color: #555;', 'color: #fff;',
        'color: #555;', 'color: #22c55e; font-weight: bold;',
        'color: #555;', 'color: #ff3333; font-weight: bold;'
      );
      return 'DIAGNOSTICS_PRINTED';
    };

    window.hire = () => {
      console.log(
        `%c┌────────────────────────────────────────────────────────┐\n│ %cJACK // CREATIVE CODING PORTFOLIO                      %c│\n│ %cEMAIL:   jack@jglypt.net                              %c│\n│ %cBLUESKY: @j4ck.xyz                                    %c│\n│ %cWEBSITE: https://j4ck.xyz                              %c│\n└────────────────────────────────────────────────────────┘`,
        'color: #ff3333;',
        'color: #fff; font-weight: bold;', 'color: #ff3333;',
        'color: #aaa;', 'color: #ff3333;',
        'color: #aaa;', 'color: #ff3333;',
        'color: #aaa;', 'color: #ff3333;'
      );
      return 'BUSINESS_CARD_OPENED';
    };

    window.glitch = () => {
      const app = document.querySelector('.app');
      if (!app) return 'App wrapper not found!';
      app.classList.add('animate-glitch-1');
      setTimeout(() => {
        app.classList.remove('animate-glitch-1');
      }, 1000);
      return 'GLITCH OVERRIDE SECURED.';
    };

    window.matrix = () => {
      if (document.getElementById('matrix-overlay')) return 'Matrix cascade already active!';
      const canvas = document.createElement('canvas');
      canvas.id = 'matrix-overlay';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.zIndex = '99999';
      canvas.style.pointerEvents = 'none';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const matrixChars = "0101100101010101010101011100101010101010101".split("");
      const fontSize = 14;
      const columns = canvas.width / fontSize;
      const drops = Array(Math.floor(columns)).fill(1);

      let animationFrameId;
      let opacity = 1;
      let fading = false;

      const draw = () => {
        ctx.fillStyle = `rgba(0, 0, 0, ${fading ? 0.25 : 0.05})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = fading ? `rgba(34, 197, 94, ${opacity})` : "#22c55e";
        ctx.font = fontSize + "px monospace";

        for (let i = 0; i < drops.length; i++) {
          const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);

          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }

        if (fading) {
          opacity -= 0.02;
          if (opacity <= 0) {
            cancelAnimationFrame(animationFrameId);
            canvas.remove();
            return;
          }
        }
        animationFrameId = requestAnimationFrame(draw);
      };

      draw();

      setTimeout(() => {
        fading = true;
      }, 5000);

      return 'INITIALIZING DATA CASCADE MATRIX OVERLAY...';
    };

    // 3. Konami Code Listener
    let keys = [];
    const konami = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba';

    const handleKey = (e) => {
      keys.push(e.key);
      keys = keys.slice(-10);
      if (keys.join('') === konami) {
        setVinylOpen(true);
      }
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      // Clean up globals on unmount
      delete window.jackHelp;
      delete window.neofetch;
      delete window.hire;
      delete window.glitch;
      delete window.matrix;
      delete window.vinyl;
    };
  }, []);

  return (
    <div className="app bg-[var(--bg-color)] min-h-screen text-white font-mono selection:bg-red-500/30">
      <CursorTrail />
      <Navigation />

      {/* 
        Responsive Padding:
        Mobile: pt-4 (top), pb-32 (bottom nav + status line)
        Desktop: pt-24 (top nav), pb-12
      */}
      <main className="w-full max-w-[1200px] mx-auto pt-4 pb-32 md:pt-24 md:pb-12 px-4 flex flex-col items-center relative z-10">
        <div className="w-full text-right mb-4 font-mono text-xs text-[#666] hidden md:block">
          root@j4ck-xyz:~$ {getCommand(location.pathname)}
        </div>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/posts" element={<PageWrapper><Posts /></PageWrapper>} />
            <Route path="/photos" element={<PageWrapper><Photos /></PageWrapper>} />
            <Route path="/blogs" element={<PageWrapper><Blogs /></PageWrapper>} />
            <Route path="/repos" element={<PageWrapper><Repos /></PageWrapper>} />
          </Routes>
        </AnimatePresence>

        <footer className="text-center text-[#333] mt-12 text-xs w-full">
          SYSTEM_ID: J4CK-XYZ-V3 // <span className="text-red-900">TERMINAL_ACTIVE</span>
        </footer>
      </main>
      <VinylPlayerOverlay isOpen={vinylOpen} onClose={() => setVinylOpen(false)} />
    </div>
  )
}

export default App
