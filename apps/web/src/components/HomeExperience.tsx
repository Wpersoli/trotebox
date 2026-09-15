"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HomeAccess } from "./HomeAccess";
import "./HomeExperience.css";

const experiences = [
  {
    title: "Caixa-surpresa",
    description: "Situações inusitadas para pegar de surpresa.",
    headline: "A próxima risada começa aqui.",
    subtitle: "Escolha uma experiência e prepare a surpresa.",
    image: "/brand/hero-gift-v2.webp",
    alt: "Mascote laranja rindo ao telefone em uma caixa de presente roxa",
    script: "Entrega impossível",
    text: "Olá! Temos uma entrega especial: um pacote de bom humor. O problema é que ele começou a rir e agora não cabe mais na caixa. Você teria um espaço para uma gargalhada?",
  },
  {
    title: "Palco de comédia",
    description: "Personagens hilários e roteiros imprevisíveis.",
    headline: "Uma ligação. Muitas risadas.",
    subtitle: "Roteiros com personalidade para surpreender com bom humor.",
    image: "/brand/hero-stage-v3.webp",
    alt: "Mascote de comédia com telefone em um palco iluminado",
    script: "Pesquisa muito séria",
    text: "Boa tarde! Estamos fazendo uma pesquisa muito séria: quando você procura uma coisa e encontra outra, isso conta como promoção? E se esquecer a resposta, podemos entrevistar a sua memória?",
  },
  {
    title: "Conexão de risadas",
    description: "Boas histórias para aproximar e divertir.",
    headline: "Conecte a chamada. Solte a risada.",
    subtitle: "Escolha seu roteiro e acompanhe cada surpresa.",
    image: "/brand/hero-connection-v3.webp",
    alt: "Mascote ao telefone cercado de balões de conversa",
    script: "Mensagem do futuro",
    text: "Alô, aqui é do futuro! Estou ligando para avisar que amanhã você vai lembrar de uma coisa importante. Infelizmente, eu também esqueci o que era. Mas pode anotar: sorrir continua funcionando!",
  },
] as const;

