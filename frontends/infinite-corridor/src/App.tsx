import React from "react"
import { HelmetProvider } from "react-helmet-async"

import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import DemoPage from "./pages/DemoPage"
import FieldPage from "./pages/field-details/FieldPage"
import FieldAdminApp from "./pages/field-details/FieldAdminApp"
import LearningResourceDrawer from "./components/LearningResourceDrawer"
import {
  UserListsListingPage,
  StaffListsListingPage
} from "./pages/resource-lists/ResourceListsListingsPage"
import {
  UserListDetailsPage,
  StaffListDetailsPage
} from "./pages/resource-lists/ResourceListDetailsPage"
import FavoritesPage from "./pages/resource-lists/FavoritesPage"
import * as urls from "./pages/urls"
import { Route, Router, Switch } from "react-router"
import { History } from "history"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import Header from "./components/Header"
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
    <MuiThemeProvider theme={muiTheme}>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <Router history={history}>
            <NiceModalProvider>{children}</NiceModalProvider>
          </Router>
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
          <Route path={urls.DEMO}>
            <DemoPage />
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
          <Route path={urls.STAFFLISTS_LISTING} exact>
            <StaffListsListingPage />
          </Route>
          <Route path={urls.STAFFLIST_VIEW} exact>
            <StaffListDetailsPage />
          </Route>
        </Switch>
        <LearningResourceDrawer />
      </AppProviders>
    </div>
  )
}

export default App
export { AppProviders }
