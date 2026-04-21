/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { drawXCards } from '../utils/cardGenerator';
import { detectCombo } from '../utils/comboDetector';
import { shuffle } from '../lib/utils';
import { ENEMIES } from '../constants/enemies';
import { 
  BattleState, 
  AnomalyMechanism, 
  DamagePopup, 
  BattleNotification 
} from '../types/battle';
import { Card } from '../types/card';
import { RunState } from '../types/game';

interface UseBattleManagerProps {
  run: RunState;
  onVictory: (loot: any, endHp: number) => void;
  onDefeat: () => void;
}

/**
 * useBattleManager - 核心业务引擎
 * 
 * 100% 逻辑保真：
 * - 抽牌算法、Combo 判定、遗物加成。
 * - 批量 Pin、重抽限制。
 * 
 * 【改动二 & 三】：新增非法出牌反馈系统与自动还原逻辑。
 */
export function useBattleManager({ run, onVictory, onDefeat }: UseBattleManagerProps) {
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
  const [battlePrompt, setBattlePrompt] = useState<string | null>(null);
  
  // 交互同步状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // 【改动二 & 三】：非法出牌反馈系统状态
  const [isInvalidCombo, setIsInvalidCombo] = useState(false);
  const [invalidTriggerCount, setInvalidTriggerCount] = useState(0);

  const generateEnemyIntent = useCallback((turn: number) => {
    if (turn % 5 === 0) return { type: 'Special' as const, value: 25, description: 'ULTIMATE EXECUTION' };
    const roll = Math.random();
    if (roll < 0.65) return { type: 'Attack' as const, value: 8, description: 'Standard Strike' };
    if (roll < 0.8) return { type: 'Special' as const, value: 5, description: 'Restoration' }; 
    return { type: 'Defend' as const, value: 3, description: 'Energy Shield' }; 
  }, []);

  const triggerDamagePopup = useCallback((value: number, target: 'Player' | 'Enemy', isHeal = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    setDamagePopups(prev => [...prev, { id, value, isHeal, x: target === 'Enemy' ? 50 : 20, y: target === 'Enemy' ? 40 : 10 }]);
    setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== id)), 1000);
  }, []);

  const addNotification = useCallback((text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, text }, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, []);

  // 战斗初始化
  useEffect(() => {
    const isBoss = run.currentNode === 10;
    const enemyKey = isBoss ? 'boss' : (run.currentNode % 2 === 0 ? 'specter' : 'executioner');
    const enemyData = ENEMIES[enemyKey];
    
    let mechanism: AnomalyMechanism = 'None';
    let monsterHpBonus = 1;
    if (run.currentRoomType === 'Event') {
      const mechanisms: AnomalyMechanism[] = ['TwinPairCombo', 'CriticalStrike', 'WeakHand', 'Vampiric'];
      mechanism = mechanisms[Math.floor(Math.random() * mechanisms.length)];
      if (mechanism === 'TwinPairCombo') monsterHpBonus = 1.3;
    }

    const initialDeck = shuffle([...run.deck]);
    const initialDrawSize = run.relics.includes('old_card_box') ? 6 : 5;
    const cardsToDraw = mechanism === 'WeakHand' ? initialDrawSize - 1 : initialDrawSize;
    const hand = drawXCards(cardsToDraw);

    setBattle({
      enemy: { ...enemyData, hp: Math.floor(enemyData.maxHp * monsterHpBonus), maxHp: Math.floor(enemyData.maxHp * monsterHpBonus), intent: generateEnemyIntent(1) },
      playerHp: Math.max(run.relics.includes('gambler_coin') ? run.currentHp - 2 : run.currentHp, 1),
      hand,
      drawPile: initialDeck.slice(cardsToDraw),
      discardPile: [],
      currentRedraws: 2,
      bonusRedrawsNextTurn: 0,
      armor: 0,
      turn: 1,
      comboPreview: null,
      selectedCardIds: [],
      mechanism,
      consecutivePairs: 0,
      firstStraightUsed: false
    });
  }, [run.currentNode, run.currentRoomType, run.deck, run.relics, run.currentHp, generateEnemyIntent]);

  const sortedHand = useMemo(() => {
    if (!battle) return [];
    return [...battle.hand].sort((a, b) => b.value - a.value);
  }, [battle?.hand]);

  // 【改动三】：核心重置监听。只要 selectedCardIds 发生任何变化，立刻重置无效状态。
  useEffect(() => {
    setIsInvalidCombo(false);
  }, [battle?.selectedCardIds]);

  const toggleSelect = useCallback((id: string, forceMode?: 'select' | 'deselect') => {
    setBattle(prev => {
      if (!prev) return prev;
      const isCurrentlySelected = prev.selectedCardIds.includes(id);
      let next = prev.selectedCardIds;
      if (forceMode === 'select' && !isCurrentlySelected) next = [...prev.selectedCardIds, id];
      else if (forceMode === 'deselect' && isCurrentlySelected) next = prev.selectedCardIds.filter(sid => sid !== id);
      else if (!forceMode) next = isCurrentlySelected ? prev.selectedCardIds.filter(sid => sid !== id) : [...prev.selectedCardIds, id];

      const selectedCards = prev.hand.filter(c => next.includes(c.id));
      const combo = detectCombo(selectedCards);

      let invalid = false;
      if (selectedCards.length > 0 && combo.type !== 'Straight' && combo.type !== 'StraightFlush') {
        const counts: Record<number, number> = {};
        selectedCards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
        if (Object.values(counts).some(v => v === 1) && Object.keys(counts).length > 1) invalid = true;
      }
      setIsInvalidDeck(invalid);
      return { ...prev, selectedCardIds: next, comboPreview: combo };
    });
  }, []);

  const handleRedraw = useCallback(() => {
    if (!battle || battle.currentRedraws <= 0 || battle.selectedCardIds.length === 0) return;
    const indices = battle.hand.reduce((acc: number[], c, i) => { if (battle.selectedCardIds.includes(c.id) && !c.isPinned) acc.push(i); return acc; }, []);
    if (indices.length === 0) return;
    const discarded = indices.map(i => battle.hand[i]);
    let draw = [...battle.drawPile], discard = [...battle.discard_pile || [], ...discarded];
    if (draw.length < indices.length) { draw = shuffle([...draw, ...discard]); discard = []; }
    const nextHand = [...battle.hand];
    indices.forEach((idx, i) => nextHand[idx] = draw[i]);
    setBattle(prev => prev ? ({ ...prev, hand: nextHand, drawPile: draw.slice(indices.length), discardPile: discard, currentRedraws: prev.currentRedraws - 1, selectedCardIds: [], comboPreview: null }) : null);
  }, [battle]);

  const batchTogglePin = useCallback(() => {
    if (!battle || battle.selectedCardIds.length === 0) return;
    setBattle(prev => {
      if (!prev) return prev;
      const anyUnpinned = prev.hand.some(c => prev.selectedCardIds.includes(c.id) && !c.isPinned);
      let normalLimit = 2, specialLimit = 2;
      let normalCnt = prev.hand.filter(c => c.isPinned && c.suite !== 'Special').length;
      let specialCnt = prev.hand.filter(c => c.isPinned && c.suite === 'Special').length;

      const nextHand = prev.hand.map(c => {
        if (!prev.selectedCardIds.includes(c.id)) return c;
        if (!anyUnpinned) return { ...c, isPinned: false };
        if (c.isPinned) return c;
        const isS = c.suite === 'Special';
        if (isS ? specialCnt < specialLimit : normalCnt < normalLimit) { if (isS) specialCnt++; else normalCnt++; return { ...c, isPinned: true }; }
        return c;
      });
      addNotification(anyUnpinned ? "BATCH PINNED" : "BATCH UNPINNED");
      return { ...prev, hand: nextHand, selectedCardIds: [] };
    });
  }, [battle, addNotification]);

  const executeEnemyTurn = useCallback((curr: BattleState, combo: string, pairs: number, drawBonus: number) => {
    const { type, value, description } = curr.enemy.intent;
    let hpD = 0, armor = curr.armor;
    if (type === 'Attack' || (type === 'Special' && value === 25)) {
      let dmg = value;
      if (curr.mechanism === 'CriticalStrike') dmg = Math.floor(dmg * 1.5);
      const abs = Math.min(armor, dmg);
      armor -= abs;
      hpD = dmg - abs;
      triggerDamagePopup(dmg, 'Player');
      setIsPlayerShaking(true); setTimeout(() => setIsPlayerShaking(false), 500);
    }
    const nextHp = Math.max(0, curr.playerHp - hpD);
    if (nextHp <= 0) { onDefeat(); return; }
    const nextHand = [...curr.hand.filter(c => c.isPinned).map(c => ({ ...c, isPinned: c.suite === 'Special' })), ...drawXCards(5)];
    const t = curr.turn + 1;
    setBattle(prev => prev ? ({
      ...prev, playerHp: nextHp, enemy: { ...prev.enemy, hp: Math.min(prev.enemy.maxHp, prev.enemy.hp + (type === 'Special' ? 5 : 0)), armor: prev.enemy.armor + (type === 'Defend' ? 15 : 0), intent: generateEnemyIntent(t) },
      armor, hand: nextHand, turn: t, currentRedraws: 2 + drawBonus, selectedCardIds: [], comboPreview: null, consecutivePairs: pairs, firstStraightUsed: prev.firstStraightUsed || combo === 'Straight'
    }) : null);
  }, [onDefeat, generateEnemyIntent, triggerDamagePopup]);

  const handlePlay = useCallback(() => {
    if (!battle || battle.selectedCardIds.length === 0) return;

    // 【改动二 & 三】：出牌校验与反馈触发
    if (isInvalidDeck) {
      setIsInvalidCombo(true);
      setInvalidTriggerCount(prev => prev + 1);
      addNotification("INVALID COMBO SELECTED!");
      return;
    }

    const { multiplier, type, displayName } = battle.comboPreview || { multiplier: 0, type: 'None', displayName: 'None' };
    const selected = battle.hand.filter(c => battle.selectedCardIds.includes(c.id));
    let heal = 0, shield = 0, draw = 0;
    const effects = selected.filter(c => c.suite === 'Special').reduce((acc: Record<string, number>, c) => { acc[c.effect!] = (acc[c.effect!] || 0) + 1; return acc; }, {});
    if (effects['Heal']) heal = effects['Heal'] === 1 ? 5 : 15;
    if (effects['ArmorBuff']) shield = effects['ArmorBuff'] === 1 ? 4 : 12;
    if (effects['GainExtraTidy']) draw = effects['GainExtraTidy'] === 1 ? 1 : 2;

    let base = selected.filter(c => c.suite !== 'Special').reduce((s, c) => s + c.value, 0);
    let mult = multiplier;
    if (run.relics.includes('flow_emblem') && type === 'Straight') mult *= 1.15;
    if (run.relics.includes('twin_ring') && type === 'Pair') mult *= 1.1;
    if (run.relics.includes('black_powder') && type === 'Bomb') mult *= 1.2;
    if (run.relics.includes('desolation_seal') && type === 'Bomb' && battle.playerHp < run.maxHp * 0.3) mult *= 1.2;

    let total = Math.floor(base * mult);
    if (battle.mechanism === 'CriticalStrike') total = Math.floor(total * 1.5);
    if (battle.mechanism === 'WeakHand') total += selected.length * 2;
    if (battle.mechanism === 'TwinPairCombo' && type === 'TwoPair') total *= 2;

    let pCount = battle.consecutivePairs;
    if (type === 'Pair') { if (++pCount >= 2 && run.relics.includes('steady_chip')) heal += 3; } else pCount = 0;
    if (type === 'Straight' && run.relics.includes('gale_gloves') && !battle.firstStraightUsed) draw += 1;
    if (type === 'Bomb') { setShowExplosion(true); setTimeout(() => setShowExplosion(false), 1500); if (run.relics.includes('fuse_amulet')) draw += 1; }
    if (battle.mechanism === 'Vampiric') heal += Math.floor(total * 0.1);

    const nextHp = Math.min(battle.playerHp + heal, run.maxHp);
    let eArmor = battle.enemy.armor, hpD = total;
    if (eArmor > 0) { const abs = Math.min(eArmor, total); eArmor -= abs; hpD -= abs; triggerDamagePopup(abs, 'Enemy'); }
    if (Math.random() < 0.03) { addNotification("MISS!"); triggerDamagePopup(0, 'Enemy'); const update = { ...battle, playerHp: nextHp, armor: battle.armor + shield, enemy: { ...battle.enemy, armor: eArmor } }; setBattle(update); setTimeout(() => executeEnemyTurn(update, type, pCount, draw), 1000); return; }

    const nextEnemyHp = Math.max(0, battle.enemy.hp - hpD);
    if (hpD > 0) triggerDamagePopup(hpD, 'Enemy');
    if (heal > 0) triggerDamagePopup(heal, 'Player', true);
    setBattlePrompt(`${displayName}${heal > 0 ? ' +Lustrous' : ''}${shield > 0 ? ' +Bulwark' : ''}`);
    setTimeout(() => setBattlePrompt(null), 1500);

    if (nextEnemyHp <= 0) { setBattle(prev => prev ? ({ ...prev, enemy: { ...prev.enemy, hp: 0 }, playerHp: nextHp }) : null); setTimeout(() => setVictoryLoot({ gold: 15, playerHp: nextHp }), 800); return; }
    const upd = { ...battle, enemy: { ...battle.enemy, hp: nextEnemyHp, armor: eArmor }, playerHp: nextHp, armor: battle.armor + shield };
    setBattle(upd); setTimeout(() => executeEnemyTurn(upd, type, pCount, draw), 1000);
  }, [battle, isInvalidDeck, run, addNotification, triggerDamagePopup, executeEnemyTurn]);

  return {
    battle, isEnemyShaking, isPlayerShaking, showExplosion, logs, damagePopups, notifications, isHandShaking,
    isInvalidDeck, showInvalidFeedback, victoryLoot, battlePrompt, isDragging, setIsDragging, dragMode, setDragMode,
    hoveredCardId, setHoveredCardId, sortedHand, toggleSelect, batchTogglePin, handleRedraw, handlePlay, setVictoryLoot,
    isInvalidCombo, invalidTriggerCount
  };
}
