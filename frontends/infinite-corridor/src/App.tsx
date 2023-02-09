import React from "react"
import { HelmetProvider } from "react-helmet-async"

import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import FieldPage from "./pages/field-details/FieldPage"
import FieldAdminApp from "./pages/field-details/FieldAdminApp"
import LearningResourceDrawer from "./pages/LearningResourceDrawer"
import UserListsListingPage from "./pages/user-lists/UserListsListingPage"
import UserListDetailsPage from "./pages/user-lists/UserListDetailsPage"
import FavoritesPage from "./pages/user-lists/FavoritesPage"
import * as urls from "./pages/urls"
import { Route, Router, Switch } from "react-router"
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

/**
 * Renders child with Router, QueryClientProvider, and other such context provides.
 */
const AppProviders: React.FC<AppProps & { children: React.ReactNode }> = ({
  history,
  queryClient,
  children
}) => {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <Router history={history}>{children}</Router>
        </HelmetProvider>
      </QueryClientProvider>
    </MuiThemeProvider>
  )
}

const App: React.FC<AppProps> = ({ history, queryClient }) => {
  return (
    <div className="app-container">
      <AppProviders history={history} queryClient={queryClient}>
        <Header />
        <Switch>
          <Route path={urls.HOME} exact>
            <HomePage />
          </Route>
          <Route path={urls.SEARCH}>
            <SearchPage />
          </Route>
          <Route path={[urls.FIELD_VIEW, urls.FIELD_EDIT_WIDGETS]} exact>
            <FieldPage />
          </Route>
          <Route path={urls.FIELD_EDIT} exact>
            <FieldAdminApp />
          </Route>
          <Route path={urls.USERLISTS_LISTING} exact>
            <UserListsListingPage />
          </Route>
          <Route path={urls.FAVORITES_VIEW} exact>
            <FavoritesPage />
          </Route>
          <Route path={urls.USERLIST_VIEW} exact>
            <UserListDetailsPage />
          </Route>
        </Switch>
        <LearningResourceDrawer />
      </AppProviders>
    </div>
  )
}

export default App
export { AppProviders }
