import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import EditChannelContributorsForm from "./EditChannelContributorsForm"
import { newContributorsForm } from "../../lib/channels"
import { profileURL } from "../../lib/url"
import { makeChannel, makeContributors } from "../../factories/channels"

import type { ChannelForm } from "../../flow/discussionTypes"

describe("EditChannelContributorsForm", () => {
  const renderForm = (form: ChannelForm) =>
    shallow(<EditChannelContributorsForm form={form} />)
  let form

  beforeEach(() => {
    form = newContributorsForm(makeChannel(), makeContributors())
  })

  it("should render names and emails", () => {
    const wrapper = renderForm(form)
    const rows = wrapper.find(".contributors .row")
    form.contributors.forEach((contributor, i) => {
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
    form = newContributorsForm(makeChannel(), contributors)

    const wrapper = renderForm(form)
    const rows = wrapper.find(".contributors .row")
    form.contributors.forEach((contributor, i) => {
      const row = rows.at(i)
      assert.equal(row.find(".name").text(), "<missing>")
      assert.equal(row.find(".email").text(), "<missing>")
    })
  })
})
