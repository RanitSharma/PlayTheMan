
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { GameState, PlayerAction, GameStage, Suit, FinancialRequestType, FinancialRequest, Player } from '../types';
import { PokerEngine } from '../poker-engine';
import Seat from './Seat';
import ActionPanel from './ActionPanel';
import Card from './Card';

interface Props {
  gameState: GameState;
  myId: string;
  onAction: (a: PlayerAction, amt?: number) => void;
  onMuck: (show: boolean) => void;
  onChat: (t: string) => void;
  onDevBackToLobby?: () => void;
  onRevealFold?: () => void;
  onFinancialRequest: (type: FinancialRequestType, amount: number) => void;
  onResolveRequest: (requestId: string, approved: boolean) => void;
}

const PokerTable: React.FC<Props> = ({ 
  gameState, myId, onAction, onMuck, onChat, onDevBackToLobby, onRevealFold, 
  onFinancialRequest, onResolveRequest 
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  
  const myPlayer = gameState.players.find(p => p.id === myId);
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  
  const [timeLeft, setTimeLeft] = useState(gameState.settings.actionTimerSeconds);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'ledger'>('chat');
  
  const [isPotExpanded, setIsPotExpanded] = useState(false);
  const [hoveredPotIndex, setHoveredPotIndex] = useState<number | null>(null);

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankAmount, setBankAmount] = useState<number | undefined>(undefined);

  const isHost = gameState.hostId === myId;
  const userChatHistory = gameState.chatHistory.filter(m => !m.isSystem);
  const myRequests = gameState.pendingRequests.filter(r => r.playerId === myId);

  // Detect if user is at the bottom of the chat
  const handleScroll = () => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    const atBottom = scrollHeight - scrollTop <= clientHeight + 10;
    isAtBottomRef.current = atBottom;
  };

  useLayoutEffect(() => {
    if (rightPanelMode === 'chat' && chatRef.current && isAtBottomRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [userChatHistory, rightPanelMode]);

  useEffect(() => {
    if (!gameState.currentTurnPlayerId || gameState.stage === GameStage.Showdown) {
      setTimeLeft(gameState.settings.actionTimerSeconds);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - (gameState.actionStartTime || 0)) / 1000;
      setTimeLeft(Math.max(0, Math.floor(gameState.settings.actionTimerSeconds - elapsed)));
    }, 200);
    return () => clearInterval(interval);
  }, [gameState.currentTurnPlayerId, gameState.actionStartTime, gameState.settings.actionTimerSeconds, gameState.stage]);

  const totalPotValue = gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
  const totalActivePlayers = gameState.players.filter(p => !p.isSpectator).length;
  const isCompact = totalActivePlayers > 6;

  const getSeatPos = (index: number) => {
    const mySeatIndex = myPlayer?.seatIndex ?? 0;
    const relativeIndex = (index - mySeatIndex + 10) % 10;
    const coordinates = [{ x: 50, y: 94 }, { x: 26, y: 90 }, { x: 6, y: 84 }, { x: 6, y: 16 }, { x: 26, y: 10 }, { x: 50, y: 6 }, { x: 74, y: 10 }, { x: 94, y: 16 }, { x: 94, y: 84 }, { x: 74, y: 90 }];
    return { left: `${coordinates[relativeIndex].x}%`, top: `${coordinates[relativeIndex].y}%` };
  };

  const myEvaluation = myPlayer && myPlayer.holeCards ? PokerEngine.getHandStrength(myPlayer.holeCards, gameState.communityCards) : null;

  const displayPots = gameState.pots.reduce((acc, pot) => {
    const sortedEligible = [...pot.eligiblePlayerIds].sort().join(',');
    const existing = acc.find(p => p.eligibleKey === sortedEligible);
    if (existing) {
      existing.amount += pot.amount;
    } else {
      acc.push({
        amount: pot.amount,
        eligiblePlayerIds: pot.eligiblePlayerIds,
        eligibleKey: sortedEligible
      });
    }
    return acc;
  }, [] as any[]);

  const ledgerEntries = gameState.players
    .filter(p => p.totalBuyIn > 0 || p.totalBuyOut > 0 || p.chips > 0)
    .map(p => {
      const assets = p.chips + (p.isFolded ? 0 : p.betThisRound);
      const currentNet = (assets + p.totalBuyOut) - p.totalBuyIn;
      return { ...p, currentNet };
    })
    .sort((a, b) => b.currentNet - a.currentNet);

  const getTimerStyles = () => {
    if (timeLeft <= 5) return "text-[#EF4444] border-red-500/50 animate-pulse";
    if (timeLeft <= 10) return "text-[#C9A24D] border-[#C9A24D]/50";
    return "text-[#606060] border-white/10";
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <div className="flex-1 relative flex flex-col bg-[#0B0B0C] poker-felt overflow-hidden">
        {/* Table UI Header */}
        <div className="w-full flex flex-col items-center pt-6 pb-2 z-[200] pointer-events-none">
           <div 
             className="flex flex-col items-center mb-4 cursor-pointer group relative pointer-events-auto"
             onMouseEnter={() => setIsPotExpanded(true)}
             onMouseLeave={() => {
               setIsPotExpanded(false);
               setHoveredPotIndex(null);
             }}
             onClick={() => setIsPotExpanded(!isPotExpanded)}
           >
              <div className="text-[10px] font-black text-[#C9A24D]/60 uppercase tracking-[0.8em] mb-1">Total Pot</div>
              <div className="text-5xl font-black text-[#C9A24D] tracking-tighter drop-shadow-[0_0_40px_rgba(201,162,77,0.5)] transition-transform group-hover:scale-105 duration-300">
                ${totalPotValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              
              {isPotExpanded && (
                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-64 bg-[#141416]/95 backdrop-blur-3xl border border-[#C9A24D]/30 rounded-[2rem] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] z-[1000] animate-in zoom-in-95 fade-in duration-200">
                  <div className="space-y-4">
                    {displayPots.length > 0 ? displayPots.map((pot, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1 ${hoveredPotIndex === idx ? 'bg-[#C9A24D]/10 border-[#C9A24D]/60' : 'bg-[#0B0B0C] border-white/5'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A24D]">Pot {idx + 1}</span>
                            <span className="text-[14px] font-black text-white">${pot.amount.toFixed(2)}</span>
                          </div>
                        </div>
                    )) : <div className="text-[10px] text-center font-black text-[#404040] uppercase">No active pots</div>}
                  </div>
                </div>
              )}
           </div>

           <div className="flex items-center gap-10 mt-2 pointer-events-auto">
              <div className="flex flex-col items-center"><div className="text-[9px] font-black text-[#404040] uppercase tracking-[0.4em] mb-0.5">Stakes</div><div className="text-[#EDEDED] font-black text-xs tracking-widest">${gameState.settings.smallBlind}/${gameState.settings.bigBlind}</div></div>
              <div className="flex flex-col items-center"><div className="text-[9px] font-black text-[#404040] uppercase tracking-[0.4em] mb-0.5">Stage</div><div className="text-[#C9A24D] font-black text-xs tracking-widest uppercase">{gameState.stage.replace('_', ' ')}</div></div>
              <div className="flex flex-col items-center"><div className="text-[9px] font-black text-[#404040] uppercase tracking-[0.4em] mb-0.5">Turn</div><div className="text-[#EDEDED] font-black text-xs tracking-widest uppercase">{currentTurnPlayer ? currentTurnPlayer.name : 'Waiting'}</div></div>
           </div>
        </div>

        {/* Evaluation & Primary Controls */}
        <div className="absolute left-6 top-6 z-[800] flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            {myEvaluation && gameState.stage !== GameStage.Lobby && (
              <div className="bg-[#141416]/95 border border-[#C9A24D]/40 px-6 py-4 rounded-[1.5rem] shadow-2xl backdrop-blur-3xl flex flex-col items-center transition-opacity duration-500">
                <span className="text-[9px] font-black text-[#606060] uppercase tracking-[0.5em] mb-2">My Hand</span>
                <span className="text-lg font-black text-[#C9A24D] tracking-wider uppercase drop-shadow-md">{myEvaluation.label}</span>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button onClick={() => setRightPanelMode(rightPanelMode === 'ledger' ? 'chat' : 'ledger')} className={`backdrop-blur-xl border px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl ${rightPanelMode === 'ledger' ? 'bg-[#C9A24D] text-black border-black/20' : 'bg-[#141416]/90 text-[#C9A24D] border-[#C9A24D]/40 hover:bg-[#C9A24D] hover:text-black'}`}>
                {rightPanelMode === 'ledger' ? 'Live Table' : 'Ledger'}
              </button>
              <button onClick={() => setShowBankModal(true)} className="bg-[#141416]/90 border border-[#C9A24D]/40 text-[#C9A24D] px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:bg-[#C9A24D] hover:text-black shadow-2xl">
                Bank
              </button>
            </div>
          </div>
        </div>

        {/* Table Felt */}
        <div className="flex-1 relative flex items-center justify-center px-4 sm:px-12 py-20 mt-8 z-[100]">
          <div className="relative w-full aspect-[2.4/1] max-w-[1400px] bg-[#141416] rounded-[300px] border-[20px] border-[#1C1C1F] shadow-[0_150px_300px_rgba(0,0,0,1)] flex items-center justify-center">
            
            <div className="flex items-center gap-6 sm:gap-10 z-20">
              <div className="flex gap-4 sm:gap-6 h-32 sm:h-44">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-20 h-full sm:w-28 rounded-xl bg-[#0B0B0C] border border-[#C9A24D]/10 flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-700 ${gameState.communityCards[i] ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
                    {gameState.communityCards[i] ? <Card card={gameState.communityCards[i]} /> : <div className="text-[10px] font-black tracking-[0.5em] text-[#C9A24D] opacity-10">PTM</div>}
                  </div>
                ))}
              </div>

              {gameState.currentTurnPlayerId && gameState.stage !== GameStage.Showdown && (
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 bg-[#141416] flex flex-col items-center justify-center shadow-2xl ${getTimerStyles().split(' ').slice(1).join(' ')}`}>
                  <span className={`text-lg sm:text-2xl font-black ${getTimerStyles().split(' ')[0]}`}>{timeLeft}</span>
                </div>
              )}
            </div>

            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
              {[...Array(10)].map((_, i) => {
                const playerAtSeat = gameState.players.find(p => !p.isSpectator && p.seatIndex === i);
                if (!playerAtSeat) return null;
                const pos = getSeatPos(i);
                return (
                  <div key={i} className="absolute transition-all duration-500" style={{ ...pos, transform: 'translate(-50%, -50%)', zIndex: playerAtSeat.id === gameState.currentTurnPlayerId ? 110 : 90 }}>
                    <Seat 
                      player={playerAtSeat} 
                      isTurn={gameState.currentTurnPlayerId === playerAtSeat.id} 
                      isDealer={playerAtSeat.role === 'D'} 
                      isMe={playerAtSeat.id === myId} 
                      stage={gameState.stage} 
                      isCompact={isCompact} 
                      muckChoicePlayerId={gameState.muckChoicePlayerId} 
                      lastActionPlayerId={gameState.lastActionPlayerId} 
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Turn Indicator Corner */}
        <div className="absolute top-6 right-6 z-[800] flex flex-col items-end gap-3 pointer-events-none">
          <div className="pointer-events-auto transform scale-90 origin-top-right flex flex-col items-end gap-3">
             {myPlayer && !myPlayer.isFolded && !myPlayer.isSpectator && gameState.currentTurnPlayerId === myId && gameState.stage !== GameStage.Showdown ? (
               <ActionPanel myPlayer={myPlayer} gameState={gameState} onAction={onAction} />
             ) : currentTurnPlayer && (
                <div className="flex items-center gap-4 bg-[#141416]/95 backdrop-blur-2xl rounded-3xl border border-[#C9A24D]/30 px-6 py-4 shadow-2xl">
                   <div className="w-2.5 h-2.5 bg-[#C9A24D] rounded-full animate-pulse shadow-[0_0_10px_rgba(201,162,77,0.5)]" />
                   <span className="text-[12px] font-black text-white uppercase tracking-[0.1em]">{currentTurnPlayer.name}'s turn</span>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 border-l border-white/10 flex flex-col bg-[#0B0B0C] z-[900] shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-[#141416] flex justify-center items-center shrink-0">
           <h3 className="text-[10px] font-black text-[#C9A24D] uppercase tracking-[0.6em]">
             {rightPanelMode === 'chat' ? 'COMMUNICATION' : 'BANK LEDGER'}
           </h3>
        </div>

        {/* Global Financial Requests */}
        {gameState.pendingRequests.length > 0 && (
          <div className="p-4 bg-[#C9A24D]/5 border-b border-white/10 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-1 px-1">
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
               <span className="text-[9px] font-black text-[#C9A24D] uppercase tracking-[0.3em]">Bank Requests</span>
            </div>
            {gameState.pendingRequests.map(r => (
              <div key={r.id} className="bg-[#141416] border border-[#C9A24D]/40 p-4 rounded-2xl flex flex-col gap-3 shadow-xl transform transition-transform hover:scale-[1.02]">
                <div className="flex justify-between items-center">
                   <span className="text-[11px] font-black text-white uppercase truncate max-w-[120px]">{r.playerName}</span>
                   <div className="flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${r.type === FinancialRequestType.BuyIn ? 'bg-[#C9A24D] text-black' : 'bg-blue-600 text-white'}`}>
                        {r.type === FinancialRequestType.BuyIn ? 'In' : 'Cashout'}
                      </span>
                      {r.status === 'approved' && <span className="text-[7px] text-[#C9A24D] font-black mt-1 uppercase">Next Round</span>}
                   </div>
                </div>
                <div className="text-xl font-black text-[#C9A24D] tracking-tighter">${r.amount.toFixed(2)}</div>
                
                {r.status === 'pending' ? (
                  isHost ? (
                    <div className="flex gap-2">
                       <button onClick={() => onResolveRequest(r.id, true)} className="flex-1 bg-[#C9A24D] hover:bg-[#B8923D] text-black text-[9px] font-black py-2.5 rounded-xl transition-all active:scale-95">APPROVE</button>
                       <button onClick={() => onResolveRequest(r.id, false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black py-2.5 rounded-xl border border-white/10 transition-all active:scale-95">REJECT</button>
                    </div>
                  ) : (
                    <div className="text-[9px] font-black text-[#505050] uppercase tracking-widest text-center py-2 bg-black/30 rounded-lg border border-white/5">Waiting for Host</div>
                  )
                ) : (
                  <div className="text-[9px] font-black text-[#C9A24D] uppercase tracking-widest text-center py-2 bg-[#C9A24D]/10 rounded-lg border border-[#C9A24D]/30">APPROVED - WAITING FOR NEXT ROUND</div>
                )}
              </div>
            ))}
          </div>
        )}

        {rightPanelMode === 'chat' ? (
          <>
            <div 
              ref={chatRef} 
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 custom-scrollbar scroll-smooth"
            >
               {userChatHistory.map((m) => (
                <div key={m.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-2 max-w-full min-w-0">
                  <span className="text-[11px] font-black uppercase text-[#C9A24D] mb-1 block truncate">{m.senderName}</span>
                  <p className="text-[13px] font-medium text-white/90 bg-white/[0.03] p-3 rounded-2xl border border-white/5 leading-relaxed break-words whitespace-pre-wrap overflow-hidden">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const t=(e.target as any).msg.value; if(t.trim()) { onChat(t); (e.target as any).reset(); }}} className="p-6 border-t border-white/5 bg-[#141416]/40">
              <input name="msg" type="text" autoComplete="off" placeholder="Type a message..." className="w-full bg-[#0B0B0C] border border-white/10 rounded-2xl px-5 py-4 text-[14px] font-bold outline-none focus:border-[#C9A24D] text-[#EDEDED] shadow-inner" />
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden bg-[#0B0B0C]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {ledgerEntries.map(p => (
                <div key={p.id} className={`bg-[#141416] border ${p.id === myId ? 'border-[#C9A24D]/40 bg-[#1C1C1F]' : 'border-white/5'} rounded-2xl p-4 flex flex-col gap-3 shadow-lg`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-[#EDEDED] uppercase tracking-wider truncate mr-2">{p.name}</span>
                    <span className={`font-black text-[16px] tracking-tight shrink-0 ${p.currentNet > 0 ? 'text-[#C9A24D]' : p.currentNet < 0 ? 'text-red-500' : 'text-[#404040]'}`}>
                      {p.currentNet > 0 ? '+' : ''}${p.currentNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-[#505050] uppercase tracking-widest mb-1">Buy-in</span>
                      <span className="text-[10px] font-bold text-white/80">${p.totalBuyIn.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] font-black text-[#505050] uppercase tracking-widest mb-1">Cash-out</span>
                      <span className="text-[10px] font-bold text-white/80">${p.totalBuyOut.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-[#141416] border border-[#C9A24D]/30 w-full max-w-sm rounded-[2.5rem] p-10 shadow-[0_50px_150px_rgba(0,0,0,1)] relative">
              <button onClick={() => setShowBankModal(false)} className="absolute top-6 right-8 text-[#606060] hover:text-[#C9A24D] text-3xl font-black">×</button>
              <div className="flex flex-col items-center mb-8">
                 <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">Banker's Desk</h2>
                 <p className="text-[10px] font-black text-[#C9A24D] uppercase tracking-[0.4em] opacity-80">Settlement</p>
              </div>
              <div className="space-y-4">
                 <div className="relative">
                    <input 
                      type="number" 
                      step="any"
                      value={bankAmount ?? ''} 
                      placeholder="0.00"
                      onChange={(e) => setBankAmount(parseFloat(e.target.value) || undefined)} 
                      className="w-full bg-[#0B0B0C] border-2 border-[#C9A24D]/20 rounded-2xl px-10 py-6 text-[#C9A24D] font-black text-3xl outline-none focus:border-[#C9A24D] text-center shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#C9A24D] opacity-30 font-black text-xl">$</span>
                 </div>
                 <button 
                   disabled={myRequests.some(r => r.status === 'pending') || !bankAmount || bankAmount <= 0} 
                   onClick={() => { if(bankAmount) { onFinancialRequest(FinancialRequestType.BuyIn, bankAmount); setShowBankModal(false); } }} 
                   className="w-full bg-gradient-to-b from-[#C9A24D] to-[#B8923D] hover:from-[#D4B063] hover:to-[#C9A24D] text-[#000] py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] shadow-[0_10px_30px_rgba(201,162,77,0.2)] transition-all disabled:opacity-20 active:scale-95"
                 >
                   Submit Buy-In
                 </button>
                 <button 
                   disabled={myRequests.some(r => r.status === 'pending') || !bankAmount || bankAmount <= 0 || bankAmount > (myPlayer?.chips || 0)} 
                   onClick={() => { if(bankAmount) { onFinancialRequest(FinancialRequestType.BuyOut, bankAmount); setShowBankModal(false); } }} 
                   className="w-full bg-transparent border-2 border-white/10 hover:bg-white/5 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] transition-all disabled:opacity-20 active:scale-95"
                 >
                   Submit Cash-Out
                 </button>

                 <div className="pt-4 border-t border-white/5">
                    <button 
                      disabled={myRequests.some(r => r.status === 'pending') || !myPlayer || myPlayer.chips <= 0}
                      onClick={() => { 
                        if (myPlayer) onFinancialRequest(FinancialRequestType.BuyOut, myPlayer.chips); 
                        setShowBankModal(false); 
                      }} 
                      className="w-full bg-red-950/20 border-2 border-red-900/40 hover:bg-red-900/40 text-red-500 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] transition-all active:scale-95 disabled:opacity-30"
                    >
                      Cashout All Stack
                    </button>
                    <p className="text-[8px] text-[#606060] text-center mt-2 uppercase tracking-widest">Host approval required. Applies next round.</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PokerTable;
