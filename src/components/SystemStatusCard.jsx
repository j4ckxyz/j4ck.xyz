import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTerminal, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useData } from '../context/DataContext';

const SystemStatusCard = () => {
    const { resolvedHandle, resolvedPds } = useData();
    const [copied, setCopied] = useState(false);
    const DID = 'did:plc:4hawmtgzjx3vclfyphbhfn7v';

    const handleCopyDid = async () => {
        try {
            await navigator.clipboard.writeText(DID);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy DID:', e);
        }
    };

    return (
        <motion.div
            className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 h-full flex flex-col justify-between relative overflow-hidden rounded-lg group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ 
                type: "spring", 
                stiffness: 350, 
                damping: 18,
                opacity: { duration: 0.5, delay: 0.45 }
            }}
        >
            {/* Header info bar */}
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2 text-[#999] font-mono uppercase text-xs tracking-widest">
                    <FontAwesomeIcon icon={faTerminal} className="text-red-500 animate-pulse" />
                    <span>SYSTEM DIAGNOSTICS</span>
                </div>
                <div className="flex items-center gap-2 bg-[oklch(22%_0.015_15)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span>
                    <span className="text-[10px] font-mono text-green-400 font-bold uppercase tracking-wider">ONLINE</span>
                </div>
            </div>

            {/* Diagnostic Console Readout */}
            <div className="mt-4 font-mono text-[11px] text-[#888] space-y-1.5 relative z-10 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-4 border-b border-[oklch(20%_0.012_15)] pb-1.5">
                    <span className="text-[#555] uppercase tracking-wider">RESOLVED HANDLE:</span>
                    <span className="text-[#ccc] font-bold">{resolvedHandle}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[oklch(20%_0.012_15)] pb-1.5">
                    <span className="text-[#555] uppercase tracking-wider">ACTIVE PDS:</span>
                    <span className="text-[#ccc] truncate max-w-[200px] hover:text-white transition-colors" title={resolvedPds}>
                        {resolvedPds.replace('https://', '')}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[#555] uppercase tracking-wider">DID:</span>
                    <div className="flex items-center gap-1.5 max-w-[220px]">
                        <span className="text-[#aaa] truncate font-bold" title={DID}>
                            {DID}
                        </span>
                        <button
                            onClick={handleCopyDid}
                            className="text-[#555] hover:text-red-500 transition-colors p-1 rounded hover:bg-[oklch(22%_0.015_15)] focus:outline-none"
                            title="Copy DID string"
                        >
                            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? "text-green-500" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Decorative background grid and gradient */}
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-gradient-radial from-[oklch(26%_0.018_15_/_15%)] to-transparent opacity-40 blur-xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)',
                backgroundSize: '16px 16px'
            }}></div>
        </motion.div>
    );
};

export default SystemStatusCard;
