
import { createLocalAgentJwt } from './src/agent-auth-jwt.js';

const agentId = "agent-1";
const companyId = "company-1";
const adapterType = "claude_local";
const runId = "run-1";

const token = createLocalAgentJwt(agentId, companyId, adapterType, runId);

console.log(token);
