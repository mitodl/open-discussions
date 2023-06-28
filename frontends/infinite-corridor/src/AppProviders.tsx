import React, { StrictMode } from "react"
import { HelmetProvider } from "react-helmet-async"

import { Router } from "react-router"
import { History } from "history"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles"
import { muiTheme } from "./libs/mui"
import { Provider as NiceModalProvider } from "@ebay/nice-modal-react"

export const BASE_URL = "/infinite"

interface AppProps {
  /**
   * App [history](https://v5.reactrouter.com/web/api/history) object.
   *  - Use BrowserHistory for the real app
   *  - Use MemoryHistory for tests.
   */
  history: History
  queryClient: QueryClient
}

/**
 * Renders child with Router, QueryClientProvider, and other such context provides.
 */
const AppProviders: React.FC<AppProps & { children: React.ReactNode }> = ({
  history,
  queryClient,
  children
}) => {
  return (
    <StrictMode>
      <MuiThemeProvider theme={muiTheme}>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <Router history={history}>
              <NiceModalProvider>{children}</NiceModalProvider>
            </Router>
          </HelmetProvider>
          <ReactQueryDevtools
            initialIsOpen={false}
            toggleButtonProps={{ style: { opacity: 0.5 } }}
          />
        </QueryClientProvider>
      </MuiThemeProvider>
    </StrictMode>
  )
}

export default AppProviders
