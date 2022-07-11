import React from "react"
import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import FieldPage from "./pages/FieldPage"
import { Route } from "react-router"
import { BrowserRouter } from "react-router-dom"
import { ThemeProvider } from "styled-components"
import { combinedTheme } from "ol-util"
import { QueryClientProvider, QueryClient } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
    }
  } 
})

const baseUrl = '/infinite'


const App = () => {
  return (
    <div className="app-container">
      <ThemeProvider theme={combinedTheme}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Route path={baseUrl} exact>
              <HomePage />
            </Route>
            <Route path={`${baseUrl}/search`}>
              <SearchPage />
            </Route>
            <Route path={`${baseUrl}/fields/:name`}>
              <FieldPage />
            </Route>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
