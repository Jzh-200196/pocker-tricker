/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useLayoutEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameManager } from './hooks/useGameManager';
import { HomeScreen } from './components/screens/HomeScreen';
import { BattleScreen } from './components/BattleScreen';
import { MapScreen } from './components/screens/MapScreen';
import { ShopScreen } from './components/screens/ShopScreen';
import { GameOverOverlay } from './components/modals/GameOverOverlay';

/**
 * App - The Master Orchestrator
 *
 * This final version of App.tsx serves as the central hub of the game's new modular architecture.
 * It manages the fixed-stage scaling (1920x1080), primary screen transitions, and delegates
 * all core gameplay logic to specialized hooks and components.
 */
export default function App() {
  const {
    gameState,
    mapChoices,
    startNewRun,
    handleVictory,
    handleShopExit,
    handleDefeat,
    onSelectRoom,
    updateRun,
    setScreen
  } = useGameManager();

  const [scale, setScale] = useState(1);

  // Maintain 1080p canvas scaling across all viewport sizes
  useLayoutEffect(() => {
    const handleResize = () => {
      const referenceWidth = 1920;
      const referenceHeight = 1080;
      const scaleX = window.innerWidth / referenceWidth;
      const scaleY = window.innerHeight / referenceHeight;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-[#050505] overflow-hidden select-none font-sans">
      <div 
        id="game-canvas"
        className="relative bg-bg-deep shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col flex-shrink-0 overflow-hidden" 
        style={{ 
          width: '1920px', 
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        <AnimatePresence mode="wait">
          {/* Main Title Screen */}
          {gameState.currentScreen === 'Home' && (
            <HomeScreen onStart={startNewRun} />
          )}

          {/* Tactical Battle Screen (Standard & Boss) */}
          {gameState.currentScreen === 'Battle' && (
            <motion.div 
              key="battle" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <BattleScreen 
                run={gameState.run}
                onVictory={handleVictory}
                onDefeat={handleDefeat}
                onPause={() => {}}
              />
            </motion.div>
          )}

          {/* Node Selection Map Screen */}
          {gameState.currentScreen === 'Map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <MapScreen 
                currentNode={gameState.run.currentNode}
                onSelectRoom={onSelectRoom}
                choices={mapChoices}
              />
            </motion.div>
          )}

          {/* Merchant Shop Screen */}
          {gameState.currentScreen === 'Shop' && (
            <motion.div 
              key="shop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} 
              className="w-full h-full"
            >
              <ShopScreen 
                run={gameState.run}
                updateRun={updateRun}
                onExit={handleShopExit}
              />
            </motion.div>
          )}

          {/* Run Termination (Failure) */}
          {gameState.currentScreen === 'GameOver' && (
            <GameOverOverlay 
              onRetry={startNewRun} 
              onMainMenu={() => setScreen('Home')} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
