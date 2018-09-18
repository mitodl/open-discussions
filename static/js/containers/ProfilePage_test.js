// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import ProfileImage from "./ProfileImage"

import IntegrationTestHelper from "../util/integration_test_helper"
import { profileURL } from "../lib/url"
import { makeProfile } from "../factories/profiles"
import { actions } from "../actions"
import { formatTitle } from "../lib/title"

describe("ProfilePage", function() {
  let helper, renderComponent, profile

  beforeEach(() => {
    profile = makeProfile()
    helper = new IntegrationTestHelper()
    helper.getProfileStub.returns(Promise.resolve(profile))
    helper.getChannelsStub.returns(Promise.resolve([]))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const basicProfilePageActions = [
    actions.profiles.get.requestType,
    actions.profiles.get.successType,
    actions.subscribedChannels.get.requestType,
    actions.subscribedChannels.get.successType
  ]

  const renderPage = async (extraActions = []) => {
    const [wrapper] = await renderComponent(profileURL(profile.username), [
      ...basicProfilePageActions,
      ...extraActions
    ])
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle(`Profile for ${profile.name}`))
  })

  it("should display profile name, bio, and headline", async () => {
    const wrapper = await renderPage()
    assert.deepEqual(
      wrapper
        .find(".name-and-headline .name")
        .at(0)
        .text(),
      profile.name
    )
    assert.deepEqual(
      wrapper
        .find(".name-and-headline .headline")
        .at(0)
        .text(),
      profile.headline
    )
    assert.deepEqual(
      wrapper
        .find(".row.bio")
        .at(0)
        .text(),
      profile.bio
    )
  })

  it("should include a ProfileImage equal to profile.profile_image_medium", async () => {
    const wrapper = await renderPage()
    assert.equal(
      wrapper
        .find(ProfileImage)
        .find("img")
        .at(1)
        .props().src,
      profile.profile_image_medium
    )
  })
  ;[true, false].forEach(sameUser => {
    it(`should not include an edit profile button on this page when profile is ${
      sameUser ? "" : "not"
    } for the logged in user`, async () => {
      SETTINGS.username = sameUser ? profile.username : "other_user"
      const wrapper = await renderPage()
      assert.isNotOk(
        wrapper
          .find("ProfileImage")
          .at(1)
          .props().editable
      )
    })
  })
})
