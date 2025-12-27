import React from 'react';
import { GameState, RoomSettings } from '../types';

interface Props {
  gameState: GameState;
  myId: string;
  onReady: () => void;
  onStart: () => void;
  onSettingsUpdate: (settings: Partial<RoomSettings>) => void;
  onChat: (t: string) => void;
  onDevAddFake: () => void;
  onDevToggleReady: (id: string) => void;
}

const Lobby: React.FC<Props> = ({ 
  gameState, 
  myId, 
  onReady, 
  onStart, 
  onSettingsUpdate,
  onDevAddFake
}) => {
  const myPlayer = gameState.players.find(p => p.id === myId);
  const seated = gameState.players.filter(p => !p.isSpectator).sort((a, b) => {
      if (a.id === gameState.hostId) return -1;
      if (b.id === gameState.hostId) return 1;
      return 0;
  });

  const readyCount = seated.filter(p => p.isReady).length;
  const isHost = gameState.hostId === myId;
  const rulesComplete = (gameState.settings.smallBlind || 0) > 0 && 
                        (gameState.settings.bigBlind || 0) > 0 && 
                        (gameState.settings.startingStack || 0) > 0;

  const allReady = seated.length >= 2 && seated.every(p => p.isReady) && rulesComplete;

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof RoomSettings) => {
    const val = parseFloat(e.target.value);
    onSettingsUpdate({ [key]: isNaN(val) ? 0 : val });
  };

  // Removed default text color from base to prevent conflicts
  const inputBaseClasses = "bg-[#0B0B0C] border border-white/5 focus:border-[#C9A24D]/30 font-black text-2xl tracking-tighter h-16 rounded-2xl outline-none transition-all w-full text-center placeholder:text-[#404040] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-10 bg-[#0B0B0C] items-center justify-center animate-in fade-in duration-700">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr,0.85fr] gap-8 items-start">
        
        {/* Left Panel: Players List */}
        <div className="bg-[#141416]/60 p-8 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col min-h-[550px] lg:min-h-[650px] relative overflow-hidden">
          <div className="flex justify-between items-start mb-10">
            <div className="flex gap-4 items-center">
              <svg viewBox="0 0 100 100" className="h-12 w-auto">
                <rect x="15" y="20" width="55" height="75" rx="2" fill="none" stroke="#C9A24D" strokeWidth="3" opacity="0.4" />
                <rect x="28" y="10" width="55" height="75" rx="2" fill="none" stroke="#C9A24D" strokeWidth="4" />
                <circle cx="38" cy="20" r="3" fill="#C9A24D" />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[#EDEDED] font-black tracking-[0.15em] text-2xl uppercase">PLAYTHEMAN</span>
                <span className="text-[#C9A24D] text-[9px] font-black tracking-[0.4em] uppercase opacity-80">POKER IS PERSONAL</span>
              </div>
            </div>
            <span className="text-[11px] font-black text-[#808080] uppercase tracking-[0.4em] mt-1">{seated.length}/10 SEATS</span>
          </div>
          
          <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-4 mb-6">
            {seated.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-5 group border-b border-white/5 last:border-0">
                <div className="flex items-center gap-5">
                  <div className={`w-2 h-2 rounded-full transition-all duration-700 ${p.isReady ? 'bg-[#C9A24D] shadow-[0_0_12px_rgba(201,162,77,0.9)]' : 'bg-[#333]'}`} />
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-[#EDEDED] uppercase tracking-wider">{p.name}</span>
                    <div className="flex gap-2">
                      {p.id === gameState.hostId && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-md border border-[#C9A24D]/30 text-[#C9A24D] bg-[#C9A24D]/5 uppercase">HOST</span>}
                      {p.id === myId && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-md border border-white/10 text-[#606060] uppercase">YOU</span>}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${p.isReady ? 'text-[#C9A24D]' : 'text-[#505050]'}`}>
                  {p.isReady ? 'READY' : 'WAITING'}
                </span>
              </div>
            ))}
          </div>

          {isHost && seated.length < 10 && (
            <div className="flex flex-col pt-4">
              <button 
                onClick={onDevAddFake}
                className="w-full text-[10px] font-black text-[#606060] hover:text-[#C9A24D] uppercase tracking-[0.4em] transition-all bg-transparent border border-white/5 hover:border-[#C9A24D]/30 py-4 rounded-xl active:scale-[0.98]"
              >
                FILL TABLE WITH AIS
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Configurations */}
        <div className="flex flex-col pt-4">
          <div className="mb-8 space-y-2 text-center lg:text-left">
             <h2 className="text-2xl font-black text-[#EDEDED] uppercase tracking-tight">GAME CONFIGURATIONS</h2>
             <p className="text-[#C9A24D] text-[13px] font-black uppercase tracking-[0.25em] opacity-80">
               READ THE TABLE. NOT THE MATH.
             </p>
          </div>

          <div className="bg-[#141416]/40 p-8 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-10">
             <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="flex flex-col gap-4">
                      <label className="text-[11px] font-black text-[#606060] uppercase tracking-[0.4em] text-center">SMALL BLIND</label>
                      <input 
                        type="number" 
                        step="any"
                        readOnly={!isHost}
                        value={gameState.settings.smallBlind === 0 ? '' : gameState.settings.smallBlind} 
                        onChange={(e) => handleSettingChange(e, 'smallBlind')} 
                        placeholder="0" 
                        className={`${inputBaseClasses} text-[#EDEDED]`} 
                      />
                   </div>
                   <div className="flex flex-col gap-4">
                      <label className="text-[11px] font-black text-[#606060] uppercase tracking-[0.4em] text-center">BIG BLIND</label>
                      <input 
                        type="number" 
                        step="any"
                        readOnly={!isHost}
                        value={gameState.settings.bigBlind === 0 ? '' : gameState.settings.bigBlind} 
                        onChange={(e) => handleSettingChange(e, 'bigBlind')} 
                        placeholder="0" 
                        className={`${inputBaseClasses} text-[#EDEDED]`} 
                      />
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                   <label className="text-[11px] font-black text-[#606060] uppercase tracking-[0.4em] text-center">STARTING STACK</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        readOnly={!isHost}
                        value={gameState.settings.startingStack === 0 ? '' : gameState.settings.startingStack} 
                        onChange={(e) => handleSettingChange(e, 'startingStack')} 
                        placeholder="0" 
                        className={`${inputBaseClasses} px-14 text-3xl text-[#C9A24D]`} 
                      />
                      <span className="absolute left-7 top-1/2 -translate-y-1/2 text-2xl font-black text-[#C9A24D] opacity-40">$</span>
                   </div>
                </div>
             </div>
             
             <div className="flex flex-col gap-5 pt-4">
               <button 
                 onClick={onReady} 
                 className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.4em] text-[13px] transition-all duration-300 shadow-2xl ${
                   !rulesComplete 
                    ? 'bg-[#1C1C1F] border border-white/5 text-[#404040] cursor-not-allowed' 
                    : myPlayer?.isReady 
                      ? 'bg-[#C9A24D]/10 border-2 border-[#C9A24D]/40 text-[#C9A24D]' 
                      : 'bg-gradient-to-b from-[#C9A24D] to-[#B8923D] border-none text-[#000] shadow-[0_15px_40px_rgba(201,162,77,0.3)] hover:scale-[1.01] active:scale-95'
                 }`}
                 disabled={!rulesComplete}
               >
                 {myPlayer?.isReady ? 'READY TO PLAY' : rulesComplete ? 'READY UP' : 'INPUT RULES'}
               </button>

               {isHost && (
                 <button 
                   onClick={onStart} 
                   disabled={!allReady} 
                   className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.4em] text-[13px] transition-all duration-300 border-2 ${
                     allReady 
                      ? 'bg-transparent border-[#EDEDED] text-[#EDEDED] hover:bg-white/5 hover:border-[#EDEDED] shadow-[0_10px_30px_rgba(255,255,255,0.05)] active:scale-95' 
                      : 'bg-transparent border-white/10 text-[#404040] cursor-not-allowed'
                   }`}
                 >
                   START ({readyCount}/{seated.length})
                 </button>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;