import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TwemojiText from './TwemojiText';

const SocialCard = ({ name, handle, url, icon, color = "#ff3333", delay = 0 }) => {
    return (
        <motion.a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full bg-[#111] border border-[#333] hover:border-red-500 p-6 relative overflow-hidden group transition-colors duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '16px'
            }}
        >
            <div className="flex justify-between items-start">
                <FontAwesomeIcon icon={icon} className="text-2xl text-[#666] group-hover:text-red-500 transition-colors" />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                    ↗
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
        </motion.a>
    );
};

export default SocialCard;
