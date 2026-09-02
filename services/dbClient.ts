// Database Adapter for YuvalStudio
import { neon } from '@neondatabase/serverless';

const databaseUrl =
  (import.meta as any).env?.VITE_NEON_DATABASE_URL ||
  (import.meta as any).env?.DATABASE_URL ||
  '';

const sql = databaseUrl ? neon(databaseUrl) : null;

async function runSql(queryText: string, params: any[] = []): Promise<any[]> {
  if (!databaseUrl || !sql) {
    console.warn('Database URL is not configured.');
    return [];
  }
  try {
    if (typeof (sql as any).query === 'function') {
      const res = await (sql as any).query(queryText, params);
      return Array.isArray(res) ? res : res.rows || [];
    }
    const urlObj = new URL(databaseUrl.replace('postgresql://', 'https://').replace('postgres://', 'https://'));
    const auth = btoa(`${decodeURIComponent(urlObj.username)}:${decodeURIComponent(urlObj.password)}`);
    const endpoint = `https://${urlObj.host}/sql`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: queryText, params })
    });
    const json = await resp.json();
    return json.rows || [];
  } catch (err) {
    console.error('Database SQL Execution Error:', err);
    return [];
  }
}

type WhereOp = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'IS' | 'LIKE' | 'ILIKE';

interface WhereCondition {
  col: string;
  op: WhereOp;
  val: any;
}

const KNOWN_RELATIONS: Record<string, Record<string, { fk: string; targetTable: string }>> = {
  appointments: {
    services: { fk: 'service_id', targetTable: 'services' },
    profiles: { fk: 'client_id', targetTable: 'profiles' }
  }
};

