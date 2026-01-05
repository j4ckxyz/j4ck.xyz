import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCamera, faNewspaper, faCode, faRss } from '@fortawesome/free-solid-svg-icons';

const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            // Tab Navigation
            if (e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = navItems.findIndex(item => item.path === location.pathname);
                const nextIndex = (currentIndex + 1) % navItems.length;
                navigate(navItems[nextIndex].path);
                return;
            }

            // Number Navigation (Disable on Home if using 1-4 for links)
            // But actually Home links will use 1-9. 
            // If we are on Home, we should probably disable these navigation shortcuts to avoid conflict?
            // Or maybe only 1-4 map to nav? 
            // Let's disable Navigation 1-4 IF we are on Home, so Home can handle them.
            // if (location.pathname === '/') return;

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

    const navItems = [
        { key: '1', path: '/', label: 'home', icon: faHome },
        { key: '2', path: '/posts', label: 'posts', icon: faRss },
        { key: '3', path: '/photos', label: 'photos', icon: faCamera },
        { key: '4', path: '/blogs', label: 'blogs', icon: faNewspaper },
        { key: '5', path: '/repos', label: 'repos', icon: faCode },
    ];

    return (
        <>
            {/* --- DESKTOP TOP BAR (md:flex, hidden on mobile) --- */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-[#333] py-3 px-6 font-mono text-sm uppercase tracking-widest hidden md:block">
                <div className="max-w-[1200px] mx-auto flex items-center justify-start gap-8">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `transition-colors duration-200 hover:text-white ${isActive ? 'text-white' : 'text-[#555]'
                                }`
                            }
                        >
                            <span className="text-[#333] mr-2">[{item.key}]</span>
                            <span className={location.pathname === item.path ? "text-red-500 font-bold" : ""}>
                                {item.label}
                            </span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* --- MOBILE BOTTOM BAR (flex, hidden on desktop) --- */}
            {/* Terminal Status Line Style */}
            <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#111] border-t border-[#333] pb-safe font-mono text-xs uppercase tracking-widest md:hidden shadow-2xl">
                <div className="flex items-center justify-around h-14">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'bg-[#222] text-white border-t-2 border-red-500' : 'text-[#555] hover:text-[#999]'
                                }`
                            }
                        >
                            <span className={`mb-1 ${location.pathname === item.path ? "text-red-500" : ""}`}>
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
                {/* Decorative status indicators */}
                <div className="bg-[#000] text-[#333] text-[10px] py-1 px-4 flex justify-between border-t border-[#222]">
                    <span> -- INSERT -- </span>
                    <span>J4CK.XYZ V3</span>
                </div>
            </nav>
        </>
    );
};

export default Navigation;
