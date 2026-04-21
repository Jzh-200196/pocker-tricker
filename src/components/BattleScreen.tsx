/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, AlertTriangle } from 'lucide-react';
import { RunState } from '../types/game';
import { useBattleManager } from '../hooks/useBattleManager';
import { HealthBar } from './ui/HealthBar';
import { DamagePopups } from './ui/DamagePopups';
import { BattleLog } from './ui/BattleLog';
import { ProgressBar } from './ui/ProgressBar';
import { EnemyZone } from './battle/EnemyZone';
import { BattleZone } from './battle/BattleZone';
import { ActionCenter } from './battle/ActionCenter';
import { HandArea } from './battle/HandArea';
import { VictoryOverlay } from './modals/VictoryOverlay';
import { PauseOverlay } from './modals/PauseOverlay';
import { cn } from '../lib/utils';

interface BattleScreenProps {
  run: RunState;
  onVictory: (loot: any, endHp: number) => void;
  onDefeat: () => void;
  onPause: () => void;
}

/**
 * BattleScreen - 0 延迟交互精英版 (反馈增强)
 * 
 * 1. 【改动二】：非法出牌中央跳字提示。
 * 2. 【改动三】：选中状态变更监听自动还原。
 * 3. 底层优化保真：Bypass React DOM 操作、全局监听器、1080p 架构。
 */
