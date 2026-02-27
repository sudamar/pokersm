"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function CreateRoomPage() {
  const router = useRouter();
  const [creatorName, setCreatorName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cookieName, setCookieName] = useState("");

  // Pré-preenche o nome a partir do cookie
  useEffect(() => {
    const saved = readNameCookie();
    if (saved) {
      setCreatorName(saved);
      setCookieName(saved);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorName, roomName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao criar sala");
        return;
      }

      const { roomId } = await res.json();
      // Salva o nome no cookie (30 dias) e no sessionStorage da sala
      writeNameCookie(creatorName.trim());
      sessionStorage.setItem(`room-${roomId}-name`, creatorName.trim());
      router.push(`/room/${roomId}`);
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
              Scrum Emotions
            </h1>
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="flex items-center justify-center min-h-[calc(100vh-72px)] px-4 py-12">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
          {/* Icon + title */}
          <div className="text-center mb-8">
            <img
              className="w-24 h-24 mx-auto mb-4"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/4630205237-77960acc9522d915fd9b.png"
              alt="Joy"
            />
            <h2
              className="text-3xl text-purple-800"
              style={{ fontFamily: "'Fredoka One', cursive" }}
            >
              Criar Sala
            </h2>
            <p className="text-purple-500 mt-2 text-sm">
              Configure sua sessão de Planning Poker
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
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Ex: Ana Paula"
                required
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3
                           text-purple-800 placeholder-purple-300
                           focus:outline-none focus:border-purple-500 transition-colors"
              />
              {cookieName && creatorName === cookieName && (
                <p className="text-xs text-purple-400 mt-1">Último nome utilizado</p>
              )}
            </div>

            <div>
              <label className="block text-purple-700 font-semibold mb-1 text-sm">
                História para Pontuar
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Ex: Como usuário quero fazer login"
                required
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3
                           text-purple-800 placeholder-purple-300
                           focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full joy-gradient text-white py-3 rounded-full font-bold text-lg
                         hover:shadow-xl transform hover:scale-105 transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Criando..." : "Criar Sala 🎉"}
            </button>
          </form>

          <p className="text-center text-purple-400 text-sm mt-6">
            Quer entrar em uma sala existente?{" "}
            <Link href="/join-room" className="text-purple-600 font-semibold hover:underline">
              Entrar aqui
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
