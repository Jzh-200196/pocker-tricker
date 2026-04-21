/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Enemy } from '../types/enemy';
import { RoomType } from '../types/game';

export const ENEMIES: Record<string, Enemy> = {
  'executioner': {
    id: 'executioner',
    name: 'The Punisher',
    maxHp: 150,
    hp: 150,
    armor: 0,
    icon: 'https://picsum.photos/seed/executioner/400/400',
    bgm: 'dark_battle_1',
    background: 'https://picsum.photos/seed/dungeon/1920/1080?blur=4',
    bgClassName: 'bg-dungeon-hell',
    intent: { type: 'Attack', value: 10, description: 'Swinging the heavy axe' }
  },
  'specter': {
    id: 'specter',
    name: 'Withered Ghost',
    maxHp: 110,
    hp: 110,
    armor: 0,
    icon: 'https://picsum.photos/seed/ghost/400/400',
    bgm: 'dark_battle_2',
    background: 'https://picsum.photos/seed/cemetery/1920/1080?blur=4',
    bgClassName: 'bg-eternal-grave',
    intent: { type: 'Attack', value: 15, description: 'Cursing your soul' }
  },
  'boss': {
    id: 'boss',
    name: 'Ancient Void Lord',
    maxHp: 350,
    hp: 350,
    armor: 0,
    icon: 'https://picsum.photos/seed/void/600/600',
    bgm: 'boss_battle',
    background: 'https://picsum.photos/seed/void_realm/1920/1080?blur=2',
    bgClassName: 'bg-void-abyss',
    intent: { type: 'Special', value: 20, description: 'Tearing the fabric of reality' }
  }
};

export const NODE_RULES: Record<number, RoomType> = {
  1: 'Combat',
  10: 'Boss'
};
