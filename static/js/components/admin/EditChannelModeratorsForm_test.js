import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import EditChannelModeratorsForm from "./EditChannelModeratorsForm"
import { newModeratorsForm } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import { makeChannel, makeModerators } from "../../factories/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

describe("EditChannelModeratorsForm", () => {
  const renderForm = (form: ChannelForm) =>
    shallow(<EditChannelModeratorsForm form={form} />)
  let form

  beforeEach(() => {
    form = newModeratorsForm(makeChannel(), makeModerators(null, true))
  })

  it("should render names and emails", () => {
    const wrapper = renderForm(form)
    const rows = wrapper.find(".moderators .row")
    form.moderators.forEach((moderator, i) => {
      const row = rows.at(i)
      const link = row.find(".name")
      assert.equal(link.children().text(), moderator.full_name)
      assert.equal(link.props().to, profileURL(moderator.moderator_name))
      assert.equal(row.find(".email").text(), moderator.email)
    })
  })

  it("should fill in missing names and emails", () => {
    const moderators = makeModerators(null, false)
    form = newModeratorsForm(makeChannel(), moderators)

    const wrapper = renderForm(form)
    const rows = wrapper.find(".moderators .row")
    form.moderators.forEach((moderator, i) => {
      const row = rows.at(i)
      assert.equal(row.find(".name").text(), "<missing>")
      assert.equal(row.find(".email").text(), "<missing>")
    })
  })
})
