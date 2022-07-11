import React from "react"
import ReactDOM from "react-dom"
import { createBrowserHistory } from "history"
import App from "../App"

const container = document.getElementById("container")

const browserHistory = createBrowserHistory()
ReactDOM.render(<App history={browserHistory} />, container)
