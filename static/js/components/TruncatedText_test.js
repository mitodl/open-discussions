// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import _ from "lodash"

import TruncatedText from "./TruncatedText"

describe("TruncatedText", () => {
  const render = (props = {}) => mount(<TruncatedText {...props} />)

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
    assert.equal(dotdotdot.prop("children"), props.text)
  })

  it("limits text that is passed into Dotdotdot if necessary", () => {
    const text = _.repeat("1234567890", 10),
      lines = 1,
      estCharsPerLine = 5
    const props = { text, lines, estCharsPerLine }
    const wrapper = render(props)
    const dotdotdotText = wrapper.find("Dotdotdot").prop("children")

    assert.isBelow(dotdotdotText.length, text.length)
    assert.equal(
      dotdotdotText,
      text.substring(0, estCharsPerLine * (lines + 2))
    )
  })
})
