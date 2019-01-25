/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import casual from "casual-browserify"
import { shallow } from "enzyme"
import { assert } from "chai"

import * as embedFuncs from "../lib/embed"

import EmbedlyCard from "./EmbedlyCard"

describe("EmbedlyCard", () => {
  let sandbox, url, loadEmbedlyPlatformStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    url = casual.url
    loadEmbedlyPlatformStub = sandbox.stub(embedFuncs, "loadEmbedlyPlatform")
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) => shallow(<EmbedlyCard url={url} {...props} />)

  it("renders an embedly card", () => {
    const wrapper = render()
    const element = document.createElement("div")
    element.innerHTML = wrapper.prop("dangerouslySetInnerHTML").__html
    const link = element.querySelector("a")
    assert.equal(link.getAttribute("data-card-chrome"), "0")
    assert.equal(link.getAttribute("data-card-controls"), "0")
    assert.equal(link.getAttribute("data-card-key"), SETTINGS.embedlyKey)
    assert.equal(link.getAttribute("href"), url)
    assert.equal(link.getAttribute("class"), "embedly-card")

    sinon.assert.calledWith(loadEmbedlyPlatformStub)
  })

  it("does not render when the url is invalid", () => {
    url = "not_a_url"
    const wrapper = render()
    assert.equal(wrapper.text(), "")
    sinon.assert.calledWith(loadEmbedlyPlatformStub)
  })
})
