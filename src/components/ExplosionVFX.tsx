/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export function ExplosionVFX() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [1, 2, 0.5], 
          opacity: [0, 1, 0],
          rotate: [0, 45, 90]
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-[40vmin] h-[40vmin] rounded-full bg-orange-500 blur-3xl mix-blend-screen"
      />
      <motion.div
         initial={{ scale: 0, opacity: 0 }}
         animate={{ 
           scale: [0.5, 3, 1], 
           opacity: [0, 0.8, 0],
         }}
         transition={{ duration: 0.6, ease: "easeOut" }}
         className="w-[20vmin] h-[20vmin] rounded-full border-[0.5vmin] border-amber-300"
      />
      {/* Fragments */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ 
            x: Math.cos(i * 30 * Math.PI / 180) * 30 + 'vmin', 
            y: Math.sin(i * 30 * Math.PI / 180) * 30 + 'vmin',
            opacity: 0,
            scale: 0
          }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="absolute w-[0.5vmin] h-[3vmin] bg-amber-400 rounded-full"
          style={{ rotate: `${i * 30}deg` }}
        />
      ))}
    </div>
  );
}
