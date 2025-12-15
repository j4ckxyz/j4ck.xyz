import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const ProfileCard = () => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 50, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 50, damping: 20 });

    function handleMouseMove({ clientX, clientY, currentTarget }) {
        let { left, top, width, height } = currentTarget.getBoundingClientRect();
        x.set(clientX - left - width / 2);
        y.set(clientY - top - height / 2);
    }

    const GlitchText = ({ text }) => {
        return (
            <div className="relative inline-block font-bold tracking-tighter text-3xl md:text-4xl group cursor-default">
                <span className="relative z-10">{text}</span>
                <span className="absolute top-0 left-0 -ml-[2px] text-red-500 opacity-0 group-hover:opacity-100 group-hover:animate-glitch-1 z-0">{text}</span>
                <span className="absolute top-0 left-0 ml-[2px] text-blue-500 opacity-0 group-hover:opacity-100 group-hover:animate-glitch-2 z-0">{text}</span>
            </div>
        );
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            className="bg-[#111] border border-[#333] h-full flex flex-col items-center justify-center relative overflow-hidden group cut-corners"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="z-10 relative flex flex-col items-center justify-center gap-4 p-4 text-center">
                <div className="relative">
                    <GlitchText text="j4ck.xyz" />
                    <div className="bg-[#ff3333] h-1 w-12 mx-auto mt-2 opacity-50"></div>
                </div>

                <motion.div
                    className="inline-flex items-center bg-[#222] px-4 py-2 border border-[#333] shadow-lg hover:border-red-500/50 transition-colors cursor-crosshair"
                    whileHover={{ scale: 1.05 }}
                >
                    <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-mono text-[#999] tracking-widest uppercase">
                        System Active
                    </span>
                </motion.div>
            </div>

            <motion.div
                className="absolute right-0 top-0 w-48 h-48 bg-gradient-radial from-[#ff333320] to-transparent opacity-40 blur-3xl rounded-full"
                style={{ translateX: mouseX, translateY: mouseY }}
            />

            <div className="absolute bottom-0 left-0 w-full h-full opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>
        </motion.div>
    );
};

export default ProfileCard;
