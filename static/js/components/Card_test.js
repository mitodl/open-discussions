// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

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

  it("should add .borderless if given the prop", () => {
    const wrapper = mountCard(<div />, { borderless: true })
    assert.equal(wrapper.props().className, "card borderless")
  })

  it("should set an onClick handler, if given one", () => {
    const onClick = sinon.stub()
    const wrapper = mountCard(<div />, { onClick })
    wrapper.simulate("click")
    sinon.assert.called(onClick)
  })
})
