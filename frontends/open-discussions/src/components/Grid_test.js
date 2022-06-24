// @flow
import React from "react"
import { mount, shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import { Grid, Cell } from "./Grid"
import * as utils from "../lib/util"
import { shouldIf } from "../lib/test_utils"

describe("Grid components", () => {
  let sandbox, isMobileWidthStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    isMobileWidthStub = sandbox.stub(utils, "isMobileGridWidth").returns(false)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should render a grid with children", () => {
    const wrapper = shallow(
      <Grid>
        <div className="child" />
      </Grid>
    )
    assert.equal(wrapper.props().className, "mdc-layout-grid")
    assert.ok(wrapper.find(".mdc-layout-grid__inner").exists())
    assert.ok(wrapper.find(".child").exists())
  })

  //
  ;[1, 12].forEach(width => {
    it(`should create a cell with width ${width}`, () => {
      const wrapper = mount(
        <Cell width={width}>
          <div className="child" />
        </Cell>
      )
      assert.ok(wrapper.find(`.mdc-layout-grid__cell--span-${width}`).exists())
      assert.ok(wrapper.find(".child").exists())
    })
  })

  it("should allow passing a className to Grid", () => {
    const wrapper = mount(
      <Grid width={2} className="foobar">
        <div />
      </Grid>
    )
    assert.ok(wrapper.find(".foobar"))
  })

  //
  ;[true, false].forEach(isMobileWidth => {
    it(`${shouldIf(
      isMobileWidth
    )} use mobileWidth if present and mobile==${String(isMobileWidth)}`, () => {
      isMobileWidthStub.returns(isMobileWidth)
      const wrapper = mount(
        <Cell width={4} mobileWidth={7}>
          <div />
        </Cell>
      )
      assert.ok(
        wrapper
          .find(`.mdc-layout-grid__cell--span-${isMobileWidth ? 7 : 4}`)
          .exists()
      )
    })
  })

  it("should allow passing a className to Cell", () => {
    const wrapper = mount(
      <Cell width={2} className="foobar">
        <div />
      </Cell>
    )
    assert.ok(wrapper.find(".foobar"))
  })
})
