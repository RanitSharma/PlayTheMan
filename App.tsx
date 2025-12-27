
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GameState, GameStage, PlayerAction, Card, Player, ChatMessage, RoomSettings, Rank, Suit, FinancialRequest, FinancialRequestType } from './types';
import { PokerEngine } from './poker-engine';
import { Home } from './components/Home';
import Lobby from './components/Lobby';
import PokerTable from './components/PokerTable';

const AI_PERSONALITIES = [
  "Alex (AI)", "Mia (AI)", "Noah (AI)", "Zara (AI)", 
  "Omar (AI)", "Ivy (AI)", "Kai (AI)", "Liam (AI)", "Sofia (AI)"
];

class MockServer {
  private state: GameState;
  private deck: Card[] = [];
  private handlers: Record<string, Function[]> = {};

  constructor() {
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    return {
      roomId: 'Harvey-Specter-Room',
      hostId: null,
      stage: GameStage.Lobby,
      players: [],
      communityCards: [],
      pots: [],
      currentTurnPlayerId: null,
      lastActionPlayerId: null,
      dealerIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 1,
      minRaise: 0,
      lastRaiseAmount: 0,
      actionStartTime: null,
      chatHistory: [],
      settings: {
        maxPlayers: 10,
        startingStack: 0,
        smallBlind: 0,
        bigBlind: 0,
        actionTimerSeconds: 20
      },
      winnerPopup: null,
      muckChoicePlayerId: null,
      muckChoiceStartTime: null,
      lastStreetAction: undefined,
      pendingRequests: []
    };
  }

