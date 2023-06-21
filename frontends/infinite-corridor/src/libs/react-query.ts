import {QueryCache, QueryClient} from "@tanstack/react-query"
import axios from "./axios"
import {History} from "history"

type MaybeHasStatus = {
  response?: {
    status?: number
  }
}
type MaybeHasUseCustom404Handler = {
  meta?: {
    useCustom404Handler?: string
  }
}
const AUTH_STATUS_CODES = [401, 403]
const RETRY_STATUS_CODES = [408, 429, 502, 503, 504]
const MAX_RETRIES = 3

const createQueryClient = (history: History): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        queryFn:   async ({ queryKey }) => {
          const url = queryKey[0]
          if (typeof url !== "string" || queryKey.length !== 1) {
            throw new Error(
              `Query key must be a single string for use with default queryFn`
            )
          }
          const { data } = await axios.get(url)
          return data
        },
        retry: (failureCount, error) => {
          const status = (error as MaybeHasStatus)?.response?.status
          /**
           * React Query's default behavior is to retry all failed queries 3
           * times. Many things (e.g., 403, 404) are not worth retrying. Let's
           * just retry some explicit whitelist of status codes.
           */
          if (status !== undefined && RETRY_STATUS_CODES.includes(status)) {
            return failureCount < MAX_RETRIES
          }
          return false
        }
      }
    },
    queryCache: new QueryCache({
      onError: async (error, query) => {
        const status = (error as MaybeHasStatus)?.response?.status
        const { user } = SETTINGS
        const currentLocation = history.location
        const useCustom404Handler = (query as MaybeHasUseCustom404Handler)?.meta?.useCustom404Handler

        if (useCustom404Handler === undefined || !useCustom404Handler) {
          if (status !== undefined && AUTH_STATUS_CODES.includes(status)) {
            if (user.is_authenticated) {
              history.replace("/forbidden/")
            } else {
              // Once there is an auth flow within this app, this can be moved
              // off of window.location and use history as well
              window.location.href = `/login/?next=${currentLocation.pathname}`
            }
          }
          if (status === 404) {
            history.replace("/forbidden/")
          }
        }
      }
    })
  })
}

export { createQueryClient }
