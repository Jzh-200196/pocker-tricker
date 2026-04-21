/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers } from 'lucide-react';

interface BattleLogProps {
  logs: string[];
}

export function BattleLog({ logs }: BattleLogProps) {
  return (
    <div className="absolute top-1/2 left-4 -translate-y-1/2 w-[220px] flex flex-col gap-6 pointer-events-none opacity-40">
      <div className="flex items-center gap-2">
         <Layers className="w-4 h-4 text-text-dim" />
         <span className="text-[10px] text-text-dim uppercase tracking-widest font-mono">Protocol Log</span>
      </div>
      <div className="space-y-4">
        {logs.slice(0, 3).map((log, i) => (
          <div key={i} className="text-[11px] text-text-dim font-mono leading-tight border-l border-white/10 pl-3">
             {log}
          </div>
        ))}
      </div>
    </div>
  );
}
