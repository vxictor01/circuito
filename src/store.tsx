import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type Database } from "./types";
import { IndexedDBRepository } from "./db/repository";
import { emptyDatabase } from "./utils/defaults";
import { mergeDatabases } from "./migrations";
import { validateDatabase } from "./utils/validation";
import catalogURL from "./data/catalog.json?url";
interface Store {
  db: Database;
  loading: boolean;
  error: string;
  notice: string;
  setNotice: (v: string) => void;
  change: (fn: (d: Database) => void) => Promise<void>;
  restore: (d: Database) => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState(emptyDatabase);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const repo = useRef<IndexedDBRepository | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let alive = true;
    const r = new IndexedDBRepository();
    repo.current = r;
    r.load()
      .then(async (data) => {
        const response = await fetch(catalogURL);
        if (!response.ok)
          throw new Error(
            "Não foi possível carregar o catálogo público. Seus dados locais foram preservados.",
          );
        const catalog: unknown = await response.json();
        validateDatabase(catalog);
        if (
          data.settings.catalogVersion !==
          (catalog as Database).settings.catalogVersion
        ) {
          data = mergeDatabases(
            data,
            structuredClone(catalog) as Database,
            "current",
          );
          data.settings.catalogVersion = (
            catalog as Database
          ).settings.catalogVersion;
          await r.replace(data);
        }
        if (alive) {
          setDb(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(String(e.message || e));
          setLoading(false);
        }
      });
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel("circuito-updates");
      channel.current = ch;
      ch.onmessage = () => {
        r.load()
          .then((d) => {
            if (alive) setDb(d);
          })
          .catch((e) => setError(String(e)));
      };
    }
    return () => {
      alive = false;
      channel.current?.close();
    };
  }, []);
  async function operation(fn: (d: Database) => Database) {
    const task = async () => {
      const act = async () => {
        const latest = await repo.current!.load();
        const next = fn(structuredClone(latest));
        validateDatabase(next);
        await repo.current!.replace(next);
        setDb(next);
        channel.current?.postMessage("saved");
      };
      if (navigator.locks) await navigator.locks.request("circuito-write", act);
      else await act();
    };
    const next = queue.current.then(task, task);
    queue.current = next.catch(() => {});
    try {
      await next;
    } catch (e) {
      setNotice(
        `Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}. Seus dados anteriores foram preservados.`,
      );
      throw e;
    }
  }
  const change = async (fn: (d: Database) => void) => {
    await operation((d) => {
      fn(d);
      return d;
    });
  };
  return (
    <Context.Provider
      value={{
        db,
        loading,
        error,
        notice,
        setNotice,
        change,
        restore: async (d) => operation(() => d),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error("Store não inicializado");
  return c;
}
