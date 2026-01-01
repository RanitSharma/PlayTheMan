
import React, { useState } from 'react';
import { GameState, RoomSettings, FinancialRequestType } from '../types';

interface Props {
  gameState: GameState;
  myId: string;
  onReady: () => void;
  onStart: () => void;
  onSettingsUpdate: (settings: Partial<RoomSettings>) => void;
  onChat: (t: string) => void;
  onDevAddFake: () => void;
  onDevToggleReady: (id: string) => void;
  onFinancialRequest: (type: FinancialRequestType, amount: number) => void;
  onResolveRequest: (requestId: string, approved: boolean) => void;
}

const Lobby: React.FC<Props> = ({ 
  gameState, 
  myId, 
  onReady, 
  onStart, 
  onSettingsUpdate,
  onDevAddFake,
  onFinancialRequest,
  onResolveRequest
}) => {
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTab, setBankTab] = useState<'request' | 'management'>('request');
  const [bankAmount, setBankAmount] = useState<number | undefined>(undefined);

  const [inputState, setInputState] = useState({
    smallBlind: gameState.settings.smallBlind > 0 ? gameState.settings.smallBlind.toString() : '',
    bigBlind: gameState.settings.bigBlind > 0 ? gameState.settings.bigBlind.toString() : '',
    startingStack: gameState.settings.startingStack > 0 ? gameState.settings.startingStack.toString() : ''
  });

  const myPlayer = gameState.players.find(p => p.id === myId);
  const seated = [...gameState.players].sort((a, b) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof RoomSettings) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setInputState(prev => ({ ...prev, [key]: val }));
      const numericVal = parseFloat(val);
      onSettingsUpdate({ [key]: isNaN(numericVal) ? 0 : numericVal });
    }
  };

  const handleBlur = (key: keyof RoomSettings) => {
    const currentVal = inputState[key as keyof typeof inputState];
    if (currentVal !== '') {
      const numeric = parseFloat(currentVal);
      if (!isNaN(numeric)) {
        setInputState(prev => ({ ...prev, [key]: numeric.toFixed(2) }));
      }
    }
  };

  const pendingCount = gameState.pendingRequests.length;
  const inputBaseClasses = "bg-[#0B0B0C] border border-white/5 focus:border-[#C9A24D]/30 font-black text-2xl tracking-tighter h-16 rounded-2xl outline-none transition-all w-full text-center placeholder:text-[#404040]";

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-10 bg-[#0B0B0C] items-center justify-center animate-in fade-in duration-700">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr,0.85fr] gap-8 items-start">
        
        <div className="bg-[#141416]/60 p-8 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col h-[550px] lg:h-[650px] relative overflow-hidden">
          <div className="flex justify-between items-start mb-10 shrink-0">
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
                <div className="flex items-center gap-4">
                  <span className="text-[14px] font-black text-[#C9A24D] tracking-tighter">${p.chips.toFixed(2)}</span>
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${p.isReady ? 'text-[#C9A24D]' : 'text-[#505050]'}`}>
                    {p.isReady ? 'READY' : 'WAITING'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-4 shrink-0">
            <button 
              onClick={() => { setShowBankModal(true); setBankTab(isHost ? 'management' : 'request'); }}
              className="w-full relative text-[10px] font-black text-[#C9A24D] uppercase tracking-[0.4em] transition-all bg-[#1C1C1F] border border-[#C9A24D]/20 hover:border-[#C9A24D]/60 py-4 rounded-xl active:scale-[0.98] shadow-lg"
            >
              Access Banker's Desk
              {isHost && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-lg animate-bounce">
                  {pendingCount}
                </span>
              )}
            </button>
            {isHost && seated.length < 10 && (
              <button 
                onClick={onDevAddFake}
                className="w-full text-[10px] font-black text-[#606060] hover:text-[#EDEDED] uppercase tracking-[0.4em] transition-all bg-transparent border border-white/5 hover:border-white/10 py-4 rounded-xl active:scale-[0.98]"
              >
                FILL TABLE WITH AIS
              </button>
            )}
          </div>
        </div>

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
                        type="text" 
                        inputMode="decimal"
                        readOnly={!isHost}
                        value={inputState.smallBlind} 
                        onChange={(e) => handleInputChange(e, 'smallBlind')} 
                        onBlur={() => handleBlur('smallBlind')}
                        placeholder="0.00" 
                        className={`${inputBaseClasses} text-[#EDEDED]`} 
                      />
                   </div>
                   <div className="flex flex-col gap-4">
                      <label className="text-[11px] font-black text-[#606060] uppercase tracking-[0.4em] text-center">BIG BLIND</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        readOnly={!isHost}
                        value={inputState.bigBlind} 
                        onChange={(e) => handleInputChange(e, 'bigBlind')} 
                        onBlur={() => handleBlur('bigBlind')}
                        placeholder="0.00" 
                        className={`${inputBaseClasses} text-[#EDEDED]`} 
                      />
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                   <label className="text-[11px] font-black text-[#606060] uppercase tracking-[0.4em] text-center">STARTING STACK</label>
                   <div className="relative">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        readOnly={!isHost}
                        value={inputState.startingStack} 
                        onChange={(e) => handleInputChange(e, 'startingStack')} 
                        onBlur={() => handleBlur('startingStack')}
                        placeholder="0.00" 
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

      {showBankModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-[#141416] border border-[#C9A24D]/30 w-full max-w-lg rounded-[2.5rem] p-8 shadow-[0_50px_150px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden max-h-[85vh]">
              <button onClick={() => setShowBankModal(false)} className="absolute top-6 right-8 text-[#606060] hover:text-[#C9A24D] text-3xl font-black z-50">×</button>
              
              <div className="flex flex-col items-center mb-6 shrink-0">
                 <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">Banker's Desk</h2>
                 <p className="text-[10px] font-black text-[#C9A24D] uppercase tracking-[0.4em] opacity-80">Settlement & Audit</p>
              </div>

              {isHost && (
                <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-2xl shrink-0">
                  <button 
                    onClick={() => setBankTab('management')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bankTab === 'management' ? 'bg-[#C9A24D] text-black shadow-lg' : 'text-[#606060] hover:text-white'}`}
                  >
                    Management ({pendingCount})
                  </button>
                  <button 
                    onClick={() => setBankTab('request')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bankTab === 'request' ? 'bg-[#C9A24D] text-black shadow-lg' : 'text-[#606060] hover:text-white'}`}
                  >
                    My Requests
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {bankTab === 'request' ? (
                  <div className="space-y-8 py-2">
                    <div className="bg-[#0B0B0C] border border-white/5 p-6 rounded-3xl text-center">
                      <div className="text-[10px] font-black text-[#404040] uppercase tracking-[0.4em] mb-2">Current Wallet</div>
                      <div className="text-3xl font-black text-white tracking-tighter">${myPlayer?.chips.toFixed(2)}</div>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                          <input 
                            type="number" 
                            step="0.01"
                            value={bankAmount ?? ''} 
                            placeholder="0.00"
                            onChange={(e) => setBankAmount(parseFloat(e.target.value) || undefined)} 
                            className="w-full bg-[#0B0B0C] border-2 border-[#C9A24D]/20 rounded-2xl px-10 py-6 text-[#C9A24D] font-black text-3xl outline-none focus:border-[#C9A24D] text-center shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#C9A24D] opacity-30 font-black text-xl">$</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          disabled={!bankAmount || bankAmount <= 0} 
                          onClick={() => { if(bankAmount) { onFinancialRequest(FinancialRequestType.BuyIn, bankAmount); setShowBankModal(false); } }} 
                          className="bg-gradient-to-b from-[#C9A24D] to-[#B8923D] hover:from-[#D4B063] hover:to-[#C9A24D] text-black py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg transition-all disabled:opacity-20 active:scale-95"
                        >
                          Request Buy-In
                        </button>
                        <button 
                          disabled={!bankAmount || bankAmount <= 0 || (myPlayer?.chips || 0) < bankAmount} 
                          onClick={() => { if(bankAmount) { onFinancialRequest(FinancialRequestType.BuyOut, bankAmount); setShowBankModal(false); } }} 
                          className="bg-[#1C1C1F] border border-[#C9A24D]/30 text-[#C9A24D] hover:bg-[#C9A24D]/10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg transition-all disabled:opacity-20 active:scale-95"
                        >
                          Request Cash-out
                        </button>
                      </div>
                      <p className="text-center text-[9px] font-black text-[#404040] uppercase tracking-widest leading-loose pt-2 px-8">
                        Decisions are pending host approval.<br/>Changes applied next round.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    {gameState.pendingRequests.length > 0 ? gameState.pendingRequests.map(req => (
                      <div key={req.id} className="bg-[#0B0B0C] border border-white/5 p-5 rounded-3xl flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-[#EDEDED] uppercase tracking-wider">{req.playerName}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${req.type === FinancialRequestType.BuyIn ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}>
                              {req.type === FinancialRequestType.BuyIn ? 'Buy-In' : 'Cash-out'}
                            </span>
                            <span className="text-[14px] font-black text-[#C9A24D]">${req.amount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {req.status === 'pending' ? (
                            <>
                              <button 
                                onClick={() => onResolveRequest(req.id, false)}
                                className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-90"
                                title="Deny"
                              >
                                ×
                              </button>
                              <button 
                                onClick={() => onResolveRequest(req.id, true)}
                                className="w-10 h-10 rounded-xl bg-[#C9A24D]/10 border border-[#C9A24D]/30 text-[#C9A24D] flex items-center justify-center hover:bg-[#C9A24D] hover:text-black transition-all active:scale-90"
                                title="Approve"
                              >
                                ✓
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-end pr-2">
                              <span className="text-[9px] font-black text-[#C9A24D] uppercase tracking-widest animate-pulse">Approved</span>
                              <span className="text-[7px] font-black text-[#404040] uppercase tracking-tighter">Pending Next Round</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="h-64 flex flex-col items-center justify-center gap-4 text-center opacity-30">
                        <div className="text-4xl">📭</div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">No Pending Applications</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
