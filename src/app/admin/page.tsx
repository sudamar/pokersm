"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface AdminRoomSummary {
  id: string;
  name: string;
  creatorName: string;
  createdAt: string;
  revealed: boolean;
  participantsOnline: number;
  participants: Array<{
    name: string;
    vote: number | null;
    isScreenOpen: boolean;
  }>;
  votesCount: number;
  pendingVotes: number;
  winnerVote: number | null;
  voteDistribution: Record<number, number>;
}

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rooms, setRooms] = useState<AdminRoomSummary[]>([]);
  const [expandedParticipantsByRoom, setExpandedParticipantsByRoom] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const roomCount = rooms.length;
  const totalParticipants = useMemo(
    () => rooms.reduce((sum, room) => sum + room.participantsOnline, 0),
    [rooms]
  );

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rooms");
      if (res.status === 401) {
        setAuthenticated(false);
        setRooms([]);
        return;
      }
      if (!res.ok) {
        setError("Não foi possível carregar as salas.");
        return;
      }
      const data = (await res.json()) as AdminRoomSummary[];
      setRooms(data);
      setExpandedParticipantsByRoom((current) => {
        const next: Record<string, boolean> = {};
        for (const room of data) {
          if (current[room.id]) {
            next[room.id] = true;
          }
        }
        return next;
      });
      setAuthenticated(true);
    } catch {
      setError("Erro de conexão ao carregar salas.");
    } finally {
      setLoadingRooms(false);
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Falha no login");
        return;
      }
      setPassword("");
      setActionMessage("Login efetuado.");
      await fetchRooms();
    } catch {
      setError("Erro de conexão no login.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
      setRooms([]);
      setActionMessage("Sessão encerrada.");
    } catch {
      setError("Erro ao encerrar sessão.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleDestroyRoom(roomId: string) {
    const confirmed = window.confirm(
      "Deseja destruir esta sala? Todos os participantes serão desconectados."
    );
    if (!confirmed) return;

    setError("");
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Não foi possível destruir a sala.");
        return;
      }
      setActionMessage("Sala destruída com sucesso.");
      await fetchRooms();
    } catch {
      setError("Erro de conexão ao destruir sala.");
    }
  }

  function toggleParticipants(roomId: string) {
    setExpandedParticipantsByRoom((current) => ({
      ...current,
      [roomId]: !current[roomId],
    }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200">
      <header className="rainbow-gradient shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/">
            <h1
              className="text-2xl sm:text-3xl text-white cursor-pointer"
              style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
            >
              SudaPoker Admin
            </h1>
          </Link>
          {authenticated && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-60"
            >
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-5xl">
        {checkingSession ? (
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center">
            <p className="text-purple-600 font-semibold">Verificando sessão admin...</p>
          </div>
        ) : !authenticated ? (
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 max-w-md mx-auto">
            <h2
              className="text-2xl sm:text-3xl text-purple-800 mb-2 text-center"
              style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
            >
              Acesso Admin
            </h2>
            <p className="text-purple-500 text-sm text-center mb-6">
              Informe usuário e senha de administrador.
            </p>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-700 text-sm text-center">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-purple-700 font-semibold mb-1 text-sm">Usuário</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-purple-800 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-purple-700 font-semibold mb-1 text-sm">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-purple-800 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full joy-gradient text-white py-3 rounded-full font-bold text-lg disabled:opacity-60"
              >
                {loggingIn ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2
                    className="text-2xl sm:text-3xl text-purple-800"
                    style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
                  >
                    Salas do Servidor
                  </h2>
                  <p className="text-purple-500 text-sm mt-1">
                    {roomCount} salas • {totalParticipants} participantes online
                  </p>
                </div>
                <button
                  onClick={fetchRooms}
                  disabled={loadingRooms}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-2.5 rounded-full font-bold text-sm disabled:opacity-60"
                >
                  {loadingRooms ? "Atualizando..." : "Atualizar lista"}
                </button>
              </div>
              {actionMessage && (
                <p className="mt-3 text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2">
                  {actionMessage}
                </p>
              )}
              {error && (
                <p className="mt-3 text-sm text-red-700 bg-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl shadow-lg p-5 border border-purple-100"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-purple-400 uppercase tracking-wider font-bold">
                        Sala
                      </p>
                      <h3 className="text-xl text-purple-800 font-bold break-words">{room.name}</h3>
                      <p className="text-xs text-purple-400 mt-1 break-all">ID: {room.id}</p>
                      <p className="text-sm text-purple-600 mt-1">
                        Criador: <strong>{room.creatorName}</strong> •{" "}
                        {new Date(room.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <button
                        type="button"
                        onClick={() => toggleParticipants(room.id)}
                        className="bg-purple-50 rounded-lg px-3 py-2 text-purple-700 text-left hover:bg-purple-100 transition-colors"
                      >
                        Online: <strong>{room.participantsOnline}</strong>
                      </button>
                      <div className="bg-blue-50 rounded-lg px-3 py-2 text-blue-700">
                        Votaram: <strong>{room.votesCount}</strong>
                      </div>
                      <div className="bg-yellow-50 rounded-lg px-3 py-2 text-yellow-700">
                        Pendentes: <strong>{room.pendingVotes}</strong>
                      </div>
                      <div className="bg-green-50 rounded-lg px-3 py-2 text-green-700">
                        Vencedora: <strong>{room.winnerVote ?? "—"}</strong>
                      </div>
                    </div>
                  </div>

                  {expandedParticipantsByRoom[room.id] && (
                    <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/60 p-3 sm:p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-2">
                        Pessoas Online
                      </p>
                      {room.participants.length > 0 ? (
                        <div className="space-y-2">
                          {room.participants.map((participant, index) => (
                            <div
                              key={`${room.id}-${participant.name}-${index}`}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                participant.isScreenOpen
                                  ? "border-green-200 bg-green-100/70"
                                  : "border-slate-300 bg-slate-200/70"
                              }`}
                            >
                              <span className="font-semibold text-purple-700">{participant.name}</span>
                              <span className="text-purple-600">
                                Voto: <strong>{participant.vote ?? "Sem Voto"}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-purple-500">Nenhuma pessoa online.</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-purple-500 break-words">
                      Resultado:{" "}
                      {room.revealed
                        ? Object.keys(room.voteDistribution).length > 0
                          ? Object.entries(room.voteDistribution)
                              .sort((a, b) => Number(a[0]) - Number(b[0]))
                              .map(([vote, count]) => `${vote}(${count})`)
                              .join(" • ")
                          : "Sem votos registrados"
                        : "Votação ainda não revelada"}
                    </p>
                    <button
                      onClick={() => handleDestroyRoom(room.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full font-bold text-sm w-full sm:w-auto"
                    >
                      Destruir Sala
                    </button>
                  </div>
                </div>
              ))}

              {rooms.length === 0 && !loadingRooms && (
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-purple-500">
                  Nenhuma sala ativa no servidor.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
