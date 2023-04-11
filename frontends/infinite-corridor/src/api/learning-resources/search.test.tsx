import React from "react"
import * as factories from "ol-search-ui/src/factories"
import { QueryClient, QueryClientProvider } from "react-query"
import { setMockResponse } from "../../test-utils/mockAxios"
import { urls } from "./urls"

const setSearchResponse = (total: number) => {
  setMockResponse.post(urls.search, {
    hits: { hits: factories.makeSearchResults(), total }
  })
}


const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { wrapper }
}
