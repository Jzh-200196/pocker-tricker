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
