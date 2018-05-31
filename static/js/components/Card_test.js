// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import Card from "./Card"

describe("Card component", () => {
  const mountCard = (children, props = {}) =>
    shallow(<Card {...props}>{children}</Card>)

  it("should render children", () => {
    const wrapper = mountCard(<div className="child">HEY</div>)
    assert.lengthOf(wrapper.find(".child"), 1)
    assert.equal(wrapper.text(), "HEY")
  })

  it("should put className, if passed one", () => {
    const wrapper = mountCard(<div />, { className: "HEY THERE" })
    assert.equal(wrapper.props().className, "card HEY THERE")
  })

  it("should display a title, if passed one", () => {
    const wrapper = mountCard(<div />, { title: "HEY THERE" })
    assert.equal(wrapper.text(), "HEY THERE")
  })
})
