import { useState } from "react";
import { useStore } from "../store";
import { type Database, type ImportReport } from "../types";
import { readImport, mergeDatabases } from "../migrations";
import {
  backupText,
  downloadText,
  parseBackup,
  publicExportText,
} from "../utils/backup";
import { Heading, Stats, Badge } from "../components/Shared";
export function Data() {
  const { db, change, restore, setNotice } = useStore();
  const [pending, setPending] = useState<{
    db: Database;
    report: ImportReport;
    filename: string;
  } | null>(null);
  const [mode, setMode] = useState("merge");
  const [prefer, setPrefer] = useState("incoming");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [storage, setStorage] = useState("");
  async function exportBackup() {
    const now = new Date();
    const clone = structuredClone(db);
    clone.settings.lastBackup = now.toISOString();
    downloadText(
      `Circuito_backup_${now.toISOString().slice(0, 10)}.json`,
      backupText(clone, now),
    );
    await change((d) => {
      d.settings.lastBackup = now.toISOString();
    });
    setNotice("Backup exportado. Guarde o arquivo em um lugar seguro.");
  }
  async function inspect(file: File) {
    setError("");
    setPending(null);
    setReport(null);
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Arquivo maior que 50 MB.");
      const result = readImport(parseBackup(await file.text()));
      setPending({ ...result, filename: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function importData() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "replace") {
        downloadText(
          `Circuito_antes_de_restaurar_${new Date().toISOString().slice(0, 10)}.json`,
          backupText(db),
        );
        const next = structuredClone(pending.db);
        next.settings.catalogVersion = db.settings.catalogVersion;
        await restore(next);
      } else
        await change((latest) => {
          Object.assign(
            latest,
            mergeDatabases(
              latest,
              pending.db,
              prefer as "incoming" | "current",
            ),
          );
        });
      setReport(pending.report);
      setPending(null);
      setNotice(
        "Importação concluída. Os dados estão guardados neste navegador.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function persistent() {
    try {
      const granted = await navigator.storage?.persist?.();
      const estimate = await navigator.storage?.estimate?.();
      setStorage(
        `${granted ? "Armazenamento persistente autorizado pelo navegador." : "O navegador decide quando liberar espaço; mantenha seus backups."} Uso estimado: ${Math.round((estimate?.usage || 0) / 1024)} KB.`,
      );
    } catch {
      setStorage(
        "Este navegador não informa a persistência. Mantenha backups regulares.",
      );
    }
  }
  const lastReport = report || db.archive.importReports.at(-1);
  const catalogUpdates = db.archive.catalogUpdates.filter(
    (update) => !update.resolvedAt,
  );
  const editHistory = [...(db.archive.editHistory || [])].reverse();
  async function resolveCatalogUpdate(
    update: Database["archive"]["catalogUpdates"][number],
    apply: boolean,
  ) {
    await change((latest) => {
      const saved = latest.archive.catalogUpdates.find(
        (item) =>
          item.detectedAt === update.detectedAt &&
          (item.entityId || item.festivalId) ===
            (update.entityId || update.festivalId),
      );
      if (!saved) return;
      if (apply && saved.incoming) {
        const id = saved.entityId || saved.festivalId;
        const target =
          saved.entityType === "edition"
            ? latest.editions.find((item) => item.id === id)
            : saved.entityType === "call"
              ? latest.calls.find((item) => item.id === id)
              : latest.festivals.find((item) => item.id === id);
        if (target) Object.assign(target, saved.incoming);
      }
      saved.resolvedAt = new Date().toISOString();
    });
    setNotice(
      apply
        ? "Atualização pública aplicada; seus campos pessoais foram preservados."
        : "Sua versão foi mantida para este conflito do catálogo.",
    );
  }
  return (
    <>
      <Heading
        title="Dados e backup"
        eyebrow="PORTABILIDADE / PRESERVAÇÃO"
        description="Toda a sua base, em um arquivo que você controla."
      />
      <Stats
        items={[
          { label: "Festivais", value: db.festivals.length },
          { label: "Edições", value: db.editions.length },
          { label: "Chamadas", value: db.calls.length },
          {
            label: "Filmes e inscrições",
            value: db.films.length + db.submissions.length,
          },
        ]}
      />
      <div className="data-grid">
        <section className="panel">
          <p className="eyebrow">01 / EXPORTAR</p>
          <h2>Leve seu Circuito.</h2>
          <p>
            O backup inclui festivais, edições, chamadas, filmes, inscrições,
            configurações e informações legadas preservadas.
          </p>
          <button className="primary" disabled={busy} onClick={exportBackup}>
            Exportar backup
          </button>
          <button
            disabled={busy}
            onClick={() =>
              downloadText(
                `Circuito_dados_publicos_${new Date().toISOString().slice(0, 10)}.json`,
                publicExportText(db),
              )
            }
          >
            Exportar somente dados públicos
          </button>
          <p className="small muted">
            Última exportação:{" "}
            {db.settings.lastBackup
              ? new Date(db.settings.lastBackup).toLocaleString("pt-BR")
              : "ainda não registrada"}
            .
          </p>
          <div className="notice-inline">
            Seu backup contém também códigos, notas e links privados. Escolha
            onde guardá-lo.
          </div>
        </section>
        <section className="panel">
          <p className="eyebrow">02 / RESTAURAR OU MIGRAR</p>
          <h2>Traga seus dados.</h2>
          <p>
            Aceita backups desta versão e o JSON da primeira versão do Circuito.
            Você pode conferir o relatório antes de importar.
          </p>
          <label className="file-upload">
            Escolher backup JSON
            <input
              aria-label="Escolher backup JSON"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void inspect(f);
                e.target.value = "";
              }}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      {pending && (
        <section className="panel import-preview">
          <p className="eyebrow">PRÉVIA / NENHUM DADO ALTERADO AINDA</p>
          <h2>{pending.filename}</h2>
          <p>
            {pending.db.festivals.length} festivais ·{" "}
            {pending.db.editions.length} edições · {pending.db.calls.length}{" "}
            chamadas · {pending.db.films.length} filmes ·{" "}
            {pending.db.submissions.length} inscrições.
          </p>
          <Report report={pending.report} />
          <fieldset className="restore-options">
            <legend>Como importar?</legend>
            <label className="check">
              <input
                type="radio"
                name="mode"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
              />
              Mesclar com minha base atual
            </label>
            <label className="check">
              <input
                type="radio"
                name="mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Substituir toda a base atual pelo backup
            </label>
          </fieldset>
          {mode === "merge" ? (
            <label>
              Quando um ID já existir
              <select
                value={prefer}
                onChange={(e) => setPrefer(e.target.value)}
              >
                <option value="incoming">
                  Usar as informações do backup importado
                </option>
                <option value="current">
                  Manter minhas informações atuais
                </option>
              </select>
            </label>
          ) : (
            <p className="notice-inline">
              A restauração substituirá a base deste navegador. Um backup da
              base atual será baixado antes da troca.
            </p>
          )}
          <div className="actions">
            <button onClick={() => setPending(null)}>Cancelar</button>
            <button className="primary" disabled={busy} onClick={importData}>
              {busy ? "Importando…" : "Confirmar importação"}
            </button>
          </div>
        </section>
      )}
      {lastReport && (
        <section className="panel">
          <header className="section-heading">
            <h2>Relatório da última importação</h2>
            <button
              onClick={() =>
                downloadText(
                  "Circuito_relatorio_importacao.json",
                  JSON.stringify(lastReport, null, 2),
                )
              }
            >
              Exportar relatório
            </button>
          </header>
          <Report report={lastReport} />
        </section>
      )}
      <section className="panel">
        <p className="eyebrow">CATÁLOGO PÚBLICO / REVISÃO</p>
        <h2>Atualizações sem sobrescrever suas escolhas.</h2>
        <p>
          Quando o catálogo publicado muda um registro que já existe neste
          navegador, o Circuito preserva a versão local e mostra a diferença
          para sua decisão. Favoritos, notas e prioridades pessoais nunca são
          incluídos na substituição.
        </p>
        {catalogUpdates.length ? (
          <div className="import-report">
            {catalogUpdates.map((update) => (
              <div
                className="notice-inline"
                key={`${update.detectedAt}-${update.entityType}-${update.entityId || update.festivalId}`}
              >
                <strong>
                  {db.festivals.find(
                    (festival) => festival.id === update.festivalId,
                  )?.name || update.festivalId}
                </strong>
                <p>
                  {update.entityType || "festival"} · campos alterados:{" "}
                  {update.fields.join(", ")}
                </p>
                <div className="actions">
                  <button
                    onClick={() => void resolveCatalogUpdate(update, false)}
                  >
                    Manter minha versão
                  </button>
                  <button
                    className="primary"
                    disabled={!update.incoming}
                    onClick={() => void resolveCatalogUpdate(update, true)}
                  >
                    Aplicar dados públicos
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Nenhuma diferença pendente do catálogo público.
          </p>
        )}
      </section>
      <section className="panel">
        <p className="eyebrow">HISTÓRICO LOCAL / EDIÇÃO MANUAL</p>
        <h2>Alterações anteriores preservadas.</h2>
        <p>
          Ao editar um registro existente, o Circuito guarda localmente a versão
          anterior e os campos alterados. O histórico completo acompanha o
          backup privado e não entra na exportação pública.
        </p>
        {editHistory.length ? (
          <div className="import-report">
            {editHistory.slice(0, 20).map((entry, index) => (
              <details key={`${entry.changedAt}-${entry.entityId}-${index}`}>
                <summary>
                  {entry.table} · {entry.entityId} ·{" "}
                  {new Date(entry.changedAt).toLocaleString("pt-BR")}
                </summary>
                <p>Campos alterados: {entry.changedFields.join(", ")}.</p>
                <pre>{JSON.stringify(entry.before, null, 2)}</pre>
              </details>
            ))}
            {editHistory.length > 20 && (
              <p className="small muted">
                Mostrando as 20 alterações mais recentes de {editHistory.length}
                .
              </p>
            )}
          </div>
        ) : (
          <p className="muted">Nenhuma edição manual registrada nesta base.</p>
        )}
      </section>
      <section className="panel privacy">
        <p className="eyebrow">PRIVACIDADE / ARMAZENAMENTO</p>
        <h2>Onde meus dados ficam?</h2>
        <div className="privacy-columns">
          <div>
            <strong>Código → GitHub</strong>
            <p>
              O repositório guarda o código e um catálogo público de referência.
              Seus dados pessoais não são enviados para ele.
            </p>
          </div>
          <div>
            <strong>Aplicação → GitHub Pages</strong>
            <p>
              O GitHub entrega os arquivos estáticos da aplicação. O uso
              cotidiano não precisa de login, assinatura ou servidor.
            </p>
          </div>
          <div>
            <strong>Dados pessoais → navegador</strong>
            <p>
              Seus cadastros ficam no IndexedDB deste navegador e deste
              endereço. Outro navegador ou computador precisa de um backup para
              recebê-los.
            </p>
          </div>
          <div>
            <strong>Backup → arquivo escolhido por você</strong>
            <p>
              Exporte antes de limpar os dados do navegador, mudar de endereço
              ou usar outro computador. Modo anônimo pode apagar os dados ao
              fechar a janela.
            </p>
          </div>
        </div>
        <button onClick={persistent}>
          Solicitar persistência ao navegador
        </button>
        {storage && <p role="status">{storage}</p>}
        {db.archive.excludedFestivals.length > 0 && (
          <details>
            <summary>
              {db.archive.excludedFestivals.length} festivais excluídos
              preservados no arquivo da importação
            </summary>
            <pre>{JSON.stringify(db.archive.excludedFestivals, null, 2)}</pre>
          </details>
        )}
      </section>
    </>
  );
}
function Report({ report }: { report: ImportReport }) {
  return (
    <div className="import-report">
      <div className="report-counts">
        <Badge>{report.total} no arquivo</Badge>
        <Badge tone="positive">{report.imported} importados</Badge>
        <Badge>{report.merged} duplicatas fundidas</Badge>
        <Badge tone="unknown">
          {report.removed.length} excluídos do catálogo
        </Badge>
        <Badge tone={report.errors.length ? "warning" : "positive"}>
          {report.errors.length} erros
        </Badge>
      </div>
      {[
        ["Campos convertidos", report.convertedFields],
        ["Campos ambíguos / revisão", report.ambiguous],
        ["Informações preservadas", report.preserved],
        ["Erros encontrados", report.errors],
        [
          "Festivais removidos por animação exclusiva",
          report.removed.map((r) => `${r.name}: ${r.reason}`),
        ],
      ].map(([label, list]) => (
        <details key={label as string}>
          <summary>
            {label as string} ({(list as string[]).length})
          </summary>
          <ul>
            {(list as string[]).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
