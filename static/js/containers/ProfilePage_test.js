/* global SETTINGS: false */
import { assert } from "chai"
import IntegrationTestHelper from "../util/integration_test_helper"
import { profileURL } from "../lib/url"
import { makeProfile } from "../factories/profiles"
import ProfileImage from "./ProfileImage"
import { actions } from "../actions"
import { initials } from "../lib/profile"
import { formatTitle } from "../lib/title"
import { defaultProfileImageUrl } from "../lib/util"

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

  const renderPage = async () => {
    const [wrapper] = await renderComponent(
      profileURL(profile.username),
      basicProfilePageActions
    )
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
        .find(".profile-view-name")
        .at(0)
        .text(),
      profile.name
    )
    assert.deepEqual(
      wrapper
        .find(".profile-view-headline")
        .at(0)
        .text(),
      profile.headline
    )
    assert.deepEqual(
      wrapper
        .find(".profile-view-bio")
        .at(0)
        .text(),
      profile.bio
    )
  })

  it("should include a ProfileImage and initials when no profile image exists", async () => {
    const wrapper = await renderPage()
    assert.equal(
      wrapper
        .find(ProfileImage)
        .find(".profile-initials")
        .at(0)
        .text(),
      initials(profile.name)
    )
  })

  it("should include a ProfileImage and default image when no profile name exists", async () => {
    profile.name = ""
    const wrapper = await renderPage()
    assert.equal(
      wrapper
        .find(ProfileImage)
        .find("img")
        .at(1)
        .props().src,
      defaultProfileImageUrl
    )
  })

  it("should include a ProfileImage and thumbnail when profile image exists", async () => {
    const profileWithImage = makeProfile(
      "userWithImage",
      "http://example.com/test.jpg"
    )
    helper.getProfileStub.returns(Promise.resolve(profileWithImage))
    const wrapper = await renderPage()
    assert.isTrue(
      wrapper
        .find(ProfileImage)
        .find("img")
        .at(0)
        .exists()
    )
  })
  ;[true, false].forEach(sameUser => {
    it(`should ${
      sameUser ? "" : "not"
    } include an edit profile button`, async () => {
      SETTINGS.username = sameUser ? profile.username : "other_user"
      const wrapper = await renderPage()
      assert.equal(wrapper.find(".profile-edit-button").exists(), sameUser)
    })
  })
})
