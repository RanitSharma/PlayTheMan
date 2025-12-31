
export enum Suit {
  Spades = 's', Hearts = 'h', Diamonds = 'd', Clubs = 'c'
}

export enum Rank {
  Two = '2', Three = '3', Four = '4', Five = '5', Six = '6', Seven = '7',
  Eight = '8', Nine = '9', Ten = '10', Jack = 'J', Queen = 'Q', King = 'K', Ace = 'A'
}

export interface Card {
  rank: Rank;
  suit: Suit;
}

export enum GameStage {
  Lobby = 'LOBBY',
  PreFlop = 'PRE_FLOP',
  Flop = 'FLOP',
  Turn = 'TURN',
  River = 'RIVER',
  Showdown = 'SHOWDOWN'
}

export enum PlayerAction {
  Fold = 'FOLD', Check = 'CHECK', Call = 'CALL', Raise = 'RAISE', AllIn = 'ALL_IN', Bet = 'BET'
}

export enum FinancialRequestType {
  BuyIn = 'BUY_IN',
  BuyOut = 'BUY_OUT'
}

export interface FinancialRequest {
  id: string;
  playerId: string;
  playerName: string;
  type: FinancialRequestType;
  amount: number;
  timestamp: number;
  status: 'pending' | 'approved';
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  totalBuyIn: number;
  totalBuyOut: number;
  betThisRound: number;
  betThisStreet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isReady: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  isAI?: boolean;
  seatIndex: number;
  hasActedThisStreet: boolean;
  holeCards?: Card[];
  handDescription?: string;
  isThinking?: boolean;
  isWinner?: boolean;
  isRevealingFold?: boolean;
  isSittingOut?: boolean;
  role?: 'D' | 'SB' | 'BB';
  lastAction?: {
    type: PlayerAction | string;
    amount?: number;
    timestamp: number;
  };
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionTimerSeconds: number;
}

export interface WinnerPopup {
  winnerName: string;
  amount: number;
  reason: string;
}

export interface GameState {
  roomId: string;
  hostId: string | null;
  stage: GameStage;
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  currentTurnPlayerId: string | null;
  lastActionPlayerId?: string | null;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  minRaise: number;
  lastRaiseAmount: number;
  actionStartTime: number | null;
  chatHistory: ChatMessage[];
  settings: RoomSettings;
  winnerPopup?: WinnerPopup | null;
  muckChoicePlayerId?: string | null;
  muckChoiceStartTime?: number | null;
  lastStreetAction?: string;
  pendingRequests: FinancialRequest[];
}
