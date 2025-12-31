
import React, { useState, useEffect } from 'react';
import { Player, GameState, PlayerAction } from '../types';

interface Props {
  myPlayer: Player;
  gameState: GameState;
  onAction: (action: PlayerAction, amount?: number) => void;
}

const ActionPanel: React.FC<Props> = ({ myPlayer, gameState, onAction }) => {
  const maxStreetBet = Math.max(...gameState.players.filter(p => !p.isSpectator).map(p => p.betThisStreet));
  const toCall = maxStreetBet - myPlayer.betThisStreet;
  const canCheck = toCall === 0;
  const maxPossible = myPlayer.chips + myPlayer.betThisStreet;
  
  // The "current pot" for betting purposes should include all chips in pots plus all bets currently on the table
  const currentTotalPot = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0) + 
                         gameState.players.reduce((sum, p) => sum + p.betThisStreet, 0);
  
  // Use string state to allow natural typing and enforce decimal precision
  const [raiseAmount, setRaiseAmount] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Regex: Optional digits, optional decimal point, at most 2 digits after decimal
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setRaiseAmount(val);
    }
  };

  const getClampedRaise = () => {
    const numVal = parseFloat(raiseAmount);
    
    let base: number;
    if (isNaN(numVal)) {
      if (canCheck) {
        // Default for opening if nothing is typed: min raise
        base = gameState.minRaise;
      } else {
        // Default for facing action: +1.5x logic -> (1.5 * maxStreetBet) + maxStreetBet
        base = maxStreetBet * 2.5;
      }
    } else {
      base = numVal;
    }

    // Enforce 2 decimal rounding
    const rounded = Math.round(base * 100) / 100;
    // Ensure it's between legal minimum and player's total stack
    return Math.min(maxPossible, Math.max(gameState.minRaise, rounded));
  };

  const clampedValue = getClampedRaise();

  // Facing a bet: +1.5x, +2x, +3x, ALL-IN
  const facingBetIncrements = [
    { label: '+1.5×', multiplier: 1.5 },
    { label: '+2×', multiplier: 2.0 },
    { label: '+3×', multiplier: 3.0 },
    { label: 'ALL-IN', multiplier: -1 },
  ];

  // Starting the action: 25%, 50%, 75%, POT, ALL-IN
  const startingActionIncrements = [
    { label: '25%', multiplier: 0.25 },
    { label: '50%', multiplier: 0.5 },
    { label: '75%', multiplier: 0.75 },
    { label: 'POT', multiplier: 1.0 },
    { label: 'ALL-IN', multiplier: -1 },
  ];

  const handleIncrementAction = (mult: number) => {
    if (mult === -1) {
      setRaiseAmount(maxPossible.toFixed(2));
      return;
    }

    let calculatedAmount = 0;
    if (canCheck) {
      // 25% is 25% of current pot
      calculatedAmount = currentTotalPot * mult;
    } else {
      // Formula: (multiplier * highBet) + highBet 
      // i.e. "1.5x the call + the call"
      calculatedAmount = (mult * maxStreetBet) + maxStreetBet;
    }

    // Clamp and format to 2 decimals
    const finalAmt = Math.min(maxPossible, Math.max(gameState.minRaise, calculatedAmount));
    setRaiseAmount(finalAmt.toFixed(2));
  };

  const activeIncrements = canCheck ? startingActionIncrements : facingBetIncrements;

  return (
    <div className="bg-[#1C1C1F]/95 backdrop-blur-3xl p-5 rounded-[2rem] border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col gap-4 w-[380px] animate-in fade-in slide-in-from-right-8 duration-500 shrink-0">
      <div className="flex flex-row gap-4">
        <div className="flex flex-col gap-2 w-28 shrink-0">
          <button 
            onClick={() => onAction(PlayerAction.Fold)} 
            className="h-11 bg-[#141416] hover:bg-red-950/40 text-[#606060] hover:text-red-500 font-black uppercase tracking-[0.2em] text-[10px] border border-white/5 rounded-xl transition-all active:scale-95"
          >
            FOLD
          </button>
          
          {canCheck ? (
            <button 
              onClick={() => onAction(PlayerAction.Check)} 
              className="h-11 bg-[#141416] hover:bg-white/5 text-[#EDEDED] font-black uppercase tracking-[0.2em] text-[10px] border border-white/10 rounded-xl transition-all active:scale-95"
            >
              CHECK
            </button>
          ) : (
            <button 
              onClick={() => onAction(PlayerAction.Call)} 
              disabled={myPlayer.chips === 0} 
              className="h-11 bg-[#1C1C1F] hover:bg-[#C9A24D]/10 text-[#C9A24D] font-black uppercase tracking-widest border border-[#C9A24D]/50 rounded-xl transition-all flex flex-col items-center justify-center disabled:opacity-30 active:scale-95 group"
            >
              <span className="leading-none text-[9px] font-black transition-opacity tracking-widest uppercase">
                CALL ${toCall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </button>
          )}
        </div>

        <div className="flex-1 relative">
          <input 
            type="text"
            inputMode="decimal"
            value={raiseAmount}
            onChange={handleInputChange}
            onBlur={() => { 
              if(raiseAmount !== '') {
                const num = parseFloat(raiseAmount);
                if(!isNaN(num)) {
                   setRaiseAmount(num.toFixed(2));
                }
              }
            }}
            className="w-full h-full bg-[#0B0B0C] border border-[#C9A24D]/30 rounded-[1.2rem] px-8 py-2 text-[#C9A24D] font-black text-2xl outline-none focus:border-[#C9A24D] transition-all text-center shadow-inner placeholder:text-[#252528]"
            placeholder="0.00"
          />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#C9A24D]/30 font-black text-xl">$</div>
        </div>
      </div>

      <div className={`grid ${canCheck ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5`}>
        {activeIncrements.map(p => (
          <button 
            key={p.label}
            onClick={() => handleIncrementAction(p.multiplier)} 
            className={`py-2.5 flex items-center justify-center border-2 text-[9px] font-black rounded-lg transition-all leading-none text-center uppercase tracking-widest
              ${p.label === 'ALL-IN' 
                ? 'bg-red-950/20 border-red-900/40 text-red-600 hover:text-red-500 hover:border-red-500/60 shadow-[0_5px_15px_rgba(239,68,68,0.1)]' 
                : 'bg-[#141416] border-white/5 text-[#808080] hover:text-[#C9A24D] hover:border-[#C9A24D]/40 shadow-md'}
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button 
        onClick={() => onAction(canCheck ? PlayerAction.Bet : PlayerAction.Raise, clampedValue)} 
        disabled={myPlayer.chips === 0 || (raiseAmount !== '' && parseFloat(raiseAmount) < gameState.minRaise)} 
        className="w-full h-16 bg-gradient-to-b from-[#C9A24D] to-[#B8923D] hover:from-[#D4B063] hover:to-[#C9A24D] text-[#000] font-black uppercase tracking-[0.3em] text-[12px] rounded-[1.2rem] transition-all shadow-[0_15px_40px_rgba(201,162,77,0.3)] disabled:opacity-20 active:scale-95 flex flex-row items-center justify-center gap-3"
      >
        <span className="opacity-70">{canCheck ? 'BET' : 'RAISE'}</span>
        <span className="text-2xl font-black text-black tracking-tighter">
          ${clampedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </button>

    </div>
  );
};

export default ActionPanel;
