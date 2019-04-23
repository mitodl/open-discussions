// @flow
import React from "react"
import { assert } from "chai"
import { mount } from "enzyme"

import NavigationItem, { NavigationExpansion } from "./NavigationItem"

import { shouldIf } from "../lib/test_utils"

describe("NavigationItem", () => {
  const badge = () => <div className="badge" />
  const whenExpanded = () => <div className="whenExpanded" />

  const renderNavigationItem = (expanded = true) =>
    mount(
      <NavigationExpansion.Provider value={expanded}>
        <NavigationItem badge={badge} whenExpanded={whenExpanded} />
      </NavigationExpansion.Provider>
    )

  //
  ;[true, false].forEach(expanded => {
    it(`should render badge and ${shouldIf(
      expanded
    )} render whenExpended when expanded == ${String(expanded)}`, () => {
      const wrapper = renderNavigationItem(expanded)

      assert.ok(wrapper.find(".badge").exists())
      assert.equal(expanded, wrapper.find(".whenExpanded").exists())
    })
  })
})
