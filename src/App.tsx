/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, RotateCcw, Home as HomeIcon } from 'lucide-react';
import { GameState, RunState, RoomType } from './types';
import { INITIAL_DECK } from './constants';
import { BattleScreen } from './components/BattleScreen';
import { MapScreen } from './components/MapScreen';
import { ShopScreen } from './components/ShopScreen';

const INITIAL_RUN: RunState = {
  currentHp: 100,
  maxHp: 100,
  gold: 0,
  currentNode: 1,
  deck: INITIAL_DECK,
  relics: [],
  currentRoomType: 'Combat'
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    run: { ...INITIAL_RUN },
    battle: null,
    currentScreen: 'Home'
  });
  const [mapChoices, setMapChoices] = useState<RoomType[] | null>(null);
  const [scale, setScale] = useState(1);

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
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const startNewRun = () => {
    setGameState({
      run: { ...INITIAL_RUN },
      battle: null,
      currentScreen: 'Battle'
    });
    setMapChoices(null);
  };
  
  const getRandomRoom = (exclude: RoomType[] = []): RoomType => {
    const roll = Math.random();
    if (roll < 0.05 && !exclude.includes('Rest')) return 'Rest'; 
    if (roll < 0.15 && !exclude.includes('Shop')) return 'Shop'; 
    if (roll < 0.45 && !exclude.includes('Event')) return 'Event'; 
    return 'Combat'; 
  };

  const handleVictory = (loot: any, endHp: number) => {
    const nextNode = gameState.run.currentNode + 1;
    let choices: RoomType[] | null = null;
    
    if (nextNode === 10) {
      choices = ['Boss'];
    } else {
      const c1 = getRandomRoom();
      const c2 = getRandomRoom([c1]);
      const c3 = getRandomRoom([c1, c2]);
      choices = [c1, c2, c3];
    }

    const finalGold = gameState.run.currentRoomType === 'Event' ? loot.gold * 2 : loot.gold;

    setGameState(prev => ({
      ...prev,
      run: {
        ...prev.run,
        gold: prev.run.gold + finalGold,
        currentHp: endHp,
        currentNode: nextNode
      },
      currentScreen: 'Map'
    }));
    setMapChoices(choices);
  };

  const handleRest = () => {
    const healAmount = Math.floor(gameState.run.maxHp * 0.3);
    const newHp = Math.min(gameState.run.currentHp + healAmount, gameState.run.maxHp);
    const nextNode = gameState.run.currentNode + 1;
    
    setGameState(prev => ({
      ...prev,
      run: {
        ...prev.run,
        currentHp: newHp,
        currentNode: nextNode
      },
      currentScreen: 'Map'
    }));

    const c1 = getRandomRoom();
    const c2 = getRandomRoom([c1]);
    const c3 = getRandomRoom([c1, c2]);
    setMapChoices(nextNode === 10 ? ['Boss'] : [c1, c2, c3]);
  };

  const handleShopExit = () => {
    const nextNodeLevel = gameState.run.currentNode + 1;
    let choices: RoomType[] | null = null;
    
    if (nextNodeLevel === 10) {
      choices = ['Boss'];
    } else {
      const c1 = getRandomRoom(['Shop']);
      const c2 = getRandomRoom(['Shop', c1]);
      const c3 = getRandomRoom(['Shop', c1, c2]);
      choices = [c1, c2, c3];
    }
    
    setGameState(prev => ({ 
      ...prev, 
      run: { ...prev.run, currentNode: nextNodeLevel },
      currentScreen: 'Map' 
    }));
    setMapChoices(choices);
  };

  const handleDefeat = () => {
    setGameState(prev => ({ ...prev, currentScreen: 'GameOver' }));
  };

  const onSelectRoom = (type: RoomType) => {
    if (type === 'Combat' || type === 'Boss' || type === 'Event') {
      setGameState(prev => ({ 
        ...prev, 
        run: { ...prev.run, currentRoomType: type },
        currentScreen: 'Battle' 
      }));
    } else if (type === 'Rest') {
      handleRest();
    } else if (type === 'Shop') {
      setGameState(prev => ({ 
        ...prev, 
        run: { ...prev.run, currentRoomType: type },
        currentScreen: 'Shop' 
      }));
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-[#111] overflow-hidden select-none font-sans">
      <div 
        id="game-canvas"
        className="relative bg-bg-deep shadow-2xl flex flex-col flex-shrink-0 overflow-hidden" 
        style={{ 
          width: '1920px', 
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        <AnimatePresence mode="wait">
          {gameState.currentScreen === 'Home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,_#4d0000_0%,_#050505_70%)]" />
              
              <div className="relative z-10 w-full">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center" style={{ gap: '16px' }}>
                  <h2 className="text-accent-gold font-mono uppercase opacity-60" style={{ fontSize: '18px', letterSpacing: '12px' }}>
                    Deckbound Siege
                  </h2>
                  <h1 className="font-serif font-black italic tracking-tighter text-text-main drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" style={{ fontSize: '120px', lineHeight: '100px' }}>
                    DARK DECK<br/>
                    <span className="text-accent-red">EXECUTIONER</span>
                  </h1>
                  <p className="text-text-dim italic font-serif" style={{ fontSize: '30px', maxWidth: '672px', marginTop: '24px' }}>
                    "The cards hold your fate, the blade holds your soul."
                  </p>
                </motion.div>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startNewRun}
                  className="bg-black border border-accent-gold text-accent-gold font-bold uppercase tracking-widest transition-all hover:bg-accent-gold hover:text-black shadow-[0_0_20px_rgba(197,160,89,0.1)]"
                  style={{ marginTop: '64px', padding: '24px 48px', fontSize: '20px' }}
                >
                  Begin Challenge
                </motion.button>
              </div>
            </motion.div>
          )}

          {gameState.currentScreen === 'Battle' && (
            <motion.div key="battle" className="w-full h-full">
              <BattleScreen 
                run={gameState.run}
                onVictory={handleVictory}
                onDefeat={handleDefeat}
                onPause={() => {}}
              />
            </motion.div>
          )}

          {gameState.currentScreen === 'Map' && (
            <motion.div key="map" className="w-full h-full">
              <MapScreen 
                currentNode={gameState.run.currentNode}
                onSelectRoom={onSelectRoom}
                choices={mapChoices}
              />
            </motion.div>
          )}

          {gameState.currentScreen === 'Shop' && (
            <motion.div key="shop" className="w-full h-full">
              <ShopScreen 
                run={gameState.run}
                updateRun={(newRun) => setGameState(prev => ({ ...prev, run: newRun }))}
                onExit={handleShopExit}
              />
            </motion.div>
          )}

          {gameState.currentScreen === 'GameOver' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col items-center justify-center text-center"
              style={{ padding: '96px' }}
            >
              <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_#300_0%,_#050505_100%)]" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-10"
                style={{ gap: '32px', display: 'flex', flexDirection: 'column' }}
              >
                <Skull className="text-accent-red mx-auto drop-shadow-[0_0_20px_rgba(255,62,62,0.5)]" style={{ width: '128px', height: '128px' }} />
                <h1 className="font-serif font-black text-text-main italic tracking-tighter uppercase" style={{ fontSize: '72px' }}>Challenge Failed</h1>
                <p className="text-text-dim uppercase tracking-widest" style={{ fontSize: '20px' }}>Your deck remains in the ashes</p>
              </motion.div>
              
              <div className="flex flex-col relative z-10" style={{ marginTop: '80px', gap: '24px', width: '400px' }}>
                <button 
                  onClick={startNewRun}
                  className="flex items-center justify-center bg-accent-red text-white font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_0_20px_rgba(255,62,62,0.2)]"
                  style={{ gap: '16px', padding: '24px 0', fontSize: '20px' }}
                >
                  <RotateCcw style={{ width: '24px', height: '24px' }} />
                  Retry Run
                </button>
                <button 
                  onClick={() => setGameState(p => ({ ...p, currentScreen: 'Home' }))}
                  className="flex items-center justify-center bg-transparent text-text-dim border border-border-color uppercase tracking-widest hover:border-white hover:text-white transition-all"
                  style={{ gap: '16px', padding: '24px 0', fontSize: '20px' }}
                >
                  <HomeIcon style={{ width: '24px', height: '24px' }} />
                  Main Menu
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
