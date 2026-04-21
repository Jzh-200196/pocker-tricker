/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from '../types/card';
import { SUITES } from './suites';

export const VALUES = [1, 2, 3, 4, 5, 6];

export const INITIAL_DECK: Card[] = [
  ...VALUES.flatMap(v => 
    SUITES.map(s => ({
      id: `reg-${s}-${v}`,
      name: v.toString(),
      value: v,
      suite: s,
      isPinned: false
    }))
  )
];
