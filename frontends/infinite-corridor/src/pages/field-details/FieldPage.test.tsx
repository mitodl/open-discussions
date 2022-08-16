import { assertInstanceOf, assertNotNil } from "ol-util"
import { urls } from "../../api/fields"
import { LearningResource, LearningResourceCard } from "ol-search-ui"
import { TitledCarousel } from "ol-util"
import type { UserList, UserListItem, FieldChannel } from "../../api/fields"
import * as factory from "../../api/fields/factories"
import { renderTestApp, screen, setMockResponse, within } from "../../test-utils"

jest.mock("ol-search-ui", () => {
  const actual = jest.requireActual("ol-search-ui")
  return {
    ...actual,
    LearningResourceCard: jest.fn(actual.LearningResourceCard)
  }
})
const spyLearningResourceCard = jest.mocked(LearningResourceCard)

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
  return { field, featured, lists }
}

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

  // TODO @CHRIS
  it("Passes the right stuff to WidgetsList", () => {

  })
})
