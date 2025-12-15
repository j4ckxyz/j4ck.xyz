import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCamera, faNewspaper, faCode } from '@fortawesome/free-solid-svg-icons';

const Navigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            switch (e.key) {
                case '1': navigate('/'); break;
                case '2': navigate('/photos'); break;
                case '3': navigate('/blogs'); break;
                case '4': navigate('/repos'); break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [navigate]);

    const navItems = [
        { key: '1', path: '/', label: 'home', icon: faHome },
        { key: '2', path: '/photos', label: 'photos', icon: faCamera },
        { key: '3', path: '/blogs', label: 'blogs', icon: faNewspaper },
        { key: '4', path: '/repos', label: 'repos', icon: faCode },
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
