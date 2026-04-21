import path from "node:path";
import fs from "node:fs";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { readConfigFile } from "../config-file.js";
import { resolveDefaultLogsDir, resolveHomeAwarePath } from "../home-paths.js";

function resolveServerLogDir(): string {
  const envOverride = process.env.PAPERCLIP_LOG_DIR?.trim();
  if (envOverride) return resolveHomeAwarePath(envOverride);

  const fileLogDir = readConfigFile()?.logging.logDir?.trim();
  if (fileLogDir) return resolveHomeAwarePath(fileLogDir);

  return resolveDefaultLogsDir();
}

const logDir = resolveServerLogDir();
fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, "server.log");

const sharedOpts = {
  translateTime: "HH:MM:ss",
  ignore: "pid,hostname",
  singleLine: true,
};

// ── Custom formatter for console output ──
// Replaces pino-pretty's default with cleaner, emoji-tagged format

const METHOD_STYLE: Record<string, string> = {
  POST:   "\x1b[1;33m POST \x1b[0m",   // bold yellow
  PATCH:  "\x1b[1;36m PATCH\x1b[0m",    // bold cyan
  PUT:    "\x1b[1;35m PUT  \x1b[0m",    // bold magenta
  DELETE: "\x1b[1;31m DEL  \x1b[0m",    // bold red
  GET:    "\x1b[2m GET  \x1b[0m",       // dim
};

function statusColor(code: number): string {
  if (code >= 500) return `\x1b[1;31m${code}\x1b[0m`;  // red
  if (code >= 400) return `\x1b[1;33m${code}\x1b[0m`;  // yellow
  if (code >= 300) return `\x1b[2m${code}\x1b[0m`;     // dim
  return `\x1b[32m${code}\x1b[0m`;                      // green
}

function shortUrl(url: string): string {
  // Strip long UUIDs and query params for readability
  return url
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '•••')
    .replace(/\?.*$/, (q) => q.length > 40 ? q.substring(0, 40) + '…' : q);
}

export const logger = pino({
  level: "debug",
}, pino.transport({
  targets: [
    {
      target: "pino-pretty",
      options: { ...sharedOpts, ignore: "pid,hostname,req,res,responseTime", colorize: true, destination: 1 },
      level: "info",
    },
    {
      target: "pino-pretty",
      options: { ...sharedOpts, colorize: false, destination: logFile, mkdir: true },
      level: "debug",
    },
  ],
}));

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore(req) {
      // Skip GET requests — too noisy (polling, cache hits)
      return req.method === "GET";
    },
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    const method = METHOD_STYLE[req.method || "GET"] || req.method;
    const status = statusColor(res.statusCode);
    const url = shortUrl(req.url || "");
    const time = (res as any).responseTime ? `${Math.round((res as any).responseTime)}ms` : "";
    return `${method} ${status} ${url} ${time}`.trim();
  },
  customErrorMessage(req, res, err) {
    const ctx = (res as any).__errorContext;
    const errMsg = ctx?.error?.message || err?.message || (res as any).err?.message || "unknown error";
    const method = METHOD_STYLE[req.method || "GET"] || req.method;
    const status = statusColor(res.statusCode);
    const url = shortUrl(req.url || "");
    return `${method} ${status} ${url} — ${errMsg}`;
  },
  customProps(req, res) {
    if (res.statusCode >= 400) {
      const ctx = (res as any).__errorContext;
      if (ctx) {
        return {
          errorContext: ctx.error,
          reqBody: ctx.reqBody,
          reqParams: ctx.reqParams,
          reqQuery: ctx.reqQuery,
        };
      }
      const props: Record<string, unknown> = {};
      const { body, params, query } = req as any;
      if (body && typeof body === "object" && Object.keys(body).length > 0) {
        props.reqBody = body;
      }
      if (params && typeof params === "object" && Object.keys(params).length > 0) {
        props.reqParams = params;
      }
      if (query && typeof query === "object" && Object.keys(query).length > 0) {
        props.reqQuery = query;
      }
      if ((req as any).route?.path) {
        props.routePath = (req as any).route.path;
      }
      return props;
    }
    return {};
  },
});
