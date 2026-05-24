import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TwemojiText from './TwemojiText';

const SocialCard = ({ name, handle, url, icon, color = "#ff3333", delay = 0, copyValue }) => {
    const [copied, setCopied] = useState(false);
    const [hovered, setHovered] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleCopy = async () => {
        if (!copyValue) {
            return;
        }

        try {
            await navigator.clipboard.writeText(copyValue);
            setCopied(true);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error('Failed to copy to clipboard', error);
        }
    };

    const CardComponent = copyValue ? motion.button : motion.a;

    return (
        <CardComponent
            {...(copyValue ? { type: 'button', onClick: handleCopy } : { href: url, target: "_blank", rel: "noopener noreferrer" })}
            className="block w-full h-full bg-[var(--card-bg)] border p-6 relative overflow-hidden group rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            transition={{ 
                type: "spring", 
                stiffness: 350, 
                damping: 18,
                opacity: { duration: 0.5, delay }
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: hovered ? color : 'var(--border-color)',
                boxShadow: hovered ? `0 12px 30px ${color}1d` : 'none',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="flex justify-between items-start w-full relative z-10">
                <FontAwesomeIcon 
                    icon={icon} 
                    className="text-2xl transition-colors duration-300" 
                    style={{ color: (hovered || copied) ? (copied ? '#22c55e' : color) : '#666' }}
                />
                <div 
                    className="opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono text-xs"
                    style={{ color: copied ? '#22c55e' : color }}
                >
                    {copyValue ? (copied ? 'Copied!' : 'Copy') : '↗'}
                </div>
            </div>

            <div className="mt-8 relative z-10">
                <h3 className="font-bold text-lg text-white">
                    <TwemojiText>{name}</TwemojiText>
                </h3>
                <p className="text-sm text-[#999] font-mono mt-1 group-hover:text-white transition-colors duration-200">
                    {handle}
                </p>
            </div>

            {/* Glowing corner indicator */}
            <div 
                className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-300"
                style={{ to: `${color}0b` }}
            />
        </CardComponent>
    );
};

export default SocialCard;
