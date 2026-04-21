/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BattleState } from './battle';

export type RoomType = 'Combat' | 'Shop' | 'Rest' | 'Event' | 'Boss';

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
  deck: import('./card').Card[];
  relics: string[]; // Relic IDs
  currentRoomType: RoomType;
}

export interface GameState {
  run: RunState;
  battle: BattleState | null;
  currentScreen: 'Home' | 'Map' | 'Battle' | 'Shop' | 'Event' | 'GameOver';
}
