/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sword, Heart, Zap, RefreshCw, Play, Settings, Pause, Trash2, Layers } from 'lucide-react';
import { drawXCards } from '../utils/cardGenerator';
import { BattleState, Card, Enemy, ComboResult, GameState, RunState, AnomalyMechanism } from '../types';
import { CardComponent } from './CardComponent';
import { ExplosionVFX } from './ExplosionVFX';
import { detectCombo } from '../utils/ComboDetector';
import { shuffle, cn } from '../lib/utils';
import { ENEMIES } from '../constants';

interface BattleScreenProps {
  run: RunState;
  onVictory: (loot: any, endHp: number) => void;
  onDefeat: () => void;
  onPause: () => void;
}

interface DamagePopup {
  id: string;
  value: number;
  x: number;
  y: number;
  isHeal?: boolean;
}

interface BattleNotification {
  id: string;
  text: string;
}

export function BattleScreen({ run, onVictory, onDefeat, onPause }: BattleScreenProps) {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [isEnemyShaking, setIsEnemyShaking] = useState(false);
  const [isPlayerShaking, setIsPlayerShaking] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [notifications, setNotifications] = useState<BattleNotification[]>([]);
  const [isHandShaking, setIsHandShaking] = useState(false);
  const [isInvalidDeck, setIsInvalidDeck] = useState(false);
  const [showInvalidFeedback, setShowInvalidFeedback] = useState(false);

  // AI logic helper to generate next intent
  const generateEnemyIntent = (turn: number) => {
    if (turn % 5 === 0) {
      return { type: 'Special' as const, value: 25, description: 'ULTIMATE EXECUTION' };
    }
    const roll = Math.random();
    if (roll < 0.65) {
      return { type: 'Attack' as const, value: 8, description: 'Standard Strike' };
    } else if (roll < 0.8) {
      return { type: 'Special' as const, value: 5, description: 'Restoration' }; // Heal
    } else {
      return { type: 'Defend' as const, value: 3, description: 'Energy Shield' }; // Shield
    }
  };

  // Initialize Battle
  useEffect(() => {
    // Select enemy based on current node
    const isBoss = run.currentNode === 10;
    const enemyKey = isBoss ? 'boss' : (run.currentNode % 2 === 0 ? 'specter' : 'executioner');
    const enemyData = ENEMIES[enemyKey];
    
    // Anomaly Mechanism selection
    let mechanism: AnomalyMechanism = 'None';
    let monsterHpBonus = 1;
    if (run.currentRoomType === 'Event') {
      const mechanisms: AnomalyMechanism[] = ['TwinPairCombo', 'CriticalStrike', 'WeakHand', 'Vampiric'];
      mechanism = mechanisms[Math.floor(Math.random() * mechanisms.length)];
      if (mechanism === 'TwinPairCombo') monsterHpBonus = 1.3;
    }

    const initialDeck = shuffle([...run.deck]);
    
    // Relic effect: Old Card Box (+1 draw)
    const initialDrawSize = run.relics.includes('old_card_box') ? 6 : 5;
    // Anomaly effect: Weak Hand (-1 draw)
    const cardsToDraw = mechanism === 'WeakHand' ? initialDrawSize - 1 : initialDrawSize;

    const hand = drawXCards(cardsToDraw);
    const drawPile = initialDeck.slice(cardsToDraw);

    let startHp = run.currentHp;
    // Relic effect: Gambler Coin (-2 HP)
    if (run.relics.includes('gambler_coin')) {
      startHp -= 2;
    }

    const initialIntent = generateEnemyIntent(1);
    
    setBattle({
      enemy: { 
        ...enemyData, 
        hp: Math.floor(enemyData.maxHp * monsterHpBonus), 
        maxHp: Math.floor(enemyData.maxHp * monsterHpBonus),
        intent: initialIntent
      },
      playerHp: Math.max(startHp, 1),
      hand,
      redrawCount: 2,
      armor: 0,
      turn: 1,
      comboPreview: null,
      selectedCardIds: [],
      mechanism,
      consecutivePairs: 0,
      firstRedrawFreeUsed: false,
      firstStraightUsed: false
    });
    
    const anomalyMsg = mechanism !== 'None' ? ` [${mechanism}]` : '';
    addLog(`Battle starts! Node ${run.currentNode}${anomalyMsg}`);
    if (mechanism !== 'None') {
      addNotification(`MODIFIER: ${mechanism.toUpperCase()}`);
    }
  }, [run.currentNode, run.currentRoomType]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const cardRects = useRef<Record<string, DOMRect>>({});

  // Global mouse up for swipe selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragMode(null);
      cardRects.current = {};
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleCardPointerDown = (id: string, e: React.PointerEvent) => {
    if (!battle) return;
    e.stopPropagation(); // Only topmost relative sibling
    
    const isSelected = battle.selectedCardIds.includes(id);
    const newMode = isSelected ? 'deselect' : 'select';
    setDragMode(newMode);
    setIsDragging(true);
    
    // Capture all card bounding boxes at the start of drag for high-speed coordinate testing
    const elements = document.querySelectorAll('[data-card-id]');
    elements.forEach(el => {
      const cardId = el.getAttribute('data-card-id');
      if (cardId) cardRects.current[cardId] = el.getBoundingClientRect();
    });

    // Perform initial toggle
    toggleSelect(id);
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragMode || !battle) return;
    
    const x = e.clientX;
    const y = e.clientY;

    // Filter cards currently under the cursor based on original drag-start rectangles
    const candidates = Object.entries(cardRects.current).filter(([id, unknownRect]) => {
      const rect = unknownRect as DOMRect;
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });

    if (candidates.length === 0) return;

    // "Topmost only" logic: Identify the card with the highest z-index (highest index in sortedHand)
    let topmostId = candidates[0][0];
    let maxIdx = -1;

    candidates.forEach(([id]) => {
      const idx = sortedHand.findIndex(c => c.id === id);
      if (idx > maxIdx) {
        maxIdx = idx;
        topmostId = id;
      }
    });

    const isSelected = battle.selectedCardIds.includes(topmostId);
    if (dragMode === 'select' && !isSelected) {
      toggleSelect(topmostId);
    } else if (dragMode === 'deselect' && isSelected) {
      toggleSelect(topmostId);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const addNotification = (text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, text }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const triggerDamagePopup = (value: number, target: 'Player' | 'Enemy', isHeal = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    const popup: DamagePopup = {
      id,
      value,
      isHeal,
      // Target positions (rough guesses for center of enemy/player)
      x: target === 'Enemy' ? 50 : 20, 
      y: target === 'Enemy' ? 40 : 10
    };
    setDamagePopups(prev => [...prev, popup]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  const toggleSelect = (id: string) => {
    if (!battle) return;
    setBattle(prev => {
      if (!prev) return prev;
      const isSelected = prev.selectedCardIds.includes(id);
      const newSelection = isSelected 
        ? prev.selectedCardIds.filter(sid => sid !== id)
        : [...prev.selectedCardIds, id];
      
      const selectedCards = prev.hand.filter(c => newSelection.includes(c.id));
      const comboPreview = detectCombo(selectedCards);

      // Validation Rules
      const isStraightType = comboPreview.type === 'Straight' || comboPreview.type === 'StraightFlush';
      
      let invalid = false;
      
      // Rule 1 & Refinement: No "kickers" (single cards of other ranks) unless it's a Straight
      if (selectedCards.length > 0 && !isStraightType) {
        const rankCounts: Record<number, number> = {};
        selectedCards.forEach(c => rankCounts[c.value] = (rankCounts[c.value] || 0) + 1);
        
        const counts = Object.values(rankCounts);
        const distinctRanks = Object.keys(rankCounts);
        
        // If there are multiple ranks, none can be "single" (count 1)
        const hasSingleValue = counts.some(c => c === 1);
        const hasMultipleRanks = distinctRanks.length > 1;
        
        if (hasSingleValue && hasMultipleRanks) {
          invalid = true;
        }
      }

      setIsInvalidDeck(invalid);
      setShowInvalidFeedback(false); // Reset feedback when deck changes

      return { ...prev, selectedCardIds: newSelection, comboPreview };
    });
  };

  const togglePin = (id: string) => {
    if (!battle) return;
    const card = battle.hand.find(c => c.id === id);
    if (!card) return;

    if (!card.isPinned) {
      const pinnedCount = battle.hand.filter(c => c.isPinned).length;
      if (pinnedCount >= 2) {
        addNotification("普通牌固定已达上限");
        return;
      }
    }

    setBattle(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        hand: prev.hand.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c)
      };
    });

    // Deselect after 0.5s delay
    setTimeout(() => {
      setBattle(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          selectedCardIds: prev.selectedCardIds.filter(sid => sid !== id)
        };
      });
    }, 500);
  };

  const handleRedraw = () => {
    if (!battle || battle.selectedCardIds.length === 0) return;

    // Relic effect: Shuffler (First redraw free)
    const isFree = run.relics.includes('shuffler') && !battle.firstRedrawFreeUsed;
    if (!isFree && battle.redrawCount <= 0) return;

    // Filter out pinned cards from selection (just in case UI allowed it)
    const validSelection = battle.selectedCardIds.filter(id => {
      const card = battle.hand.find(c => c.id === id);
      return card && !card.isPinned;
    });

    if (validSelection.length === 0) return;

    let currentDrawPile = [...battle.drawPile];
    let currentDiscardPile = [...battle.discardPile, ...battle.hand.filter(c => validSelection.includes(c.id))];

    if (currentDrawPile.length < validSelection.length) {
      currentDrawPile = shuffle([...currentDrawPile, ...currentDiscardPile]);
      currentDiscardPile = [];
    }

    const newCards = currentDrawPile.slice(0, validSelection.length);
    const updatedDrawPile = currentDrawPile.slice(validSelection.length);

    const newHand = battle.hand.map(c => {
       if (validSelection.includes(c.id)) {
         return newCards.shift()!;
       }
       return c;
    });

    setBattle(prev => prev ? ({
      ...prev,
      hand: newHand,
      drawPile: updatedDrawPile,
      discardPile: currentDiscardPile,
      redrawCount: isFree ? prev.redrawCount : prev.redrawCount - 1,
      firstRedrawFreeUsed: isFree || prev.firstRedrawFreeUsed,
      selectedCardIds: [],
      comboPreview: null
    }) : null);

    addLog(isFree ? "免费重抽!" : `重抽! 替换了 ${validSelection.length} 张牌.`);
  };

  const executeEnemyTurn = (currentBattle: BattleState, extraTidy: number, consecutivePairs: number, playedStraight: boolean) => {
    const { type, value, description } = currentBattle.enemy.intent;
    let actualDamageDealt = 0;
    let enemyHeal = 0;
    let enemyShield = 0;

    if (type === 'Attack' || (type === 'Special' && value === 25)) {
      let damage = value;
      if (currentBattle.mechanism === 'CriticalStrike') damage = Math.floor(damage * 1.5);
      
      // SHIELD FIRST LOGIC
      let remainingDamage = damage;
      let newArmor = currentBattle.armor;
      
      if (newArmor > 0) {
        const shieldAbsorb = Math.min(newArmor, remainingDamage);
        newArmor -= shieldAbsorb;
        remainingDamage -= shieldAbsorb;
        addLog(`Shield absorbed ${shieldAbsorb} damage!`);
        addNotification(`SHIELD BLOCK: ${shieldAbsorb}`);
      }

      actualDamageDealt = remainingDamage;
      triggerDamagePopup(damage, 'Player');
      addLog(`${currentBattle.enemy.name} used ${description} for ${damage}! Dealt ${actualDamageDealt} to HP.`);
      
      playerArmorAfterTurn = newArmor;
    } else if (type === 'Special' && value === 5) {
      enemyHeal = 5;
      triggerDamagePopup(5, 'Enemy', true);
      addLog(`${currentBattle.enemy.name} used ${description} to heal 5 HP!`);
      playerArmorAfterTurn = currentBattle.armor;
    } else if (type === 'Defend') {
      enemyShield = 15; // Increased for better show
      addLog(`${currentBattle.enemy.name} used ${description} to gain ${enemyShield} Armor!`);
      addNotification(`${currentBattle.enemy.name.toUpperCase()} GAINED SHIELD`);
      playerArmorAfterTurn = currentBattle.armor;
    }

    setIsPlayerShaking(actualDamageDealt > 0);
    if (actualDamageDealt > 0) setTimeout(() => setIsPlayerShaking(false), 500);

    const newPlayerHp = Math.max(0, currentBattle.playerHp - actualDamageDealt);
    const newEnemyHp = Math.min(currentBattle.enemy.maxHp, currentBattle.enemy.hp + enemyHeal);
    const newEnemyArmor = currentBattle.enemy.armor + enemyShield; // Shield stacks in single node

    if (newPlayerHp <= 0) {
      onDefeat();
      return;
    }

    // Prepare next turn - Generate 5 New Cards (Keep Pinned)
    const cardsToDrawCount = 5;
    const newCards = drawXCards(cardsToDrawCount);
    
    // Previous pinned cards (special cards stay pinned, normal cards will be unpinned)
    const pinnedCards = currentBattle.hand.filter(c => c.isPinned);
    
    // User requested: Special cards stay pinned, normal cards execute unpinning
    const nextHand = [
      ...pinnedCards.map(c => ({ 
        ...c, 
        isPinned: c.suite === 'Special' 
      })),
      ...newCards
    ];

    const nextTurn = currentBattle.turn + 1;
    const nextIntent = generateEnemyIntent(nextTurn);

    setBattle(prev => prev ? ({
      ...prev,
      playerHp: newPlayerHp,
      enemy: { ...prev.enemy, hp: newEnemyHp, armor: newEnemyArmor, intent: nextIntent },
      armor: playerArmorAfterTurn, // Armor persists and stacks
      hand: nextHand,
      turn: nextTurn,
      redrawCount: 2 + extraTidy,
      firstRedrawFreeUsed: false,
      firstStraightUsed: prev.firstStraightUsed || playedStraight,
      consecutivePairs,
      selectedCardIds: [],
      comboPreview: null
    }) : null);
  };

  const [battlePrompt, setBattlePrompt] = useState<string | null>(null);

  // Helper variable for armor persistence in executeEnemyTurn
  let playerArmorAfterTurn = 0;

  const sortedHand = useMemo(() => {
    if (!battle) return [];
    return [...battle.hand].sort((a, b) => b.value - a.value);
  }, [battle?.hand]);

  const handlePlay = () => {
    if (!battle || !battle.comboPreview || battle.selectedCardIds.length === 0) return;

    if (isInvalidDeck) {
      setIsHandShaking(true);
      setShowInvalidFeedback(true);
      setTimeout(() => setIsHandShaking(false), 500);
      addNotification("INVALID CARD SELECTION");
      return;
    }

    const combo = battle.comboPreview;
    const { type } = combo;
    const selectedCards = battle.hand.filter(c => battle.selectedCardIds.includes(c.id));
    const normalCards = selectedCards.filter(c => c.suite !== 'Special');
    const specialCards = selectedCards.filter(c => c.suite === 'Special');
    
    // 1. Determine "Poker" Label using all selected cards
    // To allow matching pairs/sets of special cards, we map them to virtual ranks
    const virtualCards = selectedCards.map(c => 
      c.suite === 'Special' ? { ...c, value: 50 + ['Heal', 'ArmorBuff', 'GainExtraTidy'].indexOf(c.effect!) } : c
    );
    const comboInfo = detectCombo(virtualCards);
    const pokerLabel = selectedCards.length > 0 ? comboInfo.displayName : "";
    
    // 2. Determine Special Card Effects and Messages
    const effectCounts: Record<string, number> = {};
    specialCards.forEach(sc => {
      effectCounts[sc.effect!] = (effectCounts[sc.effect!] || 0) + 1;
    });

    const specialLabels: string[] = [];
    let healAmount = 0;
    let extraArmor = 0;
    let extraTidy = 0;

    // Logic: 1 card = Base, 2 cards = Enhanced
    if (effectCounts['ArmorBuff']) {
      const count = effectCounts['ArmorBuff'];
      if (count === 1) {
        specialLabels.push("获得护盾");
        extraArmor += 4;
      } else if (count >= 2) {
        specialLabels.push("护盾强化");
        extraArmor += 12; // Enhanced
      }
    }
    if (effectCounts['Heal']) {
      const count = effectCounts['Heal'];
      if (count === 1) {
        specialLabels.push("恢复生命");
        healAmount += 5;
      } else if (count >= 2) {
        specialLabels.push("强效恢复");
        healAmount += 15;
      }
    }
    if (effectCounts['GainExtraTidy']) {
      const count = effectCounts['GainExtraTidy'];
      if (count === 1) {
        specialLabels.push("增加重抽");
        extraTidy += 1;
      } else if (count >= 2) {
        specialLabels.push("重抽增强");
        extraTidy += 3;
      }
    }

    // 3. Merge Prompt Text (Double Space required)
    const combinedPrompt = [pokerLabel, ...specialLabels].filter(Boolean).join("  ");
    setBattlePrompt(combinedPrompt);
    setTimeout(() => setBattlePrompt(null), 2000);

    let baseDamage = normalCards.reduce((sum, c) => sum + c.value, 0);
    let finalMultiplier = combo.multiplier;
    
    // ... multipliers from relics ...
    // Relic: Flow Emblem (Straight +15%)
    if (run.relics.includes('flow_emblem') && type === 'Straight') {
      finalMultiplier *= 1.15;
    }
    // Relic: Twin Ring (Pair +10%)
    if (run.relics.includes('twin_ring') && type === 'Pair') {
      finalMultiplier *= 1.1;
    }
    // Relic: Black Powder (Bomb +20%)
    if (run.relics.includes('black_powder') && type === 'Bomb') {
      finalMultiplier *= 1.2;
    }
    // Relic: Desolation Seal (HP < 30% -> Bomb +20%)
    if (run.relics.includes('desolation_seal') && type === 'Bomb' && battle.playerHp < run.maxHp * 0.3) {
      finalMultiplier *= 1.2;
    }

    let finalDamage = Math.floor(baseDamage * finalMultiplier);

    // Anomaly Mechanism effects
    if (battle.mechanism === 'CriticalStrike') {
      finalDamage = Math.floor(finalDamage * 1.5);
    }
    if (battle.mechanism === 'WeakHand') {
      finalDamage += selectedCards.length * 2;
    }
    // TwinPairCombo: 2-pair deals extra damage
    if (battle.mechanism === 'TwinPairCombo' && type === 'TwoPair') {
      finalDamage = Math.floor(finalDamage * 2);
      addLog("TWIN PAIR COMBO!");
    }

    // Consecutive pairs tracking for Steady Chip
    let consecutivePairs = battle.consecutivePairs;
    if (type === 'Pair') {
      consecutivePairs += 1;
      if (consecutivePairs >= 2 && run.relics.includes('steady_chip')) {
        healAmount += 3;
        consecutivePairs = 0;
        addLog("Steady Chip heal!");
        addNotification("STEADY CHIP: +3 HP");
      }
    } else {
      consecutivePairs = 0;
    }

    // Gale Gloves: Draw 1 on first straight
    if (run.relics.includes('gale_gloves') && type === 'Straight' && !battle.firstStraightUsed) {
      extraTidy += 1;
      addLog("Gale Gloves trigger!");
      addNotification("GALE GLOVES: +1 DRAW");
    }

    // Animation flags
    if (type === 'Bomb') {
      setShowExplosion(true);
      setTimeout(() => setShowExplosion(false), 1500);
      // Relic: Fuse Amulet (+1 redraw on bomb)
      if (run.relics.includes('fuse_amulet')) {
        extraTidy += 1;
        addNotification("FUSE AMULET: +1 DRAW");
      }
    }
    
    // Vampiric Anomaly
    if (battle.mechanism === 'Vampiric') {
      const vVal = Math.floor(finalDamage * 0.1);
      healAmount += vVal;
      addNotification(`VAMPIRIC: +${vVal}`);
    }

    setIsEnemyShaking(true);
    setTimeout(() => setIsEnemyShaking(false), 500);

    const newPlayerHp = Math.min(battle.playerHp + healAmount, run.maxHp);

    // SHIELD FIRST LOGIC for Enemy
    let remainingDamage = finalDamage;
    let newEnemyArmor = battle.enemy.armor;
    if (newEnemyArmor > 0) {
      const absorb = Math.min(newEnemyArmor, remainingDamage);
      newEnemyArmor -= absorb;
      remainingDamage -= absorb;
      triggerDamagePopup(absorb, 'Enemy'); // Show damage on shield
      addLog(`Enemy shield absorbed ${absorb} points.`);
    }

    // 3% Dodge Chance
    const isDodged = Math.random() < 0.03;
    if (isDodged) {
      addLog("ENEMY DODGED THE ATTACK!");
      addNotification("MISS!");
      triggerDamagePopup(0, 'Enemy');
      // Still proceed to enemy turn
      const updatedBattleDodged = {
        ...battle,
        playerHp: newPlayerHp,
        armor: battle.armor + extraArmor,
        enemy: { ...battle.enemy, armor: newEnemyArmor }
      };
      setBattle(updatedBattleDodged);
      setTimeout(() => executeEnemyTurn(updatedBattleDodged, extraTidy, consecutivePairs, type === 'Straight'), 1000);
      return;
    }

    const newEnemyHp = Math.max(0, battle.enemy.hp - remainingDamage);
    addLog(`Played ${type}! Dealt ${finalDamage} damage (${remainingDamage} to HP).`);
    
    if (remainingDamage > 0) triggerDamagePopup(remainingDamage, 'Enemy');
    if (healAmount > 0) triggerDamagePopup(healAmount, 'Player', true);
    addNotification(`${type.toUpperCase()} TRIGGERED!`);

    if (newEnemyHp <= 0) {
      const lootBase = 10 + Math.floor(Math.random() * 10);
      // Gambler Coin: extra 8 gold
      const bonusGold = run.relics.includes('gambler_coin') ? 8 : 0;
      setBattle(prev => prev ? ({ ...prev, enemy: { ...prev.enemy, hp: 0, armor: 0 }, playerHp: newPlayerHp }) : null);
      setTimeout(() => onVictory({ gold: lootBase + bonusGold }, newPlayerHp), 1000);
      return;
    }

    const updatedBattle = {
      ...battle,
      enemy: { ...battle.enemy, hp: newEnemyHp, armor: newEnemyArmor },
      playerHp: newPlayerHp,
      armor: battle.armor + extraArmor
    };

    setBattle(updatedBattle);
    
    // Wait briefly then enemy attacks
    setTimeout(() => executeEnemyTurn(updatedBattle, extraTidy, consecutivePairs, type === 'Straight'), 1000);
  };

  const [isPaused, setIsPaused] = useState(false);

  if (!battle) return <div className="flex items-center justify-center h-full bg-bg-deep text-text-dim uppercase tracking-widest text-xs">Loading Battlefield...</div>;

  return (
    <div className="relative w-full h-full bg-bg-deep overflow-hidden font-sans flex flex-col">
      {/* Pause Menu Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
          >
            <div className="max-w-md w-full space-y-6 md:space-y-8 bg-card-bg border border-border-color p-8 md:p-12 rounded-xl shadow-2xl">
               <div className="text-center space-y-2">
                  <h2 className="text-accent-gold font-mono text-[10px] tracking-widest uppercase">Combat Paused</h2>
                  <h1 className="text-2xl md:text-4xl font-serif font-black italic tracking-tighter text-text-main">THE EXECUTIONER WAITS</h1>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between p-3 md:p-4 bg-black/40 rounded-lg border border-white/5">
                     <span className="text-text-dim text-xs md:text-sm uppercase">Progress</span>
                     <span className="text-text-main font-mono">{run.currentNode} / 10</span>
                  </div>
                  <div className="flex justify-between p-3 md:p-4 bg-black/40 rounded-lg border border-white/5">
                     <span className="text-text-dim text-xs md:text-sm uppercase">Gold</span>
                     <span className="text-accent-gold font-mono">{run.gold} G</span>
                  </div>
               </div>

               <div className="flex flex-col gap-3 md:gap-4">
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="w-full bg-accent-gold text-black font-black py-4 rounded hover:bg-white transition-colors uppercase tracking-widest text-xs md:text-sm"
                  >
                     CONTINUE
                  </button>
                  <button 
                    onClick={onDefeat}
                    className="w-full bg-transparent text-accent-red border border-accent-red/30 py-4 rounded hover:bg-accent-red/10 transition-all font-bold uppercase tracking-widest text-xs md:text-sm"
                  >
                     ABANDON RUN
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD Header (Top Bar) --- */}
      <header className="flex-shrink-0 h-[80px] px-[60px] flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent border-b border-white/5">
        <div className="flex gap-10">
          <div className="flex flex-col w-[380px]">
            <div className="flex justify-between items-end mb-1">
               <div className="flex items-center gap-2">
                  <span className="text-xs text-text-dim uppercase tracking-wider">The Prisoner</span>
                  {battle.armor > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/50"
                    >
                      <Shield className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] font-mono font-black text-blue-400">{battle.armor}</span>
                    </motion.div>
                  )}
               </div>
               <span className="font-mono text-sm font-bold text-accent-red">
                 <span className="text-white/40 font-normal mr-1">{battle.armor > 0 ? `(${battle.armor})` : ''}</span>
                 {battle.playerHp} / {run.maxHp}
               </span>
            </div>
            <div className="h-[12px] bg-black border border-white/10 rounded-full flex items-center relative">
               <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(battle.playerHp / run.maxHp) * 100}%` }}
                className="h-full bg-accent-red relative z-10 rounded-full"
               />
               <AnimatePresence>
                 {battle.armor > 1 && (
                   <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ 
                      width: `${Math.min(100, (battle.armor / run.maxHp) * 100)}%`, 
                      opacity: 1 
                    }}
                    exit={{ width: 0, opacity: 0 }}
                    className={cn(
                      "absolute inset-y-[-3px] left-[-1px] bg-blue-400/10 backdrop-blur-[1px] z-20 border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] rounded-l-sm transition-all",
                      "border-t-[2px] border-b-[2px] border-l-[2px]",
                      battle.armor >= run.maxHp ? "border-r-[2px] rounded-r-sm" : "border-r-0"
                    )}
                   />
                 )}
               </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Gold</span>
            <span className="font-mono text-2xl font-bold text-accent-gold">{run.gold}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Node {run.currentNode} / 10</span>
          <div className="flex gap-1.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-[10px] h-[10px] rounded-full border border-border-color",
                  i + 1 < run.currentNode ? "bg-text-dim" : 
                  i + 1 === run.currentNode ? "bg-accent-gold border-white shadow-[0_0_8px_var(--color-accent-gold)]" : "bg-black"
                )} 
              />
            ))}
          </div>
        </div>

        <button 
          onClick={() => setIsPaused(true)} 
          className="w-[50px] h-[50px] border border-border-color flex items-center justify-center hover:border-accent-gold transition-colors rounded-sm"
        >
          <Pause className="w-6 h-6 text-white" />
        </button>
      </header>

      {/* --- Main Battlefield Area (Center) --- */}
      <main className="grow flex flex-col items-center justify-center relative p-8 overflow-hidden">
        {/* Enemy Zone */}
        <div className="w-full h-full flex flex-col items-center justify-center gap-10 overflow-hidden">
          <motion.div 
            animate={isEnemyShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="flex flex-col items-center w-full"
          >
            <div className="relative group">
              {/* Intent Label */}
              <div className="absolute -top-[50px] left-1/2 -translate-x-1/2 bg-black border border-accent-gold px-4 py-1 flex text-sm uppercase text-accent-gold whitespace-nowrap z-20 shadow-2xl skew-x-[-12deg]">
                <span className="skew-x-[12deg] inline-block font-black">{battle.enemy.intent.type} {battle.enemy.intent.value}</span>
              </div>
              
              {/* Enemy Portrait */}
              <div className="w-[260px] h-[260px] bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_4rem_rgba(255,0,0,0.05)] rounded-lg">
                <img 
                  src={battle.enemy.icon} 
                  alt={battle.enemy.name} 
                  className="w-full h-full object-cover opacity-40 grayscale group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* VFX Overlay */}
              {showExplosion && <ExplosionVFX />}
            </div>

            {/* Enemy HP Bar */}
            <div className="w-[480px] mt-8">
              <div className="flex justify-between items-end mb-1">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-dim uppercase tracking-[0.2em] font-mono">{battle.enemy.name}</span>
                    {battle.enemy.armor > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/50"
                      >
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-mono font-black text-blue-400">{battle.enemy.armor}</span>
                      </motion.div>
                    )}
                 </div>
                 <span className="font-mono text-sm font-bold text-accent-red tracking-tight">
                    <span className="text-white/40 font-normal mr-1 text-[12px]">{battle.enemy.armor > 0 ? `(${battle.enemy.armor})` : ''}</span>
                    {battle.enemy.hp} / {battle.enemy.maxHp}
                 </span>
              </div>
              <div className="h-[15px] bg-black border border-white/5 relative flex items-center rounded-sm shadow-inner">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(battle.enemy.hp / battle.enemy.maxHp) * 100}%` }}
                  className="h-full bg-gradient-to-r from-accent-red/40 via-accent-red to-white/20 relative z-10 rounded-sm"
                />
                <AnimatePresence>
                  {battle.enemy.armor > 1 && (
                    <motion.div 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ 
                        width: `${Math.min(100, (battle.enemy.armor / battle.enemy.maxHp) * 100)}%`, 
                        opacity: 1 
                      }}
                      exit={{ width: 0, opacity: 0 }}
                      className={cn(
                        "absolute inset-y-[-4px] left-[-1px] bg-blue-400/10 backdrop-blur-[1px] z-20 border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] rounded-l-sm transition-all",
                        "border-t-[3px] border-b-[3px] border-l-[3px]",
                        battle.enemy.armor >= battle.enemy.maxHp ? "border-r-[3px] rounded-r-sm" : "border-r-0"
                      )}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* "出牌区" (Battle Zone) - Displays selected cards in a row */}
          <div className="h-[200px] w-full flex flex-col items-center justify-center gap-4 z-20">
            <AnimatePresence>
              {battle.selectedCardIds.length > 0 && !battlePrompt && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm shadow-2xl"
                 >
                    {battle.hand.filter(c => battle.selectedCardIds.includes(c.id)).map(c => (
                       <div key={c.id} className="w-[60px] h-[90px] bg-card-bg border border-border-color rounded-sm flex items-center justify-center relative shadow-md">
                          <span className="text-xs font-black text-white">{c.name}</span>
                       </div>
                    ))}
                 </motion.div>
              )}
            </AnimatePresence>
            
            {/* Battle Prompt Box is now reactive to the center overlay logic, 
                but we define the anchor point here for professional layout consistency */}
            <div className="h-[20px] w-full flex items-center justify-center">
               <span className="text-[10px] text-text-dim uppercase tracking-[0.4em] font-mono">Battle Zone Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* --- Controls & Hand Zone (Bottom) --- */}
      <footer className="flex-shrink-0 h-[340px] border-t border-white/5 bg-gradient-to-t from-black/95 to-[#050505] flex flex-col justify-between items-center z-40 p-4">
        
        {/* Control Buttons Bar */}
        <div className="w-full max-w-[90%] flex items-center justify-between px-6">
           <div className="flex flex-col items-start">
              <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono mb-1">可用重抽次数</span>
              <div className="flex gap-1">
                 {[...Array(2 + (run.relics.includes('shuffler') ? 1 : 0))].map((_, i) => (
                    <div key={i} className={cn("w-[20px] h-[6px] rounded-full", i < battle.redrawCount ? "bg-accent-gold shadow-[0_0_8px_rgba(197,160,89,0.5)]" : "bg-white/5")} />
                 ))}
              </div>
           </div>

           <div className="flex gap-4">
              <button 
                onClick={handleRedraw}
                disabled={battle.redrawCount <= 0 || battle.selectedCardIds.length === 0}
                className="group relative bg-black/50 border border-accent-gold text-accent-gold px-8 py-3 rounded-sm text-sm uppercase font-black tracking-widest transition-all hover:bg-accent-gold hover:text-black disabled:opacity-20 disabled:grayscale overflow-hidden"
              >
                <div className="relative z-10 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  <span>重抽 ({battle.selectedCardIds.length}) [{battle.redrawCount}]</span>
                </div>
              </button>

              <button 
                onClick={handlePlay}
                disabled={!battle.comboPreview}
                className={cn(
                  "px-12 py-3 font-black text-sm uppercase tracking-[0.3em] transition-all rounded-sm",
                  battle.comboPreview 
                    ? "bg-accent-red text-white shadow-[0_0_2rem_rgba(255,0,0,0.2)] hover:bg-white hover:text-accent-red" 
                    : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                )}
              >
                Execute Action
              </button>
           </div>
        </div>

        {/* Dynamic Hand View */}
        <div 
          className="w-full h-full flex justify-center items-end pb-8 px-16 relative select-none touch-none"
          onPointerMove={handleContainerPointerMove}
        >
          <AnimatePresence mode="popLayout">
            {sortedHand.map((card, idx) => (
              <motion.div 
                key={card.id}
                data-card-id={card.id}
                layout
                initial={{ y: 200, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                whileHover={!isDragging ? { zIndex: 300 } : {}}
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
                style={{ zIndex: 10 + idx }}
                onPointerDown={(e) => handleCardPointerDown(card.id, e)}
              >
                <CardComponent 
                  card={card}
                  isSelected={battle!.selectedCardIds.includes(card.id)}
                  onTogglePin={togglePin}
                  isInvalid={showInvalidFeedback && isInvalidDeck && battle!.selectedCardIds.includes(card.id)}
                  isShaking={isHandShaking && battle!.selectedCardIds.includes(card.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </footer>

      {/* Battle Prompt Box (Merged Labels) */}
      <div id="battle-prompt" className="absolute top-[40%] left-1/2 -translate-x-1/2 pointer-events-none z-[1000] flex flex-col items-center">
        <AnimatePresence>
          {battlePrompt && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1.5, opacity: 1, y: 0 }}
              exit={{ scale: 2, opacity: 0, y: -50 }}
              className="bg-black/60 border border-white/20 px-16 py-8 backdrop-blur-3xl rounded-3xl"
            >
              <h2 className="text-white text-8xl font-black italic tracking-tighter uppercase whitespace-nowrap filter drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">
                {battlePrompt}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Floating UI Elements --- */}

      {/* Notifications - Responsive Position */}
      <div className="absolute top-[130px] left-10 z-[60] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="bg-black/90 backdrop-blur-md text-xs font-bold tracking-widest uppercase px-6 py-3 border-l-4 border-accent-red"
            >
              <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{n.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Damage Popups Area */}
      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
         <AnimatePresence>
           {damagePopups.map(p => (
             <motion.div
               key={p.id}
               initial={{ opacity: 0, top: `${p.y}%`, left: `${p.x}%`, scale: 0.5 }}
               animate={{ opacity: 1, top: `${p.y - 15}%`, scale: 1.5 }}
               exit={{ opacity: 0, top: `${p.y - 30}%`, scale: 2 }}
               transition={{ duration: 1, ease: 'easeOut' }}
               className={cn(
                 "absolute font-serif italic text-6xl font-black drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] -translate-x-1/2",
                 p.isHeal ? "text-emerald-400" : "text-white"
               )}
             >
               {p.isHeal ? '+' : '-'}{p.value}
             </motion.div>
           ))}
         </AnimatePresence>
      </div>

      {/* Mini Log - Desktop View inside Aspect Ratio Stage */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 w-[220px] flex flex-col gap-6 pointer-events-none opacity-40">
        <div className="flex items-center gap-2">
           <Layers className="w-4 h-4 text-text-dim" />
           <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono">Protocol Log</span>
        </div>
        <div className="space-y-4">
          {logs.slice(0, 3).map((log, i) => (
            <div key={i} className="text-[11px] text-text-dim font-mono leading-tight border-l border-white/10 pl-3">
               {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

}