export function BattleScreen({ run, onVictory, onDefeat, onPause }: BattleScreenProps) {
  const {
    battle, isEnemyShaking, isPlayerShaking, showExplosion, logs, damagePopups, notifications, isHandShaking,
    isInvalidDeck, showInvalidFeedback, victoryLoot, battlePrompt, isDragging, setIsDragging, dragMode, setDragMode,
    hoveredCardId, setHoveredCardId, sortedHand, toggleSelect, batchTogglePin, handleRedraw, handlePlay, setVictoryLoot,
    isInvalidCombo, invalidTriggerCount
  } = useBattleManager({ run, onVictory, onDefeat });

  const [isPaused, setIsPaused] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastProcessedCardId = useRef<string | null>(null);

  // 手牌点击逻辑 - 触发瞬间反馈
  const handleCardPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (!battle) return;
    const isAlreadySelected = battle.selectedCardIds.includes(id);
    const newMode = isAlreadySelected ? 'deselect' : 'select';
    
    setDragMode(newMode);
    setIsDragging(true);
    lastProcessedCardId.current = id;
    
    // Bypass React DOM Feedback: 瞬间位移平移
    const node = e.currentTarget as HTMLElement;
    if (newMode === 'select') node.classList.add('selected-visual-up');
    else node.classList.remove('selected-visual-up');

    toggleSelect(id, newMode);
  }, [battle, toggleSelect, setIsDragging, setDragMode]);

  // 全局指针探测：核心性能黑科技
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${e.clientX + 20}px, ${e.clientY + 20}px, 0)`;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      const cardNode = target?.closest('.card-element') as HTMLElement;
      const cardId = cardNode?.getAttribute('data-card-id');

      if (cardId !== hoveredCardId) setHoveredCardId(cardId || null);

      if (isDragging && dragMode && cardId && cardId !== lastProcessedCardId.current) {
        lastProcessedCardId.current = cardId;
        const isCurrentlySelected = battle?.selectedCardIds.includes(cardId);
        
        if (dragMode === 'select' && !isCurrentlySelected) {
          cardNode.classList.add('selected-visual-up');
          toggleSelect(cardId, 'select');
        } else if (dragMode === 'deselect' && isCurrentlySelected) {
          cardNode.classList.remove('selected-visual-up');
          toggleSelect(cardId, 'deselect');
        }
      }
    };

    const handleGlobalPointerUp = () => {
      setIsDragging(false);
      setDragMode(null);
      lastProcessedCardId.current = null;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDragging, dragMode, hoveredCardId, battle?.selectedCardIds, setHoveredCardId, setIsDragging, setDragMode, toggleSelect]);

  if (!battle) return <div className="flex h-full items-center justify-center bg-bg-deep uppercase font-mono text-xs tracking-widest text-text-dim">Battle Matrix Online...</div>;

  const hoveredCard = hoveredCardId ? battle.hand.find(c => c.id === hoveredCardId) : null;

  return (
    <div 
      className={cn(
        "relative w-[1920px] h-[1080px] overflow-hidden font-sans flex flex-col transition-all duration-1000 bg-cover bg-center",
        battle.enemy.bgClassName || "bg-bg-deep",
        isDragging && "cursor-crosshair"
      )}
      style={battle.enemy.background ? { backgroundImage: `url(${battle.enemy.background})` } : {}}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] z-0" />

      {/* 结算与功能弹窗 */}
      <AnimatePresence>
        {victoryLoot && (
          <VictoryOverlay 
            gold={victoryLoot.gold} playerHp={victoryLoot.playerHp} 
            onConfirm={() => { onVictory({ gold: victoryLoot.gold }, victoryLoot.playerHp); setVictoryLoot(null); }} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && (
          <PauseOverlay run={run} onContinue={() => setIsPaused(false)} onAbandon={onDefeat} />
        )}
      </AnimatePresence>

      {/* --- HEADER HUD --- */}
      <header className="relative flex-shrink-0 flex items-center justify-between z-50 bg-gradient-to-b from-black to-transparent border-b border-white/5" style={{ height: '100px', padding: '0 60px' }}>
        <div className="flex" style={{ gap: '40px' }}>
          <HealthBar current={battle.playerHp} max={run.maxHp} armor={battle.armor} label="System.Agent(01)" />
          <div className="flex flex-col">
            <span className="text-text-dim uppercase tracking-widest opacity-50" style={{ fontSize: '9px' }}>Current Wealth</span>
            <span className="font-mono font-black text-accent-gold" style={{ fontSize: '28px' }}>{run.gold} <span className="text-[12px] opacity-40">G</span></span>
          </div>
        </div>
        <ProgressBar current={run.currentNode} max={10} />
        <button onClick={() => setIsPaused(true)} className="relative border border-white/10 flex items-center justify-center hover:border-accent-gold transition-all bg-white/5 hover:bg-white/10 rounded-sm w-[48px] h-[48px]">
          <Pause className="text-white w-5 h-5" />
        </button>
      </header>

      {/* --- CORE STAGE --- */}
      <main className="relative flex-shrink-0 flex flex-col items-center justify-center overflow-hidden h-[640px] w-[1920px] p-8">
        <EnemyZone enemy={battle.enemy} isShaking={isEnemyShaking} showExplosion={showExplosion} />
        <BattleZone selectedCards={battle.hand.filter(c => battle.selectedCardIds.includes(c.id))} battlePrompt={battlePrompt} />
        
        {/* 【改动二】：出牌无效时的大字中央警示 */}
        <AnimatePresence>
          {isInvalidCombo && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.2, opacity: 0, transition: { duration: 0.2 } }}
              className="absolute z-[100] top-[75%] flex flex-col items-center gap-2"
            >
              <div className="bg-red-600 px-10 py-3 rounded-full flex items-center gap-4 border-2 border-white shadow-[0_0_50px_rgba(220,38,38,0.8)]">
                <AlertTriangle className="text-white w-8 h-8 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-4xl uppercase">Invalid Card Combination!</span>
              </div>
              <span className="text-red-500 font-bold uppercase tracking-widest text-[11px] bg-black/60 px-4 py-1 rounded backdrop-blur-sm">
                Cards must form Pair, Three, Four, or Straight
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- HAND & ACTION BAR --- */}
      <footer className="relative flex-shrink-0 border-t border-white/5 bg-gradient-to-t from-black to-[#080808] flex flex-col justify-between items-center z-40 h-[340px] p-4">
        <ActionCenter 
          currentRedraws={battle.currentRedraws} maxRedraws={2} onRedraw={handleRedraw} onPlay={handlePlay} onBatchPin={batchTogglePin}
          selectedCount={battle.selectedCardIds.length} comboPreview={battle.comboPreview} 
          isRedrawDisabled={battle.currentRedraws <= 0 || battle.selectedCardIds.length === 0}
        />

        <HandArea 
          cards={sortedHand} selectedCardIds={battle.selectedCardIds} onCardPointerDown={handleCardPointerDown} 
          onPointerEnterCard={() => {}} hoveredCardId={hoveredCardId} isDragging={isDragging} 
          showInvalidFeedback={showInvalidFeedback} isInvalidDeck={isInvalidDeck} isHandShaking={isHandShaking}
          isInvalidCombo={isInvalidCombo} invalidTriggerCount={invalidTriggerCount}
        />
      </footer>

      {/* --- NATIVE DRIVEN TOOLTIP --- */}
      {hoveredCard && hoveredCard.suite === 'Special' && (
          <div ref={tooltipRef} className="fixed pointer-events-none z-[500] rounded-lg p-4 border border-white/20 shadow-2xl backdrop-blur-xl bg-black/60 flex flex-col gap-1 min-w-[240px]" style={{ willChange: 'transform', left: 0, top: 0 }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_8px_rgba(197,160,89,1)]" />
              <span className="text-accent-gold font-bold uppercase tracking-widest text-[11px]">Quantum Signal</span>
            </div>
            <h4 className="text-white font-black italic text-lg">{hoveredCard.name}</h4>
            <div className="h-[1px] w-full bg-white/10 my-1" />
            <p className="text-white/70 text-[13px] leading-relaxed italic">
               {hoveredCard.effect === 'Heal' && "Instantly mend your damaged matrix. Successive pair execution enhances vitality return."}
               {hoveredCard.effect === 'ArmorBuff' && "Wove an energy shield around your frame. Absorbs incoming physical strikes."}
               {hoveredCard.effect === 'GainExtraTidy' && "Tactical calculation. Gain an additional redraw capacity for this strategic bypass."}
            </p>
          </div>
      )}

      {/* Side Notifications */}
      <div className="absolute left-10 z-[60] flex flex-col gap-3 pointer-events-none top-[130px]">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
              className="bg-black/80 backdrop-blur-lg border font-black uppercase tracking-[0.2em] px-8 py-4 border-l-4 border-accent-red text-[11px]">
              <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{n.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <DamagePopups popups={damagePopups} />
      <BattleLog logs={logs} />
    </div>
  );
}
