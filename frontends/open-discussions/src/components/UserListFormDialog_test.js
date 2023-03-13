// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import { times } from "ramda"

import UserListFormDialog from "./UserListFormDialog"
import Dialog from "./Dialog"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeTopic, makeUserList } from "../factories/learning_resources"
import {
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_PUBLIC,
  LR_PRIVATE
} from "../lib/constants"
import { wait } from "../lib/util"
import { topicApiURL, userListApiURL, userListDetailApiURL } from "../lib/url"
import { changeFormikInput, queryListResponse } from "../lib/test_utils"
import { TOPICS_LENGTH_MAXIMUM } from "../lib/validation"

describe("UserListFormDialog", () => {
  let render, userList, helper, hideStub, topics

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    hideStub = helper.sandbox.stub()
    topics = times(makeTopic, 5)
    helper.handleRequestStub
      .withArgs(topicApiURL)
      .returns(queryListResponse(topics))
    userList = makeUserList()
    helper.handleRequestStub
      .withArgs(userListApiURL.toString())
      .returns(userList)
    render = helper.configureReduxQueryRenderer(UserListFormDialog, {
      hide: hideStub
    })
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[true, false].forEach(isPublicListEditor => {
    it("should render a form with all the right inputs", async () => {
      SETTINGS.is_public_list_editor = isPublicListEditor
      const { wrapper } = await render()
      assert.ok(wrapper.find('textarea[name="short_description"]').exists())
      assert.ok(wrapper.find('input[name="title"]').exists())
      const listType = wrapper.find(".radio").at(0)
      assert.ok(listType.find(`input[value="${LR_TYPE_USERLIST}"]`).exists())
      assert.ok(
        listType.find(`input[value="${LR_TYPE_LEARNINGPATH}"]`).exists()
      )
      assert.equal(
        wrapper.find(`input[value="${LR_PUBLIC}"]`).exists(),
        isPublicListEditor
      )
      assert.equal(
        wrapper.find(`input[value="${LR_PRIVATE}"]`).exists(),
        isPublicListEditor
      )
    })
  })

  //
  ;[
    [0, "Subject is required"],
    [4, `Select no more than ${TOPICS_LENGTH_MAXIMUM} subjects`]
  ].forEach(([selectCount, topicError]) => {
    it(`should call validator, show the results with ${selectCount} subjects selected`, async () => {
      SETTINGS.is_public_list_editor = true
      const { wrapper } = await render()
      // Select all 5 topics (only 3 allowed)
      topics.slice(0, selectCount).forEach(topic => {
        wrapper
          .find("Select")
          .at(1)
          .instance()
          .selectOption({ label: topic.name, value: topic.id })
        wrapper.update()
      })

      wrapper.find("form").simulate("submit")
      await wait(50)
      wrapper.update()
      assert.deepEqual(
        [
          "You need to select a list type",
          "You need to select a privacy level",
          "Title is required",
          "Description is required",
          topicError
        ],
        wrapper.find(".validation-message").map(el => el.text())
      )
    })
  })

  it("should let a user with correct permissions fill out the form and create a public list", async () => {
    SETTINGS.is_public_list_editor = true
    const { wrapper } = await render()
    changeFormikInput(
      wrapper.find(`input[value="${LR_TYPE_USERLIST}"]`),
      "list_type",
      LR_TYPE_USERLIST
    )
    changeFormikInput(
      wrapper.find(`input[value="${LR_PUBLIC}"]`),
      "privacy_level",
      LR_PUBLIC
    )
    changeFormikInput(wrapper.find('input[name="title"]'), "title", "Title")
    wrapper
      .find("Select")
      .at(1)
      .instance()
      .selectOption({ label: topics[0].name, value: topics[0].id })
    changeFormikInput(
      wrapper.find("textarea"),
      "short_description",
      "My Great Description"
    )
    wrapper.update()
    wrapper.find("form").simulate("submit")
    await wait(50)
    assert.ok(hideStub.called)
    const [url, method, { body }] = helper.handleRequestStub.args[1]
    assert.equal(url, userListApiURL.toString())
    assert.equal(method, "POST")
    assert.deepEqual(body, {
      title:             "Title",
      short_description: "My Great Description",
      list_type:         LR_TYPE_USERLIST,
      privacy_level:     LR_PUBLIC,
      topics:            [topics[0].id]
    })
  })

  it("should let a user fill out the form and create a private list", async () => {
    SETTINGS.is_public_list_editor = false
    const { wrapper } = await render()
    changeFormikInput(
      wrapper.find(`input[value="${LR_TYPE_USERLIST}"]`),
      "list_type",
      LR_TYPE_USERLIST
    )
    changeFormikInput(wrapper.find('input[name="title"]'), "title", "Title")
    wrapper
      .find("Select")
      .at(1)
      .instance()
      .selectOption({ label: topics[0].name, value: topics[0].id })
    changeFormikInput(
      wrapper.find("textarea"),
      "short_description",
      "My Great Description"
    )
    wrapper.update()
    wrapper.find("form").simulate("submit")
    await wait(50)
    assert.ok(hideStub.called)
    const [url, method, { body }] = helper.handleRequestStub.args[1]
    assert.equal(url, userListApiURL.toString())
    assert.equal(method, "POST")
    assert.deepEqual(body, {
      title:             "Title",
      short_description: "My Great Description",
      list_type:         LR_TYPE_USERLIST,
      privacy_level:     LR_PRIVATE,
      topics:            [topics[0].id]
    })
  })

  it("should pre-populate fields when you pass a list", async () => {
    SETTINGS.is_public_list_editor = true
    const { wrapper } = await render({ userList })
    assert.equal(wrapper.find(Dialog).prop("title"), `Edit ${userList.title}`)
    assert.isTrue(
      wrapper.find(`input[value="${userList.list_type}"]`).prop("checked")
    )
    assert.isTrue(
      wrapper.find(`input[value="${userList.privacy_level}"]`).prop("checked")
    )
    assert.equal(
      wrapper.find('input[name="title"]').prop("value"),
      userList.title
    )
    assert.equal(
      wrapper.find("textarea").prop("value"),
      userList.short_description
    )
  })

  it("should let you edit and then patch a list", async () => {
    const { wrapper } = await render({ userList })
    changeFormikInput(
      wrapper.find('input[name="title"]'),
      "title",
      "My Brand New Title"
    )
    wrapper
      .find("Select")
      .at(1)
      .instance()
      .selectOption({ label: topics[0].name, value: topics[0].id })
    wrapper
      .find("Select")
      .at(1)
      .instance()
      .selectOption({ label: topics[1].name, value: topics[1].id })
    wrapper.update()
    wrapper.find("form").simulate("submit")
    await wait(50)
    assert.ok(hideStub.called)
    const [url, method, { body }] = helper.handleRequestStub.args[1]
    assert.equal(
      url,
      userListDetailApiURL.param({ userListId: userList.id }).toString()
    )
    assert.equal(method, "PATCH")
    assert.deepEqual(body, {
      title:             "My Brand New Title",
      short_description: userList.short_description,
      privacy_level:     userList.privacy_level,
      list_type:         userList.list_type,
      id:                userList.id,
      topics:            [topics[0].id, topics[1].id]
    })
  })
})
