import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import EditChannelContributorsForm from "./EditChannelContributorsForm"
import { profileURL } from "../../lib/url"
import { makeChannel, makeContributors } from "../../factories/channels"

describe("EditChannelContributorsForm", () => {
  const renderForm = (channel, contributors) =>
    shallow(
      <EditChannelContributorsForm
        channelName={channel.name}
        contributors={contributors}
      />
    )
  let channel, contributors

  beforeEach(() => {
    channel = makeChannel()
    contributors = makeContributors()
  })

  it("should render names and emails", () => {
    const wrapper = renderForm(channel, contributors)
    const rows = wrapper.find(".contributors .row")
    contributors.forEach((contributor, i) => {
      const row = rows.at(i)
      const link = row.find(".name")
      assert.equal(link.children().text(), contributor.full_name)
      assert.equal(link.props().to, profileURL(contributor.contributor_name))
      assert.equal(row.find(".email").text(), contributor.email)
    })
  })

  it("should fill in missing names and emails", () => {
    const contributors = makeContributors().map(contributor => ({
      ...contributor,
      full_name: null,
      email:     null
    }))

    const wrapper = renderForm(channel, contributors)
    const rows = wrapper.find(".contributors .row")
    contributors.forEach((contributor, i) => {
      const row = rows.at(i)
      assert.equal(row.find(".name").text(), "<missing>")
      assert.equal(row.find(".email").text(), "<missing>")
    })
  })
})
