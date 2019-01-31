/* global SETTINGS: false */
import React from "react"
import sinon from "sinon"
import casual from "casual-browserify"
import { shallow } from "enzyme"
import { assert } from "chai"

import * as embedFuncs from "../lib/embed"

import EmbedlyCard from "./EmbedlyCard"

describe("EmbedlyCard", () => {
  let sandbox, url, loadEmbedlyPlatformStub, renderEmbedlyCardStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    url = casual.url
    loadEmbedlyPlatformStub = sandbox.stub(embedFuncs, "loadEmbedlyPlatform")
    renderEmbedlyCardStub = sandbox.stub(embedFuncs, "renderEmbedlyCard")
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) => shallow(<EmbedlyCard url={url} {...props} />)

  it("renders an embedly card", () => {
    const text = "abcdef"
    renderEmbedlyCardStub.returns(text)
    const wrapper = render()
    assert.equal(wrapper.prop("dangerouslySetInnerHTML").__html, text)

    sinon.assert.calledWith(loadEmbedlyPlatformStub)
    sinon.assert.calledWith(renderEmbedlyCardStub, url)
  })

  it("does not render when the url is invalid", () => {
    url = "not_a_url"
    const wrapper = render()
    assert.equal(wrapper.text(), "")
    sinon.assert.calledWith(loadEmbedlyPlatformStub)
    assert.equal(renderEmbedlyCardStub.callCount, 0)
  })
})
