/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Suite, CardEffect } from '../types';

export function generateRandomCard(): Card {
  const isSpecial = Math.random() < 0.1;
  const suites: Suite[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  const effects: CardEffect[] = ['Heal', 'ArmorBuff', 'GainExtraTidy'];
  const id = `card-${Math.random().toString(36).substr(2, 9)}`;

  if (isSpecial) {
    const effect = effects[Math.floor(Math.random() * effects.length)];
    const names = { Heal: '治愈牌', ArmorBuff: '坚盾牌', GainExtraTidy: '灵感牌' };
    return {
      id,
      name: names[effect] || '特殊牌',
      value: 0,
      suite: 'Special',
      isPinned: false,
      effect
    };
  } else {
    const suite = suites[Math.floor(Math.random() * suites.length)];
    const value = Math.floor(Math.random() * 13) + 2; // 2-14
    return {
      id,
      name: value.toString(),
      value,
      suite,
      isPinned: false
    };
  }
}

export function drawXCards(count: number): Card[] {
  return Array.from({ length: count }, () => generateRandomCard());
}
