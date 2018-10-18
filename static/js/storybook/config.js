/* global SETTINGS */
import { configure } from "@storybook/react"
import "babel-polyfill"

function loadStories() {
  global.SETTINGS = {
    embedlyKey: null
  }
  const head = document.getElementsByTagName("head")[0]
  const link = document.createElement("link")
  link.setAttribute("rel", "stylesheet")
  link.setAttribute(
    "href",
    "https://fonts.googleapis.com/icon?family=Material+Icons"
  )
  head.appendChild(link)

  require("./index.js")
}

configure(loadStories, module)
