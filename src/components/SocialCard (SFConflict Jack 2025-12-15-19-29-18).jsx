import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TwemojiText from './TwemojiText';

const SocialCard = ({ name, handle, url, icon, color = "#ff3333", delay = 0, onClick }) => {
    const isInternal = url.startsWith('/');
    const [typedName, setTypedName] = React.useState('');

    // Simple typing effect
    React.useEffect(() => {
        let i = 0;
        const speed = 50;
        setTypedName('');

        const type = () => {
            if (i < name.length) {
                setTypedName(name.substring(0, i + 1));
                i++;
                setTimeout(type, speed + Math.random() * 50);
            }
        };

        const timeout = setTimeout(type, delay * 1000 + 500); // Start after card anim
        return () => clearTimeout(timeout);
    }, [name, delay]);

    const CardContent = (
        <>
            <div className="flex justify-between items-start">
                <FontAwesomeIcon icon={icon} className="text-2xl text-[#666] group-hover:text-red-500 transition-colors" />
            </div>

            <div className="mt-8">
                <h3 className="font-bold text-lg text-white flex items-center">
                    <TwemojiText>{typedName}</TwemojiText>
                    <span className="animate-pulse ml-1 text-red-500">_</span>
                </h3>
                <p className="text-sm text-[#999] font-mono mt-1 group-hover:text-white transition-colors">
                    {handle}
                </p>
            </div>

            <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-t from-white/10 to-transparent flex items-center justify-center transform translate-x-8 translate-y-8 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}>
                <div className="transform -rotate-45 translate-x-2 translate-y-2 text-red-500 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    {isInternal ? '[EXEC]' : '[LINK]'}
                </div>
            </div>
        </>
    );

    const cardStyles = "block w-full h-full bg-[#111] border border-[#333] hover:border-red-500 p-6 relative overflow-hidden group transition-colors duration-300 cut-corners flex flex-col justify-between";
    const animationProps = {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { delay, duration: 0.4 }
    };

    if (isInternal) {
        return (
            <motion.div {...animationProps} className="h-full">
                <Link to={url} className={cardStyles} onClick={onClick}>
                    {CardContent}
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cardStyles}
            {...animationProps}
        >
            {CardContent}
        </motion.a>
    );
};

export default SocialCard;
