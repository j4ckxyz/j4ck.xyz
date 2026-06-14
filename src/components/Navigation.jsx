import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faCamera, faNewspaper, faCode, faComment } from '@fortawesome/free-solid-svg-icons';

const navItems = [
    { key: '1', path: '/', label: 'home', icon: faHouse },
    { key: '2', path: '/posts', label: 'posts', icon: faComment },
    { key: '3', path: '/photos', label: 'photos', icon: faCamera },
    { key: '4', path: '/blogs', label: 'writing', icon: faNewspaper },
    { key: '5', path: '/repos', label: 'code', icon: faCode },
];

const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            if (e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = navItems.findIndex(item => item.path === location.pathname);
                const nextIndex = (currentIndex + 1) % navItems.length;
                navigate(navItems[nextIndex].path);
                return;
            }

            switch (e.key) {
                case '1': navigate('/'); break;
                case '2': navigate('/posts'); break;
                case '3': navigate('/photos'); break;
                case '4': navigate('/blogs'); break;
                case '5': navigate('/repos'); break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [navigate, location.pathname]);

    return (
        <>
            {/* Desktop top bar */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-[var(--nav-bg)] backdrop-blur-md border-b border-[var(--border-color)] hidden md:block">
                <div className="max-w-[1100px] mx-auto flex items-center justify-between h-16 px-6">
                    <NavLink to="/" className="font-display text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
                        j4ck<span className="text-[var(--accent-red)]">.xyz</span>
                    </NavLink>
                    <div className="flex items-center gap-8 text-[15px]">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `relative py-1 transition-colors duration-200 ${
                                        isActive
                                            ? 'text-[var(--text-primary)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {item.label}
                                        {isActive && (
                                            <span className="absolute -bottom-0.5 left-0 h-px w-full bg-[var(--accent-red)]" />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Mobile bottom bar */}
            <nav className="fixed bottom-0 left-0 w-full z-50 bg-[var(--nav-bg)] backdrop-blur-md border-t border-[var(--border-color)] pb-[env(safe-area-inset-bottom)] md:hidden">
                <div className="flex items-stretch justify-around h-16">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center gap-1 w-full transition-colors duration-200 ${
                                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <FontAwesomeIcon
                                        icon={item.icon}
                                        className={`text-base ${isActive ? 'text-[var(--accent-red)]' : ''}`}
                                    />
                                    <span className="text-[11px]">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </>
    );
};

export default Navigation;
