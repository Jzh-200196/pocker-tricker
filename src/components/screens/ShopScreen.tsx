/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Tag, Sparkles } from 'lucide-react';
import { drawXCards } from '../../utils/cardGenerator';
import { RunState, RoomType } from '../../types/game';
import { Card } from '../../types/card';
import { Relic } from '../../types/relic';
import { CardComponent } from '../CardComponent';
import { cn } from '../../lib/utils';
import { RELICS } from '../../constants/relics';

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
    <div className="bg-bg-deep text-text-main relative overflow-hidden" style={{ width: '1920px', height: '1080px', padding: '80px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,_#1a0f0f_0%,_#050505_70%)]" />
      
      <div className="relative z-10 flex justify-between items-center" style={{ gap: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 className="text-accent-gold font-mono uppercase" style={{ fontSize: '14px', letterSpacing: '4px' }}>Secret Market</h2>
          <h1 className="font-serif font-black italic tracking-tighter text-text-main leading-none" style={{ fontSize: '64px' }}>THE BLACK MERCHANT</h1>
        </div>
        <div className="flex items-center" style={{ gap: '32px' }}>
           <div className="bg-black/40 border border-accent-gold text-accent-gold rounded-lg font-mono" style={{ padding: '12px 32px', fontSize: '36px' }}>
             {run.gold} <span className="uppercase opacity-60" style={{ fontSize: '14px', marginLeft: '4px' }}>Gold</span>
           </div>
           <button 
            onClick={onExit}
            className="flex items-center text-text-dim hover:text-white transition-colors uppercase tracking-widest"
            style={{ fontSize: '14px', gap: '8px' }}
           >
             <ArrowLeft style={{ width: '20px', height: '20px' }} />
             Leave Shop
           </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '48px' }}>
        {/* CARDS SECTION */}
        <div className="flex flex-col overflow-hidden" style={{ gridColumn: 'span 8 / span 8', height: '100%', gap: '24px' }}>
           <div className="flex items-center text-accent-gold">
              <Sparkles style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              <h3 className="uppercase font-bold" style={{ tracking: '0.3em', fontSize: '12px' }}>Arcane Collection</h3>
           </div>
           <div className="grid grid-cols-3 overflow-y-auto custom-scrollbar" style={{ gap: '24px', paddingRight: '8px', flexGrow: 1 }}>
              {shopCards.map((shopItem, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col items-center rounded-xl border border-border-color bg-black/40 relative group",
                    shopItem.purchased && "opacity-30 pointer-events-none"
                  )}
                  style={{ gap: '24px', padding: '24px' }}
                >
                  <CardComponent card={shopItem.item} isSelected={false} />
                  <button
                    disabled={run.gold < shopItem.price || shopItem.purchased}
                    onClick={() => buyCard(idx)}
                    className="w-full bg-accent-gold/10 border border-accent-gold/40 text-accent-gold rounded-sm font-bold hover:bg-accent-gold hover:text-black transition-all"
                    style={{ padding: '12px 0', fontSize: '14px' }}
                  >
                    {shopItem.purchased ? "SOLD OUT" : `${shopItem.price} G`}
                  </button>
                </div>
              ))}
           </div>
        </div>

        {/* RELICS SECTION */}
        <div className="flex flex-col overflow-hidden" style={{ gridColumn: 'span 4 / span 4', height: '100%', gap: '24px' }}>
           <div className="flex items-center text-accent-red">
              <Tag style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              <h3 className="uppercase font-bold" style={{ tracking: '0.3em', fontSize: '12px' }}>Mystic Relics</h3>
           </div>
           <div className="overflow-y-auto custom-scrollbar" style={{ gap: '24px', paddingRight: '8px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {shopRelics.map((shopItem, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "rounded-xl border border-border-color bg-card-bg group transition-all"
                  )}
                  style={{ padding: '24px', opacity: shopItem.purchased ? 0.2 : 1 }}
                >
                  <div className="flex justify-between items-start" style={{ marginBottom: '16px' }}>
                    <h4 className="text-accent-gold font-bold italic" style={{ fontSize: '20px' }}>{shopItem.item.name}</h4>
                    <span className={cn(
                      "rounded border uppercase",
                      shopItem.item.rarity === 'Epic' ? "border-purple-500/50 text-purple-400" :
                      shopItem.item.rarity === 'Rare' ? "border-blue-500/50 text-blue-400" : "border-text-dim text-text-dim"
                    )} style={{ fontSize: '10px', padding: '2px 8px' }}>
                      {shopItem.item.rarity}
                    </span>
                  </div>
                  <p className="text-text-dim leading-relaxed" style={{ fontSize: '14px', marginBottom: '24px' }}>{shopItem.item.description}</p>
                  <button
                    disabled={run.gold < shopItem.price || shopItem.purchased}
                    onClick={() => buyRelic(idx)}
                    className="w-full flex justify-between items-center bg-black/40 border border-white/5 rounded hover:border-accent-gold hover:text-accent-gold transition-all"
                    style={{ padding: '16px' }}
                  >
                    <span className="uppercase tracking-widest font-black" style={{ fontSize: '12px' }}>Purchase</span>
                    <span className="font-mono" style={{ fontSize: '14px' }}>{shopItem.purchased ? "---" : `${shopItem.price} G`}</span>
                  </button>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
