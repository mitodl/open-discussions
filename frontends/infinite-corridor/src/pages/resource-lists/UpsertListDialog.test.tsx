import { faker } from "@faker-js/faker"
import { pick } from "lodash"
import { LearningResourceType, PrivacyLevel, UserList } from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { allowConsoleErrors, getDescriptionFor } from "ol-util/src/test-utils"
import { urls as lrUrls } from "../../api/learning-resources"
import UpsertListDialog from "./UpsertListDialog"
import NiceModal from "@ebay/nice-modal-react"
import {
  screen,
  renderWithProviders,
  setMockResponse,
  user,
  within,
  type TestAppOptions,
  act
} from "../../test-utils"
import { mockAxiosInstance as axios } from "../../test-utils/mockAxios"
import { assertNotNil } from "ol-util"
import { waitForElementToBeRemoved } from "@testing-library/react"

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
    [LearningResourceType.LearningPath]: () =>
      screen.getByLabelText("Learning Path", { exact: false }),
    [LearningResourceType.Userlist]: () =>
      screen.getByLabelText("Learning List", { exact: false })
  },
  privacy_level: {
    [PrivacyLevel.Public]:  () => screen.getByLabelText("Public"),
    [PrivacyLevel.Private]: () => screen.getByLabelText("Private")
  },
  title:       () => screen.getByLabelText("Title", { exact: false }),
  description: () => screen.getByLabelText("Description", { exact: false }),
  topics:      () => screen.getByLabelText("Subjects", { exact: false }),
  submit:      () => screen.getByRole("button", { name: "Save" }),
  cancel:      () => screen.getByRole("button", { name: "Cancel" }),
  delete:      () => screen.getByRole("button", { name: "Yes, delete" })
}

