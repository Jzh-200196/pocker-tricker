/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Card as CardType } from '../types/card';
import { cn } from '../lib/utils';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
  /** 
   * 改动二：新增出牌无效视觉反馈状态
   * isInvalidCombo: 当前选中的牌组是否判定为非法
   * invalidTriggerCount: 触发无效报警的计数器，用于重置并重新触发抖动动画
   */
  isInvalidCombo?: boolean;
  invalidTriggerCount?: number;
  
  isShaking?: boolean;
  /** 是否是鼠标指向的最顶层卡牌，用于显示高亮边缘 */
  isTopmostHovered?: boolean;
  /** 是否处于拖拽多选模式中 */
  isDraggingMode?: boolean;
  /** 指针按下事件 - 触发滑动多选的起点 */
  onPointerDown?: (id: string, e: React.PointerEvent) => void;
  /** 静态层级索引 - 铁律必须配合 position: relative */
  zIndex: number;
}

/** 
 * 震动动画变体 
 * 核心逻辑：震动过程中必须保持 [y: -20] 的向上位移（如果是选中状态），确保卡牌不掉下去。
 */
const shakeVariants = {
  idle: (isSelected: boolean) => ({
    y: isSelected ? -20 : 0, 
    x: 0,
    opacity: 1, 
    rotate: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }),
  shake: (isSelected: boolean) => ({
    y: isSelected ? -20 : 0, 
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.25 }
  })
};

const suiteIcons: Record<string, string> = {
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
  Spades: '♠',
};

/**
 * CardComponent - 高级 Game Feel 重构版 (第一步)
 * 
 * 核心优化：
 * 1. 【改动一】：特殊牌标记位置从右上角调整至左上角 (Left: 8px)。
 * 2. 【改动二】：集成 isInvalidCombo 状态，触发血红色警告高亮。
 * 3. 【改动二】：利用 invalidTriggerCount 的 Key 改动机制保证震动动画可重复触发。
 * 4. 架构保真：保留 0 延迟射线检测所需的 classList 支持、zIndex 与 pointer-events-none。
 */
