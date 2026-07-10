import React, { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import Home from './pages/Home'
import Navigation from './components/Navigation'
import { useTheme } from './hooks/useTheme'
import './App.css'

// Landing route (Home) stays eager for fast first paint; secondary routes
// are code-split so their code and data libraries load only on navigation.
const Photos = lazy(() => import('./pages/Photos'))
const Blogs = lazy(() => import('./pages/Blogs'))
const Repos = lazy(() => import('./pages/Repos'))

const RouteFallback = () => (
  <div className="w-full text-center text-[var(--text-muted)] font-mono text-sm py-12 animate-pulse">
    loading module…
  </div>
)

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
  const { theme, toggleTheme } = useTheme();

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

  return (
    <div className="app bg-[var(--bg-color)] min-h-screen text-[var(--text-primary)] font-sans">
      <Navigation />

      {/* 
        Responsive Padding:
        Mobile: pt-4 (top), pb-32 (bottom nav + status line)
        Desktop: pt-24 (top nav), pb-12
      */}
      <main className="w-full max-w-[1200px] mx-auto pt-4 pb-32 md:pt-24 md:pb-12 px-4 flex flex-col items-center relative z-10">
        <AnimatePresence mode="wait">
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
              <Route path="/photos" element={<PageWrapper><Photos /></PageWrapper>} />
              <Route path="/blogs" element={<PageWrapper><Blogs /></PageWrapper>} />
              <Route path="/repos" element={<PageWrapper><Repos /></PageWrapper>} />
            </Routes>
          </Suspense>
        </AnimatePresence>

        <footer className="mt-20 w-full max-w-[1100px] mx-auto flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-6 text-xs text-[var(--text-muted)]">
          <span className="font-mono">@j4ck.xyz</span>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-4 min-h-[44px] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-red)] touch-manipulation"
          >
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="text-[var(--accent-red)]" />
            <span className="font-mono uppercase tracking-wider">{theme === 'dark' ? 'light' : 'dark'}</span>
          </button>
        </footer>
      </main>
    </div>
  )
}

export default App
