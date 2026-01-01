
import React from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card: CardType;
  compact?: boolean;
  isBoard?: boolean;
  isMinimal?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, compact, isBoard, isMinimal }) => {
  const suitIcon = { [Suit.Spades]: '♠', [Suit.Hearts]: '♥', [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣' }[card.suit];
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  
  // In the reference image for board cards, black suits are rendered in Gold.
  // For the minimal variant, we keep standard red for hearts/diamonds and gold for spades/clubs.
  const suitColorClass = isRed ? 'text-[#E31C23]' : 'text-[#C9A24D]';
  
  if (isMinimal) {
    return (
      <div className="w-full h-full bg-[#0B0B0C] rounded-lg flex flex-col items-center justify-center font-black border border-[#C9A24D]/20 shadow-md relative overflow-hidden p-1">
        <div className="flex-1 flex items-center justify-center pt-1">
          <span className="text-white text-[13px] sm:text-[15px] font-bold leading-none">
            {card.rank}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center pb-1">
          <span className={`${suitColorClass} text-[10px] sm:text-[12px] leading-none`}>
            {suitIcon}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-[#0B0B0C] rounded-xl flex flex-col items-center justify-center font-black border border-[#C9A24D]/40 shadow-xl relative overflow-hidden ${compact ? 'p-1' : 'p-4 sm:p-6'}`}>
      
      {/* Subtle Texture & Inner Border Layer */}
      <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
      <div className={`absolute ${compact ? 'inset-[3px]' : 'inset-[6px]'} border border-[#C9A24D]/20 rounded-lg pointer-events-none`} />

      {/* Main Rank (Top Left) - Large Gold Serif */}
      <div className={`absolute ${compact ? 'top-1.5 left-2' : 'top-5 left-6'} flex flex-col items-center leading-none z-20`}>
        <span className={`
          ${compact ? 'text-[22px] sm:text-[24px]' : 'text-5xl sm:text-7xl'} 
          text-[#C9A24D] font-serif font-bold tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
        `}>
          {card.rank}
        </span>
      </div>

      {/* Massive Central Suit Icon - High visibility */}
      <div className={`
        relative z-10 flex items-center justify-center transition-transform duration-500
        ${compact ? (isBoard ? 'scale-125 translate-y-2' : 'scale-110 translate-y-1.5') : 'scale-110 sm:scale-130 translate-y-2'}
      `}>
        <span className={`
          ${suitColorClass} 
          ${compact ? (isBoard ? 'text-7xl' : 'text-6xl') : 'text-9xl sm:text-[11rem]'} 
          leading-none select-none
        `}>
          {suitIcon}
        </span>
      </div>

      {/* Small Inverted Rank (Bottom Right) - As seen in the reference image */}
      <div className={`absolute ${compact ? 'bottom-2 right-2' : 'bottom-6 right-8'} rotate-180 flex flex-col items-center leading-none z-20 opacity-40`}>
        <span className={`
          ${compact ? 'text-[12px]' : 'text-xl'} 
          text-[#C9A24D] font-serif font-bold tracking-tighter
        `}>
          {card.rank}
        </span>
      </div>
    </div>
  );
};

export default Card;
