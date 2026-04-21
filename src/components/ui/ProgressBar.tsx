/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  current: number;
  max: number;
}

export function ProgressBar({ current, max }: ProgressBarProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-text-dim uppercase tracking-wider mb-1" style={{ fontSize: '10px', marginBottom: '4px' }}>Node {current} / {max}</span>
      <div className="flex" style={{ gap: '6px' }}>
        {[...Array(max)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "rounded-full border border-border-color",
              i + 1 < current ? "bg-text-dim" : 
              i + 1 === current ? "bg-accent-gold border-white shadow-[0_0_8px_var(--color-accent-gold)]" : "bg-black"
            )} 
            style={{ width: '10px', height: '10px' }}
          />
        ))}
      </div>
    </div>
  );
}
