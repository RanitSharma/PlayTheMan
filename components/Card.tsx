import React from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card: CardType;
  compact?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, compact }) => {
  const suitIcon = { [Suit.Spades]: '♠', [Suit.Hearts]: '♥', [Suit.Diamonds]: '♦', [Suit.Clubs]: '♣' }[card.suit];
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  
  return (
    <div className={`w-full h-full bg-[#0B0B0C] rounded-xl flex flex-col items-center justify-center font-black border border-[#C9A24D]/60 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden ${compact ? 'p-1.5' : 'p-4 sm:p-6'}`}>
      
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
      <div className="absolute inset-[3px] border border-[#C9A24D]/20 rounded-lg pointer-events-none" />

      <div className="absolute top-3 left-3 flex flex-col items-center leading-none z-10">
        <span className={`${compact ? 'text-lg' : 'text-3xl sm:text-4xl'} text-[#C9A24D] font-serif tracking-tighter mb-0.5`}>
          {card.rank}
        </span>
      </div>

      <div className={`relative z-10 flex items-center justify-center transition-transform duration-500 ${compact ? 'scale-100' : 'scale-125 sm:scale-150'}`}>
        <span className={`
          ${isRed ? 'text-red-600' : 'text-[#C9A24D]'} 
          ${compact ? 'text-4xl' : 'text-7xl sm:text-8xl'} 
          drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] leading-none
        `}>
          {suitIcon}
        </span>
      </div>

      <div className="absolute bottom-3 right-3 rotate-180 flex flex-col items-center leading-none z-10 opacity-40">
        <span className={`${compact ? 'text-xs' : 'text-xl'} text-[#C9A24D] font-serif`}>
          {card.rank}
        </span>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 text-center opacity-[0.05] pointer-events-none">
        <span className="text-[6px] font-black text-[#C9A24D] tracking-[1em] uppercase">Premium</span>
      </div>
    </div>
  );
};

export default Card;