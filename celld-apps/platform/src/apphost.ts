import { DurableObject } from "cloudflare:workers";
import { HttpError } from "./types";

type Cell = string | number | null;
export interface SqlResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowsWritten: number;
}
export interface TableInfo {
  name: string;
  columns: { name: string; type: string; pk: boolean; notnull: boolean }[];
}

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

// One instance per app. Holds only that app's user data; the platform's own
// metadata lives in Registry, so a wipe here can never damage the catalog.
// celld's SQLite authorizer rejects PRAGMA statements (and AUTOINCREMENT, which needs
// sqlite_sequence), so introspection uses the pragma_table_info() table function.
export class AppHost extends DurableObject {
  sql(query: string, params: unknown[] = []): SqlResult {
    try {
      // exec() runs multi-statement scripts natively, which is what seeds need.
      const cur = this.ctx.storage.sql.exec(query, ...(params as never[]));
      const rows = cur.toArray() as Record<string, unknown>[];
      return { rows, columns: cur.columnNames, rowsWritten: cur.rowsWritten };
    } catch (e) {
      throw new HttpError(400, `SQL error: ${(e as Error).message}`);
    }
  }

  schema(): TableInfo[] {
    const tables = this.ctx.storage.sql
      .exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE '_litestream_%' ORDER BY name")
      .toArray() as { name: string }[];
    return tables.map((t) => ({
      name: t.name,
      columns: (this.ctx.storage.sql.exec("SELECT name, type, pk, \"notnull\" FROM pragma_table_info(?)", t.name).toArray() as any[]).map((c) => ({
        name: c.name,
        type: c.type,
        pk: !!c.pk,
        notnull: !!c.notnull,
      })),
    }));
  }

  importRows(table: string, rows: Record<string, unknown>[], mode: "replace" | "append" = "replace") {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new HttpError(400, "invalid table name");
    if (!Array.isArray(rows) || rows.length === 0) throw new HttpError(400, "rows must be a non-empty array of objects");
    const cols: string[] = [];
    for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);

    const typeOf = (col: string) => {
      const vals = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined);
      if (vals.length && vals.every((v) => typeof v === "boolean" || (typeof v === "number" && Number.isInteger(v)))) return "INTEGER";
      if (vals.length && vals.every((v) => typeof v === "number")) return "REAL";
      return "TEXT";
    };
    const cell = (v: unknown): Cell => {
      if (v === null || v === undefined) return null;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "number" || typeof v === "string") return v;
      return JSON.stringify(v);
    };

    const sql = this.ctx.storage.sql;
    this.ctx.storage.transactionSync(() => {
      if (mode === "replace") sql.exec(`DROP TABLE IF EXISTS ${q(table)}`);
      sql.exec(`CREATE TABLE IF NOT EXISTS ${q(table)} (${cols.map((c) => `${q(c)} ${typeOf(c)}`).join(", ")})`);
      if (mode === "append") {
        const have = (sql.exec("SELECT name FROM pragma_table_info(?)", table).toArray() as any[]).map((c) => c.name);
        for (const c of cols) if (!have.includes(c)) sql.exec(`ALTER TABLE ${q(table)} ADD COLUMN ${q(c)} ${typeOf(c)}`);
      }
      const stmt = `INSERT INTO ${q(table)} (${cols.map(q).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
      for (const r of rows) sql.exec(stmt, ...cols.map((c) => cell(r[c])));
    });
    return { table, columns: cols, inserted: rows.length, mode };
  }

  async wipe() {
    await this.ctx.storage.deleteAll();
  }
}
