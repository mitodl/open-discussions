// @flow
import React from "react"
import { mount } from "enzyme"
import { createSandbox } from "sinon"
import { assert } from "chai"

import ResponsiveWrapper from "./ResponsiveWrapper"

import * as utilHooks from "../hooks/util"
import { DESKTOP, PHONE, TABLET } from "../lib/constants"
import { shouldIf } from "../lib/test_utils"

describe("ResponsiveWrapper", () => {
  const render = (props = { onlyOn: [] }) =>
    mount(
      <ResponsiveWrapper {...props}>
        <div className="child-child-child" />
      </ResponsiveWrapper>
    )

  let sandbox, useDeviceCategoryStub

  beforeEach(() => {
    sandbox = createSandbox()
    useDeviceCategoryStub = sandbox
      .stub(utilHooks, "useDeviceCategory")
      .returns(DESKTOP)
  })

  afterEach(() => {
    sandbox.restore()
  })

  //
  ;[PHONE, DESKTOP, TABLET].forEach(deviceCategory => {
    it(`should not show any children when ${deviceCategory} and no onlyOn`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      assert.isNotOk(wrapper.find(".child-child-child").exists())
    })
  })

  //
  ;[PHONE, DESKTOP, TABLET].forEach(deviceCategory => {
    [
      [[PHONE], deviceCategory === PHONE],
      [[DESKTOP], deviceCategory === DESKTOP],
      [[TABLET], deviceCategory === TABLET]
    ].forEach(([onlyOn, shouldShowChildren]) => {
      it(`${shouldIf(
        shouldShowChildren
      )} show children when ${deviceCategory} and onlyOn is ${JSON.stringify(
        onlyOn
      )}`, () => {
        useDeviceCategoryStub.returns(deviceCategory)
        const wrapper = render()
        assert.isNotOk(wrapper.find(".child-child-child").exists())
      })
    })
  })
})
