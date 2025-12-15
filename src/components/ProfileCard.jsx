import React from 'react';
import { motion } from 'framer-motion';

const ProfileCard = () => {
    return (
        <motion.div
            className="bg-[#111] border border-[#333] p-8 md:p-12 h-full flex flex-col justify-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
                borderRadius: '24px',
                gridColumn: 'span 2', // default span for grid
            }}
        >
            <div className="z-10 relative">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
                    j4ck<span className="text-red-500">.xyz</span>
                </h1>
                <div className="bg-[#ff3333] h-1 w-20 mb-6"></div>

                <div className="inline-block bg-[#222] px-4 py-2 rounded-full border border-[#333]">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>
                    <span className="text-sm font-mono text-[#999]">
                        System Operational
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