function Icon({
  name,
}: {
  name:
    | "play"
    | "pause"
    | "left"
    | "right"
    | "home"
    | "search"
    | "help"
    | "user"
    | "menu"
    | "close";
}) {
  const paths: Record<string, React.ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="4" />
      </>
    ),
    left: <path d="m15 5-7 7 7 7" />,
    right: <path d="m9 5 7 7-7 7M4 12h12" />,
    home: (
      <>
        <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17v.1" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    menu: <path d="M3 5h18M3 12h18M3 19h18" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function HomeExperience() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [activeNav, setActiveNav] = useState("inicio");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const current = experiences[slide] ?? experiences[0];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (
      paused ||
      reducedMotion ||
      hovered ||
      focused ||
      preview !== null ||
      menu
    )
      return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setSlide((value) => (value + 1) % experiences.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, hovered, focused, preview, menu]);
  useEffect(() => {
    const update = () =>
      setActiveNav(window.location.hash.slice(1) || "inicio");
    window.addEventListener("hashchange", update);
    update();
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  function openPreview(index: number) {
    trigger.current = document.activeElement as HTMLElement;
    setPreview(index);
    setPlaying(false);
    setAudioError("");
    dialog.current?.showModal();
  }
  function stopAudio() {
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
    }
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }
  function closePreview() {
    stopAudio();
    dialog.current?.close();
    setPreview(null);
    trigger.current?.focus();
  }
  function playPreview() {
    if (playing) {
      stopAudio();
      return;
    }
    if (!("speechSynthesis" in window)) {
      setAudioError(
        "Este navegador não oferece narração. Você pode ler a prévia abaixo.",
      );
      return;
    }
    const speech = new SpeechSynthesisUtterance(
      (experiences[preview ?? 0] ?? experiences[0]).text,
    );
    speech.lang = "pt-BR";
    speech.rate = 1;
    speech.pitch = 1.08;
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang === "pt-BR");
    if (voice) speech.voice = voice;
    speech.onend = () => setPlaying(false);
    speech.onerror = () => {
      setPlaying(false);
      setAudioError(
        "Não foi possível reproduzir a voz neste dispositivo. A prévia em texto está disponível abaixo.",
      );
    };
    utterance.current = speech;
    setAudioError("");
    setPlaying(true);
    window.speechSynthesis.speak(speech);
  }
  function changeSlide(index: number) {
    setSlide((index + experiences.length) % experiences.length);
    setPaused(true);
  }
  function navigate() {
    setMenu(false);
  }

  return (
    <div className="experience-home" id="inicio">
      <header className="xp-header">
        <div className="xp-container xp-header-inner">
          <Link href="/" className="xp-brand" aria-label="TroteBox — início">
            <Image
              src="/brand/icon-64.png"
              width={52}
              height={52}
              alt=""
              priority
            />
            <span>
              TroteBox
              <span className="xp-brand-spark" aria-hidden="true">
                ✦
              </span>
            </span>
          </Link>
          <nav
            className="xp-desktop-nav"
            aria-label="Navegação da página inicial"
          >
            <a href="#como-funciona">Como funciona</a>
            <a href="#experiencias">Experiências</a>
            <a href="#faq">Dúvidas</a>
          </nav>
          <a href="#acesso" className="xp-login">
            Entrar
          </a>
          <button
            className="xp-menu-toggle"
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
            aria-controls="xp-menu"
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
        {menu && (
          <nav
            id="xp-menu"
            className="xp-menu"
            aria-label="Menu móvel"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenu(false);
                document
                  .querySelector<HTMLButtonElement>(".xp-menu-toggle")
                  ?.focus();
              }
            }}
          >
            <a href="#como-funciona" onClick={navigate}>
              Como funciona
            </a>
            <a href="#experiencias" onClick={navigate}>
              Experiências
            </a>
            <a href="#precos" onClick={navigate}>
              Créditos
            </a>
            <a href="#faq" onClick={navigate}>
              Dúvidas
            </a>
            <a href="#acesso" onClick={navigate}>
              Entrar na minha conta
            </a>
          </nav>
        )}
      </header>
      <section
        className="xp-hero"
        aria-roledescription="carrossel"
        aria-label="Experiências TroteBox"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false);
        }}
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchX.current !== null) {
            const delta =
              (event.changedTouches[0]?.clientX ?? touchX.current) -
              touchX.current;
            if (Math.abs(delta) > 60) changeSlide(slide + (delta < 0 ? 1 : -1));
          }
          touchX.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            changeSlide(slide + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}
      >
        <div className="xp-container xp-hero-inner">
          <div className="xp-hero-copy" aria-live={paused ? "polite" : "off"}>
            <h1 aria-label={current.headline}>{slide === 0 ? <><span>A próxima</span><span>risada começa</span><span>aqui.</span></> : current.headline}</h1>
            <p>{current.subtitle}</p>
            <div className="xp-hero-actions">
              <a href="#experiencias" className="xp-primary">
                Explorar trotes <Icon name="right" />
              </a>
              <button className="xp-preview" onClick={() => openPreview(slide)}>
                <span className="xp-play-circle">
                  <Icon name="play" />
                </span>
                Ouvir uma prévia
              </button>
            </div>
          </div>
          <div
            className="xp-hero-art"
            key={current.image}
          >
            <Image
              src={current.image}
              width={1254}
              height={1254}
              sizes="(max-width: 700px) 100vw, 55vw"
              alt={current.alt}
              priority={slide === 0}
            />
          </div>
          <div className="xp-carousel-controls">
            <button
              aria-label="Experiência anterior"
              onClick={() => changeSlide(slide - 1)}
            >
              <Icon name="left" />
            </button>
            <div
              className="xp-dots"
              role="group"
              aria-label="Selecionar experiência"
            >
              {experiences.map((experience, i) => (
                <button
                  key={experience.title}
                  aria-label={`Mostrar ${experience.title}`}
                  aria-pressed={i === slide}
                  className={slide === i ? "selected" : ""}
                  onClick={() => changeSlide(i)}
                >
                  <span />
                </button>
              ))}
            </div>
            <button
              aria-label={
                paused || reducedMotion
                  ? "Reproduzir carrossel"
                  : "Pausar carrossel"
              }
              onClick={() => {
                if (reducedMotion) setReducedMotion(false);
                setPaused(!(paused || reducedMotion));
              }}
            >
              <Icon name={paused || reducedMotion ? "play" : "pause"} />
            </button>
            <button
              aria-label="Próxima experiência"
              onClick={() => changeSlide(slide + 1)}
            >
              <Icon name="right" />
            </button>
          </div>
        </div>
      </section>
      <section className="xp-discovery" id="experiencias">
        <div className="xp-container xp-discovery-grid">
          <div className="xp-experiences">
            <h2>Qual é o clima da surpresa?</h2>
            <p>Cada trote é uma nova história. Escolha o seu momento.</p>
            <div className="xp-cards">
              {experiences.map((experience, i) => (
                <article
                  className={`xp-card xp-card-${i}`}
                  key={experience.title}
                >
                  <div className="xp-card-art" aria-hidden="true" />
                  <div className="xp-card-copy">
                    <h3>{experience.title}</h3>
                    <p>{experience.description}</p>
                    <button
                      onClick={() => openPreview(i)}
                      aria-label={`Ouvir prévia de ${experience.title}`}
                    >
                      <span className="xp-play-circle">
                        <Icon name="play" />
                      </span>
                      Ouvir prévia
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="xp-access" id="acesso">
            <HomeAccess compact />
          </div>
          <ol className="xp-steps" id="como-funciona">
            <li>
              <span>1</span>
              <div>
                <h3>Escolha</h3>
                <p>Selecione a experiência ideal para o momento.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Personalize</h3>
                <p>Confira o roteiro e os detalhes do contato autorizado.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Compartilhe a diversão</h3>
                <p>Prepare a surpresa e acompanhe o resultado.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
      <nav
        className="xp-bottom-nav"
        aria-label="Navegação móvel da página inicial"
      >
        {(
          [
            { id: "inicio", label: "Início", icon: "home" },
            { id: "experiencias", label: "Experiências", icon: "search" },
            { id: "faq", label: "Dúvidas", icon: "help" },
            { id: "acesso", label: "Entrar", icon: "user" },
          ] as const
        ).map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={activeNav === item.id ? "active" : ""}
            aria-current={activeNav === item.id ? "location" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      <dialog
        className="xp-dialog"
        ref={dialog}
        aria-labelledby="preview-title"
        onCancel={(event) => {
          event.preventDefault();
          closePreview();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePreview();
        }}
      >
        <div className="xp-dialog-content">
          <button
            className="xp-dialog-close"
            aria-label="Fechar prévia"
            onClick={closePreview}
          >
            <Icon name="close" />
          </button>
          <span className="xp-label">UMA AMOSTRA DO BOM HUMOR</span>
          <h2 id="preview-title">
            {(experiences[preview ?? 0] ?? experiences[0]).script}
          </h2>
          <p className="xp-preview-disclosure">
            Demonstração narrada pela voz do seu dispositivo. O áudio da chamada
            pode ser diferente.
          </p>
          <blockquote>
            {(experiences[preview ?? 0] ?? experiences[0]).text}
          </blockquote>
          <button className="xp-primary" onClick={playPreview}>
            <Icon name={playing ? "pause" : "play"} />
            {playing ? "Parar prévia" : "Ouvir demonstração"}
          </button>
          {audioError && <p role="alert">{audioError}</p>}
          <a
            href="/catalog/"
            className="xp-catalog-link"
            onClick={closePreview}
          >
            Escolher no catálogo <Icon name="right" />
          </a>
        </div>
      </dialog>
    </div>
  );
}