export const CardComponent = memo(({ 
  card, 
  isSelected, 
  disabled, 
  isInvalid, 
  isInvalidCombo,
  invalidTriggerCount = 0,
  isShaking, 
  isTopmostHovered,
  isDraggingMode,
  onPointerDown,
  zIndex
}: CardProps) => {
  
  const getCenterIcon = (card: CardType) => {
    if (card.suite === 'Special') return '★';
    return suiteIcons[card.suite as keyof typeof suiteIcons] || '♠';
  };

  const getEffectInfo = (effect: string) => {
    switch (effect) {
      case 'Heal': return { 
        title: '恢复', 
        value: '5', 
        unit: 'HP', 
        color: 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300',
        icon: '❤️',
        iconColor: 'text-red-500'
      };
      case 'ArmorBuff': return { 
        title: '护盾', 
        value: '4', 
        unit: 'ARM', 
        color: 'bg-blue-900/40 border-blue-500/50 text-blue-300',
        icon: '🛡️',
        iconColor: 'text-blue-400'
      };
      case 'GainExtraTidy': return { 
        title: '灵感', 
        value: '+1', 
        unit: 'DRAW', 
        color: 'bg-purple-900/40 border-purple-500/50 text-purple-300',
        icon: '➕',
        iconColor: 'text-yellow-400'
      };
      default: return null;
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

  const effectData = card.effect ? getEffectInfo(card.effect) : null;

  return (
    <motion.div
      layout
      custom={isSelected}
      // 关键：使用 id + triggerCount 作为 key，强制 React 重建该 motion 元素以重新播放动画
      key={`${card.id}-${invalidTriggerCount}`}
      variants={shakeVariants}
      animate={(isShaking || (isSelected && isInvalidCombo)) ? "shake" : "idle"}
      exit={{ y: -500, opacity: 0, scale: 0.5 }}
      onPointerDown={(e) => {
        if (disabled) return;
        // 射线探测核心：释放指针捕获
        e.currentTarget.releasePointerCapture(e.pointerId);
        onPointerDown?.(card.id, e);
      }}
      draggable={false}
      // 0 延迟系统所需的元数据
      data-card-id={card.id}
      data-is-card="true"
      style={{ 
        userSelect: 'none', 
        touchAction: 'none', 
        WebkitUserDrag: 'none',
        zIndex: zIndex,
        position: 'relative' 
      }}
      className={cn(
        "card-element relative w-[130px] h-[190px] rounded-md border transition-all duration-200 flex-shrink-0 shadow-2xl",
        "bg-[#111] overflow-hidden group touch-none",
        // 视觉分歧逻辑：
        // 1. 无效出牌状态 -> 血红色
        // 2. 正常状态 -> 逻辑高亮
        (isSelected && isInvalidCombo) 
          ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]" 
          : (isSelected ? "border-white shadow-[0_15px_40px_rgba(0,0,0,0.8)]" : (card.isPinned ? "border-accent-gold" : "border-[#333]")),
        
        isTopmostHovered && "ring-2 ring-white/60 shadow-[0_0_20px_rgba(255,255,255,0.4)]",
        disabled && "opacity-50 cursor-not-allowed",
        isDraggingMode && "cursor-crosshair"
      )}
    >
      <div className="absolute inset-0 z-[50] pointer-events-none" />

      <div className="h-full flex flex-col font-mono relative p-1 pointer-events-none">
        
        {/* 【改动一】：特殊牌标记位置调整至左上角 (Top-2 Left-2) */}
        {effectData && (
          <div className="absolute z-30 pointer-events-none" style={{ top: '8px', left: '8px' }}>
             <span className={cn("text-lg drop-shadow-md", effectData.iconColor)}>
               {effectData.icon}
             </span>
          </div>
        )}

        {/* 基准点数与花色显示 (仅非特殊牌) */}
        {card.suite !== 'Special' && (
          <div className="absolute flex flex-col items-center leading-none z-10" style={{ top: '6px', left: '8px' }}>
            <div className={cn(
              "font-black tracking-tighter drop-shadow-lg", 
              card.suite === 'Hearts' || card.suite === 'Diamonds' ? "text-accent-red" : "text-white"
            )} style={{ fontSize: '26px' }}>
              {displayRank(card.value)}
            </div>
            <div className={cn("text-[12px] -mt-1", card.suite === 'Hearts' || card.suite === 'Diamonds' ? "text-accent-red" : "text-text-dim")}>
              {suiteIcons[card.suite] || '♠'}
            </div>
          </div>
        )}

        {/* 核心中央图形区块 */}
        <div className="flex-grow flex items-center justify-center relative bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-sm border border-white/5 mt-1">
           <span className={cn(
             "opacity-[0.03] select-none", 
             card.suite === 'Special' ? "text-accent-gold opacity-[0.07]" : "text-white"
           )} style={{ fontSize: '80px' }}>
             {getCenterIcon(card)}
           </span>
           
           {card.suite !== 'Special' && (
             <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="font-black text-white/5 tracking-tighter select-none" style={{ fontSize: '56px' }}>
                  {displayRank(card.value)}
                </div>
             </div>
           )}

           {/* 底部特殊效果详情 */}
           {effectData && (
             <div className="absolute inset-0 flex flex-col justify-end p-2 pb-4">
                <div className={cn(
                  "w-full rounded border flex flex-col items-center py-2 px-1 backdrop-blur-sm shadow-lg",
                  effectData.color
                )}>
                   <span className="uppercase font-black tracking-tighter opacity-70" style={{ fontSize: '9px' }}>{effectData.title}</span>
                   <div className="flex items-baseline gap-1">
                      <span className="font-black" style={{ fontSize: '22px' }}>{effectData.value}</span>
                      <span className="font-bold opacity-60" style={{ fontSize: '8px' }}>{effectData.unit}</span>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* 底部元数据栏 */}
        <div className="h-6 flex items-center justify-between px-2">
           <div className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", card.isPinned ? "bg-accent-gold animate-pulse" : "bg-white/10")} />
              <span className="text-[7px] uppercase tracking-tighter text-text-dim">
                {card.isPinned ? "Secured" : "Volatile"}
              </span>
           </div>
           {card.suite === 'Special' && (
             <span className="text-[7px] font-black text-accent-gold italic uppercase">Anomaly</span>
           )}
        </div>
      </div>

      {/* 高亮反馈层 */}
      {isSelected && !isInvalidCombo && (
        <div 
          className="absolute inset-0 border-[3px] border-white pointer-events-none"
          style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3)' }}
        />
      )}
      
      {/* 出牌无效时的血红内蚀刻提示 */}
      {isSelected && isInvalidCombo && (
        <div className="absolute inset-0 border-[3px] border-red-600/50 pointer-events-none bg-red-600/5 animate-pulse" />
      )}
    </motion.div>
  );
});

CardComponent.displayName = 'CardComponent';
