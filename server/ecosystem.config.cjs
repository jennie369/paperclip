// PM2 ecosystem config for Paperclip server.
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Usage:
//   cd server && pm2 start ecosystem.config.cjs && pm2 save
//   pm2 status | pm2 logs paperclip-server | pm2 restart paperclip-server
//
// Override log dir via env: PAPERCLIP_PM2_LOG_DIR=/path/to/logs pm2 start ...

const path = require('path');
const os = require('os');

// Default log dir: ~/.paperclip/logs (portable across machines/users)
const LOG_DIR =
  process.env.PAPERCLIP_PM2_LOG_DIR ||
  path.join(os.homedir(), '.paperclip', 'logs');

module.exports = {
  apps: [
    {
      name: 'paperclip-server',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/index.ts',
      cwd: __dirname,
      interpreter: 'node',

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '30s',
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,

      // Logging — merge stdout+stderr into one file for easy tail -f
      out_file: path.join(LOG_DIR, 'server.log'),
      error_file: path.join(LOG_DIR, 'server.log'),
      merge_logs: true,
      // No log_date_format — pino already adds [HH:mm:ss] prefix itself

      env: {
        NODE_ENV: 'development',
        // Force ANSI colors from pino-pretty even though stdout isn't a TTY
        // (PM2 captures stdout into a file, which would normally disable colors).
        FORCE_COLOR: '1',
        // Redirect paperclip's own file logger to a separate debug folder.
        // The app's logger.ts writes server.log too — without this redirect,
        // PM2 (colored) and the app's logger (uncolored) race to append to
        // the same file, producing mixed/garbled output.
        PAPERCLIP_LOG_DIR: path.join(LOG_DIR, 'debug'),
        // Delegation feature (P4 rollout 2026-04-21). Enables inline CEO→subagent
        // delegation via MCP tools. See runbook: crypto-pattern-scanner/memory/
        // reports/2026-04-21-delegation-rollout-runbook.md for rollback procedure.
        PAPERCLIP_DELEGATION_ENABLED: 'true',
        // Use Vite dev middleware instead of static ui-dist/ — bypasses UI
        // build when esbuild cleanup is blocked by Windows AV. Remove once
        // `pnpm --filter @paperclipai/ui build` succeeds.
        PAPERCLIP_UI_DEV_MIDDLEWARE: 'true',
      },
    },
  ],
};
