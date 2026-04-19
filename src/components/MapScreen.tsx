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
    <div className="relative bg-bg-deep overflow-hidden flex flex-col items-center justify-center" style={{ width: '1920px', height: '1080px', padding: '80px' }}>
      {/* Background with radial gradient */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,_#1a0f0f_0%,_#050505_70%)]" />
      
      <div className="z-10 text-center" style={{ width: '1200px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="text-text-dim font-mono uppercase" style={{ fontSize: '14px', letterSpacing: '8.4px' }}>Current Location</h2>
            <h1 className="text-text-main font-serif font-black italic tracking-tighter leading-none" style={{ fontSize: '128px' }}>NODE {currentNode}</h1>
         </div>

         {/* Visual Timeline (Dots from design) */}
         <div className="flex justify-between items-center relative px-4" style={{ width: '100%', height: '40px' }}>
            <div className="absolute left-0 right-0 h-[1px] bg-border-color" style={{ top: '50%', transform: 'translateY(-50%)' }} />
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "rounded-full border z-10 transition-all",
                  i + 1 < currentNode ? "bg-text-dim border-border-color" :
                  i + 1 === currentNode ? "bg-accent-gold border-white scale-150 shadow-[0_0_10px_var(--color-accent-gold)]" :
                  "bg-bg-deep border-border-color"
                )}
                style={{ width: '16px', height: '16px' }}
              />
            ))}
         </div>

          <div style={{ paddingTop: '40px', gap: '32px', display: 'flex', flexDirection: 'column' }}>
            <p className="text-text-dim uppercase tracking-widest italic opacity-50 px-4" style={{ fontSize: '14px' }}>Where will you bleed next?</p>
            <div className={cn("grid px-10 w-full", choices && choices.length === 3 ? "grid-cols-3" : "grid-cols-1")} style={{ gap: '24px' }}>
               {(choices || ['Combat']).map((type, idx) => (
                 <motion.button
                   key={idx}
                   whileHover={{ scale: 1.05, y: -5 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => onSelectRoom(type)}
                   className="bg-black/40 backdrop-blur-md border border-border-color rounded-lg flex flex-col items-center justify-center transition-colors group aspect-square"
                   style={{ padding: '48px', gap: '16px' }}
                 >
                    {React.createElement(ROOM_DATA[type].icon, { 
                      className: cn("transition-transform group-hover:scale-110", ROOM_DATA[type].color),
                      style: { width: '64px', height: '64px', marginBottom: '16px' }
                    })}
                    <span className="text-text-main font-bold uppercase tracking-[0.2em]" style={{ fontSize: '12px' }}>
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
