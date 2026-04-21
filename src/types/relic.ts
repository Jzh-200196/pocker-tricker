/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  price: number;
}
