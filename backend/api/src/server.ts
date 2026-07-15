import { createServer, type Server } from "node:http";
import { Pool } from "pg";
import { getCapTable } from "./index.js";

export interface ServerConfig {
  databaseUrl: string;
}

/**
 * Creates (but does not start) the issuer API HTTP server.
 *
 * Routes:
 *   GET /cap-table?issuerContractId=... -> non-zero holders, balance desc
 */
export function createApiServer(config: ServerConfig): Server {
  const pool = new Pool({ connectionString: config.databaseUrl });

  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/cap-table") {
      const issuerContractId = url.searchParams.get("issuerContractId");
      if (!issuerContractId) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "issuerContractId query parameter is required" }));
        return;
      }
      getCapTable(pool, issuerContractId)
        .then((entries) => {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(entries));
        })
        .catch((err: unknown) => {
          res.writeHead(502, { "content-type": "application/json" });
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }),
          );
        });
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const port = Number(process.env.PORT ?? 8788);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  createApiServer({ databaseUrl }).listen(port, () => {
    console.log(`Issuer API listening on :${port}`);
  });
}
