/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface VictoryOverlayProps {
  gold: number;
  playerHp: number;
  onConfirm: () => void;
}

export function VictoryOverlay({ gold, playerHp, onConfirm }: VictoryOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center cursor-pointer"
      onClick={onConfirm}
    >
       <motion.div
         initial={{ scale: 0.5, y: 50, opacity: 0 }}
         animate={{ scale: 1, y: 0, opacity: 1 }}
         className="text-center pointer-events-none"
         style={{ gap: '48px', display: 'flex', flexDirection: 'column' }}
       >
          <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-accent-gold font-mono uppercase opacity-60" style={{ fontSize: '24px', letterSpacing: '15px' }}>Victory Confirmed</h2>
            <h1 className="font-serif font-black italic tracking-tighter text-text-main leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" style={{ fontSize: '120px' }}>
              挑战成功
            </h1>
            <p className="text-white/40 font-mono animate-pulse" style={{ fontSize: '14px', letterSpacing: '4px', marginTop: '16px' }}>
              CLICK ANYWHERE TO CONTINUE
            </p>
          </div>
          
          <div className="bg-white/5 border-y border-white/10" style={{ padding: '32px 96px' }}>
            <div className="flex items-center justify-center" style={{ gap: '24px' }}>
              <div className="rounded-full bg-accent-gold/20 flex items-center justify-center" style={{ width: '48px', height: '48px' }}>
                 <div className="rounded-full bg-accent-gold shadow-[0_0_15px_#c5a059]" style={{ width: '16px', height: '16px' }} />
              </div>
              <span className="text-accent-gold font-serif italic font-bold" style={{ fontSize: '48px' }}>
                 +{gold} GOLD ACQUIRED
              </span>
            </div>
          </div>
       </motion.div>
    </motion.div>
  );
}