class NeonQueryBuilder implements PromiseLike<any> {
  private tableName: string;
  private action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' = 'SELECT';
  private selectedFields: string = '*';
  private countOption?: 'exact';
  private whereClauses: WhereCondition[] = [];
  private orderClause: { col: string; asc: boolean } | null = null;
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private payload: any = null;
  private upsertConflict: string = 'key';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*', options?: { count?: 'exact' }) {
    this.selectedFields = fields;
    if (options && options.count) {
      this.countOption = options.count;
    }
    return this;
  }

  eq(col: string, val: any) {
    this.whereClauses.push({ col, op: '=', val });
    return this;
  }

  neq(col: string, val: any) {
    this.whereClauses.push({ col, op: '!=', val });
    return this;
  }

  gt(col: string, val: any) {
    this.whereClauses.push({ col, op: '>', val });
    return this;
  }

  gte(col: string, val: any) {
    this.whereClauses.push({ col, op: '>=', val });
    return this;
  }

  lt(col: string, val: any) {
    this.whereClauses.push({ col, op: '<', val });
    return this;
  }

  lte(col: string, val: any) {
    this.whereClauses.push({ col, op: '<=', val });
    return this;
  }

  like(col: string, pattern: string) {
    this.whereClauses.push({ col, op: 'LIKE', val: pattern });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.whereClauses.push({ col, op: 'ILIKE', val: pattern });
    return this;
  }

  is(col: string, val: any) {
    this.whereClauses.push({ col, op: 'IS', val });
    return this;
  }

  in(col: string, vals: any[]) {
    this.whereClauses.push({ col, op: 'IN', val: vals });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderClause = { col, asc: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  insert(items: any | any[]) {
    this.action = 'INSERT';
    this.payload = Array.isArray(items) ? items : [items];
    return this;
  }

  update(payload: Record<string, any>) {
    this.action = 'UPDATE';
    this.payload = payload;
    return this;
  }

  upsert(payload: any | any[], options?: { onConflict?: string }) {
    this.action = 'UPSERT';
    this.payload = payload;
    if (options && options.onConflict) {
      this.upsertConflict = options.onConflict;
    }
    return this;
  }

  delete() {
    this.action = 'DELETE';
    return this;
  }

  private buildWhereClause(params: any[]): string {
    if (this.whereClauses.length === 0) return '';
    const conditionStrings: string[] = [];

    for (const w of this.whereClauses) {
      if (w.op === 'IS') {
        if (w.val === null) {
          conditionStrings.push(`"${this.tableName}"."${w.col}" IS NULL`);
        } else if (w.val === true) {
          conditionStrings.push(`"${this.tableName}"."${w.col}" IS TRUE`);
        } else if (w.val === false) {
          conditionStrings.push(`"${this.tableName}"."${w.col}" IS FALSE`);
        } else {
          params.push(w.val);
          conditionStrings.push(`"${this.tableName}"."${w.col}" IS NOT DISTINCT FROM $${params.length}`);
        }
      } else if (w.op === 'IN') {
        const list = Array.isArray(w.val) ? w.val : [w.val];
        if (list.length === 0) {
          conditionStrings.push('1 = 0');
        } else {
          const placeholders = list.map((item) => {
            params.push(item);
            return `$${params.length}`;
          });
          conditionStrings.push(`"${this.tableName}"."${w.col}" IN (${placeholders.join(', ')})`);
        }
      } else {
        params.push(w.val);
        conditionStrings.push(`"${this.tableName}"."${w.col}" ${w.op} $${params.length}`);
      }
    }

    return ` WHERE ${conditionStrings.join(' AND ')}`;
  }

  async execute(): Promise<{ data: any; count?: number | null; error: any }> {
    try {
      if (this.action === 'SELECT') {
        const params: any[] = [];
        let baseFieldsStr = this.selectedFields;
        const relationSubqueries: string[] = [];

        // Match relation patterns like "services (name, price)" or "profiles(avatar_url)"
        const relRegex = /([a-zA-Z0-9_]+)\s*\(([^)]+)\)/g;
        let match: RegExpExecArray | null;
        while ((match = relRegex.exec(this.selectedFields)) !== null) {
          const relName = match[1];
          const innerFieldsStr = match[2].trim();
          const relConfig = KNOWN_RELATIONS[this.tableName]?.[relName];

          if (relConfig) {
            let jsonBuildArgs: string;
            if (innerFieldsStr === '*') {
              jsonBuildArgs = `row_to_json("${relName}")`;
            } else {
              const fieldList = innerFieldsStr.split(',').map((f) => f.trim()).filter(Boolean);
              const pairs = fieldList.map((f) => `'${f}', "${relName}"."${f}"`).join(', ');
              jsonBuildArgs = `json_build_object(${pairs})`;
            }

            relationSubqueries.push(`(
              SELECT ${jsonBuildArgs}
              FROM "${relConfig.targetTable}" "${relName}"
              WHERE "${relName}"."id" = "${this.tableName}"."${relConfig.fk}"
            ) AS "${relName}"`);
          }
        }

        // Clean up base fields after stripping relations
        baseFieldsStr = baseFieldsStr.replace(relRegex, '').trim();
        const cleanedBaseFields = baseFieldsStr
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean)
          .map((f) => (f === '*' ? `"${this.tableName}".*` : `"${this.tableName}"."${f}"`));

        const finalSelectParts = [...cleanedBaseFields, ...relationSubqueries];
        if (this.countOption === 'exact') {
          finalSelectParts.push(`COUNT(*) OVER() AS "__total_count"`);
        }

        const selectSql = finalSelectParts.length > 0 ? finalSelectParts.join(', ') : `"${this.tableName}".*`;
        let query = `SELECT ${selectSql} FROM "${this.tableName}"`;

        query += this.buildWhereClause(params);

        if (this.orderClause) {
          query += ` ORDER BY "${this.tableName}"."${this.orderClause.col}" ${this.orderClause.asc ? 'ASC' : 'DESC'}`;
        }

        if (this.limitCount !== null) {
          query += ` LIMIT ${this.limitCount}`;
        }

        if (this.offsetCount !== null) {
          query += ` OFFSET ${this.offsetCount}`;
        }

        const rows = await runSql(query, params);

        let count: number | null = null;
        if (this.countOption === 'exact') {
          if (rows && rows.length > 0) {
            count = Number(rows[0].__total_count || rows.length);
            for (const r of rows) {
              delete r.__total_count;
            }
          } else if (this.offsetCount && this.offsetCount > 0) {
            const countParams: any[] = [];
            const countQuery = `SELECT COUNT(*)::int AS count FROM "${this.tableName}"` + this.buildWhereClause(countParams);
            const countRes = await runSql(countQuery, countParams);
            count = countRes && countRes[0] ? Number(countRes[0].count) : 0;
          } else {
            count = 0;
          }
        }

        if (this.isSingle || this.isMaybeSingle) {
          return { data: rows && rows.length > 0 ? rows[0] : null, count, error: null };
        }
        return { data: rows || [], count, error: null };
      }

      if (this.action === 'INSERT') {
        if (!this.payload || this.payload.length === 0) {
          return { data: this.isSingle || this.isMaybeSingle ? null : [], error: null, count: 0 };
        }
        const item = this.payload[0];
        const keys = Object.keys(item);
        const cols = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = keys.map((k) => (typeof item[k] === 'object' && item[k] !== null ? JSON.stringify(item[k]) : item[k]));

        const query = `INSERT INTO "${this.tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`;
        const rows = await runSql(query, values);
        if (this.isSingle || this.isMaybeSingle) {
          return { data: rows && rows.length > 0 ? rows[0] : null, error: null, count: rows ? rows.length : 0 };
        }
        return { data: rows || [], error: null, count: rows ? rows.length : 0 };
      }

      if (this.action === 'UPDATE') {
        const keys = Object.keys(this.payload);
        const params: any[] = [];
        const sets = keys.map((k) => {
          const val = this.payload[k];
          params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
          return `"${k}" = $${params.length}`;
        });

        let query = `UPDATE "${this.tableName}" SET ${sets.join(', ')}`;
        query += this.buildWhereClause(params);
        query += ` RETURNING *`;

        const rows = await runSql(query, params);
        if (this.isSingle || this.isMaybeSingle) {
          return { data: rows && rows.length > 0 ? rows[0] : null, error: null, count: rows ? rows.length : 0 };
        }
        return { data: rows || [], error: null, count: rows ? rows.length : 0 };
      }

      if (this.action === 'UPSERT') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        if (items.length === 0) return { data: [], error: null, count: 0 };

        const params: any[] = [];
        const valueTuples: string[] = [];

        for (const item of items) {
          const valStr = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
          params.push(item.key);
          const pKey = params.length;
          params.push(valStr);
          const pVal = params.length;
          valueTuples.push(`($${pKey}, $${pVal}::jsonb)`);
        }

        const query = `
          INSERT INTO "${this.tableName}" ("key", "value")
          VALUES ${valueTuples.join(', ')}
          ON CONFLICT ("${this.upsertConflict}") 
          DO UPDATE SET "value" = EXCLUDED.value, "updated_at" = now()
          RETURNING *;
        `;
        const rows = await runSql(query, params);
        return { data: rows || [], error: null, count: rows ? rows.length : 0 };
      }

      if (this.action === 'DELETE') {
        const params: any[] = [];
        let query = `DELETE FROM "${this.tableName}"`;
        query += this.buildWhereClause(params);
        query += ` RETURNING *`;
        const rows = await runSql(query, params);
        return { data: rows || [], error: null, count: rows ? rows.length : 0 };
      }

      return { data: null, error: null, count: 0 };
    } catch (error) {
      console.error(`Database error on ${this.tableName}:`, error);
      return { data: null, error, count: 0 };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; count?: number | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const dbClient = {
  from: (tableName: string) => new NeonQueryBuilder(tableName),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: (_callback: any) => ({
      data: { subscription: { unsubscribe: () => {} } }
    }),
    signInWithOAuth: async () => ({ error: null }),
    signOut: async () => ({ error: null })
  },
  channel: (_name: string) => ({
    on: () => ({
      subscribe: () => ({ unsubscribe: () => {} })
    })
  }),
  removeChannel: (_channel: any) => {},
  storage: {
    from: (bucket: string) => {
      let lastUploadedUrl = '';
      return {
        upload: async (fileName: string, file: any, options?: any) => {
          try {
            const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'md6mhfhd';
            const apiKey = (import.meta as any).env?.VITE_CLOUDINARY_API_KEY || '896717328968567';
            const apiSecret = (import.meta as any).env?.VITE_CLOUDINARY_API_SECRET || 'feYh79XfGm6QZHbF1UFDLdw_0Jg';

            const timestamp = Math.floor(Date.now() / 1000);
            const folder = `yuval_studio/${bucket || 'gallery'}`;
            const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

            const enc = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(toSign));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const formData = new FormData();
            let blob: Blob;
            if (file instanceof Blob || file instanceof File) {
              blob = file;
            } else if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
              blob = new Blob([file], { type: options?.contentType || 'image/jpeg' });
            } else {
              blob = new Blob([file]);
            }

            formData.append('file', blob, fileName);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('folder', folder);
            formData.append('signature', signature);

            const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
              method: 'POST',
              body: formData
            });

            const json = await resp.json();
            if (json.secure_url) {
              lastUploadedUrl = json.secure_url;
              return { data: { path: json.secure_url }, error: null };
            }
            return { data: null, error: new Error(json.error?.message || 'Upload to Cloudinary failed') };
          } catch (err: any) {
            console.error('Cloudinary upload error:', err);
            return { data: null, error: err };
          }
        },
        getPublicUrl: (path: string) => {
          if (lastUploadedUrl) {
            return { data: { publicUrl: lastUploadedUrl } };
          }
          if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
            return { data: { publicUrl: path } };
          }
          return { data: { publicUrl: path } };
        }
      };
    }
  }
};

export const db = dbClient;
