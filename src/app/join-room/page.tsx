"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Room } from "@/lib/types";

type RoomSummary = Pick<Room, "id" | "name" | "creatorName" | "participants">;

const COOKIE_NAME = "scrum-emotions-name";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function readNameCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function writeNameCookie(name: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(name)}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

function JoinRoomPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedRoomId = (searchParams.get("roomId") ?? "").trim();
  const [name, setName] = useState("");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [cookieName, setCookieName] = useState("");

  // Pré-preenche o nome a partir do cookie
  useEffect(() => {
    const saved = readNameCookie();
    if (saved) {
      setName(saved);
      setCookieName(saved);
    }
  }, []);

  // Busca sala específica quando vem de link compartilhado.
  // Caso contrário, busca lista de salas.
  useEffect(() => {
    async function fetchRooms() {
      setFetching(true);
      setError("");

      if (sharedRoomId) {
        setSelectedRoomId("");
        try {
          const res = await fetch(`/api/rooms/${encodeURIComponent(sharedRoomId)}`);
          if (!res.ok) {
            setRooms([]);
            setSelectedRoomId("");
            setError("A sala compartilhada não foi encontrada ou já expirou.");
            return;
          }

          const room = (await res.json()) as Room;
          const summary: RoomSummary = {
            id: room.id,
            name: room.name,
            creatorName: room.creatorName,
            participants: room.participants,
          };
          setRooms([summary]);
          setSelectedRoomId(summary.id);
          return;
        } catch {
          setRooms([]);
          setSelectedRoomId("");
          setError("Erro ao carregar a sala compartilhada.");
          return;
        } finally {
          setFetching(false);
        }
      }

      try {
        const res = await fetch("/api/rooms");
        const data = await res.json();
        setRooms(data);
        if (data.length > 0) setSelectedRoomId(data[0].id);
        else setSelectedRoomId("");
      } catch {
        setError("Erro ao carregar salas.");
      } finally {
        setFetching(false);
      }
    }
    fetchRooms();
  }, [sharedRoomId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetRoomId = sharedRoomId || selectedRoomId;
    if (!targetRoomId) {
      setError("Selecione uma sala.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(targetRoomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao entrar na sala.");
        return;
      }

      // Salva o nome no cookie (30 dias) e no sessionStorage da sala
      writeNameCookie(name.trim());
      sessionStorage.setItem(`room-${targetRoomId}-name`, name.trim());
      router.push(`/room/${targetRoomId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200">
      {/* Header */}
      <header className="rainbow-gradient shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <h1
              className="text-3xl text-white cursor-pointer"
              style={{ fontFamily: "'Fredoka One', cursive" }}
            >
              SudaPoker
            </h1>
          </Link>
        </div>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-72px)] px-4 py-12">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
          {/* Icon + title */}
          <div className="text-center mb-8">
            <img
              className="w-24 h-24 mx-auto mb-4"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/a28acd6dd9-c83af1a232aa03ed00c4.png"
              alt="Sadness"
            />
            <h2
              className="text-3xl text-purple-800"
              style={{ fontFamily: "'Fredoka One', cursive" }}
            >
              Entrar em Sala
            </h2>
            <p className="text-purple-500 mt-2 text-sm">
              {sharedRoomId
                ? "Informe apenas seu nome para entrar na sala compartilhada"
                : "Escolha uma sala e informe seu nome"}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-100 text-red-700 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-purple-700 font-semibold mb-1 text-sm">
                Seu nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos"
                required
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3
                           text-purple-800 placeholder-purple-300
                           focus:outline-none focus:border-purple-500 transition-colors"
              />
              {cookieName && name === cookieName && (
                <p className="text-xs text-purple-400 mt-1">Último nome utilizado</p>
              )}
            </div>

            <div>
              <label className="block text-purple-700 font-semibold mb-1 text-sm">
                {sharedRoomId ? "Sala compartilhada" : "Sala disponível"}
              </label>

              {fetching ? (
                <div className="text-center py-6 text-purple-400 text-sm">
                  {sharedRoomId ? "Carregando sala..." : "Carregando salas..."}
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-purple-400 text-sm mb-3">
                    {sharedRoomId
                      ? "Não foi possível encontrar essa sala."
                      : "Nenhuma sala disponível no momento."}
                  </p>
                  <Link
                    href="/create-room"
                    className="text-purple-600 font-semibold hover:underline text-sm"
                  >
                    Criar uma sala →
                  </Link>
                </div>
              ) : sharedRoomId ? (
                <div className="w-full text-left px-4 py-3 rounded-2xl border-2 border-purple-500 bg-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-purple-800 text-sm">{rooms[0].name}</p>
                      <p className="text-purple-400 text-xs">
                        Criado por {rooms[0].creatorName}
                      </p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-semibold">
                      {rooms[0].participants.length}{" "}
                      {rooms[0].participants.length === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {rooms.map((room) => (
                    <button
                      type="button"
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all
                        ${
                          selectedRoomId === room.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-purple-100 bg-white hover:border-purple-300"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-purple-800 text-sm">
                            {room.name}
                          </p>
                          <p className="text-purple-400 text-xs">
                            Criado por {room.creatorName}
                          </p>
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-semibold">
                          {room.participants.length}{" "}
                          {room.participants.length === 1 ? "pessoa" : "pessoas"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedRoomId && (
              <button
                type="submit"
                disabled={loading}
                className="w-full sadness-gradient text-white py-3 rounded-full font-bold text-lg
                           hover:shadow-xl transform hover:scale-105 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Entrando..." : "Entrar na Sala 🚀"}
              </button>
            )}
          </form>

          <p className="text-center text-purple-400 text-sm mt-6">
            Quer criar uma sala?{" "}
            <Link href="/create-room" className="text-purple-600 font-semibold hover:underline">
              Criar aqui
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function JoinRoomFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200">
      <header className="rainbow-gradient shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <h1
            className="text-3xl text-white"
            style={{ fontFamily: "'Fredoka One', cursive" }}
          >
            SudaPoker
          </h1>
        </div>
      </header>
      <main className="flex items-center justify-center min-h-[calc(100vh-72px)] px-4 py-12">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center">
          <p className="text-purple-600 font-semibold">Carregando sala...</p>
        </div>
      </main>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={<JoinRoomFallback />}>
      <JoinRoomPageContent />
    </Suspense>
  );
}
