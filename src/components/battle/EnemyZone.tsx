/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import { Enemy } from '../../types/enemy';
import { HealthBar } from '../ui/HealthBar';
import { ExplosionVFX } from '../ExplosionVFX';

interface EnemyZoneProps {
  enemy: Enemy;
  isShaking: boolean;
  showExplosion: boolean;
}

export function EnemyZone({ enemy, isShaking, showExplosion }: EnemyZoneProps) {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden" style={{ width: '100%', height: '100%', gap: '40px' }}>
      <motion.div 
        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
        className="flex flex-col items-center"
        style={{ width: '100%' }}
      >
        <div className="relative group">
          {/* Intent Label */}
          <div className="absolute bg-black border border-accent-gold flex uppercase text-accent-gold whitespace-nowrap z-20 shadow-2xl skew-x-[-12deg]" style={{ top: '-50px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', fontSize: '14px' }}>
            <span className="skew-x-[12deg] inline-block font-black">{enemy.intent.type} {enemy.intent.value}</span>
          </div>
          
          {/* Enemy Portrait */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_4rem_rgba(255,0,0,0.05)] rounded-lg" style={{ width: '260px', height: '260px' }}>
            <img 
              src={enemy.icon} 
              alt={enemy.name} 
              className="w-full h-full object-cover opacity-40 grayscale group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* VFX Overlay */}
          {showExplosion && <ExplosionVFX />}
        </div>

        {/* Enemy HP Bar */}
        <div style={{ marginTop: '32px' }}>
          <HealthBar 
            current={enemy.hp} 
            max={enemy.maxHp} 
            armor={enemy.armor} 
            label={enemy.name} 
            width="480px"
            height="15px"
            colorClass="bg-gradient-to-r from-accent-red/40 via-accent-red to-white/20"
            showArmorAbove={true}
          />
        </div>
      </motion.div>
    </div>
  );
}
