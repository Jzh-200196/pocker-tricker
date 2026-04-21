/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { RunState } from '../../types/game';

interface PauseOverlayProps {
  run: RunState;
  onContinue: () => void;
  onAbandon: () => void;
}

export function PauseOverlay({ run, onContinue, onAbandon }: PauseOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center"
    >
      <div className="bg-card-bg border border-border-color shadow-2xl" style={{ width: '600px', padding: '60px', gap: '40px', display: 'flex', flexDirection: 'column' }}>
         <div className="text-center" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-accent-gold font-mono uppercase" style={{ fontSize: '10px', letterSpacing: '10px' }}>Combat Paused</h2>
            <h1 className="font-serif font-black italic tracking-tighter text-text-main" style={{ fontSize: '48px' }}>THE EXECUTIONER WAITS</h1>
         </div>

         <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between bg-black/40 border border-white/5" style={{ padding: '20px' }}>
               <span className="text-text-dim uppercase" style={{ fontSize: '14px' }}>Progress</span>
               <span className="text-text-main font-mono" style={{ fontSize: '14px' }}>{run.currentNode} / 10</span>
            </div>
            <div className="flex justify-between bg-black/40 border border-white/5" style={{ padding: '20px' }}>
               <span className="text-text-dim uppercase" style={{ fontSize: '14px' }}>Gold</span>
               <span className="text-accent-gold font-mono" style={{ fontSize: '14px' }}>{run.gold} G</span>
            </div>
         </div>

         <div className="flex flex-col" style={{ gap: '16px' }}>
            <button 
              onClick={onContinue}
              className="w-full bg-accent-gold text-black font-black uppercase tracking-widest hover:bg-white transition-colors"
              style={{ fontSize: '14px', height: '60px' }}
            >
               CONTINUE
            </button>
            <button 
              onClick={onAbandon}
              className="w-full bg-transparent text-accent-red border border-accent-red/30 transition-all font-bold uppercase tracking-widest"
              style={{ fontSize: '14px', height: '60px' }}
            >
               ABANDON RUN
            </button>
         </div>
      </div>
    </motion.div>
  );
}
