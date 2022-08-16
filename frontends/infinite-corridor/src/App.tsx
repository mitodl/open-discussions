import React from "react"
import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import FieldPage from "./pages/field-details/FieldPage"
import FieldAdminApp from "./pages/field-details/FieldAdminApp"
import * as urls from "./pages/urls"
import { Route, Router } from "react-router"
import { History } from "history"
import { QueryClientProvider, QueryClient } from "react-query"
import Header from "./components/Header"
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles"
import { muiTheme } from "./libs/mui"

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

const App: React.FC<AppProps> = ({ history, queryClient }) => {
  return (
    <div className="app-container">
      <MuiThemeProvider theme={muiTheme}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Header />
            <Route path={urls.HOME} exact>
              <HomePage />
            </Route>
            <Route path={urls.SEARCH}>
              <SearchPage />
            </Route>
            <Route path={urls.FIELD_VIEW} exact>
              <FieldPage />
            </Route>
            <Route path={urls.FIELD_EDIT}>
              <FieldAdminApp />
            </Route>
          </Router>
        </QueryClientProvider>
      </MuiThemeProvider>
    </div>
  )
}

export default App
