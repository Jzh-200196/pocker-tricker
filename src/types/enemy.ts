/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  armor: number;
  icon: string; // URL
  bgm: string; // Placeholder or audio tag
  background: string; // URL (Mainly for image)
  bgClassName: string; // Added for dynamic dynamic visual styles/themes
  intent: {
    type: 'Attack' | 'Defend' | 'Special';
    value: number;
    description: string;
  };
}
