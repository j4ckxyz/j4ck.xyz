import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TwemojiText from './TwemojiText';

const SocialCard = ({ name, handle, url, icon, color = "#ff3333", delay = 0, copyValue }) => {
    const [copied, setCopied] = useState(false);
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
            className="block w-full h-full bg-[#111] border border-[#333] hover:border-red-500 p-6 relative overflow-hidden group transition-all duration-300 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(255,51,51,0.2)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            <div className="flex justify-between items-start">
                <FontAwesomeIcon icon={icon} className="text-2xl text-[#666] group-hover:text-red-500 transition-colors" />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                    {copyValue ? (copied ? 'Copied!' : 'Copy') : '↗'}
                </div>
            </div>

            <div className="mt-8">
                <h3 className="font-bold text-lg text-white">
                    <TwemojiText>{name}</TwemojiText>
                </h3>
                <p className="text-sm text-[#999] font-mono mt-1 group-hover:text-white transition-colors">
                    {handle}
                </p>
            </div>

            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-white/5 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform" />
        </CardComponent>
    );
};

export default SocialCard;
