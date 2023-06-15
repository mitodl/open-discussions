import { faker } from "@faker-js/faker"
import { pick } from "lodash"
import {
  LearningResourceType as LRT,
  PrivacyLevel,
  StaffList,
  UserList
} from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { allowConsoleErrors, getDescriptionFor } from "ol-util/src/test-utils"
import { urls as lrUrls } from "../../api/learning-resources"
import { manageListDialogs } from "./ManageListDialogs"
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
    [LRT.LearningPath]: () =>
      screen.getByLabelText("Learning Path", { exact: false }),
    [LRT.Userlist]: () =>
      screen.getByLabelText("Learning List", { exact: false }),
    [LRT.StaffPath]: () =>
      screen.getByLabelText("Learning Path", { exact: false }),
    [LRT.StaffList]: () =>
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

const modes = [
  {
    label:       "UserLists",
    mode:        "userlist",
    makeList:    factories.makeUserList,
    createUrl:   lrUrls.userList.create,
    updateUrl:   lrUrls.userList.details,
    deletionUrl: lrUrls.userList.details
  },
  {
    label:       "StaffLists",
    mode:        "stafflist",
    makeList:    factories.makeStaffList,
    createUrl:   lrUrls.staffList.create,
    updateUrl:   lrUrls.staffList.details,
    deletionUrl: lrUrls.staffList.details
  }
] as const

