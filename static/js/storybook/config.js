/* global SETTINGS */
import { configure } from "@storybook/react"
import "babel-polyfill"

function loadStories() {
  global.SETTINGS = {
    embedlyKey: null
  }
  const head = document.getElementsByTagName("head")[0]

  const fontLink = document.createElement("link")
  fontLink.setAttribute("rel", "stylesheet")
  fontLink.setAttribute("type", "text/css")
  fontLink.setAttribute(
    "href",
    "https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700"
  )
  head.appendChild(fontLink)

  const materialIconsLink = document.createElement("link")
  materialIconsLink.setAttribute("rel", "stylesheet")
  materialIconsLink.setAttribute(
    "href",
    "https://fonts.googleapis.com/icon?family=Material+Icons"
  )
  head.appendChild(materialIconsLink)

  require("./index.js")
}

configure(loadStories, module)
