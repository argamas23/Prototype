/**
 * useApi — unified wrapper around TanStack Query that:
 *   1. Hides the concrete fetcher behind a stable hook API (Dependency Inversion).
 *   2. Pipes errors through toast + surfaces the backend `error.code`
 *      so pages can react to domain-specific failures without re-parsing strings.
 *
 * Pages depend on `useApiQuery` / `useApiMutation` — not on `apiFetch`, not on
 * React Query primitives. Swapping the HTTP layer (e.g. to axios, to an in-memory
 * mock in Storybook) only touches this file.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export type ApiError = Error & { status?: number; code?: string };

export function useApiQuery<TData = unknown>(
  key: readonly unknown[],
  path: string,
  init?: RequestInit,
  options?: Omit<UseQueryOptions<TData, ApiError>, "queryKey" | "queryFn">,
) {
  return useQuery<TData, ApiError>({
    queryKey: key,
    queryFn: async () => (await apiFetch(path, init)) as TData,
    ...options,
  });
}

type MutationExtras<TData, TVars> = {
  invalidate?: readonly (readonly unknown[])[];
  onSuccessToast?: string | ((data: TData, vars: TVars) => string | undefined);
  onErrorToast?: boolean;
};

export function useApiMutation<TData = unknown, TVars = unknown>(
  mutationFn: (vars: TVars) => Promise<TData>,
  extras: MutationExtras<TData, TVars> = {},
  options?: UseMutationOptions<TData, ApiError, TVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, ApiError, TVars>({
    mutationFn,
    onSuccess: (data, vars, ctx) => {
      extras.invalidate?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      const message =
        typeof extras.onSuccessToast === "function"
          ? extras.onSuccessToast(data, vars)
          : extras.onSuccessToast;
      if (message) toast({ title: message });
      options?.onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      if (extras.onErrorToast !== false) {
        toast({
          title: "Something went wrong",
          description: err.message,
          variant: "destructive",
        });
      }
      options?.onError?.(err, vars, ctx);
    },
    ...options,
  });
}
