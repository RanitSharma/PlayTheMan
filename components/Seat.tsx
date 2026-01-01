
import React from 'react';
import { Player, GameStage } from '../types';
import Card from './Card';

interface Props {
  player: Player;
  isTurn: boolean;
  isDealer: boolean;
  isMe: boolean;
  stage: GameStage;
  isCompact?: boolean;
  muckChoicePlayerId?: string | null;
  lastActionPlayerId?: string | null;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

const Seat: React.FC<Props> = ({ 
  player, isTurn, isDealer, isMe, stage, isCompact, 
  muckChoicePlayerId, lastActionPlayerId, isHighlighted, isDimmed 
}) => {
  const isShowdown = stage === GameStage.Showdown;
  const shouldReveal = isMe || (isShowdown && !player.isFolded) || !!player.isRevealingFold;
  
  const isWinner = player.isWinner;
  const isLoser = isShowdown && !player.isFolded && !isWinner;
  const isBust = player.chips <= 0 && !player.holeCards;

  const showActionBadge = player.id === lastActionPlayerId && player.lastAction;

  const cardWidth = isCompact ? 'w-18 sm:w-20' : 'w-24';
  const cardHeight = isCompact ? 'h-24 sm:h-28' : 'h-32';
  const plateWidth = isCompact ? 'w-32 sm:w-36' : 'w-40';

  const revealFoldClasses = player.isRevealingFold && player.isFolded 
    ? 'grayscale-[0.3] opacity-90' 
    : '';

  const cardClasses = `${cardWidth} ${cardHeight} rounded-xl shadow-2xl overflow-hidden transition-all duration-500 transform ${isTurn ? 'scale-110 -translate-y-2' : 'scale-100'} ${isWinner || isHighlighted ? 'ring-2 ring-[#C9A24D] shadow-[0_0_30px_rgba(201,162,77,0.6)]' : 'border border-[#C9A24D]/20'} ${revealFoldClasses}`;

  const baseOpacity = (player.isFolded && !player.isRevealingFold) || isBust 
    ? 'opacity-30 grayscale-[0.8]' 
    : isDimmed 
      ? 'opacity-20 grayscale-[0.4]' 
      : 'opacity-100';

  return (
    <div className={`flex flex-col items-center gap-3 sm:gap-4 transition-all duration-500 ${baseOpacity} ${isLoser && !player.isRevealingFold ? 'opacity-30' : ''}`}>
      
      <div className={`flex gap-1.5 ${cardHeight} items-center justify-center relative z-10`}>
        {player.holeCards ? (
          player.holeCards.map((c, i) => (
            <div 
              key={i} 
              className={cardClasses} 
              style={{ 
                zIndex: i,
                transform: `rotate(${i === 0 ? -6 : 6}deg)`,
                boxShadow: player.isRevealingFold && player.isFolded ? '0 0 20px rgba(201,162,77,0.2)' : undefined
              }}
            >
              {shouldReveal ? <Card card={c} compact /> : (
                <div className="w-full h-full bg-[#111111] border border-[#C9A24D]/30 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(201,162,77,0.03)_6px,rgba(201,162,77,0.03)_12px)] opacity-50" />
                  <div className="flex flex-col items-center justify-center rotate-45 border border-[#C9A24D]/20 p-2">
                    <span className={`${isCompact ? 'text-[7px]' : 'text-[9px]'} font-black text-[#C9A24D] tracking-[0.4em] uppercase`}>PTM</span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex gap-1 opacity-20">
            <div className={`${cardClasses} bg-[#111111] border border-[#C9A24D]/10`} />
            <div className={`${cardClasses} bg-[#111111] border border-[#C9A24D]/10`} />
          </div>
        )}
      </div>

      <div className={`
        relative ${plateWidth} bg-[#141416] p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border-2 flex flex-col items-center shadow-xl transition-all duration-500
        ${(isTurn || isHighlighted) && !isBust ? 'active-turn scale-105 border-[#C9A24D]' : isWinner ? 'border-[#C9A24D] shadow-[0_0_40px_rgba(201,162,77,0.4)]' : 'border-white/5'}
        ${player.isRevealingFold && player.isFolded ? 'border-[#C9A24D]/40' : ''}
      `}>
        
        {player.role && !isBust && (
          <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-9 sm:h-9 bg-[#C9A24D] text-black font-black text-[9px] sm:text-[11px] rounded-full flex items-center justify-center shadow-lg border-2 border-[#141416] z-50">
            {player.role}
          </div>
        )}

        {player.isAllIn && !isBust && (
          <div className="absolute -top-3 -left-3 px-2 py-1 bg-red-600 text-white font-black text-[7px] sm:text-[8px] rounded-md flex items-center justify-center shadow-lg border-2 border-[#141416] z-50 animate-pulse tracking-tighter">
            ALL-IN
          </div>
        )}

        {player.isSittingOut && !isBust && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 border border-white/10 text-[#C9A24D] font-black text-[7px] rounded-md flex items-center justify-center shadow-lg z-50 tracking-tighter">
            SITTING OUT
          </div>
        )}

        <span className={`${isCompact ? 'text-[10px]' : 'text-[12px]'} font-black uppercase tracking-wider truncate w-full text-center text-[#808080]`}>
          {player.name}
        </span>
        
        <span className={`${isCompact ? 'text-[13px]' : 'text-[15px]'} font-black text-[#C9A24D] tracking-tighter mt-1.5`}>
          {isBust ? 'OUT' : `$${player.chips.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
        </span>

        {player.isThinking && !isBust && (
          <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
            <span className="w-1.5 h-1.5 bg-[#C9A24D] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-[#C9A24D] rounded-full animate-bounce [animation-delay:-0.15s]" />
          </div>
        )}
        
        {(player.handDescription && (isShowdown || player.isRevealingFold) && !player.isFolded) && (
          <div className="mt-2 text-[8px] sm:text-[9px] font-black text-[#EDEDED] uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg border border-[#C9A24D]/20 text-center leading-tight">
            {player.handDescription}
          </div>
        )}

        <div className="absolute -bottom-6 sm:-bottom-7 flex items-center justify-center w-full">
           {showActionBadge ? (
              <div className="bg-[#C9A24D] text-black text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-2xl animate-in slide-in-from-bottom-2 whitespace-nowrap">
                {player.lastAction!.type} {player.lastAction!.amount ? `$${player.lastAction!.amount.toFixed(2)}` : ''}
              </div>
           ) : player.betThisStreet > 0 && !player.isFolded ? (
             <div className="text-[9px] sm:text-[11px] font-black text-[#C9A24D] uppercase tracking-widest bg-[#1C1C1F] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-[#C9A24D]/30 shadow-xl">
                ${player.betThisStreet.toFixed(2)}
             </div>
           ) : null}
        </div>
      </div>
    </div>
  );
};

export default Seat;
