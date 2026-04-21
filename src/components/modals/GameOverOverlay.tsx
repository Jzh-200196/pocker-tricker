/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Skull, RotateCcw, Home as HomeIcon } from 'lucide-react';

interface GameOverOverlayProps {
  onRetry: () => void;
  onMainMenu: () => void;
}

export function GameOverOverlay({ onRetry, onMainMenu }: GameOverOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center text-center"
      style={{ padding: '96px' }}
    >
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_#300_0%,_#050505_100%)]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10"
        style={{ gap: '32px', display: 'flex', flexDirection: 'column' }}
      >
        <Skull className="text-accent-red mx-auto drop-shadow-[0_0_20px_rgba(255,62,62,0.5)]" style={{ width: '128px', height: '128px' }} />
        <h1 className="font-serif font-black text-text-main italic tracking-tighter uppercase" style={{ fontSize: '72px' }}>Challenge Failed</h1>
        <p className="text-text-dim uppercase tracking-widest" style={{ fontSize: '20px' }}>Your deck remains in the ashes</p>
      </motion.div>
      
      <div className="flex flex-col relative z-10" style={{ marginTop: '80px', gap: '24px', width: '400px' }}>
        <button 
          onClick={onRetry}
          className="flex items-center justify-center bg-accent-red text-white font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_0_20px_rgba(255,62,62,0.2)]"
          style={{ gap: '16px', padding: '24px 0', fontSize: '20px' }}
        >
          <RotateCcw style={{ width: '24px', height: '24px' }} />
          Retry Run
        </button>
        <button 
          onClick={onMainMenu}
          className="flex items-center justify-center bg-transparent text-text-dim border border-border-color uppercase tracking-widest hover:border-white hover:text-white transition-all"
          style={{ gap: '16px', padding: '24px 0', fontSize: '20px' }}
        >
          <HomeIcon style={{ width: '24px', height: '24px' }} />
          Main Menu
        </button>
      </div>
    </motion.div>
  );
}
