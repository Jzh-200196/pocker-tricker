/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HealthBarProps {
  current: number;
  max: number;
  armor: number;
  label: string;
  subLabel?: string;
  width?: string;
  height?: string;
  colorClass?: string;
  showArmorAbove?: boolean;
}

export function HealthBar({ 
  current, 
  max, 
  armor, 
  label, 
  subLabel, 
  width = '380px', 
  height = '12px',
  colorClass = 'bg-accent-red',
  showArmorAbove = false
}: HealthBarProps) {
  return (
    <div className="flex flex-col" style={{ width }}>
      <div className="flex justify-between items-end" style={{ marginBottom: '4px' }}>
         <div className="flex items-center" style={{ gap: '8px' }}>
            <span className="text-text-dim uppercase tracking-wider" style={{ fontSize: '12px' }}>{label}</span>
            {armor > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center bg-blue-500/20 rounded border border-blue-400/50"
                style={{ padding: '2px 8px', gap: '8px' }}
              >
                <Shield className="text-blue-400" style={{ width: '12px', height: '12px' }} />
                <span className="font-mono font-black text-blue-400" style={{ fontSize: '10px' }}>{armor}</span>
              </motion.div>
            )}
         </div>
         <span className={cn("font-mono font-bold", colorClass.includes('red') ? 'text-accent-red' : 'text-white')} style={{ fontSize: '14px' }}>
           <span className="text-white/40 font-normal mr-1" style={{ marginRight: '4px' }}>{armor > 0 ? `(${armor})` : ''}</span>
           {current} / {max}
         </span>
      </div>
      <div className="bg-black border border-white/10 rounded-full flex items-center relative" style={{ height }}>
         <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${(current / max) * 100}%` }}
          className={cn("h-full relative z-10 rounded-full", colorClass)}
         />
         <AnimatePresence>
           {armor > 1 && (
             <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: `${Math.min(100, (armor / max) * 100)}%`, 
                opacity: 1 
              }}
              exit={{ width: 0, opacity: 0 }}
              className={cn(
                "absolute inset-y-[-3px] left-[-1px] bg-blue-400/10 backdrop-blur-[1px] z-20 border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] rounded-l-sm transition-all",
                "border-t-[2px] border-b-[2px] border-l-[2px]",
                armor >= max ? "border-r-[2px] rounded-r-sm" : "border-r-0"
              )}
              style={showArmorAbove ? { insetY: '-4px', borderTopWidth: '3px', borderBottomWidth: '3px', borderLeftWidth: '3px', shadow: '0_0_15px_rgba(255,255,255,0.4)' } : {}}
             />
           )}
         </AnimatePresence>
      </div>
    </div>
  );
}