  on(event: string, cb: Function) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(cb);
  }

  emit(event: string, payload: any) {
    setTimeout(() => {
      switch (event) {
        case 'room:join': this.handleJoin(payload); break;
        case 'player:ready': this.handleReady(payload); break;
        case 'game:start': this.startGame(); break;
        case 'settings:update': this.handleSettingsUpdate(payload); break;
        case 'action:submit': this.handleAction(payload); break;
        case 'action:muck': this.handleMuckChoice(payload); break;
        case 'player:reveal-fold': this.handleRevealFold(payload); break;
        case 'chat:message': this.handleChatMessage(payload); break;
        case 'financial:request': this.handleFinancialRequest(payload); break;
        case 'financial:resolve': this.handleResolveRequest(payload); break;
        case 'dev:fill-ais': this.handleFillAIs(); break;
        case 'dev:toggle-ready': this.handleReady(payload); break;
        case 'dev:reset': this.handleDevReset(); break;
      }
    }, 50);
  }

  private broadcast(event: string, payload: any) {
    this.handlers[event]?.forEach(cb => cb(payload));
  }

  private logSystem(text: string) {
    this.handleChatMessage({ senderId: 'system', senderName: '', text });
  }

  private handleJoin({ name, playerId, isSpectator }: { name: string, playerId: string, isSpectator: boolean }) {
    if (this.state.players.some(p => p.id === playerId)) {
      const p = this.state.players.find(p => p.id === playerId)!;
      p.isConnected = true;
      p.isSpectator = isSpectator;
      this.broadcast('room:update', this.state);
      return;
    }
    if (!this.state.hostId && !isSpectator) this.state.hostId = playerId;

    const startingStack = isSpectator ? 0 : this.state.settings.startingStack;
    const player: Player = {
      id: playerId, name,
      chips: startingStack,
      totalBuyIn: startingStack,
      totalBuyOut: 0,
      betThisRound: 0, betThisStreet: 0,
      isFolded: false, isAllIn: false, isReady: false,
      isSpectator, isConnected: true,
      seatIndex: this.getNextAvailableSeat(),
      hasActedThisStreet: false
    };
    this.state.players.push(player);
    this.logSystem(`>>> ${name} joined.`);
    this.broadcast('room:update', this.state);
  }

  private getNextAvailableSeat(): number {
    const taken = new Set(this.state.players.map(p => p.seatIndex));
    for (let i = 0; i < 10; i++) {
      if (!taken.has(i)) return i;
    }
    return -1;
  }

  private handleSettingsUpdate(newSettings: Partial<RoomSettings>) {
    if (this.state.stage !== GameStage.Lobby) return;
    this.state.settings = { ...this.state.settings, ...newSettings };
    
    this.state.players.forEach(p => {
      if (!p.isSpectator) {
        p.chips = this.state.settings.startingStack;
        p.totalBuyIn = this.state.settings.startingStack;
      }
    });
    this.broadcast('room:update', this.state);
  }

  private applyApprovedRequests() {
    const remainingRequests: FinancialRequest[] = [];
    
    this.state.pendingRequests.forEach(req => {
      if (req.status === 'approved') {
        const player = this.state.players.find(p => p.id === req.playerId);
        if (player) {
          if (req.type === FinancialRequestType.BuyIn) {
            player.chips += req.amount;
            player.totalBuyIn += req.amount;
            this.logSystem(`${player.name} Buy-In of $${req.amount.toFixed(2)} applied.`);
          } else {
            const outAmount = Math.min(player.chips, req.amount);
            player.totalBuyOut += outAmount;
            player.chips -= outAmount;
            this.logSystem(`${player.name} Cash-out of $${outAmount.toFixed(2)} applied.`);
          }
        }
      } else {
        remainingRequests.push(req);
      }
    });
    
    this.state.pendingRequests = remainingRequests;
  }

  private startGame() {
    const { smallBlind, bigBlind } = this.state.settings;
    if (smallBlind <= 0 || bigBlind <= 0) return;

    // Apply approved financial requests BEFORE starting the next hand
    this.applyApprovedRequests();

    const seatedPlayers = this.state.players.filter(p => !p.isSpectator && p.isReady && p.isConnected).sort((a,b) => a.seatIndex - b.seatIndex);
    const seatedWithChips = seatedPlayers.filter(p => p.chips > 0);

    if (seatedWithChips.length < 2) {
      this.logSystem(">>> Not enough players with chips to start.");
      this.state.stage = GameStage.Lobby;
      this.broadcast('room:update', this.state);
      return;
    }

    this.logStandings();

    this.state.stage = GameStage.PreFlop;
    this.state.winnerPopup = null;
    this.state.muckChoicePlayerId = null;
    this.state.muckChoiceStartTime = null;
    this.state.lastActionPlayerId = null;
    this.state.lastStreetAction = "New hand dealt";
    this.deck = PokerEngine.createDeck();
    this.state.communityCards = [];
    
    this.state.players.forEach(p => {
      p.holeCards = undefined;
      p.isFolded = true;
      p.betThisRound = 0; p.betThisStreet = 0;
      p.hasActedThisStreet = false; p.isWinner = false;
      p.lastAction = undefined; p.isThinking = false;
      p.isRevealingFold = false;
      delete p.handDescription;
      p.role = undefined;
    });

    seatedWithChips.forEach((p) => {
      p.holeCards = [this.deck.pop()!, this.deck.pop()!];
      p.isFolded = false; p.isAllIn = false;
    });

    const dIdx = this.state.dealerIndex % seatedWithChips.length;
    let sbIdx, bbIdx;

    if (seatedWithChips.length === 2) {
      sbIdx = dIdx;
      bbIdx = (dIdx + 1) % seatedWithChips.length;
    } else {
      sbIdx = (dIdx + 1) % seatedWithChips.length;
      bbIdx = (dIdx + 2) % seatedWithChips.length;
    }

    seatedWithChips[dIdx].role = 'D';
    seatedWithChips[sbIdx].role = 'SB';
    seatedWithChips[bbIdx].role = 'BB';

    const sb = seatedWithChips[sbIdx];
    const bb = seatedWithChips[bbIdx];
    
    const sbAmt = Math.min(sb.chips, smallBlind);
    sb.chips -= sbAmt; sb.betThisRound = sbAmt; sb.betThisStreet = sbAmt;
    if (sb.chips === 0) sb.isAllIn = true;
    
    const bbAmt = Math.min(bb.chips, bigBlind);
    bb.chips -= bbAmt; bb.betThisRound = bbAmt; bb.betThisStreet = bbAmt;
    if (bb.chips === 0) bb.isAllIn = true;

    this.state.lastRaiseAmount = bigBlind;
    this.state.minRaise = bigBlind * 2;

    this.state.currentTurnPlayerId = seatedWithChips.length === 2 ? sb.id : seatedWithChips[(bbIdx + 1) % seatedWithChips.length].id;
    this.state.actionStartTime = Date.now();
    
    this.logSystem(`>>> Hand started.`);
    this.updatePots();
    this.broadcast('room:update', this.state);
    this.checkSimulationTurns();
  }

  private logStandings() {
    const standings = this.state.players
      .filter(p => p.totalBuyIn > 0 || p.totalBuyOut > 0 || p.chips > 0)
      .map(p => {
        const net = (p.chips + p.betThisRound + p.totalBuyOut) - p.totalBuyIn;
        return `${p.name}: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}`;
      });
    
    if (standings.length > 0) {
      this.logSystem(`>>> STANDINGS: ${standings.join(' | ')}`);
    }
  }

  private updatePots() {
    let rawPots = PokerEngine.calculatePots(this.state.players);
    const activePlayers = this.state.players.filter(p => !p.isFolded && !p.isSpectator);
    
    const validPots = [];
    for (const pot of rawPots) {
      if (pot.eligiblePlayerIds.length === 1) {
        const playerId = pot.eligiblePlayerIds[0];
        const player = this.state.players.find(p => p.id === playerId);
        const others = activePlayers.filter(p => p.id !== playerId);
        const canAnyoneElseCall = others.some(p => !p.isAllIn);

        if (player && !canAnyoneElseCall) {
          player.chips += pot.amount;
          player.betThisRound -= pot.amount;
        } else {
          validPots.push(pot);
        }
      } else {
        validPots.push(pot);
      }
    }
    this.state.pots = validPots;
  }

  private handleAction({ playerId, action, amount }: { playerId: string, action: PlayerAction, amount?: number }) {
    if (this.state.currentTurnPlayerId !== playerId) return;
    const player = this.state.players.find(p => p.id === playerId)!;
    const maxStreetBet = Math.max(...this.state.players.filter(p => !p.isSpectator).map(p => p.betThisStreet));
    const toCall = maxStreetBet - player.betThisStreet;

    player.hasActedThisStreet = true;
    player.isThinking = false;
    this.state.lastActionPlayerId = playerId;

    let actionLabel = "";
    switch (action) {
      case PlayerAction.Fold:
        player.isFolded = true;
        player.lastAction = { type: action, timestamp: Date.now() };
        actionLabel = `${player.name} folds.`;
        break;
      case PlayerAction.Check:
        player.lastAction = { type: action, timestamp: Date.now() };
        actionLabel = `${player.name} checks.`;
        break;
      case PlayerAction.Call:
        const add = Math.min(toCall, player.chips);
        player.chips -= add; player.betThisRound += add; player.betThisStreet += add;
        if (player.chips === 0) player.isAllIn = true;
        player.lastAction = { type: action, amount: add, timestamp: Date.now() };
        actionLabel = `${player.name} calls.`;
        break;
      case PlayerAction.Bet:
      case PlayerAction.Raise:
        if (amount === undefined) return;
        const totalIncrease = amount - player.betThisStreet;
        player.chips -= totalIncrease;
        player.betThisRound += totalIncrease;
        player.betThisStreet = amount;
        const raiseSize = amount - maxStreetBet;
        this.state.minRaise = amount + Math.max(raiseSize, this.state.settings.bigBlind);
        this.state.lastRaiseAmount = raiseSize;
        if (player.chips === 0) player.isAllIn = true;
        player.lastAction = { type: action, amount: amount, timestamp: Date.now() };
        actionLabel = `${player.name} ${action.toLowerCase()}s.`;
        this.state.players.forEach(p => { if (p.id !== playerId && !p.isFolded && !p.isAllIn) p.hasActedThisStreet = false; });
        break;
    }
    
    this.state.lastStreetAction = actionLabel;
    
    const remaining = this.state.players.filter(p => !p.isSpectator && !p.isFolded);
    if (remaining.length === 1) {
      this.updatePots();
      this.settleHand();
      return;
    }

    this.updatePots();
    this.advanceTurn();
  }

  private advanceTurn() {
    const activeAtTable = this.state.players.filter(p => !p.isSpectator && !p.isFolded);
    const maxStreetBet = Math.max(...this.state.players.map(p => p.betThisStreet));
    const allActed = activeAtTable.every(p => p.hasActedThisStreet || p.isAllIn);
    const matched = activeAtTable.every(p => p.betThisStreet === maxStreetBet || p.isAllIn);

    if (allActed && matched) {
      setTimeout(() => this.nextStage(), 600);
    } else {
      const seated = this.state.players.filter(p => !p.isSpectator).sort((a,b) => a.seatIndex - b.seatIndex);
      let nextIdx = (seated.findIndex(p => p.id === this.state.currentTurnPlayerId) + 1) % seated.length;
      while (seated[nextIdx].isFolded || (seated[nextIdx].isAllIn && seated[nextIdx].hasActedThisStreet)) {
          nextIdx = (nextIdx + 1) % seated.length;
      }
      this.state.currentTurnPlayerId = seated[nextIdx].id;
      this.state.actionStartTime = Date.now();
      this.broadcast('room:update', this.state);
      this.checkSimulationTurns();
    }
  }

  private nextStage() {
    this.state.players.forEach(p => { p.betThisStreet = 0; p.hasActedThisStreet = false; p.lastAction = undefined; });
    this.state.lastRaiseAmount = 0;
    this.state.minRaise = this.state.settings.bigBlind;
    this.state.lastStreetAction = undefined;
    this.state.lastActionPlayerId = null;

    switch (this.state.stage) {
      case GameStage.PreFlop:
        this.state.stage = GameStage.Flop;
        this.state.communityCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
        break;
      case GameStage.Flop:
        this.state.stage = GameStage.Turn;
        this.state.communityCards.push(this.deck.pop()!);
        break;
      case GameStage.Turn:
        this.state.stage = GameStage.River;
        this.state.communityCards.push(this.deck.pop()!);
        break;
      default:
        this.settleHand();
        return;
    }

    this.updatePots();
    const active = this.state.players.filter(p => !p.isSpectator && !p.isFolded && !p.isAllIn);
    if (active.length < 2) {
        setTimeout(() => this.nextStage(), 1000);
    } else {
        const seated = this.state.players.filter(p => !p.isSpectator).sort((a,b) => a.seatIndex - b.seatIndex);
        let nextIdx = (this.state.dealerIndex + 1) % seated.length;
        while (seated[nextIdx].isFolded || seated[nextIdx].isAllIn) nextIdx = (nextIdx + 1) % seated.length;
        this.state.currentTurnPlayerId = seated[nextIdx].id;
        this.state.actionStartTime = Date.now();
    }
    this.broadcast('room:update', this.state);
    this.checkSimulationTurns();
  }

  private settleHand() {
    this.state.currentTurnPlayerId = null;
    this.state.lastActionPlayerId = null;
    this.updatePots();
    
    const seated = this.state.players.filter(p => !p.isSpectator && !p.isFolded);
    seated.forEach(p => {
      if (p.holeCards) {
        const evalResult = PokerEngine.evaluateHand([...this.state.communityCards, ...p.holeCards]);
        p.handDescription = evalResult.label;
      }
    });

    if (seated.length > 1) {
      this.state.stage = GameStage.Showdown;
      this.payoutPots(seated);
      this.state.muckChoicePlayerId = 'REVEALING';
      setTimeout(() => this.resetForNextHand(), 5000);
    } else if (seated.length === 1) {
      const winner = seated[0];
      winner.isWinner = true;
      this.payoutPots(seated);
      this.state.muckChoicePlayerId = winner.id;
      this.state.muckChoiceStartTime = Date.now();
    }
    
    this.broadcast('room:update', this.state);
  }

  private handleMuckChoice({ playerId, show }: { playerId: string, show: boolean }) {
    if (this.state.muckChoicePlayerId !== playerId) return;
    if (show) {
      this.state.muckChoicePlayerId = 'REVEALING';
      const p = this.state.players.find(p => p.id === playerId);
      if (p) p.isRevealingFold = true; 
      this.broadcast('room:update', this.state);
      setTimeout(() => {
        this.state.muckChoicePlayerId = null;
        this.state.muckChoiceStartTime = null;
        this.resetForNextHand();
      }, 3000);
    } else {
      this.state.muckChoicePlayerId = null;
      this.state.muckChoiceStartTime = null;
      this.resetForNextHand();
    }
  }

  private payoutPots(seated: Player[]) {
    this.state.pots.forEach((pot, index) => {
      const eligibleInPot = seated.filter(p => pot.eligiblePlayerIds.includes(p.id));
      if (!eligibleInPot.length) return;

      const scored = eligibleInPot.map(p => ({
        p,
        s: PokerEngine.evaluateHand([...this.state.communityCards, ...p.holeCards!]).score
      })).sort((a,b) => b.s - a.s);

      const maxScore = scored[0].s;
      const winners = scored.filter(s => s.s === maxScore).map(s => s.p);
      
      const oddChipDistributions = PokerEngine.resolveOddChips(pot.amount, winners, this.state.dealerIndex, this.state.players);
      
      winners.forEach(w => {
        const amt = oddChipDistributions[w.id];
        w.chips += amt;
        w.isWinner = true; 
      });

      const potName = index === 0 ? "Main Pot" : `Side Pot ${index}`;
      const winnerNames = winners.map(w => w.name).join(', ');
      this.logSystem(`${potName} ($${pot.amount.toFixed(2)}) won by: ${winnerNames}`);
    });
  }

  private resetForNextHand() {
    const seatedWithChips = this.state.players.filter(p => !p.isSpectator && p.chips > 0 && p.isConnected).sort((a,b) => a.seatIndex - b.seatIndex);
    if (seatedWithChips.length < 2) {
      this.state.stage = GameStage.Lobby;
      this.broadcast('room:update', this.state);
      return;
    }
    this.state.dealerIndex = (this.state.dealerIndex + 1) % seatedWithChips.length;
    this.startGame();
  }

  private handleReady(playerId: string) {
    const p = this.state.players.find(p => p.id === playerId);
    if (p) p.isReady = !p.isReady;
    this.broadcast('room:update', this.state);
  }

  private handleChatMessage({ senderId, senderName, text }: { senderId: string, senderName: string, text: string }) {
    const msg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: senderId === 'system' ? 'INTEL' : senderName,
      text, timestamp: Date.now(), isSystem: senderId === 'system'
    };
    this.state.chatHistory.push(msg);
    this.broadcast('room:update', this.state);
  }

  private handleFillAIs() {
    const currentSeated = this.state.players.filter(p => !p.isSpectator);
    const needed = 10 - currentSeated.length;
    if (needed <= 0) return;

    for (let i = 0; i < needed; i++) {
      const name = AI_PERSONALITIES[i] || `Bot ${i}`;
      const startingStack = this.state.settings.startingStack;
      const fakePlayer: Player = {
        id: `ai-${Math.random().toString(36).substr(2, 6)}`,
        name,
        chips: startingStack,
        totalBuyIn: startingStack,
        totalBuyOut: 0,
        betThisRound: 0, betThisStreet: 0,
        isFolded: false, isAllIn: false, isReady: true,
        isAI: true, isSpectator: false, isConnected: true,
        seatIndex: this.getNextAvailableSeat(),
        hasActedThisStreet: false
      };
      this.state.players.push(fakePlayer);
    }
    this.broadcast('room:update', this.state);
  }

  private handleDevReset() {
    this.state = this.getInitialState();
    this.broadcast('room:update', this.state);
  }

  private handleFinancialRequest({ playerId, type, amount }: { playerId: string, type: FinancialRequestType, amount: number }) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;
    const request: FinancialRequest = {
      id: Math.random().toString(36).substr(2, 9),
      playerId,
      playerName: player.name,
      type,
      amount: amount,
      timestamp: Date.now(),
      status: 'pending'
    };
    this.state.pendingRequests.push(request);
    this.logSystem(`${player.name} requested a ${type === FinancialRequestType.BuyIn ? 'Buy-In' : 'Cash-out'} of $${amount.toFixed(2)}.`);
    this.broadcast('room:update', this.state);
  }

  private handleResolveRequest({ requestId, approved }: { requestId: string, approved: boolean }) {
    const requestIndex = this.state.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return;
    
    if (approved) {
      const request = this.state.pendingRequests[requestIndex];
      request.status = 'approved';
      this.logSystem(`Host approved request for ${request.playerName}. Applying next round.`);
    } else {
      this.state.pendingRequests.splice(requestIndex, 1);
    }
    this.broadcast('room:update', this.state);
  }

  private handleRevealFold({ playerId }: { playerId: string }) {
    const p = this.state.players.find(p => p.id === playerId);
    if (p && p.holeCards) {
      p.isRevealingFold = true;
      this.broadcast('room:update', this.state);
    }
  }

  private checkSimulationTurns() {
    const currentPlayer = this.state.players.find(p => p.id === this.state.currentTurnPlayerId);
    if (currentPlayer && currentPlayer.isAI && this.state.stage !== GameStage.Showdown) {
      this.botAct(currentPlayer);
    }
  }

  private async botAct(bot: Player) {
    if (bot.isFolded || bot.isAllIn || this.state.currentTurnPlayerId !== bot.id) return;
    bot.isThinking = true;
    this.broadcast('room:update', this.state);
    
    const maxB = Math.max(...this.state.players.filter(p => !p.isSpectator).map(p => p.betThisStreet));
    const toC = maxB - bot.betThisStreet;
    const totalPot = this.state.pots.reduce((sum, pot) => sum + pot.amount, 0);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are ${bot.name}, a professional poker bot.
      Hand: ${bot.holeCards?.map(c => c.rank+c.suit).join(', ')}, Board: ${this.state.communityCards.map(c => c.rank+c.suit).join(', ')}, Pot: ${totalPot}, To Call: ${toC}.
      Decision JSON: {"action": "fold"|"call"|"check"|"raise", "raiseTo": number|null}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const d = JSON.parse(response.text || '{}');
      let act = (d.action || 'check').toUpperCase() as PlayerAction;
      let amt = d.raiseTo;
      
      if (act === PlayerAction.Raise && (!amt || amt < this.state.minRaise)) amt = this.state.minRaise;
      if (amt && amt > bot.chips + bot.betThisStreet) amt = bot.chips + bot.betThisStreet;

      this.handleAction({ playerId: bot.id, action: act, amount: amt });
    } catch (e) {
      this.handleAction({ playerId: bot.id, action: toC === 0 ? PlayerAction.Check : PlayerAction.Fold });
    }
  }

  handleTimeout(playerId: string) {
    if (this.state.currentTurnPlayerId !== playerId) return;
    const p = this.state.players.find(p => p.id === playerId)!;
    const maxB = Math.max(...this.state.players.filter(p => !p.isSpectator).map(p => p.betThisStreet));
    const toC = maxB - p.betThisStreet;
    this.handleAction({ playerId, action: toC === 0 ? PlayerAction.Check : PlayerAction.Fold });
  }

  handleMuckTimeout() {
    if (this.state.muckChoicePlayerId && this.state.muckChoicePlayerId !== 'REVEALING') {
        this.handleMuckChoice({ playerId: this.state.muckChoicePlayerId, show: false });
    }
  }
}

