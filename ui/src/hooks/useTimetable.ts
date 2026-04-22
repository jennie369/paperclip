import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableApi } from "../api/timetable";
import { queryKeys } from "../lib/queryKeys";
import type {
  TimetableFilters,
  CreateManualRowInput,
  UpsertRowNoteInput,
} from "../types/timetable";

function todayHCM(): string {
  // Intl sv-SE locale gives YYYY-MM-DD; TZ forces HCM day calculation.
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Fetch timetable for a given company + date, with 30s polling.
 * Default date = today in Asia/Ho_Chi_Minh.
 * Widget + Full page share this hook — React Query dedupes 1 request.
 */
export function useTimetable(companyId: string, filters: TimetableFilters = {}) {
  const date = filters.date ?? todayHCM();
  const sortKey = filters.sort ? `${filters.sort.field}:${filters.sort.dir}` : undefined;

  return useQuery({
    queryKey: queryKeys.timetable.byDate(companyId, date, {
      q: filters.q,
      agentId: filters.agentId,
      types: filters.types,
      status: filters.status,
      sort: sortKey,
      group: filters.group,
    }),
    queryFn: () => timetableApi.list(companyId, { ...filters, date }),
    refetchInterval: 30_000,        // 30s polling, per chị's design decision
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    enabled: Boolean(companyId),
  });
}

export function useCreateTimetableManual(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualRowInput) => timetableApi.createManual(companyId, input),
    onSuccess: () => {
      // Invalidate all timetable queries for this company (widget + page + any date filter)
      queryClient.invalidateQueries({ queryKey: queryKeys.timetable.allForCompany(companyId) });
    },
  });
}

export function useUpsertTimetableNote(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertRowNoteInput) => timetableApi.upsertNote(companyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetable.allForCompany(companyId) });
    },
  });
}