describe("UpsertListDialog", () => {
  const setup = (
    opts: Partial<TestAppOptions> = {
      user: { is_public_list_editor: true, is_authenticated: true }
    }
  ) => {
    const topics = factories.makeTopicsPaginated({ count: 5 })
    setMockResponse.get(lrUrls.topics.listing, topics)
    renderWithProviders(null, opts)
    act(() => {
      NiceModal.show(UpsertListDialog, {
        resource: null,
        mode:     "userlist",
        title:    "Create a list"
      })
    })
    return { topics }
  }

  const fillInForm = async (userList: UserList) => {
    await user.click(inputs.list_type[userList.list_type]())

    await user.click(inputs.privacy_level[userList.privacy_level]())

    await user.click(inputs.title())
    await user.paste(userList.title)

    await user.click(inputs.description())
    assertNotNil(userList.short_description)
    await user.paste(userList.short_description)

    await selectFromAutocomplete(inputs.topics(), userList.topics[0].name)
  }

  test("Creating a userlist", async () => {
    const { topics } = setup()

    const userList = factories.makeUserList({
      short_description: faker.lorem.paragraph(),
      topics:            [faker.helpers.arrayElement(topics.results)]
    })

    /**
     * Fill in the form
     */
    await fillInForm(userList)

    const dialog = screen.getByRole("dialog")
    /**
     * Submit the form
     */
    setMockResponse.post(lrUrls.userList.create, userList)
    await user.click(inputs.submit())
    expect(axios.post).toHaveBeenCalledWith(
      lrUrls.userList.create,
      pick(userList, [
        "title",
        "list_type",
        "privacy_level",
        "short_description",
        "topics"
      ])
    )

    await waitForElementToBeRemoved(dialog)
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

  test("'Cancel' closes dialog (and does not POST)", async () => {
    setup()
    const dialog = screen.getByRole("dialog")
    await user.click(inputs.cancel())
    expect(axios.post).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(dialog)
  })

  test.each([
    {
      user:              { is_public_list_editor: true, is_authenticated: true },
      hasPrivacyChoices: true
    },
    {
      user:              { is_public_list_editor: false, is_authenticated: true },
      hasPrivacyChoices: false
    }
  ])(
    "Form has privacy options if and only if user.is_public_list_editor",
    async ({ user, hasPrivacyChoices }) => {
      setup({ user })
      const publicChoice = screen.queryByText("Privacy")
      expect(!!publicChoice).toBe(hasPrivacyChoices)
    }
  )

  test("Userlists are private by default for staff", async () => {
    await setup()
    expect(inputs.privacy_level[PrivacyLevel.Private]()).toBeChecked()
  })

  test("Userlists are private by default for non-staff", async () => {
    const { topics } = setup({
      user: { is_authenticated: true, is_public_list_editor: false }
    })

    const userList = factories.makeUserList()

    await user.click(inputs.title())
    await user.paste(userList.title)

    await user.click(inputs.description())
    assertNotNil(userList.short_description)
    await user.paste(userList.short_description)

    await selectFromAutocomplete(inputs.topics(), topics.results[0].name)

    setMockResponse.post(lrUrls.userList.create, userList)
    await user.click(inputs.submit())

    expect(axios.post).toHaveBeenCalledWith(
      lrUrls.userList.create,
      expect.objectContaining({ privacy_level: PrivacyLevel.Private })
    )
  })

  test("Userlists are Learning Lists (not Learning Paths) by default", async () => {
    await setup()
    expect(inputs.list_type[LearningResourceType.Userlist]()).toBeChecked()
  })

  test("Displays overall error if form validates but API call fails", async () => {
    allowConsoleErrors()
    const { topics } = await setup()
    const userList = factories.makeUserList({
      short_description: faker.lorem.paragraph(),
      topics:            [faker.helpers.arrayElement(topics.results)]
    })
    await fillInForm(userList)

    setMockResponse.post(lrUrls.userList.create, {}, { code: 408 })
    await user.click(inputs.submit())
    const alertMessage = await screen.findByRole("alert")
    expect(axios.post).toHaveBeenCalled()
    expect(alertMessage).toHaveTextContent(
      "There was a problem saving your list."
    )
  })
})

describe("Editing", () => {
  const setup = (
    resourceOverrides: Partial<UserList> = {},
    topicsCount = 1
  ) => {
    const topics = factories.makeTopicsPaginated({ count: 5 })
    setMockResponse.get(lrUrls.topics.listing, topics)
    const resource = factories.makeUserList({
      ...resourceOverrides,
      topics: faker.helpers.arrayElements(topics.results, topicsCount)
    })
    renderWithProviders(null)
    act(() => {
      NiceModal.show(UpsertListDialog, {
        resource,
        mode:  "userlist",
        title: "Edit a list"
      })
    })
    return { topics, resource }
  }

  test("Editing a userlist calls correct API", async () => {
    const { resource } = setup()

    const updatedResource = factories.makeUserList({
      ...resource,
      title:             faker.lorem.words(),
      short_description: faker.lorem.paragraph()
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

    const dialog = screen.getByRole("dialog")

    setMockResponse.patch(lrUrls.userList.details(resource.id), updatedResource)
    await user.click(inputs.submit())

    expect(axios.patch).toHaveBeenCalledWith(
      lrUrls.userList.details(resource.id),
      updatedResource
    )

    await waitForElementToBeRemoved(dialog)
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
  ])(
    "Error messages ($expectedError)",
    async ({ overrides, topicsCount, expectedError, targetInput }) => {
      setup(overrides, topicsCount)
      await user.click(inputs.submit())
      const theInput = targetInput()
      const description = getDescriptionFor(theInput)
      expect(theInput).toBeInvalid()
      expect(description).toHaveTextContent(expectedError)
    }
  )

  test("'Cancel' closes dialog (and does not PATCH)", async () => {
    setup()
    const dialog = screen.getByRole("dialog")
    await user.click(inputs.cancel())
    expect(axios.patch).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(dialog)
  })

  test("Displays overall error if form validates but API call fails", async () => {
    allowConsoleErrors()
    const { resource } = setup()

    const titleInput = inputs.title()
    await user.click(titleInput)
    await user.clear(titleInput)
    await user.paste("New title")

    await user.click(inputs.submit())
    setMockResponse.patch(
      lrUrls.userList.details(resource.id),
      {},
      { code: 408 }
    )
    const alertMessage = await screen.findByRole("alert")
    expect(alertMessage).toHaveTextContent(
      "There was a problem saving your list."
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeVisible()
  })
})
