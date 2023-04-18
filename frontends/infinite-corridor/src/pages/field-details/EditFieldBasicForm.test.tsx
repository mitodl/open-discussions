import { waitFor } from "@testing-library/react"

import { PaginatedResult } from "ol-util"
import { FieldChannel, urls } from "../../api/fields"
import { urls as widgetUrls } from "../../api/widgets"
import { urls as lrUrls } from "../../api/learning-resources"
import * as factory from "../../api/fields/factories"
import * as resourceFactory from "ol-search-ui/src/factories"
import type { UserList } from "ol-search-ui"
import { makeFieldViewPath } from "../urls"
import { renderTestApp, screen, setMockResponse, user } from "../../test-utils"
import { makeWidgetListResponse } from "ol-widgets/src/factories"

describe("EditFieldBasicForm", () => {
  let field: FieldChannel, publicLists: PaginatedResult<UserList>

  beforeEach(() => {
    publicLists = resourceFactory.makeUserListsPaginated({ count: 5 })
    setMockResponse.get(
      lrUrls.userList.listing({
        public: true
      }),
      publicLists
    )
    field = factory.makeField({
      is_moderator:  true,
      featured_list: publicLists.results[0],
      lists:         publicLists.results.slice(0, 3)
    })
    setMockResponse.get(
      lrUrls.userList.itemsListing(publicLists.results[0].id),
      resourceFactory.makeUserListItemsPaginated({ count: 2 })
    )
    setMockResponse.get(
      lrUrls.userList.itemsListing(publicLists.results[1].id),
      resourceFactory.makeUserListItemsPaginated({ count: 2 })
    )
    setMockResponse.get(
      lrUrls.userList.itemsListing(publicLists.results[2].id),
      resourceFactory.makeUserListItemsPaginated({ count: 2 })
    )
    setMockResponse.get(
      lrUrls.userList.itemsListing(publicLists.results[4].id),
      resourceFactory.makeUserListItemsPaginated({ count: 2 })
    )
    setMockResponse.get(urls.fieldDetails(field.name), field)
    setMockResponse.get(
      widgetUrls.widgetList(field.widget_list),
      makeWidgetListResponse({}, { count: 0 })
    )
  })

  it("Displays a 'featured list' autocomplete form field and draggable list widgets", async () => {
    renderTestApp({ url: `${urls.fieldDetails(field.name)}manage/#basic` })

    const featuredListSelector = (await screen.findByLabelText(
      "Featured learning resources"
    )) as HTMLInputElement
    expect(featuredListSelector.value).toEqual(field.featured_list.title)
    await user.click(featuredListSelector)
    await user.click(screen.getByText(publicLists.results[4].title))
    expect(featuredListSelector.value).toEqual(publicLists.results[4].title)

    const listSelector = (await screen
      .queryAllByRole("combobox")
      .at(1)) as HTMLInputElement
    let drags = await screen.findAllByText("drag_indicator")
    expect(drags.length).toEqual(3)
    for (let x = 0; x < drags.length; x++) {
      // eslint-disable-next-line testing-library/no-node-access
      expect(drags[x].closest("div").innerHTML).toContain(field.lists[x].title)
    }

    // Add a list
    await user.click(listSelector)
    // The following line causes a timeout???
    //await user.type(listSelector, publicLists.results[3].title)
    await user.click(screen.getByText(publicLists.results[3].title))
    await user.click(screen.getByText("Add"))
    drags = await screen.findAllByText("drag_indicator")
    expect(drags.length).toEqual(4)

    // Remove a list
    await user.click(screen.getAllByText("remove_circle_outline")[0])
    drags = await screen.findAllByText("drag_indicator")
    expect(drags.length).toEqual(3)
  })

  it("updates field values on form submission", async () => {
    const { history } = renderTestApp({
      url: `${urls.fieldDetails(field.name)}manage/#basic`
    })
    const featuredListSelector = (await screen.findByLabelText(
      "Featured learning resources"
    )) as HTMLInputElement
    expect(featuredListSelector.value).toEqual(field.featured_list?.title)
    await user.click(featuredListSelector)
    await user.click(screen.getByText(publicLists.results[4].title))
    expect(featuredListSelector.value).toEqual(publicLists.results[4].title)

    const listSelector = (await screen
      .queryAllByRole("combobox")
      .at(1)) as HTMLInputElement
    await user.click(listSelector)
    await user.click(screen.getByText(publicLists.results[4].title))
    await user.click(screen.getByText("Add"))

    const updatedValues = {
      featured_list: publicLists.results[4].id,
      lists:         [
        ...publicLists.results.slice(0, 3).map(fl => fl.id),
        publicLists.results[4].id
      ]
    }
    const updatedField = {
      ...field,
      featured_list: publicLists.results[4],
      lists:         [...field.lists.slice(0, 3), publicLists.results[4]]
    }
    setMockResponse.patch(
      urls.fieldDetails(field.name),
      { requestBody: updatedValues },
      updatedField
    )
    setMockResponse.get(urls.fieldDetails(field.name), updatedField)
    const submitBtn = screen.getByText("Save")
    await user.click(submitBtn)
    await waitFor(() => {
      expect(history.location.pathname).toBe(makeFieldViewPath(field.name))
    })
    // New featured list title should appear twice now
    const featuredListTitle = await screen.findAllByText(
      publicLists.results[4].title
    )
    expect(featuredListTitle.length).toEqual(2)
  })
})
