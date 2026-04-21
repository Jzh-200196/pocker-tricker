/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Relic } from '../types/relic';

export const RELICS: Record<string, Relic> = {
  'flow_emblem': { id: 'flow_emblem', name: '流水纹章', description: '顺子伤害 +15%', rarity: 'Common', price: 100 },
  'gale_gloves': { id: 'gale_gloves', name: '疾风手套', description: '每回合首次顺子后抽1张', rarity: 'Rare', price: 150 },
  'dance_boots': { id: 'dance_boots', name: '踏歌靴', description: '顺子命中后获得2护甲', rarity: 'Common', price: 90 },
  'twin_ring': { id: 'twin_ring', name: '双生戒指', description: '对子伤害 +10%', rarity: 'Common', price: 110 },
  'defensive_sigil': { id: 'defensive_sigil', name: '守势徽记', description: '对子额外获得4护甲', rarity: 'Common', price: 100 },
  'steady_chip': { id: 'steady_chip', name: '稳局筹码', description: '连续两回合打出对子，回复3生命', rarity: 'Epic', price: 250 },
  'black_powder': { id: 'black_powder', name: '黑火药桶', description: '炸弹伤害 +20%', rarity: 'Common', price: 120 },
  'fuse_amulet': { id: 'fuse_amulet', name: '引信护符', description: '炸弹打断敌人时回复1次整理次数', rarity: 'Rare', price: 180 },
  'desolation_seal': { id: 'desolation_seal', name: '绝地封印', description: '生命低于30%时炸弹伤害额外 +20%', rarity: 'Rare', price: 200 },
  'old_card_box': { id: 'old_card_box', name: '旧牌匣', description: '战斗开始时多抽1张', rarity: 'Common', price: 130 },
  'shuffler': { id: 'shuffler', name: '洗牌器', description: '每回合第一次整理不消耗整理次数', rarity: 'Epic', price: 300 },
  'gambler_coin': { id: 'gambler_coin', name: '赌徒硬币', description: '每场战斗后额外获得8金币，但战斗开始时失去2生命', rarity: 'Common', price: 50 }
};
