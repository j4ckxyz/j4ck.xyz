import React from 'react';
import { motion } from 'framer-motion';

const ProfileCard = () => {
    return (
        <motion.div
            className="bg-[var(--card-bg)] border border-[var(--border-color)] p-8 md:p-12 h-full flex flex-col justify-center relative overflow-hidden rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="z-10 relative">
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-2 uppercase leading-none select-none">
                    j4ck<span className="text-transparent font-extrabold" style={{ WebkitTextStroke: '2px var(--accent-red)', textStroke: '2px var(--accent-red)' }}>.xyz</span>
                </h1>
                
                <div className="flex items-center gap-1 mb-6">
                    <div className="bg-[var(--accent-red)] h-1.5 w-24"></div>
                    <span className="text-[var(--accent-red)] text-xl font-bold animate-pulse">_</span>
                </div>

                <div className="inline-flex items-center bg-[oklch(11%_0.006_15)] px-4 py-2 rounded-lg border border-[var(--border-color)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-3 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                    <span className="text-xs font-mono text-green-500 uppercase tracking-widest font-bold">
                        SYS_STATUS // OPERATIONAL
                    </span>
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-radial from-[#ff333320] to-transparent opacity-50 blur-3xl rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-full h-full opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>
        </motion.div>
    );
};

export default ProfileCard;
