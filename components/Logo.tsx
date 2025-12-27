import React from 'react';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const iconSize = size === 'lg' ? 'h-16 mb-6' : 'h-12 mb-4';
  
  const icon = (
    <svg viewBox="0 0 100 100" className={`${iconSize} w-auto drop-shadow-sm`}>
      <rect 
        x="15" 
        y="20" 
        width="55" 
        height="75" 
        rx="2" 
        fill="none" 
        stroke="#C9A24D" 
        strokeWidth="3" 
        opacity="0.4"
      />
      <rect 
        x="28" 
        y="10" 
        width="55" 
        height="75" 
        rx="2" 
        fill="none" 
        stroke="#C9A24D" 
        strokeWidth="4" 
      />
      <circle cx="38" cy="20" r="3" fill="#C9A24D" />
    </svg>
  );

  return (
    <div className="flex flex-col items-center select-none animate-in fade-in duration-700">
      {icon}
      <div className="flex flex-col items-center leading-none">
        <span className="text-[#EDEDED] font-black tracking-[0.3em] text-2xl uppercase">PlayTheMan</span>
        <span className="text-[#C9A24D] text-[9px] font-black tracking-[0.5em] uppercase mt-3 opacity-80">Poker is personal</span>
      </div>
    </div>
  );
};