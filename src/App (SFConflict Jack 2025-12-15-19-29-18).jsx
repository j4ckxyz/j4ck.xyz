import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import Home from './pages/Home'
import Blogs from './pages/Blogs'
import Photos from './pages/Photos'
import Repos from './pages/Repos'
import Navigation from './components/Navigation'
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

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Tab' || e.key.startsWith('Arrow') || ['j', 'k', '[', ']'].includes(e.key.toLowerCase())) {
        document.body.classList.add('user-is-tabbing');
      }
    }

    function handleMouseDown() {
      document.body.classList.remove('user-is-tabbing');
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const getCommand = (path) => {
    switch (path) {
      case '/photos': return './photos.sh --verbose';
      case '/blogs': return './blogs.sh --verbose';
      case '/repos': return './repos.sh --verbose';
      default: return './home.sh --verbose';
    }
  };

  return (
    <div className="app bg-[#0a0a0a] min-h-screen text-white font-mono selection:bg-red-500/30">
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
            <Route path="/blogs" element={<PageWrapper><Blogs /></PageWrapper>} />
            <Route path="/photos" element={<PageWrapper><Photos /></PageWrapper>} />
            <Route path="/repos" element={<PageWrapper><Repos /></PageWrapper>} />
          </Routes>
        </AnimatePresence>

        <footer className="text-center text-[#333] mt-12 text-xs w-full">
          SYSTEM_ID: J4CK-XYZ-V3 // <span className="text-red-900">TERMINAL_ACTIVE</span>
        </footer>
      </main>
    </div>
  )
}

export default App
