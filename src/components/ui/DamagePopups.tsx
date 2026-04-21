/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { DamagePopup as DamagePopupType } from '../../types/battle';

interface DamagePopupsProps {
  popups: DamagePopupType[];
}

export function DamagePopups({ popups }: DamagePopupsProps) {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
       <AnimatePresence>
         {popups.map(p => (
           <motion.div
             key={p.id}
             initial={{ opacity: 0, top: `${p.y}%`, left: `${p.x}%`, scale: 0.5 }}
             animate={{ opacity: 1, top: `${p.y - 15}%`, scale: 1.5 }}
             exit={{ opacity: 0, top: `${p.y - 30}%`, scale: 2 }}
             transition={{ duration: 1, ease: 'easeOut' }}
             className={cn(
               "absolute font-serif italic text-6xl font-black drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] -translate-x-1/2",
               p.isHeal ? "text-emerald-400" : "text-white"
             )}
           >
             {p.isHeal ? '+' : '-'}{p.value}
           </motion.div>
         ))}
       </AnimatePresence>
    </div>
  );
}
