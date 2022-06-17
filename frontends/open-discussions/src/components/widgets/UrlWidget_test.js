// @flow
import React from "react"
import { shallow, mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import UrlWidget, { TwitterEmbed } from "./UrlWidget"

import { WIDGET_TYPE_URL } from "../../lib/constants"
import { makeWidgetInstance } from "../../factories/widgets"

describe("UrlWidget", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("renders a UrlWidget", () => {
    const widgetInstance = makeWidgetInstance(WIDGET_TYPE_URL)
    const wrapper = shallow(<UrlWidget widgetInstance={widgetInstance} />)
    assert.equal(
      wrapper.find("EmbedlyCard").prop("url"),
      widgetInstance.configuration.url
    )
  })

  it("renders using the TwitterEmbed, if that's what it is given", () => {
    const widgetInstance = makeWidgetInstance(WIDGET_TYPE_URL)
    widgetInstance.configuration.url = null
    const html = '<div class="asdf">fooooo</div>'
    widgetInstance.configuration.custom_html = html
    const twitterEmbed = shallow(
      <UrlWidget widgetInstance={widgetInstance} />
    ).find("TwitterEmbed")
    assert.ok(twitterEmbed.exists())
    assert.equal(twitterEmbed.prop("embed"), html)
  })

  it("twitter embed calls twitter platform after loading", () => {
    const twitterPlatformStub = sandbox.stub()
    window.twttr = {
      widgets: {
        load: twitterPlatformStub
      }
    }
    const wrapper = mount(
      <TwitterEmbed embed="<div class='asdf'>fooooo</div>" />
    )
    sinon.assert.called(twitterPlatformStub)
    assert.equal(wrapper.text(), "fooooo")
  })
})
