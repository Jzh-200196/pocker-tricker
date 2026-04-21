/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
   * invalidTriggerCount: 触发无效报警的计数器，用于重置抖动动画
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

/** 震动动画变体 */
const shakeVariants = {
  idle: (isSelected: boolean) => ({
    y: isSelected ? -30 : 0, 
    x: 0,
    opacity: 1, 
    rotate: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }),
  shake: (isSelected: boolean) => ({
    y: isSelected ? -30 : 0, // 核心逻辑：震动时必须保持原本选中时的向上位移
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
 * CardComponent - 高级 Game Feel 重构版
 * 
 * 核心提升：
 * 1. 【改动一】：特殊牌标记从右上角移动到左上角 (left: 8px)。
 * 2. 【改动二】：支持 isInvalidCombo 状态，触发血红色警告边框。
 * 3. 【改动二】：使用 invalidTriggerCount 强制重新播放 Shake 动画。
 * 4. 架构保真：100% 保留 .card-element 射线探测机制、静态 Z-Index、pointer-events-none。
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
      // 使用 key 绑定触发计数器，确保动画每次都能在视觉上“重置”并重新播放
      key={`${card.id}-${invalidTriggerCount}`}
      variants={shakeVariants}
      animate={(isShaking || (isSelected && isInvalidCombo)) ? "shake" : "idle"}
      exit={{ y: -500, opacity: 0, scale: 0.5 }}
      onPointerDown={(e) => {
        if (disabled) return;
        // 射线探测核心优化：释放指针捕获
        e.currentTarget.releasePointerCapture(e.pointerId);
        onPointerDown?.(card.id, e);
      }}
      draggable={false}
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
        // 核心视觉逻辑补丁：
        // 1. 如果选中且 combo 无效 -> 变为血红色警告边框
        // 2. 否则根据业务：选中(白色)、固定(金色)、默认(深灰色)
        (isSelected && isInvalidCombo) 
          ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]" 
          : (isSelected ? "border-white shadow-[0_15px_40px_rgba(0,0,0,0.8)]" : (card.isPinned ? "border-accent-gold shadow-md" : "border-[#333]")),
        
        isTopmostHovered && "ring-2 ring-white/60 shadow-[0_0_20px_rgba(255,255,255,0.4)]",
        disabled && "opacity-50 cursor-not-allowed",
        isDraggingMode && "cursor-crosshair"
      )}
    >
      {/* 遮罩屏蔽层：直达 .card-element 节点 */}
      <div className="absolute inset-0 z-[50] pointer-events-none" />

      {/* Card Content Interior - 子元素 pointer-events-none 防止射线检测中断 */}
      <div className="h-full flex flex-col font-mono relative p-1 pointer-events-none">
        
        {/* 【改动一】：特殊牌标记移动到左上角 (Left-2) */}
        {effectData && (
          <div className="absolute z-30 pointer-events-none" style={{ top: '8px', left: '8px' }}>
             <span className={cn("text-lg drop-shadow-md", effectData.iconColor)}>
               {effectData.icon}
             </span>
          </div>
        )}

        {/* 标准点数与花色显示 (仅在非特殊牌或作为背景显示) */}
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

        {/* 核心中央图形 */}
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

           {/* 底部效果面板 (仅特殊牌) */}
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

        {/* 底部功能反馈元数据 */}
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

      {/* 选中时的内边缘发光（如果 Combo 无效则不显示白色内光以突显血红边框，或叠加显示） */}
      {isSelected && !isInvalidCombo && (
        <div 
          className="absolute inset-0 border-[3px] border-white pointer-events-none"
          style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3)' }}
        />
      )}
      
      {/* 出牌无效时的血红内部蒙版提示 */}
      {isSelected && isInvalidCombo && (
        <div className="absolute inset-0 border-[3px] border-red-600/50 pointer-events-none bg-red-600/5 animate-pulse" />
      )}
    </motion.div>
  );
});

CardComponent.displayName = 'CardComponent';
