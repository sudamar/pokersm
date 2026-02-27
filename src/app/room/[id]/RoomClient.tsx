"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Room } from "@/lib/types";

export type { Room };

const TIMER_SECONDS = 600; // 10 minutos

// ── Cartas de votação ──────────────────────────────────────
const CARDS = [
  { value: 1,  label: "Alegria",  cls: "joy-gradient",     emoji: "😄", img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/4630205237-77960acc9522d915fd9b.png" },
  { value: 3,  label: "Tristeza", cls: "sadness-gradient", emoji: "😢", img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/d6f07d7b19-02bb550c8da73f3de51b.png" },
  { value: 5,  label: "Raiva",    cls: "anger-gradient",   emoji: "😤", img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/bae099cc31-de6215dfe37efec57ea8.png" },
  { value: 8,  label: "Medo",     cls: "fear-gradient",    emoji: "😨", img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/5077253ead-efa95800dc2bd05119cb.png" },
  { value: 13, label: "Nojinho",  cls: "disgust-gradient", emoji: "🤢", img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/56e592d5e9-d793ca6ba0d29dd6bbaa.png" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  online:     { label: "Online",     color: "bg-green-100 text-green-700 border border-green-200" },
  votando:    { label: "Votando",    color: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  aguardando: { label: "Aguardando", color: "bg-blue-100 text-blue-700 border border-blue-200" },
  finalizado: { label: "Finalizado", color: "bg-purple-100 text-purple-700 border border-purple-200" },
};
const DEFAULT_STATUS = { label: "Online", color: "bg-gray-100 text-gray-600 border border-gray-200" };

const AVATAR_GRADIENTS = ["joy-gradient", "sadness-gradient", "anger-gradient", "fear-gradient", "disgust-gradient"];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function calcTimeLeft(createdAt: string) {
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  return Math.max(0, TIMER_SECONDS - elapsed);
}

interface Props {
  initialRoom: Room;
  roomId: string;
}

export default function RoomClient({ initialRoom, roomId }: Props) {
  const router = useRouter();
  const [room, setRoom]           = useState<Room>(initialRoom);
  const [connected, setConnected] = useState(false);
  const [myName, setMyName]       = useState<string | null>(null);
  const [voting, setVoting]       = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(() => calcTimeLeft(initialRoom.createdAt));
  const revealCalled              = useRef(false);

  // Nome salvo no sessionStorage pelo /create-room ou /join-room
  useEffect(() => {
    const saved = sessionStorage.getItem(`room-${roomId}-name`);
    if (saved) setMyName(saved);
  }, [roomId]);

  // SSE — recebe atualizações em tempo real
  useEffect(() => {
    const es = new EventSource(`/api/rooms/${roomId}/events`);
    es.addEventListener("room-update", (e: MessageEvent) => {
      setRoom(JSON.parse(e.data) as Room);
      setConnected(true);
    });
    es.addEventListener("room-destroyed", () => {
      es.close();
      router.push("/");
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [roomId, router]);

  // Cronômetro — sincronizado via room.createdAt
  useEffect(() => {
    if (room.revealed) return; // para de contar se já revelado

    const tick = () => {
      const left = calcTimeLeft(room.createdAt);
      setTimeLeft(left);

      if (left === 0 && !revealCalled.current) {
        revealCalled.current = true;
        // Qualquer cliente chama reveal ao zerar — é idempotente no servidor
        fetch(`/api/rooms/${roomId}/reveal`, { method: "POST" }).catch(() => {});
      }
    };

    tick(); // executa imediatamente ao montar/atualizar
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [room.createdAt, room.revealed, roomId]);

  // Muda status local para "votando"
  const startVoting = useCallback(() => {
    if (!myName) return;
    setRoom((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.name === myName ? { ...p, status: "votando" as const } : p
      ),
    }));
  }, [myName]);

  // Registra o voto via API
  const castVote = useCallback(async (value: number) => {
    if (!myName || voting) return;
    setVoting(true);
    try {
      await fetch(`/api/rooms/${roomId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName, vote: value }),
      });
    } finally {
      setVoting(false);
    }
  }, [myName, roomId, voting]);

  // Cancela o voto e volta a "online"
  const unvote = useCallback(async () => {
    if (!myName) return;
    try {
      await fetch(`/api/rooms/${roomId}/unvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName }),
      });
      // Atualiza localmente também para resposta imediata
      setRoom((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === myName ? { ...p, status: "online" as const, vote: null } : p
        ),
      }));
    } catch { /* ignora */ }
  }, [myName, roomId]);

  // Revelar votos manualmente (só o criador)
  const handleReveal = useCallback(async () => {
    if (!myName || revealing) return;
    setRevealing(true);
    try {
      await fetch(`/api/rooms/${roomId}/reveal`, { method: "POST" });
    } finally {
      setRevealing(false);
    }
  }, [myName, roomId, revealing]);

  // Destruir sala (só o criador)
  const handleDestroy = useCallback(async () => {
    if (!myName || destroying) return;
    const confirmed = window.confirm("Tem certeza que deseja destruir a sala? Todos os participantes serão desconectados.");
    if (!confirmed) return;
    setDestroying(true);
    try {
      await fetch(`/api/rooms/${roomId}/destroy`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName }),
      });
      router.push("/");
    } catch {
      setDestroying(false);
    }
  }, [myName, roomId, destroying, router]);

  const me        = myName ? room.participants.find((p) => p.name === myName) : null;
  const hasVoted  = me?.status === "finalizado";
  const isVoting  = me?.status === "votando";
  const isCreator = myName === room.creatorName;
  const isUrgent  = timeLeft <= 30 && !room.revealed;
  const progress  = (timeLeft / TIMER_SECONDS) * 100;

  // ── Cálculos do resultado ────────────────────────────────
  const votedParticipants = room.participants.filter((p) => p.vote != null);
  const votes = votedParticipants.map((p) => p.vote as number);

  // Nota vencedora: a mais frequente (desempate: maior valor)
  const winnerVote = (() => {
    if (votes.length === 0) return null;
    const freq: Record<number, number> = {};
    for (const v of votes) freq[v] = (freq[v] ?? 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    const candidates = Object.keys(freq)
      .map(Number)
      .filter((v) => freq[v] === maxFreq);
    return candidates.sort((a, b) => b - a)[0];
  })();

  // Outliers: votos que divergem do padrão (winnerVote)
  // Só destaca quem votou acima OU abaixo do padrão, nunca quem votou igual
  const outlierVotes = winnerVote != null
    ? [...new Set(votes.filter((v) => v !== winnerVote))]
    : [];
  const hasOutliers = outlierVotes.length > 0;
  const maxVote = hasOutliers ? Math.max(...votes) : null;
  const minVote = hasOutliers ? Math.min(...votes) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="rainbow-gradient shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-3xl text-white cursor-pointer" style={{ fontFamily: "'Fredoka One', cursive" }}>
              Scrum Emotions
            </h1>
          </Link>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full transition-colors ${connected ? "bg-green-300" : "bg-white/40"}`} />
            <span className="text-white text-sm font-semibold">{connected ? "Ao vivo" : "Conectando..."}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-2xl space-y-6">

        {/* ── Card da sala + cronômetro ─────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">História para Pontuar</p>
              <h2 className="text-4xl text-purple-800 mb-1 truncate" style={{ fontFamily: "'Fredoka One', cursive" }}>
                {room.name}
              </h2>
              <p className="text-purple-400 text-sm">
                Criado por <span className="font-semibold text-purple-600">{room.creatorName}</span>
              </p>
            </div>

            {/* Cronômetro */}
            {!room.revealed && (
              <div className={`flex flex-col items-center gap-1 min-w-[90px] ${isUrgent ? "text-red-500" : "text-purple-700"}`}>
                <span
                  className={`text-3xl font-bold ${isUrgent ? "timer-blink" : ""}`}
                  style={{ fontFamily: "'Fredoka One', cursive" }}
                >
                  {formatTime(timeLeft)}
                </span>
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-400" : "bg-purple-400"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${isUrgent ? "text-red-400" : "text-purple-400"}`}>
                  {timeLeft === 0 ? "Revelando..." : "restantes"}
                </span>
              </div>
            )}

            {/* Badge de revelado */}
            {room.revealed && (
              <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-bold text-sm border border-purple-200">
                🎉 Votos revelados!
              </div>
            )}
          </div>

          {/* Ações do criador (antes da revelação) */}
          {isCreator && !room.revealed && (
            <div className="mt-5 pt-5 border-t border-purple-100 flex flex-wrap items-center gap-3">
              <button
                onClick={handleReveal}
                disabled={revealing}
                className="anger-gradient text-white px-6 py-2.5 rounded-full font-bold text-sm
                           hover:shadow-lg transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {revealing ? "Revelando..." : "🃏 Revelar Votos Agora"}
              </button>
              <button
                onClick={handleDestroy}
                disabled={destroying}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-sm
                           hover:shadow-lg transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {destroying ? "Destruindo..." : "🗑️ Destruir Sala"}
              </button>
              <p className="text-purple-400 text-xs w-full">
                Revela para todos antes do tempo acabar.
              </p>
            </div>
          )}

          {/* Botão destruir após revelação (só criador) */}
          {isCreator && room.revealed && (
            <div className="mt-5 pt-5 border-t border-purple-100">
              <button
                onClick={handleDestroy}
                disabled={destroying}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-sm
                           hover:shadow-lg transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {destroying ? "Destruindo..." : "🗑️ Destruir Sala"}
              </button>
            </div>
          )}
        </div>

        {/* ── Tela de resultado (após revelação) ───────────── */}
        {room.revealed && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-2xl text-purple-800 mb-2 text-center" style={{ fontFamily: "'Fredoka One', cursive" }}>
              🎉 Resultado da Votação
            </h3>

            {/* Nota vencedora */}
            {winnerVote != null && (() => {
              const winCard = CARDS.find((c) => c.value === winnerVote);
              return (
                <div className="flex flex-col items-center my-6 py-5 px-6 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300">
                  <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-2">Nota Vencedora</span>
                  {winCard && (
                    <img src={winCard.img} alt={winCard.label} className="w-20 h-20 object-contain drop-shadow-lg mb-2" />
                  )}
                  <span className="text-5xl font-bold text-yellow-700" style={{ fontFamily: "'Fredoka One', cursive" }}>
                    {winnerVote}
                  </span>
                  {winCard && <span className="text-sm text-yellow-600 mt-1">{winCard.label}</span>}
                </div>
              );
            })()}

            {/* Grid de participantes */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {room.participants.map((p, i) => {
                const card = CARDS.find((c) => c.value === p.vote);
                const avatarCls = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                const isHighest = hasOutliers && p.vote === maxVote;
                const isLowest  = hasOutliers && p.vote === minVote;
                const needsJustify = isHighest || isLowest;

                return (
                  <div
                    key={`${p.name}-result`}
                    className={`flex flex-col items-center p-4 rounded-2xl border transition-all
                      ${isHighest ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-300 shadow-md" :
                        isLowest  ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 shadow-md" :
                                    "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100"}`}
                  >
                    {card ? (
                      <img src={card.img} alt={card.label} className="w-16 h-16 object-contain drop-shadow-md mb-2" />
                    ) : (
                      <div className={`${avatarCls} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold text-purple-800 text-sm text-center leading-tight">{p.name}</span>
                    <span className={`text-2xl font-bold mt-1 ${
                      isHighest ? "text-red-600" : isLowest ? "text-blue-600" : card ? "text-purple-700" : "text-gray-400"
                    }`} style={{ fontFamily: "'Fredoka One', cursive" }}>
                      {p.vote != null ? p.vote : "—"}
                    </span>
                    {card && <span className={`text-xs mt-0.5 ${isHighest ? "text-red-400" : isLowest ? "text-blue-400" : "text-purple-400"}`}>{card.label}</span>}
                    {needsJustify && (
                      <span className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full
                        ${isHighest ? "bg-red-100 text-red-700 border border-red-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                        {isHighest ? "⬆ Justificar" : "⬇ Justificar"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cartas de votação (antes de votar, antes da revelação) ── */}
        {myName && !hasVoted && !room.revealed && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-2xl text-purple-800 mb-2" style={{ fontFamily: "'Fredoka One', cursive" }}>
              {isVoting ? "Escolha sua carta" : "Pronto para votar?"}
            </h3>
            <p className="text-purple-400 text-sm mb-6">
              {isVoting ? "Clique em uma carta para registrar seu voto." : "Clique em 'Votar' para revelar as cartas."}
            </p>

            {!isVoting ? (
              <button
                onClick={startVoting}
                className="joy-gradient text-white px-8 py-3 rounded-full font-bold
                           hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Votar 🗳️
              </button>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {CARDS.map((card) => (
                  <button
                    key={card.value}
                    onClick={() => castVote(card.value)}
                    disabled={voting}
                    className={`${card.cls} p-4 rounded-2xl text-center
                                transform hover:scale-110 transition-all shadow-lg
                                disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <img src={card.img} alt={card.label} className="w-14 h-14 mx-auto mb-2 object-contain drop-shadow-md" />
                    <div className="text-white font-bold text-xl leading-none">{card.value}</div>
                    <div className="text-white text-xs opacity-90 mt-0.5">{card.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Estado pós-voto, aguardando revelação ────────── */}
        {myName && hasVoted && !room.revealed && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            {(() => {
              const voted = CARDS.find((c) => c.value === me?.vote);
              return voted ? (
                <img src={voted.img} alt={voted.label} className="w-24 h-24 mx-auto mb-3 object-contain drop-shadow-lg" />
              ) : (
                <div className="text-5xl mb-3">✅</div>
              );
            })()}
            <h3 className="text-2xl text-purple-800 mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
              Voto registrado!
            </h3>
            <p className="text-purple-400 text-sm mb-4">
              Você votou <span className="font-bold text-purple-700">{me?.vote}</span>
              {" — "}{CARDS.find((c) => c.value === me?.vote)?.label}.
              <br />Aguardando o criador revelar ou o tempo acabar...
            </p>
            <button
              onClick={startVoting}
              className="text-sm text-purple-500 underline hover:text-purple-700 transition-colors"
            >
              Alterar voto
            </button>
          </div>
        )}

        {/* ── Lista de participantes ───────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h3 className="text-2xl text-purple-800 mb-6" style={{ fontFamily: "'Fredoka One', cursive" }}>
            Participantes ({room.participants.length})
          </h3>
          <ul className="space-y-3">
            {room.participants.map((p, i) => {
              const statusCfg = STATUS_CONFIG[p.status] ?? DEFAULT_STATUS;
              const avatarCls = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
              const isCreatorItem = p.name === room.creatorName && i === 0;
              const isMe = p.name === myName;
              const card = CARDS.find((c) => c.value === p.vote);
              // Votos só visíveis para: sala revelada, ou é o próprio usuário
              const showVote = room.revealed || isMe;

              return (
                <li
                  key={`${p.name}-${p.joinedAt}`}
                  className={`flex items-center justify-between p-4 rounded-2xl border
                              transition-all hover:shadow-md
                              ${isMe ? "bg-purple-50 border-purple-200" : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100"}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`${avatarCls} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shadow`}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-semibold text-purple-800">{p.name}</span>
                        {isCreatorItem && (
                          <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">Criador</span>
                        )}
                        {isMe && (
                          <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">Você</span>
                        )}
                      </div>
                      <span className="text-xs text-purple-400">
                        Entrou às {new Date(p.joinedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Voto: mostra carta se revelado ou se é o próprio; senão mostra 🃏 se já votou */}
                    {showVote && p.status === "finalizado" && (
                      <span className="font-bold text-purple-700 text-sm">
                        {card ? `${card.emoji} ${p.vote}` : "—"}
                      </span>
                    )}
                    {!showVote && p.status === "finalizado" && (
                      <span className="text-xl" title="Voto oculto">🃏</span>
                    )}
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
