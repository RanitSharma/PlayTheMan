
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

const ProgressTimer: React.FC<{ 
  seconds: number, 
  max: number, 
  size?: number, 
  hideTrack?: boolean, 
  hideCircle?: boolean,
  textColor?: string 
}> = ({ seconds, max, size = 32, hideTrack, hideCircle, textColor = "text-[#C9A24D]" }) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (seconds / max) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${textColor}`} style={{ width: size, height: size }}>
      {!hideCircle && (
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          {!hideTrack && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="opacity-10"
            />
          )}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: isNaN(offset) ? circumference : offset,
              transition: 'stroke-dashoffset 1s linear'
            }}
          />
        </svg>
      )}
      <span className={`text-[11px] font-black z-10`}>{seconds}</span>
    </div>
  );
};

const PokerTable: React.FC<Props> = ({ 
  gameState, myId, onAction, onMuck, onChat, onDevBackToLobby, onRevealFold, 
  onFinancialRequest, onResolveRequest 
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  
  const myPlayer = gameState.players.find(p => p.id === myId);
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  
  const [timeLeft, setTimeLeft] = useState(gameState.settings.actionTimerSeconds);
  const [muckTimeLeft, setMuckTimeLeft] = useState(0);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'ledger'>('chat');
  
  const [isPotExpanded, setIsPotExpanded] = useState(false);
  const [hoveredPotIndex, setHoveredPotIndex] = useState<number | null>(null);

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTab, setBankTab] = useState<'request' | 'management'>('request');
  const [bankAmount, setBankAmount] = useState<number | undefined>(undefined);

  const isHost = gameState.hostId === myId;
  const userChatHistory = gameState.chatHistory.filter(m => !m.isSystem);

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
    const interval = setInterval(() => {
      if (gameState.currentTurnPlayerId && gameState.actionStartTime && gameState.stage !== GameStage.Showdown) {
        const elapsed = (Date.now() - (gameState.actionStartTime || 0)) / 1000;
        setTimeLeft(Math.max(0, Math.floor(gameState.settings.actionTimerSeconds - elapsed)));
      } else {
        setTimeLeft(gameState.settings.actionTimerSeconds);
      }

      if (gameState.muckChoiceStartTime) {
        const isShowdown = gameState.stage === GameStage.Showdown;
        const isRevealing = gameState.muckChoicePlayerId === 'REVEALING';
        const postHandMax = (isRevealing && !isShowdown) ? 5 : 10;
        const elapsedMuck = (Date.now() - (gameState.muckChoiceStartTime || 0)) / 1000;
        setMuckTimeLeft(Math.max(0, Math.floor(postHandMax - elapsedMuck)));
      } else {
        setMuckTimeLeft(0);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [
    gameState.currentTurnPlayerId, 
    gameState.actionStartTime, 
    gameState.settings.actionTimerSeconds, 
    gameState.stage, 
    gameState.muckChoiceStartTime,
    gameState.muckChoicePlayerId
  ]);

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

  const isMuckChoiceActive = gameState.muckChoicePlayerId === myId;
  const isHandDecided = gameState.stage === GameStage.Showdown || gameState.muckChoicePlayerId;
  const isShowdown = gameState.stage === GameStage.Showdown;
  const isRevealing = gameState.muckChoicePlayerId === 'REVEALING';
  const postHandMax = (isRevealing && !isShowdown) ? 5 : 10;

  const pendingCount = gameState.pendingRequests.length;

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <div className="flex-1 relative flex flex-col bg-[#0B0B0C] poker-felt overflow-hidden">
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

        <div className="absolute left-6 top-6 z-[800] flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            {myEvaluation && gameState.stage !== GameStage.Lobby && (
              <div className="bg-[#141416]/95 border border-[#C9A24D]/40 px-5 py-4 rounded-[2rem] shadow-2xl backdrop-blur-3xl flex flex-col items-center transition-all duration-500 animate-in slide-in-from-left-4">
                <span className="text-[9px] font-black text-[#606060] uppercase tracking-[0.5em] mb-3">My Hand</span>
                
                <div className="flex items-center gap-1 mb-3">
                  {myEvaluation.bestFive.map((card, i) => (
                    <div key={i} className="w-9 h-14 sm:w-11 sm:h-16 transform transition-transform hover:scale-110 duration-200">
                      <Card card={card} isMinimal />
                    </div>
                  ))}
                </div>

                <div className="bg-[#C9A24D]/10 border border-[#C9A24D]/20 px-4 py-1.5 rounded-full">
                  <span className="text-[11px] font-black text-[#C9A24D] tracking-[0.15em] uppercase drop-shadow-md">
                    {myEvaluation.label}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button onClick={() => setRightPanelMode(rightPanelMode === 'ledger' ? 'chat' : 'ledger')} className={`backdrop-blur-xl border px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl ${rightPanelMode === 'ledger' ? 'bg-[#C9A24D] text-black border-black/20' : 'bg-[#141416]/90 text-[#C9A24D] border-[#C9A24D]/40 hover:bg-[#C9A24D] hover:text-black'}`}>
                {rightPanelMode === 'ledger' ? 'Live Table' : 'Ledger'}
              </button>
              <button onClick={() => { setShowBankModal(true); setBankTab(isHost ? 'management' : 'request'); }} className="relative bg-[#141416]/90 border border-[#C9A24D]/40 text-[#C9A24D] px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:bg-[#C9A24D] hover:text-black shadow-2xl group">
                Bank
                {isHost && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-lg animate-bounce group-hover:animate-none">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center px-4 sm:px-12 py-20 mt-8 z-[100]">
          <div className="relative w-full aspect-[2.4/1] max-w-[1400px] bg-[#141416] rounded-[300px] border-[20px] border-[#1C1C1F] shadow-[0_150px_300px_rgba(0,0,0,1)] flex items-center justify-center">
            
            <div className="flex items-center gap-6 sm:gap-10 z-20">
              <div className="flex gap-4 sm:gap-6 h-32 sm:h-44">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-20 h-full sm:w-28 rounded-xl bg-[#0B0B0C] border border-[#C9A24D]/10 flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-700 ${gameState.communityCards[i] ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
                    {gameState.communityCards[i] ? <Card card={gameState.communityCards[i]} compact isBoard /> : <div className="text-[10px] font-black tracking-[0.5em] text-[#C9A24D] opacity-10">PTM</div>}
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
        
        <div className="absolute top-6 right-6 z-[800] flex flex-col items-end gap-3 pointer-events-none">
          <div className="pointer-events-auto transform scale-90 origin-top-right flex flex-col items-end gap-3">
             
             {myPlayer && !myPlayer.isFolded && !myPlayer.isSpectator && gameState.currentTurnPlayerId === myId && gameState.stage !== GameStage.Showdown ? (
               <ActionPanel myPlayer={myPlayer} gameState={gameState} onAction={onAction} />
             
             ) : isMuckChoiceActive ? (
               <div className="bg-[#141416]/95 backdrop-blur-2xl rounded-[2.5rem] border border-[#C9A24D]/40 p-6 shadow-2xl flex flex-col items-center gap-4 animate-in slide-in-from-right-4">
                  <div className="flex flex-col items-center">
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase mb-0.5">Victory</h3>
                    <p className="text-[9px] font-black text-[#C9A24D] uppercase tracking-[0.4em]">The Choice is Yours</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => onMuck(false)}
                      className="bg-white/5 hover:bg-white/10 text-[#606060] hover:text-white border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                    >
                      Muck
                    </button>
                    <button 
                      onClick={() => onMuck(true)}
                      className="bg-gradient-to-b from-[#C9A24D] to-[#B8923D] text-black border border-black/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_5px_20px_rgba(201,162,77,0.3)] active:scale-95"
                    >
                      Show
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <ProgressTimer seconds={muckTimeLeft} max={postHandMax} size={36} />
                    <span className="text-[8px] font-black text-[#404040] uppercase tracking-widest">Auto-muck</span>
                  </div>
               </div>

             ) : myPlayer?.isFolded && !myPlayer.isRevealingFold && gameState.stage !== GameStage.Lobby ? (
                <div className="flex flex-col gap-4 items-end animate-in slide-in-from-right-4">
                   <div className="bg-[#141416]/95 backdrop-blur-2xl rounded-3xl border border-[#C9A24D]/30 px-6 py-4 shadow-2xl">
                      <span className="text-[12px] font-black text-[#606060] uppercase tracking-[0.1em]">You are folded</span>
                   </div>
                   {isHandDecided && muckTimeLeft > 0 && myPlayer.holeCards && (
                      <button 
                        onClick={onRevealFold}
                        className="bg-gradient-to-b from-[#C9A24D] to-[#B8923D] hover:from-[#D4B063] hover:to-[#C9A24D] text-black border border-black/10 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_15px_30px_rgba(201,162,77,0.3)] active:scale-95 animate-in slide-in-from-bottom-2 flex items-center gap-4"
                      >
                        <span>Reveal Folded Hand</span>
                        <div className="flex items-center justify-center">
                          <ProgressTimer seconds={muckTimeLeft} max={postHandMax} size={24} hideCircle textColor="text-black" />
                        </div>
                      </button>
                   )}
                </div>

             ) : currentTurnPlayer && (
                <div className="flex items-center gap-4 bg-[#141416]/95 backdrop-blur-2xl rounded-3xl border border-[#C9A24D]/30 px-6 py-4 shadow-2xl">
                   <div className="w-2.5 h-2.5 bg-[#C9A24D] rounded-full animate-pulse shadow-[0_0_10px_rgba(201,162,77,0.5)]" />
                   <span className="text-[12px] font-black text-white uppercase tracking-[0.1em]">{currentTurnPlayer.name}'s turn</span>
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="w-80 border-l border-white/10 flex flex-col bg-[#0B0B0C] z-[900] shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-[#141416] flex justify-center items-center shrink-0">
           <h3 className="text-[10px] font-black text-[#C9A24D] uppercase tracking-[0.6em]">
             {rightPanelMode === 'chat' ? 'COMMUNICATION' : 'BANK LEDGER'}
           </h3>
        </div>

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
                      <div className="text-3xl font-black text-white tracking-tighter">${myPlayer?.chips.toLocaleString()}</div>
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
                            <span className="text-[14px] font-black text-[#C9A24D]">${req.amount.toLocaleString()}</span>
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

export default PokerTable;