const server = new MockServer();

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem('ptm_id') || 'p_' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem('ptm_id', id);
    setMyId(id);
    server.on('room:update', (s: GameState) => setGameState({ ...s }));
  }, []);

  useEffect(() => {
    if (!gameState) return;
    const interval = setInterval(() => {
      if (gameState.currentTurnPlayerId && gameState.stage !== GameStage.Showdown && gameState.stage !== GameStage.Lobby) {
        const elapsed = (Date.now() - (gameState.actionStartTime || 0)) / 1000;
        if (elapsed >= gameState.settings.actionTimerSeconds) {
            server.handleTimeout(gameState.currentTurnPlayerId!);
        }
      }
      if (gameState.muckChoicePlayerId && gameState.muckChoicePlayerId !== 'REVEALING') {
        const elapsedMuck = (Date.now() - (gameState.muckChoiceStartTime || 0)) / 1000;
        if (elapsedMuck >= 5) {
            server.handleMuckTimeout();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const onJoinRoom = (name: string, isSpectator: boolean) => {
    server.emit('room:join', { name, playerId: myId, isSpectator });
    setIsJoined(true);
  };

  if (!isJoined) return <Home onJoin={onJoinRoom} />;
  if (!gameState) return null;

  const currentUserName = gameState.players.find(p => p.id === myId)?.name || '';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0B0C]">
      {gameState.stage === GameStage.Lobby ? (
        <Lobby 
          gameState={gameState} 
          myId={myId} 
          onReady={() => server.emit('player:ready', myId)} 
          onStart={() => server.emit('game:start', {})} 
          onSettingsUpdate={(settings) => server.emit('settings:update', settings)}
          onChat={(text) => server.emit('chat:message', { senderId: myId, senderName: currentUserName, text })} 
          onDevAddFake={() => server.emit('dev:fill-ais', {})} 
          onDevToggleReady={(id) => server.emit('dev:toggle-ready', id)} 
        />
      ) : (
        <PokerTable 
          gameState={gameState} 
          myId={myId} 
          onAction={(action, amount) => server.emit('action:submit', { playerId: myId, action, amount })} 
          onMuck={(show) => server.emit('action:muck', { playerId: myId, show })} 
          onChat={(text) => server.emit('chat:message', { senderId: myId, senderName: currentUserName, text })} 
          onDevBackToLobby={() => server.emit('dev:reset', {})} 
          onRevealFold={() => server.emit('player:reveal-fold', { playerId: myId })}
          onFinancialRequest={(type, amount) => server.emit('financial:request', { playerId: myId, type, amount })}
          onResolveRequest={(requestId, approved) => server.emit('financial:resolve', { requestId, approved })}
        />
      )}
    </div>
  );
}
