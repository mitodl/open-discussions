// @flow
import React from "react"
import { mount } from "enzyme"
import { createSandbox } from "sinon"
import { assert } from "chai"

import CourseFilterDrawer from "./CourseFilterDrawer"

import * as utilHooks from "../hooks/util"
import { DESKTOP, PHONE, TABLET } from "../lib/constants"

describe("CourseFilterDrawer", () => {
  const render = (props = {}) =>
    mount(
      <CourseFilterDrawer {...props}>
        <div className="child-child-child" />
      </CourseFilterDrawer>
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

  it("should render the children on desktop", () => {
    const wrapper = render()
    assert.ok(wrapper.find(".child-child-child"))
  })

  //
  ;[TABLET, PHONE].forEach(deviceCategory => {
    it(`should render an open control by default when ${deviceCategory}`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      assert.ok(wrapper.find(".filter-controls").exists())
      assert.isNotOk(wrapper.find(".child-child-child").exists())
    })
  })

  //
  ;[TABLET, PHONE].forEach(deviceCategory => {
    it(`should open the drawer when you click the control when ${deviceCategory}`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      wrapper.find(".filter-controls").simulate("click")
      assert.ok(wrapper.find(".child-child-child").exists())
    })
  })

  //
  ;[TABLET, PHONE].forEach(deviceCategory => {
    it(`should let you close the drawer once it's open when ${deviceCategory}`, () => {
      useDeviceCategoryStub.returns(deviceCategory)
      const wrapper = render()
      wrapper.find(".filter-controls").simulate("click")
      assert.ok(wrapper.find(".child-child-child").exists())
      wrapper.find(".controls i").simulate("click")
      assert.isNotOk(wrapper.find(".child-child-child").exists())
    })
  })
})
