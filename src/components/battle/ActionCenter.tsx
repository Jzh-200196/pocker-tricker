/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, Lock, Unlock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ComboResult } from '../../types/card';

interface ActionCenterProps {
  currentRedraws: number;
  maxRedraws: number;
  onRedraw: () => void;
  onPlay: () => void;
  onBatchPin: () => void;
  comboPreview: ComboResult | null;
  isRedrawDisabled: boolean;
  selectedCount: number;
}

export function ActionCenter({ 
  currentRedraws, 
  maxRedraws, 
  onRedraw, 
  onPlay, 
  onBatchPin,
  comboPreview, 
  isRedrawDisabled,
  selectedCount
}: ActionCenterProps) {
  return (
    <div className="flex items-center justify-center relative" style={{ width: '100%', gap: '24px', padding: '0 24px' }}>
       {/* 换牌 / 重抽 */}
       <button 
         id="btn-redraw"
         onClick={onRedraw}
         disabled={isRedrawDisabled}
         className="group relative bg-[#0a0a0a] border border-accent-gold/40 text-accent-gold rounded-sm uppercase font-black tracking-widest transition-all hover:bg-accent-gold hover:text-black hover:border-white disabled:opacity-20 disabled:grayscale overflow-hidden"
         style={{ padding: '12px 32px', fontSize: '13px' }}
       >
         <div className="relative z-10 flex items-center gap-2">
           <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" style={{ width: '15px', height: '15px' }} />
           <span>换牌 ({currentRedraws}/{maxRedraws})</span>
         </div>
       </button>

       {/* 全局批量锁定/解绑按钮 */}
       <button
         onClick={onBatchPin}
         disabled={selectedCount === 0}
         className={cn(
           "group flex items-center gap-2 uppercase font-black tracking-[0.2em] transition-all border rounded-sm",
           selectedCount > 0 
             ? "bg-[#1a1a1a] border-accent-gold text-accent-gold hover:bg-accent-gold hover:text-black" 
             : "bg-[#050505] border-white/5 text-white/10 opacity-30 cursor-not-allowed"
         )}
         style={{ padding: '12px 24px', fontSize: '13px' }}
       >
         <Lock className={cn("transition-transform group-hover:scale-110", selectedCount > 0 && "animate-pulse")} style={{ width: '15px', height: '15px' }} />
         <span>锁定/解锁 ({selectedCount})</span>
       </button>

       {/* 行动执行 */}
       <div className="flex" style={{ gap: '16px' }}>
          <button 
            onClick={onPlay}
            disabled={!comboPreview}
            className={cn(
              "font-black uppercase tracking-[0.3em] transition-all rounded-sm border",
              comboPreview 
                ? "bg-accent-red border-white/20 text-white shadow-[0_0_30px_rgba(255,0,0,0.25)] hover:bg-white hover:text-accent-red" 
                : "bg-white/5 text-white/10 cursor-not-allowed border-white/5"
            )}
            style={{ padding: '12px 48px', fontSize: '13px' }}
          >
            Execute Strike
          </button>
       </div>
    </div>
  );
}
