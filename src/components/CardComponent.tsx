/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pin, Shield, Heart, Plus } from 'lucide-react';
import { Card as CardType } from '../types';
import { cn } from '../lib/utils';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  disabled?: boolean;
  isInvalid?: boolean;
  isShaking?: boolean;
}

const shakeVariants = {
  shake: {
    x: [-3, 3, -3, 3, 0],
    transition: { duration: 0.1, repeat: 2 }
  }
};

const suiteIcons: Record<string, string> = {
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
  Spades: '♠',
};

const suiteColors: Record<string, string> = {
  Hearts: 'text-red-500',
  Diamonds: 'text-red-400',
  Clubs: 'text-slate-400',
  Spades: 'text-slate-200',
};

export function CardComponent({ card, isSelected, onToggleSelect, onTogglePin, disabled, isInvalid, isShaking }: CardProps) {
  const getCenterIcon = (card: CardType) => {
    if (card.suite === 'Special') return '★';
    return suiteIcons[card.suite as keyof typeof suiteIcons] || '♠';
  };

  const getEffectInfo = (effect: string) => {
    switch (effect) {
      case 'Heal': return { title: '❤️', desc: '恢复5点生命' };
      case 'ArmorBuff': return { title: '🛡️', desc: '获得4点护盾' };
      case 'GainExtraTidy': return { title: '➕', desc: '下回合重抽+1' };
      default: return { title: '', desc: '' };
    }
  };

  const displayRank = (val: number) => {
    if (val <= 10) return val;
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    if (val === 14) return 'A';
    return val;
  };

  return (
    <motion.div
      layout
      variants={shakeVariants}
      initial={{ y: 300, opacity: 0, rotate: 10 }}
      animate={isShaking ? "shake" : { y: 0, opacity: 1, rotate: 0 }}
      exit={{ y: -500, opacity: 0, scale: 0.5 }}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={cn(
        "relative w-[130px] h-[190px] rounded-md border transition-all duration-300 cursor-pointer select-none flex-shrink-0 shadow-lg",
        "bg-card-bg overflow-hidden",
        isSelected ? (isInvalid ? "border-accent-red shadow-[0_0_20px_rgba(255,0,0,0.5)] z-[100]" : "border-white -translate-y-10 shadow-[0_0_20px_rgba(255,255,255,0.2)] z-[100]") : "border-border-color",
        card.isPinned && !isInvalid && "border-2 border-accent-gold shadow-[0_0_15px_rgba(197,160,89,0.3)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onToggleSelect?.(card.id)}
    >
      {/* Card Content */}
      <div className="h-full flex flex-col font-mono relative" style={{ padding: '4px' }}>
        {/* Top-Left Corner Rank (Standard) */}
        {card.suite !== 'Special' && (
          <div className="absolute flex flex-col items-center leading-none z-10 pointer-events-none" style={{ top: '4px', left: '8px' }}>
            <div className={cn("font-black tracking-tighter drop-shadow-md", card.suite === 'Hearts' || card.suite === 'Diamonds' ? "text-accent-red" : "text-white")} style={{ fontSize: '24px' }}>
              {displayRank(card.value)}
            </div>
          </div>
        )}

        {/* Top-Left Marker (Special) */}
        {card.effect && (
          <div className="absolute flex flex-col items-start z-20 pointer-events-none" style={{ top: '4px', left: '4px' }}>
            <div className="filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ fontSize: '20px' }}>
              {getEffectInfo(card.effect).title}
            </div>
            <div className="text-white font-bold leading-tight bg-black/40 rounded whitespace-nowrap" style={{ fontSize: '7px', marginTop: '2px', padding: '0 4px' }}>
              {getEffectInfo(card.effect).desc}
            </div>
          </div>
        )}

        <div className="flex-grow bg-[#0d0d0d]/40 border border-border-color/20 rounded-sm flex items-center justify-center relative overflow-hidden" style={{ marginTop: '40px', marginBottom: '4px' }}>
           <span className={cn("opacity-5", card.suite === 'Special' && "text-accent-gold opacity-10")} style={{ fontSize: '60px' }}>{getCenterIcon(card)}</span>
           {card.suite !== 'Special' && (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="font-black text-white/5 tracking-tighter" style={{ fontSize: '48px' }}>
                  {displayRank(card.value)}
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Pin Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin?.(card.id);
        }}
        className={cn(
          "absolute -translate-x-1/2 rounded-full flex items-center justify-center transition-all border",
          card.isPinned ? "bg-accent-gold text-black border-white" : "bg-[#222] text-[#666] border-[#444] hover:text-white"
        )}
        style={{ bottom: '8px', left: '50%', width: '24px', height: '24px' }}
      >
        <Pin style={{ width: '12px', height: '12px' }} />
      </button>
    </motion.div>
  );
}
