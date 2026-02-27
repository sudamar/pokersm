"use client";
/* eslint-disable @next/next/no-img-element */

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

interface RoomHonkPayload {
  honkId: string;
  triggeredBy: string;
  targets: string[];
  sentAt: string;
}

function playHornTone() {
  const audioCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!audioCtor) return;

  const ctx = new audioCtor();
  const now = ctx.currentTime;

  const playTone = (start: number, duration: number, frequency: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  };

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  playTone(now + 0.02, 0.18, 720);
  playTone(now + 0.28, 0.18, 620);

  window.setTimeout(() => {
    void ctx.close();
  }, 1200);
}

export default function RoomClient({ initialRoom, roomId }: Props) {
  const router = useRouter();
  const [room, setRoom]           = useState<Room>(initialRoom);
  const [connected, setConnected] = useState(false);
  const [myName, setMyName]       = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [voting, setVoting]       = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [refreshingRoom, setRefreshingRoom] = useState(false);
  const [honking, setHonking] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<
    | "idle"
    | "share-success"
    | "share-error"
    | "copied"
    | "refresh-success"
    | "refresh-error"
    | "honk-success"
    | "honk-empty"
    | "honk-error"
  >("idle");
  const [honkNotice, setHonkNotice] = useState("");
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECONDS);
  const revealCalled              = useRef(false);
  const lastHandledHonkId = useRef<string | null>(null);
  const lastUrgentHornSecond = useRef<number | null>(null);
  const hornAudioRef = useRef<HTMLAudioElement | null>(null);

  // Nome salvo no sessionStorage pelo /create-room ou /join-room.
  // Sem nome salvo, redireciona para a tela de entrada da sala.
  useEffect(() => {
    const saved = sessionStorage.getItem(`room-${roomId}-name`);
    if (saved) {
      setMyName(saved);
      setCheckingAccess(false);
      return;
    }
    router.replace(`/join-room?roomId=${roomId}`);
  }, [roomId, router]);

  // Marca quando já hidratou no cliente para renderizações dependentes de locale
  useEffect(() => {
    setMounted(true);
  }, []);

  // Áudio explícito de buzina com fallback para sintetizador
  useEffect(() => {
    const audio = new Audio("/sounds/horn.wav");
    audio.preload = "auto";
    hornAudioRef.current = audio;
    return () => {
      hornAudioRef.current = null;
    };
  }, []);

  // Mensagem temporária de feedback das ações da sala
  useEffect(() => {
    if (actionFeedback === "idle") return;
    const timeout = window.setTimeout(() => setActionFeedback("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [actionFeedback]);

  // Mensagem temporária da buzina para quem ainda não votou
  useEffect(() => {
    if (!honkNotice) return;
    const timeout = window.setTimeout(() => setHonkNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [honkNotice]);

  const playHornSound = useCallback(async () => {
    const audio = hornAudioRef.current;
    if (audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch {
        // fallback abaixo
      }
    }
    playHornTone();
  }, []);

  const sendPresenceUpdate = useCallback(
    (isViewingRoom: boolean, useBeacon = false) => {
      if (!myName) return;

      const endpoint = `/api/rooms/${encodeURIComponent(roomId)}/presence`;
      const payload = JSON.stringify({ name: myName, isViewingRoom });

      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
        return;
      }

      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    },
    [myName, roomId]
  );

  // Heartbeat de presença da tela para o admin distinguir tela aberta x outra tela
  useEffect(() => {
    if (!myName) return;

    const publishPresence = () => {
      sendPresenceUpdate(document.visibilityState === "visible");
    };

    publishPresence();
    const interval = window.setInterval(publishPresence, 10_000);

    const onVisibilityChange = () => {
      sendPresenceUpdate(document.visibilityState === "visible");
    };
    const onPageHide = () => {
      sendPresenceUpdate(false, true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      sendPresenceUpdate(false, true);
    };
  }, [myName, sendPresenceUpdate]);

  const triggerHonkIfTarget = useCallback((payload: RoomHonkPayload) => {
    if (!myName) return;
    if (lastHandledHonkId.current === payload.honkId) return;
    lastHandledHonkId.current = payload.honkId;
    if (!payload.targets.includes(myName)) return;

    void playHornSound();
    if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
    setHonkNotice(`${payload.triggeredBy} buzinou para você votar.`);
  }, [myName, playHornSound]);

  // SSE — recebe atualizações em tempo real
  useEffect(() => {
    const es = new EventSource(`/api/rooms/${roomId}/events`);
    const onRoomUpdate = (e: MessageEvent) => {
      setRoom(JSON.parse(e.data) as Room);
      setConnected(true);
    };
    const onRoomDestroyed = () => {
      es.close();
      router.push("/");
    };
    const onRoomHonk = (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as RoomHonkPayload;
      triggerHonkIfTarget(payload);
    };

    es.addEventListener("room-update", onRoomUpdate);
    es.addEventListener("room-destroyed", onRoomDestroyed);
    es.addEventListener("room-honk", onRoomHonk);
    es.onerror = () => setConnected(false);
    return () => {
      es.removeEventListener("room-update", onRoomUpdate);
      es.removeEventListener("room-destroyed", onRoomDestroyed);
      es.removeEventListener("room-honk", onRoomHonk);
      es.close();
    };
  }, [roomId, router, triggerHonkIfTarget]);

  // Fallback robusto: também reage a buzina recebida via room-update
  useEffect(() => {
    if (!room.lastHonkId || !room.lastHonkBy || !room.lastHonkAt || !room.lastHonkTargets) return;
    triggerHonkIfTarget({
      honkId: room.lastHonkId,
      triggeredBy: room.lastHonkBy,
      sentAt: room.lastHonkAt,
      targets: room.lastHonkTargets,
    });
  }, [
    room.lastHonkId,
    room.lastHonkBy,
    room.lastHonkAt,
    room.lastHonkTargets,
    triggerHonkIfTarget,
  ]);

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

  const handleShareRoom = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    setActionFeedback("idle");

    const shareUrl = `${window.location.origin}/join-room?roomId=${encodeURIComponent(roomId)}`;
    const shareText = `Entre na sala "${room.name}" no SudaPoker`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "SudaPoker",
          text: shareText,
          url: shareUrl,
        });
        setActionFeedback("share-success");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setActionFeedback("copied");
        return;
      }

      setActionFeedback("share-error");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setActionFeedback("share-error");
    } finally {
      setSharing(false);
    }
  }, [room.name, roomId, sharing]);

  const handleCopyRoomLink = useCallback(async () => {
    if (copyingLink) return;
    setCopyingLink(true);
    setActionFeedback("idle");

    const shareUrl = `${window.location.origin}/join-room?roomId=${encodeURIComponent(roomId)}`;
    try {
      if (!navigator.clipboard?.writeText) {
        setActionFeedback("share-error");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setActionFeedback("copied");
    } catch {
      setActionFeedback("share-error");
    } finally {
      setCopyingLink(false);
    }
  }, [copyingLink, roomId]);

  const handleRefreshRoom = useCallback(async () => {
    if (refreshingRoom) return;
    setRefreshingRoom(true);
    setActionFeedback("idle");

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (!res.ok) {
        setActionFeedback("refresh-error");
        return;
      }
      const latest = (await res.json()) as Room;
      setRoom(latest);
      setConnected(true);
      setActionFeedback("refresh-success");
    } catch {
      setActionFeedback("refresh-error");
    } finally {
      setRefreshingRoom(false);
    }
  }, [refreshingRoom, roomId]);

  const handleHonkPendingVoters = useCallback(async () => {
    if (!myName || honking || room.revealed || myName !== room.creatorName) return;
    setHonking(true);
    setActionFeedback("idle");

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/honk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName }),
      });
      const data = (await res.json()) as { targets?: string[] };
      if (!res.ok) {
        setActionFeedback("honk-error");
        return;
      }
      const totalTargets = Array.isArray(data.targets) ? data.targets.length : 0;
      setActionFeedback(totalTargets > 0 ? "honk-success" : "honk-empty");
    } catch {
      setActionFeedback("honk-error");
    } finally {
      setHonking(false);
    }
  }, [myName, honking, room.revealed, room.creatorName, roomId]);

  const me        = myName ? room.participants.find((p) => p.name === myName) : null;
  const hasVoted  = me?.status === "finalizado";
  const isVoting  = me?.status === "votando";
  const isCreator = myName === room.creatorName;
  const isUrgent  = timeLeft <= 30 && !room.revealed;
  const progress  = (timeLeft / TIMER_SECONDS) * 100;

  // Últimos 10 segundos: toca horn.wav a cada 2 segundos
  useEffect(() => {
    if (room.revealed || timeLeft <= 0 || timeLeft > 10) {
      lastUrgentHornSecond.current = null;
      return;
    }
    if (timeLeft % 2 !== 0) return;
    if (lastUrgentHornSecond.current === timeLeft) return;

    lastUrgentHornSecond.current = timeLeft;
    void playHornSound();
  }, [room.revealed, timeLeft, playHornSound]);

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

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <p className="text-purple-700 font-semibold">Redirecionando para entrada da sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="rainbow-gradient shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/">
            <h1 className="text-2xl sm:text-3xl text-white cursor-pointer" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
              SudaPoker
            </h1>
          </Link>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full transition-colors ${connected ? "bg-green-300" : "bg-white/40"}`} />
            <span className="text-white text-xs sm:text-sm font-semibold">{connected ? "Ao vivo" : "Conectando..."}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-2xl space-y-6">
        {honkNotice && (
          <div className="bg-amber-100 text-amber-800 border border-amber-300 rounded-2xl px-4 py-3 text-sm font-semibold">
            🔔 {honkNotice}
          </div>
        )}

        {/* ── Card da sala + cronômetro ─────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">História para Pontuar</p>
              <h2 className="text-2xl sm:text-4xl text-purple-800 mb-1 break-words sm:truncate" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
                {room.name}
              </h2>
              <p className="text-purple-400 text-sm">
                Criado por <span className="font-semibold text-purple-600">{room.creatorName}</span>
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleShareRoom}
                  disabled={sharing}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full font-bold text-xs w-full sm:w-auto
                             transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sharing ? "Compartilhando..." : "🔗 Compartilhar"}
                </button>
                <button
                  onClick={handleCopyRoomLink}
                  disabled={copyingLink}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-xs w-full sm:w-auto
                             transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {copyingLink ? "Copiando..." : "📋 Copiar Link da Sala"}
                </button>
                <button
                  onClick={handleRefreshRoom}
                  disabled={refreshingRoom}
                  className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-full font-bold text-xs w-full sm:w-auto
                             transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {refreshingRoom ? "Atualizando..." : "🔄 Atualizar Sala"}
                </button>
                {(actionFeedback === "share-success" || actionFeedback === "copied") && (
                  <span className="text-xs text-green-600 font-semibold">Link copiado/compartilhado com sucesso.</span>
                )}
                {actionFeedback === "share-error" && (
                  <span className="text-xs text-red-500 font-semibold">Não foi possível copiar/compartilhar agora.</span>
                )}
                {actionFeedback === "refresh-success" && (
                  <span className="text-xs text-green-600 font-semibold">Sala atualizada.</span>
                )}
                {actionFeedback === "refresh-error" && (
                  <span className="text-xs text-red-500 font-semibold">Falha ao atualizar a sala.</span>
                )}
              </div>
            </div>

            {/* Cronômetro */}
            {!room.revealed && (
              <div className={`flex flex-col items-center gap-1 min-w-[90px] w-full sm:w-auto ${isUrgent ? "text-red-500" : "text-purple-700"}`}>
                <span
                  className={`text-2xl sm:text-3xl font-bold ${isUrgent ? "timer-blink" : ""}`}
                  style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
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
                className="anger-gradient text-white px-6 py-2.5 rounded-full font-bold text-sm w-full sm:w-auto
                           hover:shadow-lg transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {revealing ? "Revelando..." : "🃏 Revelar Votos Agora"}
              </button>
              <button
                onClick={handleHonkPendingVoters}
                disabled={honking}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold text-sm w-full sm:w-auto
                           hover:shadow-lg transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {honking ? "Buzinando..." : "📣 Buzinar Não Votantes"}
              </button>
              <button
                onClick={handleDestroy}
                disabled={destroying}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-sm w-full sm:w-auto
                           hover:shadow-lg transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {destroying ? "Destruindo..." : "🗑️ Destruir Sala"}
              </button>
              {actionFeedback === "honk-success" && (
                <p className="text-green-600 text-xs w-full font-semibold">
                  Buzina enviada para quem ainda não votou.
                </p>
              )}
              {actionFeedback === "honk-empty" && (
                <p className="text-purple-500 text-xs w-full font-semibold">
                  Todos já votaram.
                </p>
              )}
              {actionFeedback === "honk-error" && (
                <p className="text-red-500 text-xs w-full font-semibold">
                  Não foi possível buzinar agora.
                </p>
              )}
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
          <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8">
            <h3 className="text-2xl text-purple-800 mb-2 text-center" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
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
                  <span className="text-5xl font-bold text-yellow-700" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
                    {winnerVote}
                  </span>
                  {winCard && <span className="text-sm text-yellow-600 mt-1">{winCard.label}</span>}
                </div>
              );
            })()}

            {/* Grid de participantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {room.participants.map((p, i) => {
                const card = CARDS.find((c) => c.value === p.vote);
                const avatarCls = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                const isHighest = hasOutliers && p.vote === maxVote;
                const isLowest  = hasOutliers && p.vote === minVote;
                const hasVote = p.vote != null;
                const needsJustify = hasVote && winnerVote != null && p.vote !== winnerVote;

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
                    }`} style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
                      {p.vote != null ? p.vote : "—"}
                    </span>
                    {card && <span className={`text-xs mt-0.5 ${isHighest ? "text-red-400" : isLowest ? "text-blue-400" : "text-purple-400"}`}>{card.label}</span>}
                    {needsJustify && (
                      <span className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full
                        ${
                          isHighest
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : isLowest
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-purple-100 text-purple-700 border border-purple-200"
                        }`}>
                        {isHighest ? "⬆ Justificar" : isLowest ? "⬇ Justificar" : "🗣️ Justificar"}
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
          <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8">
            <h3 className="text-2xl text-purple-800 mb-2" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
              {isVoting ? "Escolha sua carta" : "Pronto para votar?"}
            </h3>
            <p className="text-purple-400 text-sm mb-6">
              {isVoting ? "Clique em uma carta para registrar seu voto." : "Clique em 'Votar' para revelar as cartas."}
            </p>

            {!isVoting ? (
              <button
                onClick={startVoting}
                className="joy-gradient text-white px-8 py-3 rounded-full font-bold w-full sm:w-auto
                           hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Votar 🗳️
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CARDS.map((card) => (
                  <button
                    key={card.value}
                    onClick={() => castVote(card.value)}
                    disabled={voting}
                    className={`${card.cls} p-3 sm:p-4 rounded-2xl text-center
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
          <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 text-center">
            {(() => {
              const voted = CARDS.find((c) => c.value === me?.vote);
              return voted ? (
                <img src={voted.img} alt={voted.label} className="w-24 h-24 mx-auto mb-3 object-contain drop-shadow-lg" />
              ) : (
                <div className="text-5xl mb-3">✅</div>
              );
            })()}
            <h3 className="text-2xl text-purple-800 mb-1" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
              Voto registrado!
            </h3>
            <p className="text-purple-400 text-sm mb-4">
              Você votou <span className="font-bold text-purple-700">{me?.vote}</span>
              {" — "}{CARDS.find((c) => c.value === me?.vote)?.label}.
              <br />Aguardando o criador revelar ou o tempo acabar...
            </p>
            <button
              onClick={unvote}
              className="text-sm text-purple-500 underline hover:text-purple-700 transition-colors"
            >
              Alterar voto
            </button>
          </div>
        )}

        {/* ── Lista de participantes ───────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8">
          <h3 className="text-2xl text-purple-800 mb-6" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
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
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border
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
                        Entrou às{" "}
                        {mounted
                          ? new Date(p.joinedAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
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
