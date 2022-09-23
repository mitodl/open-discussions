/* eslint-disable testing-library/no-node-access */
import { assertInstanceOf, assertNotNil } from "ol-util"
import { urls } from "../../api/fields"
import { urls as widgetUrls } from "../../api/widgets"
import { urls as resourceUrls } from "../../api/learning-resources"
import {
  LearningResource,
  LearningResourceCard,
  ExpandedLearningResourceDisplay
} from "ol-search-ui"
import { TitledCarousel } from "ol-util"
import type { UserList, UserListItem, FieldChannel } from "../../api/fields"
import * as factory from "../../api/fields/factories"
import WidgetList from "./WidgetsList"
import {
  renderTestApp,
  screen,
  setMockResponse,
  within,
  user,
  waitFor
} from "../../test-utils"
import { makeWidgetListResponse } from "ol-widgets/build/factories"
import { makeLearningResource } from "ol-search-ui/src/factories"
import { waitForElementToBeRemoved } from "@testing-library/react"

jest.mock("./WidgetsList", () => {
  const actual = jest.requireActual("./WidgetsList")
  return {
    __esModule: true,
    default:    jest.fn(actual.default)
  }
})
const mockWidgetList = jest.mocked(WidgetList)

jest.mock("ol-search-ui", () => {
  const actual = jest.requireActual("ol-search-ui")
  return {
    ...actual,
    LearningResourceCard:            jest.fn(actual.LearningResourceCard),
    ExpandedLearningResourceDisplay: jest.fn(
      actual.ExpandedLearningResourceDisplay
    )
  }
})
const spyLearningResourceCard = jest.mocked(LearningResourceCard)
const spyExpandedLearningResourceDisplay = jest.mocked(
  ExpandedLearningResourceDisplay
)

jest.mock("ol-util", () => {
  const actual = jest.requireActual("ol-util")
  return {
    ...actual,
    TitledCarousel: jest.fn(actual.TitledCarousel)
  }
})
const spyTitledCarousel = jest.mocked(TitledCarousel)

/**
 * Check that:
 * - the container element contains the text of `resource.title`
 * - `LearningResourceCard` has been called with props `resource={resource}`
 */
const checkLRC = async (container: HTMLElement, resource: LearningResource) => {
  await within(container).findByText(resource.title)
  expect(spyLearningResourceCard).toHaveBeenCalledWith(
    expect.objectContaining({ resource }),
    expect.anything()
  )
}

type SubfieldData = {
  list: UserList
  items: LearningResource[]
}

const setupApis = (fieldPatch?: Partial<FieldChannel>) => {
  const list1 = factory.makeUserList()
  const list2 = factory.makeUserList()
  const list3 = factory.makeUserList()
  const items1 = factory.makeUserListItemsPaginated(4)
  const items2 = factory.makeUserListItemsPaginated(2)
  const items3 = factory.makeUserListItemsPaginated(2)

  const field = factory.makeField({
    featured_list: list1,
    lists:         [list2, list3],
    ...fieldPatch
  })

  setMockResponse.get(urls.fieldDetails(field.name), field)
  setMockResponse.get(urls.userListItems(list1.id), items1)
  setMockResponse.get(urls.userListItems(list2.id), items2)
  setMockResponse.get(urls.userListItems(list3.id), items3)

  const widgetsList = makeWidgetListResponse()
  setMockResponse.get(widgetUrls.widgetList(field.widget_list), widgetsList)

  const toLearningResources = (items: UserListItem[]) =>
    items.map(item => item.content_data)
  const featured: SubfieldData = {
    list:  list1,
    items: toLearningResources(items1.results)
  }
  const lists: SubfieldData[] = [
    { list: list2, items: toLearningResources(items2.results) },
    { list: list3, items: toLearningResources(items3.results) }
  ]

  const resources = Object.fromEntries(
    [...lists, featured].flatMap(({ items }) =>
      items.map(item => {
        const resource = makeLearningResource({
          id:          item.id,
          title:       item.title,
          object_type: item.object_type
        })
        return [resource.id, resource]
      })
    )
  )

  Object.values(resources).forEach(r => {
    setMockResponse.get(resourceUrls.resource(r.object_type, r.id), r)
  })

  return {
    field,
    featured,
    lists,
    widgets: widgetsList.widgets,
    /**
     * Full resource objects used, e.g., in the LearningResourceDrawer
     */
    resources
  }
}
type SetupResult = ReturnType<typeof setupApis>

