import { QueryClient } from "react-query"
import axios from "./axios"

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
        }
      }
    }
  })

export { createQueryClient }
