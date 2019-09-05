// @flow
import React from "react"
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"

import { useDeviceCategory } from "./util"
import { PHONE, TABLET, DESKTOP } from "../lib/constants"

describe("utility hooks", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("useDeviceCategory", () => {
    const TestComponent = () => {
      const category = useDeviceCategory()

      return <div>{category}</div>
    }

    let render

    beforeEach(() => {
      render = helper.configureHOCRenderer(TestComponent, TestComponent, {})
    })

    //
    ;[
      [400, PHONE],
      [580, PHONE],
      [600, TABLET],
      [750, TABLET],
      [800, TABLET],
      [850, DESKTOP],
      [900, DESKTOP]
    ].forEach(([width, expectation]) => {
      it(`should give ${expectation} for a width of ${width}`, async () => {
        helper.getViewportWidthStub.returns(width)
        const { wrapper } = await render()
        assert.equal(wrapper.text(), expectation)
      })
    })
  })
})