describe("FieldPage", () => {
  it("Displays the field title, banner, and avatar", async () => {
    const { field } = setupApis()
    renderTestApp({ url: `/fields/${field.name}` })

    const title = await screen.findByText(field.title)
    const header = title.closest("header")
    assertInstanceOf(header, HTMLElement)
    const images = within(header).getAllByRole("img") as HTMLImageElement[]

    expect(images[0].src).toBe(field.banner)
    expect(images).toEqual([
      /**
       * Unless it is meaningful, the alt text should be an empty string, and
       * the channel header already has a title.
       */
      expect.objectContaining({ src: field.banner, alt: "" }),
      expect.objectContaining({ src: field.avatar_medium, alt: "" })
    ])
  })

  it("renders the featured list with items", async () => {
    const { field, featured } = setupApis()
    renderTestApp({ url: `/fields/${field.name}` })

    const title = await screen.findByText(featured.list.title)
    const section = title.closest("section")
    assertNotNil(section)

    expect(featured.items).toHaveLength(4)
    const [item1, item2, item3, item4] = featured.items

    await checkLRC(section, item1)
    await checkLRC(section, item2)
    await checkLRC(section, item3)
    await checkLRC(section, item4)

    // Basic carousel check
    expect(spyTitledCarousel).toHaveBeenCalled()
    const prev = within(section).getByText("Previous")
    const next = within(section).getByText("Next")
    expect(prev).toBeInstanceOf(HTMLButtonElement)
    expect(next).toBeInstanceOf(HTMLButtonElement)
  })

  it.each([{ index: 0 }, { index: 1 }])(
    "renders subfield lists (index: $index) with items",
    async ({ index }) => {
      const { field, lists } = setupApis()
      renderTestApp({ url: `/fields/${field.name}` })
      const { list, items } = lists[index]

      const title = await screen.findByText(list.title)
      const section = title.closest("section")
      assertNotNil(section)

      expect(items).toHaveLength(2)
      await checkLRC(section, items[0])
      await checkLRC(section, items[1])
    }
  )

  it("Does not render a carousel if no featured_list", async () => {
    const { field, lists } = setupApis({ featured_list: null })
    renderTestApp({ url: `/fields/${field.name}` })

    // wait for page to be ready
    await screen.findByText(lists[0].list.title)
    await screen.findByText(lists[1].list.title)
    expect(spyTitledCarousel).not.toHaveBeenCalled()
  })

  it.each([
    {
      getUrl:    (field: FieldChannel) => `/fields/${field.name}`,
      isEditing: false,
      urlDesc:   "/fields/:name/"
    },
    {
      getUrl:    (field: FieldChannel) => `/fields/${field.name}/manage/widgets/`,
      isEditing: true,
      urlDesc:   "/fields/:name/manage/widgets/"
    }
  ])(
    "Renders readonly WidgetList at $urlDesc",
    async ({ getUrl, isEditing }) => {
      const { field, widgets } = setupApis()
      const url = getUrl(field)
      renderTestApp({ url })

      // below we check the FC was called correctly
      // but let's check that it is still visible, too.
      await screen.findByText(widgets[0].title)
      expect(field.widget_list).toEqual(expect.any(Number))

      const expectedProps = expect.objectContaining({
        widgetListId: field.widget_list,
        isEditing:    isEditing
      })
      const expectedContext = expect.anything()
      expect(mockWidgetList).lastCalledWith(expectedProps, expectedContext)
    }
  )

  it.each([{ btnName: "Done" }, { btnName: "Cancel" }])(
    "When managing widgets, $text returns to field page",
    async ({ btnName }) => {
      const { field } = setupApis()
      const url = `/fields/${field.name}/manage/widgets/`
      const { history } = renderTestApp({ url })
      // click done without an edit
      await user.click(await screen.findByRole("button", { name: btnName }))

      await waitFor(() => {
        expect(history.location.pathname).toEndWith(`/fields/${field.name}/`)
      })
    }
  )

  test.each([
    {
      getItem:  (setupResult: SetupResult) => setupResult.featured.items[0],
      cardDesc: "featured card"
    },
    {
      getItem:  (setupResult: SetupResult) => setupResult.lists[0].items[0],
      cardDesc: "subfield card"
    }
  ])(
    "Clicking a $cardDesc opens the <LearningResourceDrawer />",
    async ({ getItem }) => {
      const result = setupApis()
      const item = getItem(result)
      const { field, resources } = result

      const url = `/fields/${field.name}/`
      const { history } = renderTestApp({ url })

      await user.click(await screen.findByRole("button", { name: item.title }))
      const params0 = new URLSearchParams(history.location.search)
      expect(params0.get("resource_id")).toBe(String(item.id))
      expect(params0.get("resource_type")).toBe(item.object_type)

      const getDrawerContent = () =>
        screen.getByLabelText("Detailed description")
      const drawer = getDrawerContent()
      await within(drawer).findByRole("heading", { name: item.title })
      expect(spyExpandedLearningResourceDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ resource: resources[item.id] }),
        expect.anything()
      )

      await user.click(screen.getByRole("button", { name: "Close" }))
      const params1 = new URLSearchParams(history.location.search)
      expect(params1.get("resource_id")).toBe(null)
      expect(params1.get("resource_type")).toBe(null)
      await waitForElementToBeRemoved(getDrawerContent)
    }
  )
})
