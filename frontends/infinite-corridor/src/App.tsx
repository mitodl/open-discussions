import React from "react"
import HomePage from "./pages/Home"
import SearchPage from "./pages/Search"
import { Route } from "react-router"
import { BrowserRouter } from "react-router-dom"
import { ThemeProvider } from "styled-components"
import { combinedTheme } from "ol-util"

const App = () => {
  return (
    <ThemeProvider theme={combinedTheme}>
      <BrowserRouter>
        <Route path='/infinite/search' component={SearchPage} />
        <Route path='/infinite' exact component={HomePage} />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
