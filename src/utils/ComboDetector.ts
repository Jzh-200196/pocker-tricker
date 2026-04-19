/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, ComboResult, ComboType } from '../types';

export function detectCombo(cards: Card[]): ComboResult {
  if (cards.length === 0) return { type: 'HighCard', displayName: '无', baseDamage: 0, multiplier: 1, cards: [] };

  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const values = sorted.map(c => c.value);
  
  const countsMap = cards.reduce((acc, c) => {
    acc[c.value] = (acc[c.value] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const countValues = Object.values(countsMap).sort((a, b) => b - a);
  
  // For suites and straight detection, we still use values and real suites
  const suiteCounts = sorted.reduce((acc, c) => ({ ...acc, [c.suite]: (acc[c.suite] || 0) + 1 }), {} as Record<string, number>);
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
  const isFlush = (Object.values(suiteCounts) as number[]).some(c => c >= 5);
  const isStraight = checkStraight(uniqueValues);
  
  // Rule 3: Sum of all values
  const sumValues = values.reduce((a, b) => a + b, 0);

  // High to low priority
  if (isStraight && isFlush) return { type: 'StraightFlush', displayName: '同花顺', baseDamage: sumValues, multiplier: 6, cards };
  if (countValues[0] >= 4) return { type: 'Bomb', displayName: '炸弹', baseDamage: sumValues, multiplier: 4, cards };
  if (countValues[0] === 3 && countValues[1] >= 2) return { type: 'FullHouse', displayName: '葫芦', baseDamage: sumValues, multiplier: 3.5, cards };
  if (isFlush) return { type: 'Flush', displayName: '同花', baseDamage: sumValues, multiplier: 2.5, cards };
  if (isStraight) return { type: 'Straight', displayName: '顺子', baseDamage: sumValues, multiplier: 5, cards };
  if (countValues[0] === 3) return { type: 'ThreeOfAKind', displayName: '连牌', baseDamage: sumValues, multiplier: 3, cards };
  if (countValues[0] === 2 && countValues[1] === 2) return { type: 'TwoPair', displayName: '对子', baseDamage: sumValues, multiplier: 2, cards }; // Note: User requested "对子" for two same cards. 2-pair also typically grouped as such in casual terms or "两对". User spec says: 两张相同提示“对子”。
  if (countValues[0] === 2) return { type: 'Pair', displayName: '对子', baseDamage: sumValues, multiplier: 1.5, cards };
  
  return { 
    type: 'HighCard', 
    displayName: '单牌',
    baseDamage: Math.max(sumValues, values.length > 0 ? Math.max(...values) : 0), 
    multiplier: 1, 
    cards: sorted
  };
}

function checkStraight(values: number[]): boolean {
  if (values.length < 5) return false;
  // Check sliding window
  for (let i = 0; i <= values.length - 5; i++) {
    const window = values.slice(i, i + 5);
    if (window[4] - window[0] === 4) return true;
  }
  // Special case for A-2-3-4-5
  if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) return true;
  return false;
}
