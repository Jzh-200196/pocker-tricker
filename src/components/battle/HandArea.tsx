/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { cn } from '../../lib/utils';

interface HandAreaProps {
  cards: Card[];
  selectedCardIds: string[];
  onCardPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerEnterCard: (id: string) => void;
  isDragging: boolean;
  showInvalidFeedback: boolean;
  isInvalidDeck: boolean;
  isInvalidCombo?: boolean;
  invalidTriggerCount?: number;
  isHandShaking: boolean;
  hoveredCardId: string | null;
}

/**
 * 优化后的手牌渲染区 - 物理层叠保真版
 * 【铁律遵循】：
 * 1. 静态 Z-Index：zIndex 严格且仅由数组索引 idx 决定。
 * 2. 绝对禁止动态层级：选中或悬停时不再改变 zIndex，确保物理堆叠顺序恒定。
 */
export const HandArea = memo(({
  cards,
  selectedCardIds,
  onCardPointerDown,
  onPointerEnterCard,
  isDragging,
  showInvalidFeedback,
  isInvalidDeck,
  isInvalidCombo,
  invalidTriggerCount,
  isHandShaking,
  hoveredCardId
}: HandAreaProps) => {
  return (
    <div 
      className="flex justify-center items-end relative select-none touch-none"
      style={{ width: '100%', height: '100%', paddingBottom: '32px', paddingLeft: '64px', paddingRight: '64px' }}
    >
      <AnimatePresence mode="popLayout">
        {cards.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          
          // 【铁律】：静态层级分配。左边的牌永远在下面，右边的牌永远压在上面。
          const zIndex = 10 + idx;

          return (
            <motion.div 
              key={card.id}
              data-card-id={card.id}
              layout
              initial={{ y: 200, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 120,
                layout: { duration: 0.3 }
              }}
              className={cn(
                "flex-shrink-0 origin-bottom relative transition-all duration-300",
                idx !== 0 && "ml-[-85px]"
              )}
              style={{ zIndex }}
            >
              <CardComponent 
                card={card}
                isSelected={isSelected}
                isInvalid={showInvalidFeedback && isInvalidDeck && isSelected}
                isInvalidCombo={isInvalidCombo}
                invalidTriggerCount={invalidTriggerCount}
                isShaking={isHandShaking && isSelected}
                isTopmostHovered={hoveredCardId === card.id}
                isDraggingMode={isDragging}
                onPointerDown={onCardPointerDown}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

HandArea.displayName = 'HandArea';
