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

  const [victoryLoot, setVictoryLoot] = useState<{ gold: number, playerHp: number } | null>(null);

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
    
    const currentRedraws = 2; // baseRedraws
    const bonusRedrawsNextTurn = 0;

    setBattle({
      enemy: { 
        ...enemyData, 
        hp: Math.floor(enemyData.maxHp * monsterHpBonus), 
        maxHp: Math.floor(enemyData.maxHp * monsterHpBonus),
        intent: initialIntent
      },
      playerHp: Math.max(startHp, 1),
      hand,
      drawPile: initialDeck.slice(cardsToDraw),
      discardPile: [],
      currentRedraws,
      bonusRedrawsNextTurn,
      armor: 0,
      turn: 1,
      comboPreview: null,
      selectedCardIds: [],
      mechanism,
      consecutivePairs: 0,
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
      const isSpecial = card.suite === 'Special';
      const pinnedSameTypeCount = battle.hand.filter(c => c.isPinned && (isSpecial ? c.suite === 'Special' : c.suite !== 'Special')).length;
      
      if (pinnedSameTypeCount >= 2) {
        addNotification(isSpecial ? "特殊牌固定已达上限" : "普通牌固定已达上限");
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
    if (!battle || battle.currentRedraws <= 0 || battle.selectedCardIds.length === 0) return;

    // Filter out pinned cards from selection
    const validSelectionIndices = battle.hand.reduce((acc: number[], c, i) => {
      if (battle.selectedCardIds.includes(c.id) && !c.isPinned) {
        acc.push(i);
      }
      return acc;
    }, []);

    if (validSelectionIndices.length === 0) return;

    const cardsToDiscard = validSelectionIndices.map(i => battle.hand[i]);
    let currentDrawPile = [...battle.drawPile];
    let currentDiscardPile = [...battle.discardPile, ...cardsToDiscard];

    // Reshuffle if needed
    if (currentDrawPile.length < validSelectionIndices.length) {
      currentDrawPile = shuffle([...currentDrawPile, ...currentDiscardPile]);
      currentDiscardPile = [];
    }

    const newCards = currentDrawPile.slice(0, validSelectionIndices.length);
    const updatedDrawPile = currentDrawPile.slice(validSelectionIndices.length);

    const newHand = [...battle.hand];
    validSelectionIndices.forEach((handIdx, i) => {
      newHand[handIdx] = newCards[i];
    });

    setBattle(prev => prev ? ({
      ...prev,
      hand: newHand,
      drawPile: updatedDrawPile,
      discardPile: currentDiscardPile,
      currentRedraws: prev.currentRedraws - 1,
      selectedCardIds: [],
      comboPreview: null
    }) : null);

    addLog(`重抽! 消耗1次机会，替换了 ${validSelectionIndices.length} 张牌.`);
  };

  const executeEnemyTurn = (currentBattle: BattleState, consecutivePairs: number, playedStraight: boolean, nextTurnBonusRedraws: number) => {
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
    
    // Mulligan Reset Logic
    const baseRedraws = 2;
    const nextTurnRedraws = baseRedraws + nextTurnBonusRedraws;

    setBattle(prev => prev ? ({
      ...prev,
      playerHp: newPlayerHp,
      enemy: { ...prev.enemy, hp: newEnemyHp, armor: newEnemyArmor, intent: nextIntent },
      armor: playerArmorAfterTurn, // Armor persists and stacks
      hand: nextHand,
      turn: nextTurn,
      currentRedraws: nextTurnRedraws,
      bonusRedrawsNextTurn: 0, // Cleared after reset
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
        extraTidy += 1; // Used as bonusRedrawsNextTurn
      } else if (count >= 2) {
        specialLabels.push("重抽增强");
        extraTidy += 2;
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
      setTimeout(() => executeEnemyTurn(updatedBattleDodged, consecutivePairs, type === 'Straight', extraTidy), 1000);
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
      const totalGold = lootBase + bonusGold;
      
      setBattle(prev => prev ? ({ ...prev, enemy: { ...prev.enemy, hp: 0, armor: 0 }, playerHp: newPlayerHp }) : null);
      
      // Delay before showing challenge success
      setTimeout(() => {
        setVictoryLoot({ gold: totalGold, playerHp: newPlayerHp });
      }, 800);
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
    setTimeout(() => executeEnemyTurn(updatedBattle, consecutivePairs, type === 'Straight', extraTidy), 1000);
  };

  const [isPaused, setIsPaused] = useState(false);

  if (!battle) return <div className="flex items-center justify-center h-full bg-bg-deep text-text-dim uppercase tracking-widest text-xs">Loading Battlefield...</div>;

  return (
    <div className="relative w-[1920px] h-[1080px] bg-bg-deep overflow-hidden font-sans flex flex-col">
      {/* Victory Overlay */}
      <AnimatePresence>
        {victoryLoot && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center cursor-pointer"
            onClick={() => {
              onVictory({ gold: victoryLoot.gold }, victoryLoot.playerHp);
              setVictoryLoot(null);
            }}
          >
             <motion.div
               initial={{ scale: 0.5, y: 50, opacity: 0 }}
               animate={{ scale: 1, y: 0, opacity: 1 }}
               className="text-center pointer-events-none"
               style={{ gap: '48px', display: 'flex', flexDirection: 'column' }}
             >
                <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                  <h2 className="text-accent-gold font-mono uppercase opacity-60" style={{ fontSize: '24px', letterSpacing: '15px' }}>Victory Confirmed</h2>
                  <h1 className="font-serif font-black italic tracking-tighter text-text-main leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" style={{ fontSize: '120px' }}>
                    挑战成功
                  </h1>
                  <p className="text-white/40 font-mono animate-pulse" style={{ fontSize: '14px', letterSpacing: '4px', marginTop: '16px' }}>
                    CLICK ANYWHERE TO CONTINUE
                  </p>
                </div>
                
                <div className="bg-white/5 border-y border-white/10" style={{ padding: '32px 96px' }}>
                  <div className="flex items-center justify-center" style={{ gap: '24px' }}>
                    <div className="rounded-full bg-accent-gold/20 flex items-center justify-center" style={{ width: '48px', height: '48px' }}>
                       <div className="rounded-full bg-accent-gold shadow-[0_0_15px_#c5a059]" style={{ width: '16px', height: '16px' }} />
                    </div>
                    <span className="text-accent-gold font-serif italic font-bold" style={{ fontSize: '48px' }}>
                       +{victoryLoot.gold} GOLD ACQUIRED
                    </span>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause Menu Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center"
          >
            <div className="bg-card-bg border border-border-color shadow-2xl" style={{ width: '600px', padding: '60px', gap: '40px', display: 'flex', flexDirection: 'column' }}>
               <div className="text-center" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
                  <h2 className="text-accent-gold font-mono uppercase" style={{ fontSize: '10px', letterSpacing: '10px' }}>Combat Paused</h2>
                  <h1 className="font-serif font-black italic tracking-tighter text-text-main" style={{ fontSize: '48px' }}>THE EXECUTIONER WAITS</h1>
               </div>

               <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div className="flex justify-between bg-black/40 border border-white/5" style={{ padding: '20px' }}>
                     <span className="text-text-dim uppercase" style={{ fontSize: '14px' }}>Progress</span>
                     <span className="text-text-main font-mono" style={{ fontSize: '14px' }}>{run.currentNode} / 10</span>
                  </div>
                  <div className="flex justify-between bg-black/40 border border-white/5" style={{ padding: '20px' }}>
                     <span className="text-text-dim uppercase" style={{ fontSize: '14px' }}>Gold</span>
                     <span className="text-accent-gold font-mono" style={{ fontSize: '14px' }}>{run.gold} G</span>
                  </div>
               </div>

               <div className="flex flex-col" style={{ gap: '16px' }}>
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="w-full bg-accent-gold text-black font-black uppercase tracking-widest hover:bg-white transition-colors"
                    style={{ fontSize: '14px', height: '60px' }}
                  >
                     CONTINUE
                  </button>
                  <button 
                    onClick={onDefeat}
                    className="w-full bg-transparent text-accent-red border border-accent-red/30 transition-all font-bold uppercase tracking-widest"
                    style={{ fontSize: '14px', height: '60px' }}
                  >
                     ABANDON RUN
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD Header (Top Bar) --- */}
      <header className="flex-shrink-0 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent border-b border-white/5" style={{ height: '100px', padding: '0 60px' }}>
        <div className="flex" style={{ gap: '40px' }}>
          <div className="flex flex-col" style={{ width: '380px' }}>
            <div className="flex justify-between items-end" style={{ marginBottom: '4px' }}>
               <div className="flex items-center" style={{ gap: '8px' }}>
                  <span className="text-text-dim uppercase tracking-wider" style={{ fontSize: '12px' }}>The Prisoner</span>
                  {battle.armor > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center bg-blue-500/20 rounded border border-blue-400/50"
                      style={{ padding: '2px 8px', gap: '8px' }}
                    >
                      <Shield className="text-blue-400" style={{ width: '12px', height: '12px' }} />
                      <span className="font-mono font-black text-blue-400" style={{ fontSize: '10px' }}>{battle.armor}</span>
                    </motion.div>
                  )}
               </div>
               <span className="font-mono font-bold text-accent-red" style={{ fontSize: '14px' }}>
                 <span className="text-white/40 font-normal mr-1" style={{ marginRight: '4px' }}>{battle.armor > 0 ? `(${battle.armor})` : ''}</span>
                 {battle.playerHp} / {run.maxHp}
               </span>
            </div>
            <div className="h-[12px] bg-black border border-white/10 rounded-full flex items-center relative" style={{ height: '12px' }}>
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
            <span className="text-text-dim uppercase tracking-wider" style={{ fontSize: '10px' }}>Gold</span>
            <span className="font-mono font-bold text-accent-gold" style={{ fontSize: '24px' }}>{run.gold}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-text-dim uppercase tracking-wider mb-1" style={{ fontSize: '10px', marginBottom: '4px' }}>Node {run.currentNode} / 10</span>
          <div className="flex" style={{ gap: '6px' }}>
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "rounded-full border border-border-color",
                  i + 1 < run.currentNode ? "bg-text-dim" : 
                  i + 1 === run.currentNode ? "bg-accent-gold border-white shadow-[0_0_8px_var(--color-accent-gold)]" : "bg-black"
                )} 
                style={{ width: '10px', height: '10px' }}
              />
            ))}
          </div>
        </div>

        <button 
          onClick={() => setIsPaused(true)} 
          className="border border-border-color flex items-center justify-center hover:border-accent-gold transition-colors rounded-sm"
          style={{ width: '50px', height: '50px' }}
        >
          <Pause className="text-white" style={{ width: '24px', height: '24px' }} />
        </button>
      </header>

      {/* --- Main Battlefield Area (Center) --- */}
      <main className="flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden" style={{ width: '1920px', height: '640px', padding: '32px' }}>
        {/* Enemy Zone */}
        <div className="flex flex-col items-center justify-center overflow-hidden" style={{ width: '100%', height: '100%', gap: '40px' }}>
          <motion.div 
            animate={isEnemyShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="flex flex-col items-center"
            style={{ width: '100%' }}
          >
            <div className="relative group">
              {/* Intent Label */}
              <div className="absolute bg-black border border-accent-gold flex uppercase text-accent-gold whitespace-nowrap z-20 shadow-2xl skew-x-[-12deg]" style={{ top: '-50px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', fontSize: '14px' }}>
                <span className="skew-x-[12deg] inline-block font-black">{battle.enemy.intent.type} {battle.enemy.intent.value}</span>
              </div>
              
              {/* Enemy Portrait */}
              <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_4rem_rgba(255,0,0,0.05)] rounded-lg" style={{ width: '260px', height: '260px' }}>
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
            <div style={{ width: '480px', marginTop: '32px' }}>
              <div className="flex justify-between items-end" style={{ marginBottom: '4px' }}>
                 <div className="flex items-center" style={{ gap: '8px' }}>
                    <span className="text-text-dim uppercase tracking-[0.2em] font-mono" style={{ fontSize: '10px' }}>{battle.enemy.name}</span>
                    {battle.enemy.armor > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center bg-blue-500/20 rounded border border-blue-400/50"
                        style={{ padding: '2px 8px', gap: '4px' }}
                      >
                        <Shield className="text-blue-400" style={{ width: '12px', height: '12px' }} />
                        <span className="font-mono font-black text-blue-400" style={{ fontSize: '10px' }}>{battle.enemy.armor}</span>
                      </motion.div>
                    )}
                 </div>
                 <span className="font-mono font-bold text-accent-red tracking-tight" style={{ fontSize: '14px' }}>
                    <span className="text-white/40 font-normal mr-1" style={{ fontSize: '12px', marginRight: '4px' }}>{battle.enemy.armor > 0 ? `(${battle.armor})` : ''}</span>
                    {battle.enemy.hp} / {battle.enemy.maxHp}
                 </span>
              </div>
              <div className="bg-black border border-white/5 relative flex items-center rounded-sm shadow-inner" style={{ height: '15px' }}>
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
          <div className="flex flex-col items-center justify-center z-20" style={{ width: '100%', height: '200px', gap: '16px' }}>
             <div className="relative" style={{ height: '60px' }}>
               <AnimatePresence>
                  {battlePrompt && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      id="battle-prompt"
                      className="bg-accent-red text-white font-black italic uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,62,62,0.4)]"
                      style={{ padding: '12px 40px', fontSize: '24px' }}
                    >
                      {battlePrompt}
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <AnimatePresence>
              {battle.selectedCardIds.length > 0 && !battlePrompt && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm shadow-2xl"
                   style={{ gap: '8px', padding: '16px' }}
                 >
                    {battle.hand.filter(c => battle.selectedCardIds.includes(c.id)).map(c => (
                       <div key={c.id} className="bg-card-bg border border-border-color rounded-sm flex items-center justify-center relative shadow-md" style={{ width: '60px', height: '90px' }}>
                          <span className="font-black text-white" style={{ fontSize: '10px' }}>{c.name}</span>
                       </div>
                    ))}
                 </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center justify-center" style={{ height: '20px', width: '100%' }}>
               <span className="text-text-dim uppercase tracking-[0.4em] font-mono" style={{ fontSize: '10px' }}>Battle Zone Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* --- Controls & Hand Zone (Bottom) --- */}
      <footer className="flex-shrink-0 border-t border-white/5 bg-gradient-to-t from-black/95 to-[#050505] flex flex-col justify-between items-center z-40" style={{ height: '340px', padding: '16px' }}>
        
        {/* Control Buttons Bar */}
        <div className="flex items-center justify-center" style={{ width: '100%', gap: '24px', padding: '0 24px' }}>
           <button 
             id="btn-redraw"
             onClick={handleRedraw}
             disabled={battle.currentRedraws <= 0 || battle.selectedCardIds.length === 0}
             className="group relative bg-[#111] border border-accent-gold text-accent-gold rounded-sm uppercase font-black tracking-widest transition-all hover:bg-accent-gold hover:text-black disabled:opacity-20 disabled:grayscale overflow-hidden"
             style={{ padding: '12px 32px', fontSize: '14px' }}
           >
             <div className="relative z-10 flex items-center gap-2">
               <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" style={{ width: '16px', height: '16px' }} />
               <span>🔄 换牌 ({battle.currentRedraws}/2)</span>
             </div>
           </button>

           <div className="flex" style={{ gap: '16px' }}>
              <button 
                onClick={handlePlay}
                disabled={!battle.comboPreview}
                className={cn(
                  "font-black uppercase tracking-[0.3em] transition-all rounded-sm",
                  battle.comboPreview 
                    ? "bg-accent-red text-white shadow-[0_0_2rem_rgba(255,0,0,0.2)] hover:bg-white hover:text-accent-red" 
                    : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                )}
                style={{ padding: '12px 48px', fontSize: '14px' }}
              >
                Execute Action
              </button>
           </div>
        </div>

        {/* Dynamic Hand View */}
        <div 
          className="flex justify-center items-end relative select-none touch-none"
          style={{ width: '100%', height: '100%', paddingBottom: '32px', paddingLeft: '64px', paddingRight: '64px' }}
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