describe("Creating lists with manageListDialogs", () => {
  const setup = (
    mode: "userlist" | "stafflist",
    opts: Partial<TestAppOptions> = {
      user: { is_public_list_editor: true, is_authenticated: true }
    }
  ) => {
    const topics = factories.makeTopicsPaginated({ count: 5 })
    setMockResponse.get(lrUrls.topics.listing, topics)

    renderWithProviders(null, opts)

    act(() => {
      manageListDialogs.createList(mode)
    })

    return { topics }
  }

  const fillInForm = async (userList: UserList | StaffList) => {
    const listType = userList.list_type as
      | LRT.StaffList
      | LRT.Userlist
      | LRT.StaffPath
      | LRT.LearningPath
    await user.click(inputs.list_type[listType]())

    await user.click(inputs.privacy_level[userList.privacy_level]())

    await user.click(inputs.title())
    await user.paste(userList.title)

    await user.click(inputs.description())
    assertNotNil(userList.short_description)
    await user.paste(userList.short_description)

    await selectFromAutocomplete(inputs.topics(), userList.topics[0].name)
  }

  test.each(modes)(
    "Creating a $label",
    async ({ mode, makeList, createUrl }) => {
      const { topics } = setup(mode)

      const list = makeList({
        short_description: faker.lorem.paragraph(),
        topics:            [faker.helpers.arrayElement(topics.results)]
      })

      /**
       * Fill in the form
       */
      await fillInForm(list)

      const dialog = screen.getByRole("dialog")
      /**
       * Submit the form
       */
      setMockResponse.post(createUrl, list)
      await user.click(inputs.submit())
      expect(axios.post).toHaveBeenCalledWith(
        createUrl,
        pick(list, [
          "title",
          "list_type",
          "privacy_level",
          "short_description",
          "topics"
        ])
      )

      await waitForElementToBeRemoved(dialog)
    }
  )

  test("Dialog title is 'Create list'", async () => {
    // behavior does not depend on stafflist / userlist, so just pick one
    const { mode } = faker.helpers.arrayElement(modes)
    setup(mode)
    const dialog = screen.getByRole("heading", { name: "Create list" })
    expect(dialog).toBeVisible()
  })

  test("'Cancel' closes dialog (and does not POST)", async () => {
    // behavior does not depend on stafflist / userlist, so just pick one
    const { mode } = faker.helpers.arrayElement(modes)
    setup(mode)
    const dialog = screen.getByRole("dialog")
    await user.click(inputs.cancel())
    expect(axios.post).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(dialog)
  })

  test("Validates required fields", async () => {
    const { mode } = faker.helpers.arrayElement(modes)
    setup(mode)
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
    "Userlist form has privacy options if and only if user.is_public_list_editor",
    async ({ user, hasPrivacyChoices }) => {
      setup("userlist", { user })
      const publicChoice = screen.queryByText("Privacy")
      expect(!!publicChoice).toBe(hasPrivacyChoices)
    }
  )

  test.each([
    {
      user: { is_public_list_editor: true, is_authenticated: true }
    },
    {
      user: { is_public_list_editor: false, is_authenticated: true }
    }
  ])("StaffList form always has privacy options", async ({ user }) => {
    setup("stafflist", { user })
    const publicChoice = screen.getByText("Privacy")
    expect(publicChoice).toBeVisible()
  })

  test.each(modes)(
    "$label are private by default for staff",
    async ({ mode }) => {
      await setup(mode)
      expect(inputs.privacy_level[PrivacyLevel.Private]()).toBeChecked()
    }
  )

  test("Userlists are private by default for non-staff", async () => {
    const { topics } = setup("userlist", {
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

  test.each(modes)(
    "$label are unordered lists (not ordered paths) by default",
    async ({ mode }) => {
      await setup(mode)
      const type = mode === "userlist" ? LRT.Userlist : LRT.StaffList
      expect(inputs.list_type[type]()).toBeChecked()
    }
  )

  test("Displays overall error if form validates but API call fails", async () => {
    allowConsoleErrors()
    const { topics } = await setup("userlist")
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

describe("Editing lists with manageListDialogs", () => {
  const setup = (resource: UserList | StaffList) => {
    const topics = factories.makeTopicsPaginated({ count: 5 })
    topics.results = topics.results.concat(resource.topics)
    topics.count = topics.results.length
    setMockResponse.get(lrUrls.topics.listing, topics)
    renderWithProviders(null)

    act(() => {
      manageListDialogs.editList(resource)
    })

    return { topics, resource }
  }

  test.each(modes)(
    "Editing a userlist calls correct API",
    async ({ makeList, updateUrl }) => {
      const resource = makeList()
      setup(resource)

      const updatedResource = {
        ...resource,
        title:             faker.lorem.words(),
        short_description: faker.lorem.paragraph()
      }

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

      setMockResponse.patch(updateUrl(resource.id), updatedResource)
      await user.click(inputs.submit())

      expect(axios.patch).toHaveBeenCalledWith(
        updateUrl(resource.id),
        updatedResource
      )

      await waitForElementToBeRemoved(dialog)
    }
  )

  test.each([
    {
      overrides:     { title: "" },
      targetInput:   inputs.title,
      topicsCount:   1,
      expectedError: "Title is required."
    },
    {
      overrides:     { short_description: "" },
      targetInput:   inputs.description,
      topicsCount:   1,
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
      const { makeList } = faker.helpers.arrayElement(modes)
      const resource = makeList({
        topics: Array(topicsCount)
          .fill(null)
          .map(() => factories.makeTopic()),
        ...overrides
      })
      setup(resource)
      await user.click(inputs.submit())
      const theInput = targetInput()
      const description = getDescriptionFor(theInput)
      expect(theInput).toBeInvalid()
      expect(description).toHaveTextContent(expectedError)
    }
  )

  test("Dialog title is 'Edit list'", async () => {
    // behavior does not depend on stafflist / userlist, so just pick one
    const { makeList } = faker.helpers.arrayElement(modes)
    setup(makeList())
    const dialog = screen.getByRole("heading", { name: "Edit list" })
    expect(dialog).toBeVisible()
  })

  test("'Cancel' closes dialog (and does not PATCH)", async () => {
    // Behavior does not depend on stafflist/userlist, so just pick one
    const { makeList } = faker.helpers.arrayElement(modes)
    const resource = makeList()
    setup(resource)
    const dialog = screen.getByRole("dialog")
    await user.click(inputs.cancel())
    expect(axios.patch).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(dialog)
  })

  test.each(modes)(
    "Displays overall error if form validates but API call fails",
    async ({ makeList, updateUrl }) => {
      allowConsoleErrors()
      const resource = makeList()
      setup(resource)

      const titleInput = inputs.title()
      await user.click(titleInput)
      await user.clear(titleInput)
      await user.paste("New title")

      await user.click(inputs.submit())
      setMockResponse.patch(updateUrl(resource.id), {}, { code: 408 })
      const alertMessage = await screen.findByRole("alert")
      expect(alertMessage).toHaveTextContent(
        "There was a problem saving your list."
      )
      const dialog = screen.getByRole("dialog")
      expect(dialog).toBeVisible()
    }
  )
})

describe.each(modes)(
  "Deleting $label lists with manageListDialogs",
  ({ makeList, deletionUrl }) => {
    const setup = () => {
      const resource = makeList()
      renderWithProviders(null)
      act(() => {
        manageListDialogs.deleteList(resource)
      })
      return { resource }
    }

    test("Dialog title is 'Delete list'", async () => {
      setup()
      const dialog = screen.getByRole("heading", { name: "Delete list" })
      expect(dialog).toBeVisible()
    })

    test("Deleting a $label calls correct API", async () => {
      const { resource } = setup()

      const dialog = screen.getByRole("dialog")
      setMockResponse.delete(deletionUrl(resource.id), undefined)
      await user.click(inputs.delete())

      expect(axios.delete).toHaveBeenCalledWith(deletionUrl(resource.id))
      await waitForElementToBeRemoved(dialog)
    })

    test("Clicking cancel does not delete list", async () => {
      setup()

      const dialog = screen.getByRole("dialog")
      await user.click(inputs.cancel())

      expect(axios.delete).not.toHaveBeenCalled()
      await waitForElementToBeRemoved(dialog)
    })
  }
)
