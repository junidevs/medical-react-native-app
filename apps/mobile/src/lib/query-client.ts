import NetInfo from "@react-native-community/netinfo";
import { MutationCache, onlineManager, QueryCache, QueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  })
);

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        Sentry.withScope((scope) => {
          scope.setTag("scope", "query");
          scope.setContext("query", { queryKey: query.queryKey });
          Sentry.captureException(error);
        });
      }
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        Sentry.withScope((scope) => {
          scope.setTag("scope", "mutation");
          scope.setContext("mutation", { mutationKey: mutation.options.mutationKey ?? null });
          Sentry.captureException(error);
        });
      }
    }),
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1000,
        networkMode: "offlineFirst"
      },
      mutations: {
        retry: 1,
        networkMode: "offlineFirst"
      }
    }
  });
}

