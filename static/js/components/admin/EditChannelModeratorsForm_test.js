import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import EditChannelModeratorsForm from "./EditChannelModeratorsForm"
import { profileURL } from "../../lib/url"
import { makeChannel, makeModerators } from "../../factories/channels"

describe("EditChannelModeratorsForm", () => {
  const renderForm = (channel, moderators) =>
    shallow(
      <EditChannelModeratorsForm
        channelName={channel.name}
        moderators={moderators}
      />
    )
  let channel, moderators

  beforeEach(() => {
    channel = makeChannel()
    moderators = makeModerators(null, true)
  })

  it("should render names and emails", () => {
    const wrapper = renderForm(channel, moderators)
    const rows = wrapper.find(".moderators .row")
    moderators.forEach((moderator, i) => {
      const row = rows.at(i)
      const link = row.find(".name")
      assert.equal(link.children().text(), moderator.full_name)
      assert.equal(link.props().to, profileURL(moderator.moderator_name))
      assert.equal(row.find(".email").text(), moderator.email)
    })
  })

  it("should fill in missing names and emails", () => {
    const moderators = makeModerators(null, false)

    const wrapper = renderForm(channel, moderators)
    const rows = wrapper.find(".moderators .row")
    moderators.forEach((moderator, i) => {
      const row = rows.at(i)
      assert.equal(row.find(".name").text(), "<missing>")
      assert.equal(row.find(".email").text(), "<missing>")
    })
  })
})
