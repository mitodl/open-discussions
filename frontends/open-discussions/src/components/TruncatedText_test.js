// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import _ from "lodash"

import TruncatedText from "./TruncatedText"

import { mockHTMLElHeight } from "../lib/test_utils"

describe("TruncatedText", () => {
  const render = (props = {}) => mount(<TruncatedText {...props} />)

  beforeEach(() => {
    mockHTMLElHeight(100, 50)
  })

  it("displays text", () => {
    const props = {
      text:            "normal text",
      lines:           2,
      estCharsPerLine: 200,
      className:       "some-class"
    }
    const wrapper = render(props)
    const dotdotdot = wrapper.find("Dotdotdot")

    assert.isTrue(dotdotdot.exists())
    assert.equal(dotdotdot.prop("clamp"), props.lines)
    assert.equal(dotdotdot.prop("className"), props.className)
    assert.equal(dotdotdot.text(), props.text)
  })

  it("converts newlines to <br>", () => {
    const props = {
      text:            "normal\ntext",
      lines:           2,
      estCharsPerLine: 200,
      className:       "some-class"
    }
    const wrapper = render(props)
    const dotdotdot = wrapper.find("Dotdotdot")

    assert.isTrue(dotdotdot.exists())
    assert.equal(dotdotdot.prop("clamp"), props.lines)
    assert.equal(dotdotdot.prop("className"), props.className)
    assert.equal(dotdotdot.children().children().html(), "normal<br>text")
  })

  it("limits text that is passed into Dotdotdot if necessary", () => {
    const text = _.repeat("1234567890", 10),
      lines = 1,
      estCharsPerLine = 5
    const props = { text, lines, estCharsPerLine }
    const wrapper = render(props)
    const dotdotdotText = wrapper.find("Dotdotdot").text()

    assert.isBelow(dotdotdotText.length, text.length)
    assert.equal(
      dotdotdotText,
      text.substring(0, estCharsPerLine * (lines + 2))
    )
  })

  it("should show expansion controls if flag is passed", () => {
    const wrapper = render({
      text:                  "foofofofofofof",
      lines:                 1,
      showExpansionControls: true
    })
    assert.ok(wrapper.find(".tt-expansion-control").exists())
  })

  it("should not show expansion controls if text is not hidden", () => {
    mockHTMLElHeight(100, 100)
    const wrapper = render({
      text:                  "foofofofofofof",
      lines:                 1,
      showExpansionControls: true
    })
    assert.isNotOk(wrapper.find(".tt-expansion-control").exists())
  })

  it("should render an empty string ok", () => {
    mockHTMLElHeight(0, 0)
    const wrapper = render({
      text:                  "",
      lines:                 1,
      showExpansionControls: true
    })
    assert.isNotOk(wrapper.find(".tt-expansion-control").exists())
  })

  it("should reset if the text changes", () => {
    const wrapper = render({
      text:                  "text",
      lines:                 1,
      showExpansionControls: true
    })
    wrapper.find(".tt-expansion-control").simulate("click")
    assert.equal(wrapper.find(".tt-expansion-control").text(), "Read less")

    wrapper.update()
    assert.equal(wrapper.find(".tt-expansion-control").text(), "Read less")

    wrapper.setProps({ text: "new text" })
    wrapper.update()
    assert.equal(wrapper.find(".tt-expansion-control").text(), "Read more")
  })
})
