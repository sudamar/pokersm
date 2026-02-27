/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header id="header" className="rainbow-gradient shadow-lg relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img
                className="w-9 h-9 sm:w-12 sm:h-12 rounded-full"
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/139a8f0dd8-722fb40d7abea17e7acb.png"
                alt="Inside Out Joy character head icon bright yellow happy face"
              />
              <h1 className="text-xl sm:text-3xl text-white" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
                Suda Poker Planing
              </h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#hero" className="text-white hover:text-yellow-200 transition-colors font-semibold">Início</a>
              <a href="#features" className="text-white hover:text-yellow-200 transition-colors font-semibold">Como Funciona</a>
              <a href="mailto:sudamar@gmail.com" className="text-white hover:text-yellow-200 transition-colors font-semibold">Contato</a>
            </nav>
            <div className="hidden sm:flex space-x-3">
              <button disabled title="Em breve" className="bg-white text-purple-400 px-4 sm:px-6 py-2 rounded-full font-semibold opacity-50 cursor-not-allowed text-sm sm:text-base">
                Entrar
              </button>
              <button disabled title="Em breve" className="bg-yellow-400 text-purple-500 px-4 sm:px-6 py-2 rounded-full font-semibold opacity-50 cursor-not-allowed text-sm sm:text-base">
                Cadastrar
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20">
          <img
            className="w-full h-full object-cover"
            src="https://storage.googleapis.com/uxpilot-auth.appspot.com/cae39086e4-0dad0fd79aa57cf5a0fb.png"
            alt="Inside Out characters Joy Sadness Anger Fear Disgust floating around colorful"
          />
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────── */}
      <main id="main-content">

        {/* HERO */}
        <section id="hero" className="h-[600px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 opacity-90" />
          <div className="container mx-auto px-6 h-full flex items-center relative z-10">
            <div className="w-1/2">
              <h1
                className="text-6xl text-purple-800 mb-6 leading-tight"
                style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
              >
                Planning Poker {" "}
                <span className="text-yellow-500">SudaSimples</span>
              </h1>
              <p className="text-xl text-purple-700 mb-8 font-semibold">
                Transforme suas estimativas Scrum numa experiência divertida com os personagens do Divertida Mente!
              </p>
              <div className="flex space-x-4">
                <Link
                  href="/create-room"
                  className="joy-gradient text-white px-8 py-4 rounded-full text-lg font-bold hover:shadow-xl transform hover:scale-105 transition-all inline-flex items-center justify-center"
                >
                  Criar Sala
                </Link>
                <Link
                  href="/join-room"
                  className="sadness-gradient text-white px-8 py-4 rounded-full text-lg font-bold hover:shadow-xl transform hover:scale-105 transition-all inline-flex items-center justify-center"
                >
                  Entrar em Sala
                </Link>
              </div>
            </div>
            <div className="w-1/2 relative">
              <img
                className="w-full h-auto max-h-96 object-contain"
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/51b6d630b3-4f84dfd1069d258f72de.png"
                alt="Inside Out all five emotions Joy Sadness Anger Fear Disgust group happy colorful illustration"
              />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <h2
              className="text-4xl text-center text-purple-800 mb-16"
              style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
            >
              Como Funciona o Suda Poker?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-yellow-100 to-yellow-200 transform hover:scale-105 transition-all">
                <img
                  className="w-24 h-24 mx-auto mb-6"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/2e2e239206-2bfb959a3e1870afe747.png"
                  alt="Inside Out Joy character happy excited pointing up yellow bright"
                />
                <h3 className="text-2xl font-bold text-purple-800 mb-4">PO Cria a Sala</h3>
                <p className="text-purple-600">
                  O(A) Scrum Master cria uma sala e convida a equipe para participar das estimativas
                </p>
              </div>
              <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 transform hover:scale-105 transition-all">
                <img
                  className="w-24 h-24 mx-auto mb-6"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/a28acd6dd9-c83af1a232aa03ed00c4.png"
                  alt="Inside Out Sadness character thoughtful concentrated blue thinking"
                />
                <h3 className="text-2xl font-bold text-purple-800 mb-4">Equipe Vota</h3>
                <p className="text-purple-600">
                  Cada membro vota secretamente usando as emoções como pontuação
                </p>
              </div>
              <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-green-100 to-green-200 transform hover:scale-105 transition-all">
                <img
                  className="w-24 h-24 mx-auto mb-6"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/fc798fc30f-4ef39310d28f70262628.png"
                  alt="Inside Out all emotions celebrating together happy reveal moment colorful"
                />
                <h3 className="text-2xl font-bold text-purple-800 mb-4">Revelação</h3>
                <p className="text-purple-600">
                  Quando todos votam, as cartas são reveladas simultaneamente
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VOTING CARDS */}
        <section id="voting-cards" className="py-20 bg-gradient-to-br from-purple-100 to-pink-100">
          <div className="container mx-auto px-6">
            <h2
              className="text-4xl text-center text-purple-800 mb-16"
              style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
            >
              Sistema de Pontuação
            </h2>
            <div className="grid grid-cols-5 gap-6 max-w-4xl mx-auto">
              {[
                {
                  cls: "joy-gradient",
                  value: "1",
                  label: "Alegria",
                  img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/4630205237-77960acc9522d915fd9b.png",
                  alt: "Inside Out Joy character super happy excited yellow bright smiling",
                },
                {
                  cls: "sadness-gradient",
                  value: "3",
                  label: "Tristeza",
                  img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/d6f07d7b19-02bb550c8da73f3de51b.png",
                  alt: "Inside Out Sadness character blue melancholic thoughtful",
                },
                {
                  cls: "anger-gradient",
                  value: "5",
                  label: "Raiva",
                  img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/bae099cc31-de6215dfe37efec57ea8.png",
                  alt: "Inside Out Anger character red angry frustrated fire",
                },
                {
                  cls: "fear-gradient",
                  value: "8",
                  label: "Medo",
                  img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/5077253ead-efa95800dc2bd05119cb.png",
                  alt: "Inside Out Fear character purple nervous worried anxious",
                },
                {
                  cls: "disgust-gradient",
                  value: "13",
                  label: "Nojinho",
                  img: "https://storage.googleapis.com/uxpilot-auth.appspot.com/56e592d5e9-d793ca6ba0d29dd6bbaa.png",
                  alt: "Inside Out Disgust character green disgusted sassy attitude",
                },
              ].map((card) => (
                <div
                  key={card.value}
                  className={`${card.cls} p-6 rounded-2xl text-center transform hover:scale-110 transition-all shadow-lg`}
                >
                  <img className="w-16 h-16 mx-auto mb-4" src={card.img} alt={card.alt} />
                  <h3 className="text-white font-bold text-2xl">{card.value}</h3>
                  <p className="text-white text-sm">{card.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="py-20 rainbow-gradient">
          <div className="container mx-auto px-6 text-center">
            <h2
              className="text-5xl text-white mb-8"
              style={{ fontFamily: "var(--font-fredoka-one), cursive" }}
            >
              Pronto para Começar?
            </h2>
            <p className="text-xl text-white mb-12 max-w-2xl mx-auto">
              Junte-se a milhares de equipes que já tornaram suas estimativas mais divertidas e eficientes!
            </p>
            <div className="flex justify-center space-x-6">
              <button disabled title="Em breve" className="bg-white text-purple-400 px-10 py-4 rounded-full text-xl font-bold opacity-50 cursor-not-allowed shadow-xl">
                Começar Agora
              </button>
              <button disabled title="Em breve" className="border-2 border-white text-white px-10 py-4 rounded-full text-xl font-bold opacity-50 cursor-not-allowed">
                Ver Demo
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer id="footer" className="bg-purple-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img
                  className="w-8 h-8 rounded-full"
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/478eefaf8c-84e8ad0045cc0301c20f.png"
                  alt="Inside Out Joy character head icon bright yellow"
                />
                <h3 className="text-xl" style={{ fontFamily: "var(--font-fredoka-one), cursive" }}>
                  SudaPoker
                </h3>
              </div>
              <p className="text-purple-300">
                Transformando estimativas em momentos de diversão e conexão.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-purple-300">
                <li><a href="#" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-purple-300">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Redes Sociais</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  {/* Twitter / X */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.731-8.835L2.058 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  {/* LinkedIn */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  {/* GitHub */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-purple-700 mt-8 pt-8 text-center text-purple-300">
            <p>© 2024 SudaPoker. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
