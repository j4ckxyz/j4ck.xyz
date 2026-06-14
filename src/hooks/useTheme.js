import { useState, useEffect, useCallback } from 'react';

// Reads the theme the inline index.html script already applied to <html>.
const getInitialTheme = () => {
    if (typeof document !== 'undefined') {
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'light' || attr === 'dark') return attr;
    }
    return 'dark';
};

const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    // Keep the browser-chrome colour in sync with the toggled theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f9f4f2' : '#120d0c');
};

/**
 * Theme state: defaults to the OS preference (applied pre-paint by the inline
 * script), follows live OS changes until the user makes an explicit choice, and
 * persists that choice to localStorage thereafter.
 */
export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme);

    // Follow the OS only while the user hasn't chosen explicitly.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = (e) => {
            if (!localStorage.getItem('theme')) {
                const next = e.matches ? 'light' : 'dark';
                setTheme(next);
                applyTheme(next);
            }
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const setThemeChoice = useCallback((next) => {
        setTheme(next);
        applyTheme(next);
        try {
            localStorage.setItem('theme', next);
        } catch (e) {
            /* ignore storage failures (private mode, etc.) */
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeChoice(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setThemeChoice]);

    return { theme, setTheme: setThemeChoice, toggleTheme };
}
