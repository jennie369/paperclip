import { api } from "./client";
import type {
  TimetableResponse,
  TimetableFilters,
  CreateManualRowInput,
  CreateManualRowResponse,
  UpsertRowNoteInput,
} from "../types/timetable";

function buildQuery(filters: TimetableFilters): string {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  if (filters.q) params.set("q", filters.q);
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.types?.length) params.set("types", filters.types.join(","));
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.sort) params.set("sort", `${filters.sort.field}:${filters.sort.dir}`);
  if (filters.group) params.set("group", filters.group);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const timetableApi = {
  list: (companyId: string, filters: TimetableFilters = {}) =>
    api.get<TimetableResponse>(`/companies/${companyId}/timetable${buildQuery(filters)}`),

  createManual: (companyId: string, input: CreateManualRowInput) =>
    api.post<CreateManualRowResponse>(`/companies/${companyId}/timetable/manual`, input),

  upsertNote: (companyId: string, input: UpsertRowNoteInput) =>
    api.post<{
      id: string;
      sourceTable: string;
      sourceId: string;
      resultOverride: string | null;
      note: string | null;
    }>(`/companies/${companyId}/timetable/notes`, input),
};
