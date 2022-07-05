// @flow
import { assert } from "chai"
import sinon from "sinon"

import EditChannelContributorsPage, {
  EditChannelContributorsPage as InnerEditChannelContributorsPage,
  CONTRIBUTORS_KEY
} from "./EditChannelContributorsPage"

import {
  makeChannel,
  makeContributor,
  makeContributors,
  makeChannelInvite
} from "../../factories/channels"
import { FORM_VALIDATE, FORM_UPDATE } from "../../actions/forms"
import {
  DIALOG_REMOVE_MEMBER,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_DIALOG_DATA,
  SET_SNACKBAR_MESSAGE
} from "../../actions/ui"

import { newMemberForm, CHANNEL_TYPE_PRIVATE } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { wait } from "../../lib/util"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelContributorsPage", () => {
  let helper, render, channel, contributors, initialState, initialProps

  beforeEach(() => {
    channel = makeChannel()
    channel.user_is_contributor = true
    contributors = makeContributors()
    helper = new IntegrationTestHelper()
    initialState = {
      channels: {
        data:       new Map([[channel.name, channel]]),
        processing: false
      },
      channelContributors: {
        processing: false,
        data:       new Map([[channel.name, contributors]])
      },
      forms: {
        [CONTRIBUTORS_KEY]: {
          value:  newMemberForm(),
          errors: {}
        }
      },
      ui: {
        dialogs: new Map()
      }
    }
    initialProps = {
      match: {
        params: {
          channelName: channel.name
        }
      },
      channel: channel
    }

    render = helper.configureHOCRenderer(
      EditChannelContributorsPage,
      InnerEditChannelContributorsPage,
      initialState,
      initialProps
    )
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelContributorsStub.returns(Promise.resolve(contributors))
    helper.addChannelInvitationStub.returns(
      Promise.resolve(makeChannelInvite())
    )
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
    helper.sandbox.stub(window, "scrollTo")
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should set the document title", async () => {
    const { inner } = await render()
    assert.equal(
      inner.find("MetaTags").props().children.props.children,
      formatTitle("Edit Channel")
    )
  })

  it("displays a notice that membership is managed by micromasters", async () => {
    channel.membership_is_managed = true
    const { inner } = await render()
    assert.equal(
      inner.find(".membership-notice").text(),
      "Membership is managed via MicroMasters"
    )
  })

  it("renders the member list", async () => {
    const { inner } = await render()
    const props = inner.find("MembersList").props()
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
      const { inner } = await render()
      const props = inner.find("EditChannelMembersForm").props()
      assert.deepEqual(props.memberTypeDescription, "contributor")
      assert.deepEqual(props.form, newMemberForm())
    })

    it("updates the email", async () => {
      const { inner, store } = await render()
      const props = inner.find("EditChannelMembersForm").props()
      const email = "new@email.com"
      props.onUpdate({ target: { name: "email", value: email } })

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    FORM_UPDATE,
        payload: {
          formKey: CONTRIBUTORS_KEY,
          value:   { email }
        }
      })
    })

    it("tries to add a new contributor but the API request fails", async () => {
      helper.addChannelContributorStub.returns(Promise.reject("an error"))

      const email = "new@email.com"
      const { inner, store } = await render({
        forms: {
          [CONTRIBUTORS_KEY]: {
            value: {
              email
            },
            errors: {}
          }
        }
      })

      const props = inner.find("EditChannelMembersForm").props()
      props.onSubmit({ preventDefault: helper.sandbox.stub() })

      // let promise resolve
      await wait(0)
      sinon.assert.calledWith(
        helper.addChannelContributorStub,
        channel.name,
        email
      )

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    FORM_VALIDATE,
        payload: {
          formKey: CONTRIBUTORS_KEY,
          errors:  {
            email: "Error adding new contributor"
          }
        }
      })
    })

    it("sends a channel invitation if the channel is private and email doesn't exist", async () => {
      helper.addChannelContributorStub.returns(
        Promise.reject({
          email: ["email does not exist"]
        })
      )

      const email = "new@email.com"
      channel.channel_type = CHANNEL_TYPE_PRIVATE
      const { inner } = await render({
        forms: {
          [CONTRIBUTORS_KEY]: {
            value: {
              email
            },
            errors: {}
          }
        }
      })

      const props = inner.find("EditChannelMembersForm").props()
      props.onSubmit({ preventDefault: helper.sandbox.stub() })

      // let promise resolve
      await wait(0)
      sinon.assert.calledWith(
        helper.addChannelContributorStub,
        channel.name,
        email
      )
      sinon.assert.calledWith(
        helper.addChannelInvitationStub,
        channel.name,
        email
      )
    })

    it("adds a new contributor", async () => {
      const newContributor = makeContributor()
      helper.addChannelContributorStub.returns(Promise.resolve(newContributor))

      const email = "new@email.com"
      const { inner, store } = await render({
        forms: {
          [CONTRIBUTORS_KEY]: {
            value: {
              email
            },
            errors: {}
          }
        }
      })

      inner
        .find("EditChannelMembersForm")
        .props()
        .onSubmit({ preventDefault: helper.sandbox.stub() })

      await wait(0)
      sinon.assert.calledWith(
        helper.addChannelContributorStub,
        channel.name,
        email
      )

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type:    SET_SNACKBAR_MESSAGE,
        payload: {
          message: `Successfully added ${String(
            newContributor.email
          )} as a contributor`
        }
      })
    })
  })
  it("removes a contributor", async () => {
    const { inner, store } = await render(
      {},
      { history: helper.browserHistory }
    )

    helper.deleteChannelContributorStub.returns(Promise.resolve())

    inner
      .find("MembersList")
      .props()
      .removeMember(channel, contributors[0])

    // wait for promise to resolve
    await wait(0)
    sinon.assert.calledWith(
      helper.deleteChannelContributorStub,
      channel.name,
      contributors[0].contributor_name
    )

    const actions = store.getActions()

    assert.deepEqual(actions[actions.length - 2], {
      type:    SET_SNACKBAR_MESSAGE,
      payload: {
        message: `Successfully removed ${String(
          contributors[0].email
        )} as a contributor`
      }
    })
    assert.deepEqual(actions[actions.length - 1], {
      type:    HIDE_DIALOG,
      payload: DIALOG_REMOVE_MEMBER
    })
  })

  //
  ;[true, false].forEach(hasDialog => {
    it(`passes a dialog value of ${String(hasDialog)}`, async () => {
      const { inner } = await render({
        ui: {
          dialogs: new Map(hasDialog ? [[DIALOG_REMOVE_MEMBER, true]] : [])
        }
      })

      assert.equal(inner.find("MembersList").props().dialogOpen, hasDialog)
    })
  })
  ;[true, false].forEach(dialogVisibility => {
    it(`sets dialog visibility to ${String(dialogVisibility)}`, async () => {
      const { inner, store } = await render()
      inner
        .find("MembersList")
        .props()
        .setDialogVisibility(dialogVisibility)

      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    dialogVisibility ? SHOW_DIALOG : HIDE_DIALOG,
        payload: DIALOG_REMOVE_MEMBER
      })
    })
  })

  it("sets dialog data", async () => {
    const { inner, store } = await render()
    const data = { a: "data" }
    inner
      .find("MembersList")
      .props()
      .setDialogData(data)
    const actions = store.getActions()
    assert.deepEqual(actions[actions.length - 1], {
      type:    SET_DIALOG_DATA,
      payload: { data, dialogKey: DIALOG_REMOVE_MEMBER }
    })
  })

  it("has a channel header", async () => {
    render = helper.configureHOCRenderer(
      EditChannelContributorsPage,
      "withChannelHeader(WithSingleColumn)",
      initialState,
      initialProps
    )

    const { inner } = await render()
    assert.isTrue(inner.find("ChannelHeader").exists())
  })
})
