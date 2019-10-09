// @flow
import { assert } from "chai"
import { Radio } from "@mitodl/mdl-react-components"
import { Checkbox } from "@rmwc/checkbox"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { FORM_BEGIN_EDIT } from "../actions/forms"
import { makeFrontpageSetting, makeCommentSetting } from "../factories/settings"
import { FREQUENCY_IMMEDIATE } from "../reducers/settings"

describe("SettingsPage", () => {
  let helper, renderComponent

  const renderPage = async () => {
    const [wrapper] = await renderComponent("/settings/", [
      actions.settings.get.requestType,
      actions.settings.get.successType,
      FORM_BEGIN_EDIT
    ])
    return wrapper.update()
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should work ok when the frontpage setting comes back first", async () => {
    const settings = [makeFrontpageSetting(), makeCommentSetting()]
    helper.getSettingsStub.returns(Promise.resolve(settings))
    const wrapper = await renderPage()
    assert.equal(
      wrapper.find(Radio).props().value,
      settings[0].trigger_frequency
    )
    assert.equal(
      wrapper.find(Checkbox).props().checked,
      settings[1].trigger_frequency === FREQUENCY_IMMEDIATE
    )
  })

  it("should work ok if the frontpage setting doesnt come back first", async () => {
    const settings = [makeCommentSetting(), makeFrontpageSetting()]
    helper.getSettingsStub.returns(Promise.resolve(settings))
    const wrapper = await renderPage()
    assert.equal(
      wrapper.find(Radio).props().value,
      settings[1].trigger_frequency
    )
    assert.equal(
      wrapper.find(Checkbox).props().checked,
      settings[0].trigger_frequency === FREQUENCY_IMMEDIATE
    )
  })
})
