import { useState } from "react";
import { useStore } from "../store";
import { Heading } from "../components/Shared";
export function Settings() {
  const { db, change, setNotice } = useStore();
  const [settings, setSettings] = useState({ ...db.settings });
  return (
    <>
      <Heading
        title="Configurações"
        eyebrow="PREFERÊNCIAS / SEU ESPAÇO"
        description="Ajustes pequenos para o seu modo de pesquisar."
      />
      <section className="panel settings-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await change((d) => {
                d.settings = { ...d.settings, ...settings };
              });
              setNotice("Preferências salvas.");
            } catch {}
          }}
        >
          <div className="form-grid">
            <label>
              Seu nome
              <input
                value={settings.name}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, name: e.target.value }))
                }
              />
            </label>
            <label>
              Fuso padrão
              <select
                aria-label="Fuso padrão"
                value={settings.timezone}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, timezone: e.target.value }))
                }
              >
                {[
                  "America/Sao_Paulo",
                  "America/Manaus",
                  "America/Rio_Branco",
                  "Europe/Lisbon",
                  "Europe/Madrid",
                  "America/New_York",
                  "UTC",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Revisar fontes após (dias)
              <input
                required
                type="number"
                min="1"
                max="3650"
                value={settings.staleDays}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    staleDays: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Festivais por página
              <select
                aria-label="Festivais por página"
                value={settings.pageSize}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    pageSize: Number(e.target.value),
                  }))
                }
              >
                {[25, 50, 100, 200].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="primary" type="submit">
            Salvar preferências
          </button>
        </form>
      </section>
      <section className="panel settings-panel">
        <p className="eyebrow">CIRCUITO / VERSÃO 1.0</p>
        <h2>Um arquivo de circulação.</h2>
        <p>
          Construído para funcionar no seu navegador, com código aberto,
          armazenamento local e backup portátil. O catálogo informa o grau de
          verificação de cada fonte; editais e datas exigem revisão anual.
        </p>
        <p>
          Schema de dados: {db.schemaVersion} · Catálogo:{" "}
          {db.settings.catalogVersion}.
        </p>
        <a href="#/dados">Entender armazenamento e privacidade →</a>
      </section>
    </>
  );
}
