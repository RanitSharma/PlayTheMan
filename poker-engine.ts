
import { Card, Rank, Suit, Player, Pot } from './types';

export interface Evaluation {
  score: number;
  label: string;
  bestFive: Card[];
}

export class PokerEngine {
  static RANK_VALUE: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  static createDeck(): Card[] {
    const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
    const ranks = Object.values(Rank);
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }
    return this.shuffle(deck);
  }

  static shuffle<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  static getHandStrength(holeCards: Card[], boardCards: Card[]): Evaluation | null {
    const all = [...holeCards, ...boardCards];
    if (all.length < 5) return null;
    return this.evaluateHand(all);
  }

  static evaluateHand(cards: Card[]): Evaluation {
    const sorted = [...cards].sort((a, b) => this.RANK_VALUE[b.rank] - this.RANK_VALUE[a.rank]);
    const rankCounts: Record<string, Card[]> = {};
    const suitCounts: Record<string, Card[]> = {};
    
    sorted.forEach(c => {
      if (!rankCounts[c.rank]) rankCounts[c.rank] = [];
      rankCounts[c.rank].push(c);
      if (!suitCounts[c.suit]) suitCounts[c.suit] = [];
      suitCounts[c.suit].push(c);
    });

    // Flush check
    const flushSuitCards = Object.values(suitCounts).find(s => s.length >= 5);
    
    // Straight check
    const uniqueRanks = Array.from(new Set(sorted.map(c => this.RANK_VALUE[c.rank]))).sort((a, b) => b - a);
    let straightHigh = -1;
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        straightHigh = uniqueRanks[i];
        break;
      }
    }
    const isWheel = uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5);
    if (straightHigh === -1 && isWheel) straightHigh = 5;

    // Straight Flush check
    let straightFlushHigh = -1;
    let sfCards: Card[] = [];
    if (flushSuitCards) {
      const fRanks = Array.from(new Set(flushSuitCards.map(c => this.RANK_VALUE[c.rank]))).sort((a, b) => b - a);
      for (let i = 0; i <= fRanks.length - 5; i++) {
        if (fRanks[i] - fRanks[i + 4] === 4) {
          straightFlushHigh = fRanks[i];
          const bestRanks = fRanks.slice(i, i + 5);
          sfCards = bestRanks.map(r => flushSuitCards.find(c => this.RANK_VALUE[c.rank] === r)!);
          break;
        }
      }
      if (straightFlushHigh === -1 && fRanks.includes(14) && fRanks.includes(2) && fRanks.includes(3) && fRanks.includes(4) && fRanks.includes(5)) {
        straightFlushHigh = 5;
        const wheelRanks = [5, 4, 3, 2, 14];
        sfCards = wheelRanks.map(r => flushSuitCards.find(c => this.RANK_VALUE[c.rank] === r)!);
      }
    }

    const quads = Object.entries(rankCounts).filter(([_, v]) => v.length === 4).sort((a, b) => this.RANK_VALUE[b[0]] - this.RANK_VALUE[a[0]]);
    const trips = Object.entries(rankCounts).filter(([_, v]) => v.length === 3).sort((a, b) => this.RANK_VALUE[b[0]] - this.RANK_VALUE[a[0]]);
    const pairs = Object.entries(rankCounts).filter(([_, v]) => v.length === 2).sort((a, b) => this.RANK_VALUE[b[0]] - this.RANK_VALUE[a[0]]);

    // Score calculations use weighted ranks for perfect tie-breaking
    if (straightFlushHigh !== -1) {
      return { score: 9000000 + straightFlushHigh, label: straightFlushHigh === 14 ? "Royal Flush" : "Straight Flush", bestFive: sfCards };
    }
    
    if (quads.length) {
      const kicker = sorted.find(c => c.rank !== quads[0][0])!;
      return { score: 8000000 + this.RANK_VALUE[quads[0][0]] * 15 + this.RANK_VALUE[kicker.rank], label: "Four of a Kind", bestFive: [...quads[0][1], kicker] };
    }
    
    if (trips.length && (trips.length > 1 || pairs.length > 0)) {
      const mainTrips = trips[0];
      const secondSet = trips.length > 1 ? trips[1][1].slice(0, 2) : pairs[0][1];
      return { score: 7000000 + this.RANK_VALUE[mainTrips[0]] * 15 + this.RANK_VALUE[secondSet[0].rank], label: "Full House", bestFive: [...mainTrips[1], ...secondSet] };
    }
    
    if (flushSuitCards) {
      const top5 = flushSuitCards.slice(0, 5);
      const flushScore = top5.reduce((acc, c, i) => acc + this.RANK_VALUE[c.rank] * Math.pow(15, 4-i), 0);
      return { score: 6000000 + (flushScore / 100000), label: "Flush", bestFive: top5 };
    }
    
    if (straightHigh !== -1) {
      let sCards: Card[] = [];
      if (straightHigh === 5 && uniqueRanks.includes(14)) {
        [5, 4, 3, 2, 14].forEach(r => sCards.push(sorted.find(c => this.RANK_VALUE[c.rank] === r)!));
      } else {
        for (let r = straightHigh; r > straightHigh - 5; r--) sCards.push(sorted.find(c => this.RANK_VALUE[c.rank] === r)!);
      }
      return { score: 5000000 + straightHigh, label: "Straight", bestFive: sCards };
    }
    
    if (trips.length) {
      const kickers = sorted.filter(c => c.rank !== trips[0][0]).slice(0, 2);
      const score = 4000000 + this.RANK_VALUE[trips[0][0]] * 1000 + this.RANK_VALUE[kickers[0].rank] * 15 + this.RANK_VALUE[kickers[1].rank];
      return { score, label: "Three of a Kind", bestFive: [...trips[0][1], ...kickers] };
    }
    
    if (pairs.length >= 2) {
      const pair1 = pairs[0];
      const pair2 = pairs[1];
      const kicker = sorted.find(c => c.rank !== pair1[0] && c.rank !== pair2[0])!;
      const score = 3000000 + this.RANK_VALUE[pair1[0]] * 1000 + this.RANK_VALUE[pair2[0]] * 15 + this.RANK_VALUE[kicker.rank];
      return { score, label: "Two Pair", bestFive: [...pair1[1], ...pair2[1], kicker] };
    }
    
    if (pairs.length === 1) {
      const kickers = sorted.filter(c => c.rank !== pairs[0][0]).slice(0, 3);
      const kickersScore = kickers.reduce((acc, c, i) => acc + this.RANK_VALUE[c.rank] * Math.pow(15, 2-i), 0);
      return { score: 2000000 + this.RANK_VALUE[pairs[0][0]] * 1000 + kickersScore, label: "One Pair", bestFive: [...pairs[0][1], ...kickers] };
    }
    
    const top5 = sorted.slice(0, 5);
    const highCardScore = top5.reduce((acc, c, i) => acc + this.RANK_VALUE[c.rank] * Math.pow(15, 4-i), 0);
    return { score: 1000000 + (highCardScore / 100000), label: "High Card", bestFive: top5 };
  }

  static calculatePots(players: Player[]): Pot[] {
    const contributors = players.filter(p => p.betThisRound > 0);
    if (contributors.length === 0) return [];
    
    const levels = Array.from(new Set(contributors.map(p => p.betThisRound))).sort((a, b) => a - b);
    
    const pots: Pot[] = [];
    let lastLevel = 0;

    for (const level of levels) {
      const amountPerPlayer = level - lastLevel;
      if (amountPerPlayer <= 0) continue;

      const contributingPlayers = contributors.filter(p => p.betThisRound >= level);
      const eligiblePlayers = contributingPlayers.filter(p => !p.isFolded).map(p => p.id);
      
      if (eligiblePlayers.length > 0) {
        pots.push({
          amount: parseFloat((amountPerPlayer * contributingPlayers.length).toFixed(2)),
          eligiblePlayerIds: eligiblePlayers
        });
      }
      
      lastLevel = level;
    }
    
    return pots;
  }

  static resolveOddChips(amount: number, winners: Player[], dealerIndex: number, players: Player[]): Record<string, number> {
    const distributions: Record<string, number> = {};
    const cents = Math.round(amount * 100);
    const shareCents = Math.floor(cents / winners.length);
    let remainingCents = cents % winners.length;

    winners.forEach(w => {
      distributions[w.id] = shareCents / 100;
    });

    if (remainingCents > 0) {
      const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
      const dIdxInSeated = seated.findIndex(p => p.seatIndex === dealerIndex);
      for (let i = 1; i <= seated.length && remainingCents > 0; i++) {
        const checkIdx = (dIdxInSeated + i) % seated.length;
        const targetPlayer = seated[checkIdx];
        if (winners.some(w => w.id === targetPlayer.id)) {
          distributions[targetPlayer.id] = parseFloat((distributions[targetPlayer.id] + 0.01).toFixed(2));
          remainingCents--;
        }
      }
    }

    return distributions;
  }
}
