/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, ComboResult } from '../../types/card';

interface BattleZoneProps {
  selectedCards: Card[];
  battlePrompt: string | null;
}

export function BattleZone({ selectedCards, battlePrompt }: BattleZoneProps) {
  return (
    <div className="flex flex-col items-center justify-center z-20" style={{ width: '100%', height: '200px', gap: '16px' }}>
       <div className="relative" style={{ height: '60px' }}>
         <AnimatePresence>
            {battlePrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1 }}
                id="battle-prompt"
                className="bg-accent-red text-white font-black italic uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,62,62,0.4)]"
                style={{ padding: '12px 40px', fontSize: '24px' }}
              >
                {battlePrompt}
              </motion.div>
            )}
         </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedCards.length > 0 && !battlePrompt && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.8 }}
             className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm shadow-2xl"
             style={{ gap: '8px', padding: '16px' }}
           >
              {selectedCards.map(c => (
                 <div key={c.id} className="bg-card-bg border border-border-color rounded-sm flex items-center justify-center relative shadow-md" style={{ width: '60px', height: '90px' }}>
                    <span className="font-black text-white" style={{ fontSize: '10px' }}>{c.name}</span>
                 </div>
              ))}
           </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-center justify-center" style={{ height: '20px', width: '100%' }}>
         <span className="text-text-dim uppercase tracking-[0.4em] font-mono" style={{ fontSize: '10px' }}>Battle Zone Active</span>
      </div>
    </div>
  );
}
