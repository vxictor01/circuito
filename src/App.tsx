import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { Dashboard } from "./pages/Dashboard";
import { Festivals } from "./pages/Festivals";
import { FestivalDetail } from "./pages/FestivalDetail";
import { Films, FilmDetail } from "./pages/Films";
import { Submissions } from "./pages/Submissions";
import { Calendar } from "./pages/Calendar";
import { Data } from "./pages/Data";
import { Settings } from "./pages/Settings";
import { norm } from "./migrations/legacy";
import { canInstall, installApp, registerPWA } from "./pwa";
const nav = [
  ["", "Visão geral", "01"],
  ["festivais", "Festivais", "02"],
  ["filmes", "Filmes", "03"],
  ["inscricoes", "Inscrições", "04"],
  ["calendario", "Calendário", "05"],
  ["dados", "Dados e backup", "06"],
  ["configuracoes", "Configurações", "07"],
];
export function App() {
  const { db, loading, error, notice, setNotice } = useStore();
  const [route, setRoute] = useState(location.hash.slice(2));
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installable, setInstallable] = useState(canInstall());
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const onHash = () => {
      setRoute(location.hash.slice(2));
      setMenu(false);
      setSearch("");
      window.scrollTo(0, 0);
      setTimeout(() => main.current?.focus({ preventScroll: true }), 0);
    };
    const onNetwork = () => setOnline(navigator.onLine);
    const onInstall = () => setInstallable(canInstall());
    window.addEventListener("hashchange", onHash);
    window.addEventListener("online", onNetwork);
    window.addEventListener("offline", onNetwork);
    window.addEventListener("circuito-installable", onInstall);
    void registerPWA(setUpdate).catch(() => {});
    const keyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setSearch("");
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", onNetwork);
      window.removeEventListener("offline", onNetwork);
      window.removeEventListener("circuito-installable", onInstall);
      document.removeEventListener("keydown", keyboard);
    };
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 7000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const [path, id] = route.split("?")[0].split("/");
  const q = norm(search);
  const callIds = q
    ? new Set(
        db.calls
          .filter((c) => norm(c.name + " " + c.notes).includes(q))
          .map(
            (c) => db.editions.find((e) => e.id === c.editionId)?.festivalId,
          ),
      )
    : new Set();
  const hits = q
    ? [
        ...db.festivals
          .filter(
            (f) =>
              callIds.has(f.id) ||
              norm(
                [
                  f.name,
                  ...f.aliases,
                  f.country,
                  f.city,
                  ...f.tags,
                  ...f.genres,
                  f.personalNotes,
                ].join(" "),
              ).includes(q),
          )
          .slice(0, 6)
          .map((f) => ({
            title: f.name,
            detail: `Festival · ${f.city}`,
            href: `#/festivais/${f.id}`,
          })),
        ...db.films
          .filter((f) =>
            norm([f.title, f.internationalTitle, f.notes].join(" ")).includes(
              q,
            ),
          )
          .slice(0, 3)
          .map((f) => ({
            title: f.title,
            detail: "Filme",
            href: `#/filmes/${f.id}`,
          })),
      ]
    : [];
  let page;
  if (id && path === "festivais") page = <FestivalDetail id={id} />;
  else if (id && path === "filmes") page = <FilmDetail id={id} />;
  else if (path === "festivais") page = <Festivals key={route} />;
  else if (path === "filmes") page = <Films />;
  else if (path === "inscricoes") page = <Submissions />;
  else if (path === "calendario") page = <Calendar />;
  else if (path === "dados") page = <Data />;
  else if (path === "configuracoes") page = <Settings />;
  else if (path === "") page = <Dashboard />;
  else
    page = (
      <div className="empty">
        <h1>Página não encontrada</h1>
        <a href="#/">Voltar à visão geral</a>
      </div>
    );
  async function activateUpdate() {
    if (!update?.waiting) return;
    if (document.querySelector("dialog[open]")) {
      setNotice("Salve ou feche o formulário antes de atualizar a aplicação.");
      return;
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    update.waiting.postMessage({ type: "SKIP_WAITING" });
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <div className="app-shell">
        <aside className={`sidebar ${menu ? "mobile-open" : ""}`}>
          <a href="#/" className="brand" aria-label="Circuito, visão geral">
            circuito<span>.</span>
          </a>
          <p className="brand-caption">
            Pesquisa e circulação
            <br />
            de filmes.
          </p>
          <nav aria-label="Navegação principal">
            {nav.map(([url, title, n]) => (
              <a
                className={path === url ? "active" : ""}
                key={url}
                href={`#/${url}`}
                aria-current={path === url ? "page" : undefined}
              >
                <span className="nav-number">{n}</span>
                {title}
                {url === "festivais" && (
                  <span className="nav-count">{db.festivals.length}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className={`connection ${online ? "" : "offline"}`}>
              <i aria-hidden="true" />
              {online ? "Armazenamento local" : "Modo offline"}
            </span>
            <p>Seu acervo, no seu navegador.</p>
            {installable && (
              <button onClick={installApp}>Instalar Circuito ↗</button>
            )}
            <span className="version">v1.0 / schema {db.schemaVersion}</span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="mobile-toggle"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <div className="global-search">
              <span aria-hidden="true">⌕</span>
              <input
                ref={searchRef}
                aria-label="Busca global"
                autoComplete="off"
                placeholder="Pesquisar no Circuito"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>Ctrl K</kbd>
              {search && (
                <div className="search-results">
                  <div className="small muted">
                    Busca em festivais, locais, tags, categorias, notas e filmes
                  </div>
                  {hits.length ? (
                    hits.map((h) => (
                      <a href={h.href} key={h.href}>
                        <strong>{h.title}</strong>
                        <small>{h.detail}</small>
                      </a>
                    ))
                  ) : (
                    <p>Nenhum resultado.</p>
                  )}
                  <a href={`#/festivais?q=${encodeURIComponent(search)}`}>
                    Ver todos os resultados de festivais →
                  </a>
                </div>
              )}
            </div>
            <span className="topbar-note">
              {db.settings.name || "Meu espaço"}{" "}
              <span className="avatar" aria-hidden="true">
                {db.settings.name?.[0]?.toUpperCase() || "C"}
              </span>
            </span>
          </header>
          {update && (
            <div className="update-banner">
              <span>
                Uma nova versão do Circuito está pronta. Seus dados locais serão
                preservados.
              </span>
              <button onClick={activateUpdate}>Atualizar aplicação</button>
            </div>
          )}
          <main id="main-content" tabIndex={-1} ref={main} className="content">
            {loading ? (
              <div className="loading" role="status">
                Abrindo seu acervo…
              </div>
            ) : error ? (
              <section className="panel form-error" role="alert">
                <h1>Não foi possível abrir os dados.</h1>
                <p>{error}</p>
                <p>
                  Nenhum reset foi executado. Feche outras abas do Circuito,
                  confira o armazenamento do navegador e tente atualizar a
                  página.
                </p>
              </section>
            ) : (
              page
            )}
          </main>
          <footer className="app-footer">
            <span>Circuito · um arquivo de possibilidades</span>
            <a href="#/dados">Dados locais. Backup portátil.</a>
          </footer>
        </div>
      </div>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
