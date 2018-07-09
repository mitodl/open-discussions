// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import SpinnerButton from "./SpinnerButton"

describe("SpinnerButton", () => {
  let sandbox
  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  for (const promiseState of ["not_clicked", "rejected", "resolved"]) {
    it(`passes through all props when promise state is ${promiseState}`, () => {
      return new Promise((resolve, reject) => {
        const onClickPromise = () =>
          promiseState === "rejected" ? reject() : resolve()
        const props = {
          "data-x":       "y",
          onClickPromise: onClickPromise,
          className:      "class1 class2"
        }
        const wrapper = shallow(
          <SpinnerButton {...props}>childText</SpinnerButton>
        )
        const button = wrapper.find("button")
        const buttonProps = button.props()

        if (promiseState !== "not_clicked") {
          buttonProps.onClick()
        }

        for (const key of Object.keys(props)) {
          if (key !== "onClickPromise") {
            assert.deepEqual(buttonProps[key].trim(), props[key])
          }
        }
        assert.equal(button.children().text(), "childText")
        assert.isFalse(buttonProps.disabled)

        if (promiseState === "not_clicked") {
          resolve()
        }
      }).catch(err => {
        assert.isNotOk(err)
      })
    })
  }

  it("renders a button which is disabled while promise is not yet resolved or rejected", () => {
    const onClickPromise = () => new Promise(() => {})
    const props = {
      "data-x": "y"
    }
    const wrapper = shallow(
      <SpinnerButton
        onClickPromise={onClickPromise}
        className="class1 class2"
        {...props}
      >
        text
      </SpinnerButton>
    )
    let button = wrapper.find("button")
    let buttonProps = button.props()
    for (const key of Object.keys(props)) {
      assert.deepEqual(buttonProps[key], props[key])
    }
    buttonProps.onClick()

    // refresh after state update
    button = wrapper.find("button")
    wrapper.update()
    buttonProps = wrapper.find("button").props()

    assert.equal(buttonProps.className, "class1 class2 disabled-with-spinner")
    assert.equal(buttonProps["data-x"], "y")
    assert.isTrue(buttonProps.disabled)
    assert(
      button.children().find(".sk-fading-circle"),
      "Unable to find spinner"
    )
  })
})
