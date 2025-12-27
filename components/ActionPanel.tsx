
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
  const totalPot = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
  
  const [raiseAmount, setRaiseAmount] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRaiseAmount(isNaN(val) ? null : val);
  };

  const getClampedRaise = () => {
    const val = raiseAmount ?? gameState.minRaise;
    return Math.min(maxPossible, Math.max(gameState.minRaise, val));
  };

  const clampedValue = getClampedRaise();

  const potBetSizes = [
    { label: '½ POT', multiplier: 0.5 },
    { label: 'POT', multiplier: 1.0 },
    { label: '2X POT', multiplier: 2.0 },
    { label: 'ALL-IN', multiplier: -1 },
  ];

  const handlePotAction = (mult: number) => {
    if (mult === -1) {
      setRaiseAmount(maxPossible);
      return;
    }
    const calculated = totalPot * mult;
    const finalAmount = Math.min(maxPossible, Math.max(gameState.minRaise, calculated + maxStreetBet));
    setRaiseAmount(finalAmount);
  };

  return (
    <div className="bg-[#1C1C1F]/95 backdrop-blur-3xl p-6 rounded-[2.5rem] border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col gap-6 w-[500px] animate-in fade-in slide-in-from-right-8 duration-500 shrink-0">
      <div className="flex flex-row gap-5">
        <div className="flex flex-col gap-3 w-36 shrink-0">
          <button 
            onClick={() => onAction(PlayerAction.Fold)} 
            className="h-14 bg-[#141416] hover:bg-red-950/40 text-[#606060] hover:text-red-500 font-black uppercase tracking-[0.3em] text-[11px] border border-white/5 rounded-2xl transition-all active:scale-95"
          >
            FOLD
          </button>
          
          {canCheck ? (
            <button 
              onClick={() => onAction(PlayerAction.Check)} 
              className="h-14 bg-[#141416] hover:bg-white/5 text-[#EDEDED] font-black uppercase tracking-[0.3em] text-[11px] border border-white/10 rounded-2xl transition-all active:scale-95"
            >
              CHECK
            </button>
          ) : (
            <button 
              onClick={() => onAction(PlayerAction.Call)} 
              disabled={myPlayer.chips === 0} 
              className="h-14 bg-[#1C1C1F] hover:bg-[#C9A24D]/10 text-[#C9A24D] font-black uppercase tracking-widest border border-[#C9A24D]/50 rounded-2xl transition-all flex flex-col items-center justify-center disabled:opacity-30 active:scale-95 group"
            >
              <span className="leading-none text-[8px] opacity-60 group-hover:opacity-100 transition-opacity tracking-widest">CALL</span>
              <span className="text-[13px] font-black text-white tracking-normal mt-1">${Math.min(toCall, myPlayer.chips).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </button>
          )}
        </div>

        <div className="flex-1 relative">
          <input 
            type="number"
            step="any"
            value={raiseAmount ?? ''}
            onChange={handleInputChange}
            onBlur={() => { if(raiseAmount !== null) setRaiseAmount(clampedValue); }}
            className="w-full h-full bg-[#0B0B0C] border border-[#C9A24D]/30 rounded-[1.8rem] px-10 py-3 text-[#C9A24D] font-black text-4xl outline-none focus:border-[#C9A24D] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner placeholder:text-[#252528]"
            placeholder="0.00"
          />
          <div className="absolute left-8 top-1/2 -translate-y-1/2 text-[#C9A24D]/30 font-black text-2xl">$</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {potBetSizes.map(p => (
          <button 
            key={p.label}
            onClick={() => handlePotAction(p.multiplier)} 
            className={`py-4 flex items-center justify-center border-2 text-[12px] font-black rounded-xl transition-all leading-none text-center uppercase tracking-widest
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
        disabled={myPlayer.chips === 0 || (raiseAmount !== null && raiseAmount < gameState.minRaise)} 
        className="w-full h-20 bg-gradient-to-b from-[#C9A24D] to-[#B8923D] hover:from-[#D4B063] hover:to-[#C9A24D] text-[#000] font-black uppercase tracking-[0.4em] text-[14px] rounded-[1.5rem] transition-all shadow-[0_15px_50px_rgba(201,162,77,0.3)] disabled:opacity-20 active:scale-95 flex flex-row items-center justify-center gap-4"
      >
        <span className="opacity-70">{canCheck ? 'BET' : 'RAISE'}</span>
        <span className="text-4xl font-black text-black tracking-tighter">
          ${clampedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </button>

    </div>
  );
};

export default ActionPanel;
