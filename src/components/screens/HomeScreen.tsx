/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface HomeScreenProps {
  onStart: () => void;
}

export function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <motion.div 
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,_#4d0000_0%,_#050505_70%)]" />
      
      <div className="relative z-10 w-full">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center" style={{ gap: '16px' }}>
          <h2 className="text-accent-gold font-mono uppercase opacity-60" style={{ fontSize: '18px', letterSpacing: '12px' }}>
            Deckbound Siege
          </h2>
          <h1 className="font-serif font-black italic tracking-tighter text-text-main drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" style={{ fontSize: '120px', lineHeight: '100px' }}>
            DARK DECK<br/>
            <span className="text-accent-red">EXECUTIONER</span>
          </h1>
          <p className="text-text-dim italic font-serif" style={{ fontSize: '30px', maxWidth: '672px', marginTop: '24px' }}>
            "The cards hold your fate, the blade holds your soul."
          </p>
        </motion.div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="bg-black border border-accent-gold text-accent-gold font-bold uppercase tracking-widest transition-all hover:bg-accent-gold hover:text-black shadow-[0_0_20px_rgba(197,160,89,0.1)]"
          style={{ marginTop: '64px', padding: '24px 48px', fontSize: '20px' }}
        >
          Begin Challenge
        </motion.button>
      </div>
    </motion.div>
  );
}
