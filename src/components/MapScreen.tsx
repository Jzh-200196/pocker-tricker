/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Swords, ShoppingCart, Coffee, Skull, Zap } from 'lucide-react';
import { RoomType } from '../types';
import { cn } from '../lib/utils';

interface MapScreenProps {
  currentNode: number;
  onSelectRoom: (type: RoomType) => void;
  choices: RoomType[] | null;
}

const ROOM_DATA: Record<RoomType, { label: string, icon: any, color: string }> = {
  Combat: { label: 'SKIRMISH', icon: Swords, color: 'text-accent-red' },
  Event: { label: 'ANOMALY', icon: Zap, color: 'text-purple-400' },
  Shop: { label: 'MERCHANT', icon: ShoppingCart, color: 'text-accent-gold' },
  Rest: { label: 'SANCTUARY', icon: Coffee, color: 'text-emerald-400' },
  Boss: { label: 'EXECUTION', icon: Skull, color: 'text-accent-red' }
};

export function MapScreen({ currentNode, onSelectRoom, choices }: MapScreenProps) {
  return (
    <div className="relative w-full h-full bg-bg-deep overflow-hidden flex flex-col items-center justify-center p-20">
      {/* Background with radial gradient */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,_#1a0f0f_0%,_#050505_70%)]" />
      
      <div className="z-10 text-center space-y-12 max-w-[1200px] w-full">
         <div className="space-y-4">
            <h2 className="text-text-dim text-sm font-mono uppercase tracking-[0.4em]">Current Location</h2>
            <h1 className="text-text-main text-8xl font-serif font-black italic tracking-tighter leading-none">NODE {currentNode}</h1>
         </div>

         {/* Visual Timeline (Dots from design) */}
         <div className="flex justify-between items-center w-full px-4 relative h-10">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border-color -translate-y-1/2" />
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-4 h-4 rounded-full border z-10 transition-all",
                  i + 1 < currentNode ? "bg-text-dim border-border-color" :
                  i + 1 === currentNode ? "bg-accent-gold border-white scale-150 shadow-[0_0_10px_var(--color-accent-gold)]" :
                  "bg-bg-deep border-border-color"
                )}
              />
            ))}
         </div>

          <div className="space-y-8 pt-10">
            <p className="text-text-dim text-sm uppercase tracking-widest italic opacity-50 px-4">Where will you bleed next?</p>
            <div className={cn("grid gap-6 px-10 w-full", choices && choices.length === 3 ? "grid-cols-3" : "grid-cols-1")}>
               {(choices || ['Combat']).map((type, idx) => (
                 <motion.button
                   key={idx}
                   whileHover={{ scale: 1.05, y: -5 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => onSelectRoom(type)}
                   className="bg-black/40 backdrop-blur-md border border-border-color p-12 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-accent-gold transition-colors group aspect-square"
                 >
                    {React.createElement(ROOM_DATA[type].icon, { 
                      className: cn("w-16 h-16 mb-4 transition-transform group-hover:scale-110", ROOM_DATA[type].color) 
                    })}
                    <span className="text-text-main font-bold uppercase tracking-[0.2em] text-xs">
                       {ROOM_DATA[type].label}
                    </span>
                 </motion.button>
               ))}
            </div>
          </div>
      </div>
    </div>
  );
}
