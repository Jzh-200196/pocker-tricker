/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { GameState, RunState, RoomType } from '../types/game';
import { INITIAL_DECK } from '../constants/cards';

const INITIAL_RUN: RunState = {
  currentHp: 100,
  maxHp: 100,
  gold: 0,
  currentNode: 1,
  deck: INITIAL_DECK,
  relics: [],
  currentRoomType: 'Combat'
};

export function useGameManager() {
  const [gameState, setGameState] = useState<GameState>({
    run: { ...INITIAL_RUN },
    battle: null,
    currentScreen: 'Home'
  });
  const [mapChoices, setMapChoices] = useState<RoomType[] | null>(null);

  const startNewRun = useCallback(() => {
    setGameState({
      run: { ...INITIAL_RUN },
      battle: null,
      currentScreen: 'Battle'
    });
    setMapChoices(null);
  }, []);

  const getRandomRoom = useCallback((exclude: RoomType[] = []): RoomType => {
    const roll = Math.random();
    if (roll < 0.05 && !exclude.includes('Rest')) return 'Rest'; 
    if (roll < 0.15 && !exclude.includes('Shop')) return 'Shop'; 
    if (roll < 0.45 && !exclude.includes('Event')) return 'Event'; 
    return 'Combat'; 
  }, []);

  const handleVictory = useCallback((loot: any, endHp: number) => {
    setGameState(prev => {
      const nextNode = prev.run.currentNode + 1;
      let choices: RoomType[] | null = null;
      
      if (nextNode === 10) {
        choices = ['Boss'];
      } else {
        const c1 = getRandomRoom();
        const c2 = getRandomRoom([c1]);
        const c3 = getRandomRoom([c1, c2]);
        choices = [c1, c2, c3];
      }

      const finalGold = prev.run.currentRoomType === 'Event' ? loot.gold * 2 : loot.gold;
      setMapChoices(choices);

      return {
        ...prev,
        run: {
          ...prev.run,
          gold: prev.run.gold + finalGold,
          currentHp: endHp,
          currentNode: nextNode
        },
        currentScreen: 'Map'
      };
    });
  }, [getRandomRoom]);

  const handleRest = useCallback(() => {
    setGameState(prev => {
      const healAmount = Math.floor(prev.run.maxHp * 0.3);
      const newHp = Math.min(prev.run.currentHp + healAmount, prev.run.maxHp);
      const nextNode = prev.run.currentNode + 1;
      
      const c1 = getRandomRoom();
      const c2 = getRandomRoom([c1]);
      const c3 = getRandomRoom([c1, c2]);
      setMapChoices(nextNode === 10 ? ['Boss'] : [c1, c2, c3]);

      return {
        ...prev,
        run: {
          ...prev.run,
          currentHp: newHp,
          currentNode: nextNode
        },
        currentScreen: 'Map'
      };
    });
  }, [getRandomRoom]);

  const handleShopExit = useCallback(() => {
    setGameState(prev => {
      const nextNodeLevel = prev.run.currentNode + 1;
      let choices: RoomType[] | null = null;
      
      if (nextNodeLevel === 10) {
        choices = ['Boss'];
      } else {
        const c1 = getRandomRoom(['Shop']);
        const c2 = getRandomRoom(['Shop', c1]);
        const c3 = getRandomRoom(['Shop', c1, c2]);
        choices = [c1, c2, c3];
      }
      setMapChoices(choices);

      return { 
        ...prev, 
        run: { ...prev.run, currentNode: nextNodeLevel },
        currentScreen: 'Map' 
      };
    });
  }, [getRandomRoom]);

  const handleDefeat = useCallback(() => {
    setGameState(prev => ({ ...prev, currentScreen: 'GameOver' }));
  }, []);

  const onSelectRoom = useCallback((type: RoomType) => {
    setGameState(prev => {
      if (type === 'Combat' || type === 'Boss' || type === 'Event') {
        return { 
          ...prev, 
          run: { ...prev.run, currentRoomType: type },
          currentScreen: 'Battle' 
        };
      } else if (type === 'Rest') {
        const healAmount = Math.floor(prev.run.maxHp * 0.3);
        const newHp = Math.min(prev.run.currentHp + healAmount, prev.run.maxHp);
        const nextNode = prev.run.currentNode + 1;
        
        const c1 = getRandomRoom();
        const c2 = getRandomRoom([c1]);
        const c3 = getRandomRoom([c1, c2]);
        setMapChoices(nextNode === 10 ? ['Boss'] : [c1, c2, c3]);

        return {
          ...prev,
          run: {
            ...prev.run,
            currentHp: newHp,
            currentNode: nextNode
          },
          currentScreen: 'Map'
        };
      } else if (type === 'Shop') {
        return { 
          ...prev, 
          run: { ...prev.run, currentRoomType: type },
          currentScreen: 'Shop' 
        };
      }
      return prev;
    });
  }, [getRandomRoom]);

  const updateRun = useCallback((newRun: RunState) => {
    setGameState(prev => ({ ...prev, run: newRun }));
  }, []);

  const setScreen = useCallback((screen: GameState['currentScreen']) => {
    setGameState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  return {
    gameState,
    mapChoices,
    startNewRun,
    handleVictory,
    handleRest,
    handleShopExit,
    handleDefeat,
    onSelectRoom,
    updateRun,
    setScreen
  };
}
