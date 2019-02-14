// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import PeopleWidget from "./PeopleWidget"

import { WIDGET_TYPE_PEOPLE } from "../../lib/constants"
import { makeWidgetInstance } from "../../factories/widgets"

describe("PeopleWidget", () => {
  it("renders a PeopleList", () => {
    const widgetInstance = makeWidgetInstance(WIDGET_TYPE_PEOPLE)
    const wrapper = shallow(<PeopleWidget widgetInstance={widgetInstance} />)
    assert.deepEqual(
      wrapper.find("sortableList").prop("profiles"),
      widgetInstance.json.people
    )
    assert.isTrue(wrapper.find("sortableList").prop("useDragHandle"))
  })
})
