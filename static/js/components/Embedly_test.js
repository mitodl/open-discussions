import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import ContentLoader from "react-content-loader"
import sinon from "sinon"

import Embedly from "./Embedly"

import { urlHostname } from "../lib/url"
import { makeArticle, makeYoutubeVideo, makeImage } from "../factories/embedly"
import * as embedFuncs from "../lib/embed"

const renderEmbedly = embedlyResponse =>
  mount(<Embedly embedly={embedlyResponse} />)

describe("Embedly", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render the returned HTML for a video", () => {
    const wrapper = renderEmbedly(makeYoutubeVideo())
    assert.equal(wrapper.text(), "dummy html")
    assert.ok(wrapper.find(".video").exists())
  })

  it("should render an image sensibly", () => {
    const image = makeImage()
    const wrapper = renderEmbedly(image)
    assert.ok(wrapper.find(".photo"))
    const img = wrapper.find("img")
    assert.equal(img.props().src, image.url)
  })

  it("should render generic article-type content sensibly", () => {
    const article = makeArticle()
    const wrapper = renderEmbedly(article)
    assert.equal(
      wrapper
        .find("a")
        .at(0)
        .props().href,
      article.url
    )
    assert.equal(
      wrapper.find(".thumbnail img").props().src,
      article.thumbnail_url
    )
    assert.equal(wrapper.find(".link-summary h2").text(), article.title)
    assert.equal(
      wrapper.find(".link-summary .description").text(),
      article.description
    )
    const link = wrapper.find(".read-more-link")
    assert.equal(link.props().href, article.url)
    assert.equal(link.text(), `Read this on ${urlHostname(article.url)}`)
  })

  //
  ;[true, false].forEach(hasIframe => {
    it(`should render a 'rich' type link ${
      hasIframe ? "with" : "without"
    } an iframe`, () => {
      const hasIframeStub = sandbox
        .stub(embedFuncs, "hasIframe")
        .returns(hasIframe)
      const article = makeArticle()
      article.type = "rich"
      article.html = "beep boop beepity boop"
      const wrapper = renderEmbedly(article)
      assert.ok(hasIframeStub.called)
      if (hasIframe) {
        assert.ok(wrapper.find(".rich.iframe-container").exists())
      } else {
        assert.ok(wrapper.find(".rich").exists())
        assert.isNotOk(wrapper.find(".iframe-container").exists())
      }
      assert.equal(wrapper.text(), "beep boop beepity boop")
    })
  })

  it("shouldnt render anything if embedly had some kind of error", () => {
    const article = makeArticle()
    article.type = "error"
    const wrapper = renderEmbedly(article)
    assert.lengthOf(wrapper.children().at(1), 0)
  })

  it("should show a loading animation thing if embedly response hasn't come back yet", () => {
    const wrapper = renderEmbedly()
    assert.isOk(wrapper.find(".content-loader"))
    assert.isOk(wrapper.find(ContentLoader))
  })
})
