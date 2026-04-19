/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Suite = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades' | 'Special';

export type CardEffect = 'Heal' | 'ArmorBuff' | 'GainExtraTidy';

export interface Card {
  id: string;
  name: string;
  value: number; // 2-10, 11 (J), 12 (Q), 13 (K), 14 (A)
  suite: Suite;
  isPinned: boolean;
  effect?: CardEffect;
}

export type ComboType = 
  | 'HighCard' 
  | 'Pair' 
  | 'TwoPair' 
  | 'ThreeOfAKind' 
  | 'Straight' 
  | 'Flush' 
  | 'FullHouse' 
  | 'FourOfAKind' 
  | 'StraightFlush' 
  | 'Bomb';

export interface ComboResult {
  type: ComboType;
  displayName: string;
  baseDamage: number;
  multiplier: number;
  cards: Card[];
}

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  armor: number;
  icon: string; // URL
  bgm: string; // Placeholder or audio tag
  background: string; // URL
  intent: {
    type: 'Attack' | 'Defend' | 'Special';
    value: number;
    description: string;
  };
}

export type RoomType = 'Combat' | 'Shop' | 'Rest' | 'Event' | 'Boss';

export type AnomalyMechanism = 
  | 'TwinPairCombo' // Monster HP up, 2-pair deals combo damage
  | 'CriticalStrike' // All damage +50% for everyone
  | 'WeakHand' // Player draw -1, but every card has +2 base damage
  | 'Vampiric' // Player heals 10% damage dealt, but max HP -10 during battle
  | 'None';

export interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  price: number;
}

export interface MapNode {
  id: number;
  type: RoomType;
  options?: RoomType[]; // For choice after victory
}

export interface RunState {
  currentHp: number;
  maxHp: number;
  gold: number;
  currentNode: number;
  deck: Card[];
  relics: string[]; // Relic IDs
  currentRoomType: RoomType;
}

export interface GameState {
  run: RunState;
  battle: BattleState | null;
  currentScreen: 'Home' | 'Map' | 'Battle' | 'Shop' | 'Event' | 'GameOver';
}

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
