import React from "react"
import { faker } from "@faker-js/faker"
import { pick } from "lodash"
import {
  Favorites,
  LearningResourceType,
  PrivacyLevel,
  UserList
} from "ol-search-ui"
import * as factories from "ol-search-ui/build/factories"
import { getDescriptionFor } from "ol-util/build/test-utils"
import { urls as lrUrls } from "../../api/learning-resources"
import {
  EditListDialog,
  CreateListDialog,
  DeletionDialog
} from "./ManageListDialog"
import {
  screen,
  renderWithProviders,
  setMockResponse,
  user,
  within,
} from "../../test-utils"
import { makeRequest } from "../../test-utils/mockAxios"
import { assertNotNil } from "ol-util"

const selectFromAutocomplete = async (input: HTMLElement, label: string) => {
  await user.click(input)
  const listbox = await screen.findByRole("listbox")
  const option = within(listbox).getByRole("option", { name: label })
  await user.click(option)
  return
}

/**
 * Helpers to find various inputs.
 *
 * E.g., `inputs.object_type[LearningResourceType.LearningPath]()` will return
 * radio button for "Learning Path".
 *
 */
const inputs = {
  list_type: {
    [LearningResourceType.LearningPath]: () => screen.getByLabelText("Learning Path", { exact: false }),
    [LearningResourceType.Userlist]:     () => screen.getByLabelText("Learning List", { exact: false }),
  },
  pivacy_level: {
    [PrivacyLevel.Public]:  () => screen.getByLabelText("Public"),
    [PrivacyLevel.Private]: () => screen.getByLabelText("Private"),
  },
  title:       () => screen.getByLabelText("Title"),
  description: () => screen.getByLabelText("Description"),
  topics:      () => screen.getByLabelText("Subjects"),
  submit:      () => screen.getByRole("button", { name: "Save" }),
  cancel:      () => screen.getByRole("button", { name: "Cancel" }),
}

describe("Creation", () => {
  const setup = () => {
    const topics = factories.makeTopicsPaginated(5)
    setMockResponse.get(lrUrls.topics(), topics)
    const onClose = jest.fn()
    renderWithProviders(<CreateListDialog open={true} onClose={onClose} />)
    return { topics, onClose }
  }
  test("Creating a userlist", async () => {
    const { topics, onClose } = setup()

    const userList = factories.makeUserList({
      short_description: faker.lorem.paragraph(),
      topics:            [faker.helpers.arrayElement(topics.results)]
    })

    await user.click(inputs.list_type[userList.list_type]())

    await user.click(inputs.pivacy_level[userList.privacy_level]())

    await user.click(inputs.title())
    await user.paste(userList.title)

    await user.click(inputs.description())
    assertNotNil(userList.short_description)
    await user.paste(userList.short_description)

    await selectFromAutocomplete(inputs.topics(), userList.topics[0].name)

    expect(onClose).not.toHaveBeenCalled()
    setMockResponse.post(lrUrls.createUserList(), userList)
    await user.click(inputs.submit())

    expect(makeRequest).toHaveBeenCalledWith(
      "post",
      lrUrls.createUserList(),
      pick(userList, ["title", "list_type", "privacy_level", "short_description", "topics"])
    )
    expect(onClose).toHaveBeenCalled()
  })

  test("Validates required fields", async () => {
    setup()
    await user.click(inputs.submit())

    const titleInput = inputs.title()
    const titleFeedback = getDescriptionFor(titleInput)
    expect(titleInput).toBeInvalid()
    expect(titleFeedback).toHaveTextContent("Title is required.")

    const descriptionInput = inputs.description()
    const descriptionFeedback = getDescriptionFor(descriptionInput)
    expect(descriptionInput).toBeInvalid()
    expect(descriptionFeedback).toHaveTextContent("Description is required.")

    const topicsInput = inputs.topics()
    const topicsFeedback = getDescriptionFor(topicsInput)
    expect(topicsInput).toBeInvalid()
    expect(topicsFeedback).toHaveTextContent("Select between 1 and 3 subjects.")
  })

  test("Calls onClose when cancelled", async () => {
    const { onClose } = setup()

    expect(onClose).not.toHaveBeenCalled()
    await user.click(inputs.cancel())
    expect(onClose).toHaveBeenCalled()
  })

  test("Lists are private by default", () => {
    setup()
    expect(inputs.pivacy_level[PrivacyLevel.Private]()).toBeChecked()
  })

  test("Userlists are lists (not paths) by default", () => {
    setup()
    expect(inputs.list_type[LearningResourceType.Userlist]()).toBeChecked()
  })
})

describe("Editing", () => {
  const setup = (resourceOverrides: Partial<UserList> = {}, topicsCount = 1) => {
    const topics = factories.makeTopicsPaginated(5)
    setMockResponse.get(lrUrls.topics(), topics)
    const resource = factories.makeUserList({
      ...resourceOverrides,
      topics: faker.helpers.arrayElements(topics.results, topicsCount)
    })
    const onClose = jest.fn()
    renderWithProviders(<EditListDialog resource={resource} onClose={onClose} />)
    return { topics, resource, onClose }
  }

  test("Editing a userlist calls correct API", async () => {
    const { resource, onClose } = setup()

    const updatedResource = factories.makeUserList({
      ...resource,
      title:             faker.lorem.words(),
      short_description: faker.lorem.paragraph(),
    })

    const titleInput = inputs.title()
    await user.click(titleInput)
    await user.clear(titleInput)
    await user.paste(updatedResource.title)

    const descriptionInput = inputs.description()
    await user.click(descriptionInput)
    await user.clear(descriptionInput)
    assertNotNil(updatedResource.short_description)
    await user.paste(updatedResource.short_description)

    expect(onClose).not.toHaveBeenCalled()
    setMockResponse.patch(lrUrls.updateUserList(resource.id), updatedResource)
    await user.click(inputs.submit())

    expect(makeRequest).toHaveBeenCalledWith(
      "patch",
      lrUrls.updateUserList(resource.id),
      updatedResource
    )
    expect(onClose).toHaveBeenCalled()
  })

  test.each([
    {
      overrides:     { title: "" },
      targetInput:   inputs.title,
      expectedError: "Title is required."
    },
    {
      overrides:     { short_description: "" },
      targetInput:   inputs.description,
      expectedError: "Description is required."
    },
    {
      overrides:     {},
      targetInput:   inputs.topics,
      topicsCount:   0,
      expectedError: "Select between 1 and 3 subjects."
    },
    {
      overrides:     {},
      targetInput:   inputs.topics,
      topicsCount:   4,
      expectedError: "Select between 1 and 3 subjects."
    }
  ])("Error messages ($expectedError)", async ({ overrides, topicsCount, expectedError, targetInput }) => {
    setup(overrides, topicsCount)
    await user.click(inputs.submit())
    const theInput = targetInput()
    const description = getDescriptionFor(theInput)
    expect(theInput).toBeInvalid()
    expect(description).toHaveTextContent(expectedError)
  })
})
