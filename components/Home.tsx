
import React, { useState } from 'react';
import { Logo } from './Logo';

interface HomeProps {
  onJoin: (name: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onJoin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length >= 2 && trimmedName.length <= 12) {
      onJoin(trimmedName);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0B0C] relative">
      <div className="w-full max-w-md bg-[#141416] p-10 sm:p-14 rounded-[3.5rem] border border-[#C9A24D]/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] text-center relative z-10 overflow-hidden">
        
        <div className="flex flex-col items-center mb-14">
          <Logo />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input 
              autoFocus 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your name" 
              minLength={2}
              maxLength={12}
              className="w-full bg-[#0B0B0C] border-2 border-[#C9A24D]/20 px-6 py-3.5 rounded-2xl outline-none focus:border-[#C9A24D] text-[#C9A24D] text-center font-black tracking-tight placeholder:text-[#C9A24D]/20 transition-all text-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:shadow-[0_0_40px_rgba(201,162,77,0.15)]" 
              required 
            />
            <div className="mt-2 text-[10px] font-black text-[#606060] uppercase tracking-widest">
              2-12 characters
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-gradient-to-b from-[#C9A24D] to-[#B8923D] hover:from-[#D4B063] hover:to-[#C9A24D] text-[#000] py-3.5 rounded-2xl font-black uppercase tracking-[0.3em] text-[13px] transition-all shadow-[0_20px_40px_rgba(201,162,77,0.25)] active:scale-[0.98]"
          >
            Enter Room
          </button>
        </form>

        <div className="mt-16 space-y-4">
          <p className="text-[#D1D1D1] text-[15px] font-semibold italic leading-relaxed tracking-tight px-4">
            "I don't play the odds, I play the man."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-4 bg-[#C9A24D]/30" />
            <p className="text-[#C9A24D] text-[11px] font-black uppercase tracking-[0.5em] opacity-80">
              Harvey Specter
            </p>
            <div className="h-[1px] w-4 bg-[#C9A24D]/30" />
          </div>
        </div>

        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#C9A24D]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
};
