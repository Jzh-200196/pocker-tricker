/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingCart, Tag, Sparkles } from 'lucide-react';
import { drawXCards } from '../utils/cardGenerator';
import { RunState, Card, Relic, Suite } from '../types';
import { CardComponent } from './CardComponent';
import { cn } from '../lib/utils';
import { RELICS, SUITES } from '../constants';

interface ShopScreenProps {
  run: RunState;
  updateRun: (run: RunState) => void;
  onExit: () => void;
}

interface ShopItem<T> {
  item: T;
  price: number;
  purchased: boolean;
}

export function ShopScreen({ run, updateRun, onExit }: ShopScreenProps) {
  const [shopCards, setShopCards] = useState<ShopItem<Card>[]>([]);
  const [shopRelics, setShopRelics] = useState<ShopItem<Relic>[]>([]);

  // Generate shop inventory only once per mount
  useEffect(() => {
    const cardPool = drawXCards(6);

    const cardsItems = cardPool.map(c => ({
      item: c,
      price: c.suite === 'Special' ? 20 : 5 + Math.floor(Math.random() * 16),
      purchased: false
    }));

    const ownedRelics = new Set(run.relics);
    const availableRelics = Object.values(RELICS).filter(r => !ownedRelics.has(r.id));
    const randomRelics = availableRelics.sort(() => Math.random() - 0.5).slice(0, 3);
    
    const relicsItems = randomRelics.map(r => ({
      item: r,
      price: 35 + Math.floor(Math.random() * 16),
      purchased: false
    }));

    setShopCards(cardsItems);
    setShopRelics(relicsItems);
  }, []);

  const buyCard = (index: number) => {
    const shopItem = shopCards[index];
    if (run.gold < shopItem.price || shopItem.purchased) return;

    const newShopCards = [...shopCards];
    newShopCards[index].purchased = true;
    setShopCards(newShopCards);

    updateRun({
      ...run,
      gold: run.gold - shopItem.price,
      deck: [...run.deck, shopItem.item]
    });
  };

  const buyRelic = (index: number) => {
    const shopItem = shopRelics[index];
    if (run.gold < shopItem.price || shopItem.purchased) return;

    const newShopRelics = [...shopRelics];
    newShopRelics[index].purchased = true;
    setShopRelics(newShopRelics);

    updateRun({
      ...run,
      gold: run.gold - shopItem.price,
      relics: [...run.relics, shopItem.item.id]
    });
  };

  return (
    <div className="w-full h-full bg-bg-deep text-text-main p-20 flex flex-col gap-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,_#1a0f0f_0%,_#050505_70%)]" />
      
      <div className="relative z-10 flex justify-between items-center gap-12">
        <div className="space-y-1 text-left">
          <h2 className="text-accent-gold text-sm font-mono tracking-widest uppercase">Secret Market</h2>
          <h1 className="text-6xl font-serif font-black italic tracking-tighter text-text-main leading-none">THE BLACK MERCHANT</h1>
        </div>
        <div className="flex items-center gap-8">
           <div className="bg-black/40 border border-accent-gold text-accent-gold px-8 py-3 rounded-lg font-mono text-4xl">
             {run.gold} <span className="text-sm uppercase ml-1 opacity-60">Gold</span>
           </div>
           <button 
            onClick={onExit}
            className="flex items-center gap-2 text-text-dim hover:text-white transition-colors uppercase text-sm tracking-widest"
           >
             <ArrowLeft className="w-5 h-5" />
             Leave Shop
           </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-12 gap-12 flex-1 items-start overflow-hidden">
        {/* CARDS SECTION */}
        <div className="col-span-8 flex flex-col gap-6 overflow-hidden h-full w-full">
           <div className="flex items-center gap-2 text-accent-gold flex-shrink-0">
              <Sparkles className="w-4 h-4" />
              <h3 className="uppercase tracking-[0.3em] text-xs font-bold">Arcane Collection</h3>
           </div>
           <div className="grid grid-cols-3 gap-6 overflow-y-auto pr-2 flex-grow custom-scrollbar">
              {shopCards.map((shopItem, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col items-center gap-6 p-6 rounded-xl border border-border-color bg-black/40 relative group",
                    shopItem.purchased && "opacity-30 pointer-events-none"
                  )}
                >
                  <CardComponent card={shopItem.item} isSelected={false} onToggleSelect={() => {}} />
                  <button
                    disabled={run.gold < shopItem.price || shopItem.purchased}
                    onClick={() => buyCard(idx)}
                    className="w-full bg-accent-gold/10 border border-accent-gold/40 text-accent-gold py-3 rounded-sm text-sm font-bold hover:bg-accent-gold hover:text-black transition-all"
                  >
                    {shopItem.purchased ? "SOLD OUT" : `${shopItem.price} G`}
                  </button>
                </div>
              ))}
           </div>
        </div>

        {/* RELICS SECTION */}
        <div className="col-span-4 flex flex-col gap-6 w-full h-full overflow-hidden">
           <div className="flex items-center gap-2 text-accent-red flex-shrink-0">
              <Tag className="w-4 h-4" />
              <h3 className="uppercase tracking-[0.3em] text-xs font-bold">Mystic Relics</h3>
           </div>
           <div className="space-y-6 overflow-y-auto flex-grow pr-2 custom-scrollbar">
              {shopRelics.map((shopItem, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-6 rounded-xl border border-border-color bg-card-bg group transition-all",
                    shopItem.purchased && "opacity-20 grayscale"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-accent-gold font-bold italic text-xl">{shopItem.item.name}</h4>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded border uppercase",
                      shopItem.item.rarity === 'Epic' ? "border-purple-500/50 text-purple-400" :
                      shopItem.item.rarity === 'Rare' ? "border-blue-500/50 text-blue-400" : "border-text-dim text-text-dim"
                    )}>
                      {shopItem.item.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-text-dim mb-6 leading-relaxed">{shopItem.item.description}</p>
                  <button
                    disabled={run.gold < shopItem.price || shopItem.purchased}
                    onClick={() => buyRelic(idx)}
                    className="w-full flex justify-between items-center bg-black/40 border border-white/5 p-4 rounded hover:border-accent-gold hover:text-accent-gold transition-all"
                  >
                    <span className="text-xs uppercase tracking-widest font-black">Purchase</span>
                    <span className="font-mono text-sm">{shopItem.purchased ? "---" : `${shopItem.price} G`}</span>
                  </button>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
