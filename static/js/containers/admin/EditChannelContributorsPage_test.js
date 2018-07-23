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
import { formatTitle } from "../../lib/title"
import { editChannelContributorsURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

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

  it("renders the form", async () => {
    const wrapper = await renderPage()
    const props = wrapper.find("EditChannelMembersForm").props()
    assert.deepEqual(props.members, contributors)
    assert.equal(
      props.usernameGetter(contributors[0]),
      contributors[0].contributor_name
    )
    assert.deepEqual(props.channel, channel)
  })

  describe("editable", () => {
    beforeEach(() => {
      channel.membership_is_managed = false
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
          target:         { value: email },
          preventDefault: helper.sandbox.stub()
        })
      await listenForActions(
        [
          actions.channelContributors.post.requestType,
          actions.channelContributors.post.failureType,
          actions.forms.FORM_VALIDATE
        ],
        () => {
          wrapper
            .find("form")
            .props()
            .onSubmit({ preventDefault: helper.sandbox.stub() })
        }
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
          target:         { value: email },
          preventDefault: helper.sandbox.stub()
        })
      await listenForActions(
        [
          actions.channelContributors.post.requestType,
          actions.channelContributors.post.successType
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
          actions.channelContributors.delete.requestType,
          actions.channelContributors.delete.successType
        ],
        () => {
          wrapper
            .find(".remove")
            .first()
            .props()
            .onClick({ preventDefault: helper.sandbox.stub() })
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
