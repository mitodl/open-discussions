// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import sinon from "sinon"

import CloseButton from "./CloseButton"
import AddLinkMenu from "./AddLinkMenu"

describe("AddLinkMenu", () => {
  let sandbox, onSubmit, onChange, closeMenu, props

  const renderLinkMenu = (extraProps = {}) =>
    shallow(<AddLinkMenu {...props} {...extraProps} />)

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    onSubmit = sandbox.stub()
    onChange = sandbox.stub()
    closeMenu = sandbox.stub()
    props = {
      onSubmit:  onSubmit,
      onChange:  onChange,
      closeMenu: closeMenu,
      text:      "hey!",
      url:       "https://en.wikipedia.org/wiki/United_States_war_crimes"
    }
  })

  //
  ;[["text", 0], ["url", 1]].forEach(([name, index]) => {
    it(`has the input for ${name} that we expect`, () => {
      const wrapper = renderLinkMenu()
      const { onChange, name, value } = wrapper
        .find("input")
        .at(index)
        .props()
      onChange()
      sinon.assert.called(onChange)
      assert.equal(name, name)
      assert.equal(value, props[name])
    })
  })

  it("has a submit button", () => {
    const button = renderLinkMenu().find("button")
    button.props().onClick()
    sinon.assert.called(onSubmit)
    assert.equal(button.text(), "Add Link")
    assert.equal(button.props().className, "submit-link")
  })

  it("has a close button with the closeMenu function passed in", () => {
    const wrapper = renderLinkMenu()
    wrapper
      .find(CloseButton)
      .props()
      .onClick()
    sinon.assert.called(closeMenu)
  })
})
