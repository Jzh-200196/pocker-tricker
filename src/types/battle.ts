/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Enemy } from './enemy';
import { Card, ComboResult } from './card';

export type AnomalyMechanism = 
  | 'TwinPairCombo' // Monster HP up, 2-pair deals combo damage
  | 'CriticalStrike' // All damage +50% for everyone
  | 'WeakHand' // Player draw -1, but every card has +2 base damage
  | 'Vampiric' // Player heals 10% damage dealt, but max HP -10 during battle
  | 'None';

export interface BattleState {
  enemy: Enemy;
  playerHp: number;
  hand: Card[];
  drawPile: Card[];
  discardPile: Card[];
  currentRedraws: number;
  bonusRedrawsNextTurn: number;
  armor: number;
  turn: number;
  comboPreview: ComboResult | null;
  selectedCardIds: string[];
  mechanism: AnomalyMechanism;
  consecutivePairs: number; // For Steady Chip relic
  firstStraightUsed: boolean; // For Gale Gloves relic
}

export interface DamagePopup {
  id: string;
  value: number;
  x: number;
  y: number;
  isHeal?: boolean;
}

export interface BattleNotification {
  id: string;
  text: string;
}
