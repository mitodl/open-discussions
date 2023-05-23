import React from "react"
import { createRoot } from "react-dom/client"
import { createBrowserHistory } from "history"
import { createQueryClient } from "../libs/react-query"
import App from "../App"
import invariant from "tiny-invariant"

const container = document.getElementById("container")
invariant(container, "Could not find container element")
const root = createRoot(container)

const browserHistory = createBrowserHistory()
const queryClient = createQueryClient()
root.render(<App queryClient={queryClient} history={browserHistory} />)
