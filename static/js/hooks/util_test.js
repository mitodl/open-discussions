// @flow
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"

import { useDeviceCategory, useResponsive } from "./util"
import { PHONE, TABLET, DESKTOP } from "../lib/constants"
import { hookReturnTestHarness, renderCountTestHarness } from "./test_util"

const DeviceCategoryTestHarness = hookReturnTestHarness(useDeviceCategory)
const UseResponsiveTestHarness = renderCountTestHarness(useResponsive)

describe("utility hooks", () => {
  let helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("useDeviceCategory", () => {
    beforeEach(() => {
      render = helper.configureReduxQueryRenderer(DeviceCategoryTestHarness)
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
        await render({
          cb: text => assert.equal(text, expectation)
        })
      })
    })
  })

  describe("useResponsive", () => {
    beforeEach(() => {
      render = helper.configureReduxQueryRenderer(UseResponsiveTestHarness)
    })

    it("should re-render after resize event", async () => {
      const { wrapper } = await render()
      assert.equal(wrapper.find("PropRecipient").prop("renderCount"), 1)
      window.dispatchEvent(new Event("resize"))
      wrapper.update()
      assert.equal(wrapper.find("PropRecipient").prop("renderCount"), 2)
    })
  })
})
