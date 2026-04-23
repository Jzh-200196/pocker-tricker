/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause } from 'lucide-react';
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
 * BattleScreen - 0 延迟交互精英版面板 (Game Feel 重构版)
 * 
 * 逻辑保真说明：
 * 1. 全局监听器：通过 window.addEventListener('pointermove') 实时精准探测。
 * 2. 0 延迟渲染：通过直接修改 DOM classList 实现瞬间弹起反馈，彻底绕过 React 渲染树更新导致的掉帧。
 * 3. 物理射线探测：document.elementFromPoint 配合静态 zIndex 确保探测结果 100% 准确。
 * 4. 【新增】：集成了出牌无效时的中央强警告（Red Warning）与状态自动还原逻辑。
 */
export function BattleScreen({ run, onVictory, onDefeat, onPause }: BattleScreenProps) {
  const {
    battle,
    isEnemyShaking,
    isPlayerShaking,
    showExplosion,
    logs,
    damagePopups,
    notifications,
    isHandShaking,
    isInvalidDeck,
    isInvalidCombo,
    invalidTriggerCount,
    showInvalidFeedback,
    victoryLoot,
    battlePrompt,
    isDragging,
    setIsDragging,
    dragMode,
    setDragMode,
    hoveredCardId,
    setHoveredCardId,
    sortedHand,
    toggleSelect,
    batchTogglePin,
    handleRedraw,
    handlePlay,
    setVictoryLoot
  } = useBattleManager({ run, onVictory, onDefeat });

  const [isPaused, setIsPaused] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastProcessedCardId = useRef<string | null>(null);

  // 初始化手牌按下 - 触发滑动模式起点
  const handleCardPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (!battle) return;
    const isAlreadySelected = battle.selectedCardIds.includes(id);
    const newMode = isAlreadySelected ? 'deselect' : 'select';
    
    setDragMode(newMode);
    setIsDragging(true);
    lastProcessedCardId.current = id;
    
    // 0 延迟瞬间反馈：直接操作 DOM 节点，避免等待 React Context 更新
    const node = e.currentTarget as HTMLElement;
    if (newMode === 'select') node.classList.add('selected-visual-up');
    else node.classList.remove('selected-visual-up');

    toggleSelect(id, newMode);
  }, [battle, toggleSelect, setIsDragging, setDragMode]);

  // 全局指针监听：解决滑动过快导致的漏选与视觉延迟
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      // 1. 同步原生 Tooltip 坐标 (硬件加速模式)
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${e.clientX + 20}px, ${e.clientY + 20}px, 0)`;
      }

      // 2. 使用 elementFromPoint 进行物理层级射线步进
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      const cardNode = target?.closest('.card-element') as HTMLElement;
      const cardId = cardNode?.getAttribute('data-card-id');

      // 3. 更新悬停状态 (同步 React 业务逻辑用于光晕显示)
      if (cardId !== hoveredCardId) {
        setHoveredCardId(cardId || null);
      }

      // 4. 滑动多选核心逻辑 (DOM 操作优先实现 0 延迟弹起)
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

  if (!battle) return <div className="flex items-center justify-center h-full bg-[#050505] text-text-dim text-xs uppercase tracking-tighter">Synchronizing Strategic Pulse...</div>;

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

      {/* --- 中央跳字警示 Overlay --- */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[100]">
        <AnimatePresence>
          {isInvalidCombo && (
            <motion.div
              key={invalidTriggerCount} // 每次触发强制重启动画
              initial={{ scale: 0.8, opacity: 0, y: 20, rotate: -2 }}
              animate={{ scale: 1.1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 1.4, opacity: 0, y: -40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="bg-red-600/10 backdrop-blur-md border-y-2 border-red-600/50 px-24 py-8 shadow-[0_0_100px_rgba(220,38,38,0.2)]"
            >
               <span className="text-white font-black text-6xl italic tracking-tighter drop-shadow-[0_0_30px_rgba(220,38,38,1)] uppercase">
                 无效的牌型!
               </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 结算与功能覆盖层 */}
      <AnimatePresence>
        {victoryLoot && (
          <VictoryOverlay 
            gold={victoryLoot.gold} 
            playerHp={victoryLoot.playerHp} 
            onConfirm={() => {
              onVictory({ gold: victoryLoot.gold }, victoryLoot.playerHp);
              setVictoryLoot(null);
            }} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && (
          <PauseOverlay run={run} onContinue={() => setIsPaused(false)} onAbandon={onDefeat} />
        )}
      </AnimatePresence>

      {/* --- HUD HEADER --- */}
      <header className="relative flex-shrink-0 flex items-center justify-between z-50 bg-gradient-to-b from-black to-transparent border-b border-white/5" style={{ height: '100px', padding: '0 60px' }}>
        <div className="flex" style={{ gap: '40px' }}>
          <HealthBar current={battle.playerHp} max={run.maxHp} armor={battle.armor} label="The Executioner" />
          <div className="flex flex-col">
            <span className="text-text-dim uppercase tracking-widest opacity-50" style={{ fontSize: '9px' }}>Current Fortune</span>
            <span className="font-mono font-black text-accent-gold" style={{ fontSize: '28px' }}>{run.gold} <span className="text-[12px] opacity-40">G</span></span>
          </div>
        </div>
        <ProgressBar current={run.currentNode} max={10} />
        <button 
          onClick={() => setIsPaused(true)} 
          className="relative border border-white/10 flex items-center justify-center hover:border-accent-gold transition-all bg-white/5 hover:bg-white/10 rounded-sm"
          style={{ width: '48px', height: '48px' }}
        >
          <Pause className="text-white" style={{ width: '20px', height: '20px' }} />
        </button>
      </header>

      {/* --- STAGE CONTEXT --- */}
      <main className="relative flex-shrink-0 flex flex-col items-center justify-center overflow-hidden" style={{ width: '1920px', height: '640px', padding: '32px' }}>
        <EnemyZone enemy={battle.enemy} isShaking={isEnemyShaking} showExplosion={showExplosion} />
        <BattleZone selectedCards={battle.hand.filter(c => battle.selectedCardIds.includes(c.id))} battlePrompt={battlePrompt} />
      </main>

      {/* --- HAND & BATTLE CONTROLS --- */}
      <footer className="relative flex-shrink-0 border-t border-white/5 bg-gradient-to-t from-black to-[#080808] flex flex-col justify-between items-center z-40" style={{ height: '340px', padding: '16px' }}>
        <ActionCenter 
          currentRedraws={battle.currentRedraws} 
          maxRedraws={2} 
          onRedraw={handleRedraw} 
          onPlay={handlePlay} 
          onBatchPin={batchTogglePin}
          selectedCount={battle.selectedCardIds.length}
          comboPreview={battle.comboPreview} 
          isRedrawDisabled={battle.currentRedraws <= 0 || battle.selectedCardIds.length === 0}
        />

        <HandArea 
          cards={sortedHand} 
          selectedCardIds={battle.selectedCardIds} 
          onCardPointerDown={handleCardPointerDown} 
          onPointerEnterCard={() => {}}
          hoveredCardId={hoveredCardId}
          isDragging={isDragging} 
          showInvalidFeedback={showInvalidFeedback} 
          isInvalidDeck={isInvalidDeck} 
          isInvalidCombo={isInvalidCombo}
          invalidTriggerCount={invalidTriggerCount}
          isHandShaking={isHandShaking}
        />
      </footer>

      {/* --- ULTIMATE 0-LATENCY TOOLTIP --- */}
      {hoveredCard && hoveredCard.suite === 'Special' && (
          <div
            ref={tooltipRef}
            className="fixed pointer-events-none z-[500] rounded-lg p-4 border border-white/20 shadow-2xl backdrop-blur-xl bg-black/60 flex flex-col gap-1 min-w-[240px]"
            style={{ willChange: 'transform', left: 0, top: 0 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_8px_rgba(197,160,89,1)]" />
              <span className="text-accent-gold font-bold uppercase tracking-widest text-[11px]">Anomaly Signal</span>
            </div>
            <h4 className="text-white font-black italic text-lg">{hoveredCard.name}</h4>
            <div className="h-[1px] w-full bg-white/10 my-1" />
            <p className="text-white/70 text-[13px] leading-relaxed italic">
               {hoveredCard.effect === 'Heal' && "获得 5 点瞬时生命恢复。触发连对时效能大幅增强。"}
               {hoveredCard.effect === 'ArmorBuff' && "生成 4 点灵能护甲，持续吸收敌方的所有物理损伤。"}
               {hoveredCard.effect === 'GainExtraTidy' && "获取战况洞察。立即获得 +1 次本回合的重抽额度。"}
            </p>
          </div>
      )}

      {/* Dynamic Battle Notifications */}
      <div className="absolute left-10 z-[60] flex flex-col gap-3 pointer-events-none" style={{ top: '130px' }}>
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="bg-black/80 backdrop-blur-lg border font-black uppercase tracking-[0.2em] px-8 py-4 border-l-4 border-accent-red"
              style={{ fontSize: '11px' }}
            >
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
