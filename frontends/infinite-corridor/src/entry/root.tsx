import React from "react"
import ReactDOM from "react-dom"
import { createBrowserHistory } from "history"
import { createQueryClient } from "../libs/react-query"
import App from "../App"

const container = document.getElementById("container")

const browserHistory = createBrowserHistory()
const queryClient = createQueryClient()
ReactDOM.render(
  <App queryClient={queryClient} history={browserHistory} />,
  container
)

window.queryClient = queryClient
