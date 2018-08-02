// @flow
import { assert } from "chai"
import sinon from "sinon"

import {
  makeChannel,
  makeContributor,
  makeContributors
} from "../../factories/channels"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { newMemberForm } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { editChannelContributorsURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { SET_DIALOG_DATA, SHOW_DIALOG } from "../../actions/ui"

describe("EditChannelContributorsPage", () => {
  let helper, renderComponent, listenForActions, channel, contributors

  beforeEach(() => {
    channel = makeChannel()
    contributors = makeContributors()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelContributorsStub.returns(Promise.resolve(contributors))
    helper.getPostsForChannelStub.returns(
      Promise.resolve({
        pagination: {},
        posts:      []
      })
    )
    helper.getFrontpageStub.returns(
      Promise.resolve({
        pagination: {},
        posts:      []
      })
    )
    helper.getProfileStub.returns(Promise.resolve(""))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    window.scrollTo = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = async () => {
    const [wrapper] = await renderComponent(
      editChannelContributorsURL(channel.name),
      [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelContributors.get.requestType,
        actions.channelContributors.get.successType,
        actions.profiles.get.requestType,
        actions.profiles.get.successType,
        SET_CHANNEL_DATA,
        actions.forms.FORM_BEGIN_EDIT
      ]
    )
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("displays a notice that membership is managed by micromasters", async () => {
    channel.membership_is_managed = true
    const wrapper = await renderPage()
    assert.equal(
      wrapper.find(".membership-notice").text(),
      "Membership is managed via MicroMasters"
    )
  })

  it("renders the member list", async () => {
    const wrapper = await renderPage()
    const props = wrapper.find("MembersList").props()
    assert.deepEqual(props.members, contributors)
    assert.equal(props.editable, !channel.membership_is_managed)
    assert.equal(
      props.usernameGetter(contributors[0]),
      contributors[0].contributor_name
    )
    assert.deepEqual(props.channel, channel)
    assert.equal(props.memberTypeDescription, "contributor")
  })

  describe("editable", () => {
    beforeEach(() => {
      channel.membership_is_managed = false
    })

    it("renders the form", async () => {
      const wrapper = await renderPage()
      const props = wrapper.find("EditChannelMembersForm").props()
      assert.deepEqual(props.memberTypeDescription, "contributor")
      assert.deepEqual(props.form, newMemberForm())
    })

    it("tries to add a new contributor but fails validation", async () => {
      const wrapper = await renderPage()
      await listenForActions([actions.forms.FORM_VALIDATE], () => {
        wrapper
          .find("form")
          .props()
          .onSubmit({ preventDefault: helper.sandbox.stub() })
      })

      assert.equal(
        helper.store.getState().forms["channel:edit:contributors"].errors.email,
        "Email must not be blank"
      )
    })

    it("tries to add a new contributor but the API request fails", async () => {
      const wrapper = await renderPage()
      const email = "new@email.com"

      helper.addChannelContributorStub.returns(Promise.reject())

      wrapper
        .find("input[name='email']")
        .props()
        .onChange({
          target: { name: "email", value: email }
        })
      await listenForActions(
        [
          actions.channelContributors.post.requestType,
          actions.channelContributors.post.failureType,
          actions.forms.FORM_VALIDATE,
          actions.forms.FORM_VALIDATE
        ],
        () => {
          wrapper
            .find("form")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })
        }
      )

      sinon.assert.calledWith(
        helper.addChannelContributorStub,
        channel.name,
        email
      )
      assert.equal(
        helper.store.getState().forms["channel:edit:contributors"].errors.email,
        "Error adding new contributor"
      )
    })

    it("adds a new contributor", async () => {
      const wrapper = await renderPage()
      const email = "new@email.com"

      const newContributor = makeContributor()
      helper.addChannelContributorStub.returns(Promise.resolve(newContributor))

      wrapper
        .find("input[name='email']")
        .props()
        .onChange({
          target: { name: "email", value: email }
        })
      await listenForActions(
        [
          actions.channelContributors.post.requestType,
          actions.channelContributors.post.successType,
          actions.forms.FORM_VALIDATE
        ],
        () => {
          wrapper
            .find("form")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })
        }
      )

      sinon.assert.calledWith(
        helper.addChannelContributorStub,
        channel.name,
        email
      )
    })

    it("removes a contributor", async () => {
      const wrapper = await renderPage()

      helper.deleteChannelContributorStub.returns(Promise.resolve())

      await listenForActions(
        [
          SHOW_DIALOG,
          SET_DIALOG_DATA,
          actions.channelContributors.delete.requestType,
          actions.channelContributors.delete.successType
        ],
        () => {
          wrapper
            .find(".remove")
            .first()
            .props()
            .onClick({ preventDefault: helper.sandbox.stub() })

          wrapper.update()
          wrapper
            .find("#remove-member button.edit-button")
            .props()
            .onClick({
              type: "MDCDialog:accept"
            })
        }
      )

      sinon.assert.calledWith(
        helper.deleteChannelContributorStub,
        channel.name,
        contributors[0].contributor_name
      )
    })
  })
})
