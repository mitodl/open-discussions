import React from "react"
import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import FieldPage from "./pages/FieldPage"
import * as urls from "./pages/urls"
import { Route, Router } from "react-router"
import { History } from "history"
import { ThemeProvider } from "styled-components"
import { combinedTheme } from "ol-util"
import { QueryClientProvider, QueryClient } from "react-query"
import axios from "./libs/axios"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0]
        if (typeof url !== "string" || queryKey.length !== 1) {
          throw new Error(
            `Query key must be a single string for use with default queryFn`
          )
        }
        const { data } = await axios.get(url)
        return data
      },
    },
  },
})

export const BASE_URL = "/infinite"

interface AppProps {
  /**
   * App [history](https://v5.reactrouter.com/web/api/history) object.
   *  - Use BrowserHistory for the real app
   *  - Use MemoryHistory for tests.
   */
  history: History
}

const App: React.FC<AppProps> = ({ history }) => {
  return (
    <div className="app-container">
      <ThemeProvider theme={combinedTheme}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route path={urls.HOME} exact>
              <HomePage />
            </Route>
            <Route path={urls.SEARCH}>
              <SearchPage />
            </Route>
            <Route path={urls.FIELD_VIEW}>
              <FieldPage />
            </Route>
          </Router>
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
