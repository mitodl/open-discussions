import { QueryClient } from "react-query"
import axios from "./axios"

type MaybeHasStatus = {
  response?: {
    status?: number
  }
}
const RETRY_STATUS_CODES = [408, 429, 502, 503, 504]
const MAX_RETRIES = 3

const createQueryClient = (): QueryClient =>
  new QueryClient({
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
    }
  })

export { createQueryClient }
