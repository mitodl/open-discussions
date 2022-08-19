import React from "react"
import { Router } from "react-router"
import { createMemoryHistory } from "history"
import { render, screen, waitFor } from "@testing-library/react"

import { urls } from "../../../api/fields"
import * as factories from "../../../api/fields/factories"
import { setMockResponse, user } from "../../../test-utils"
import FieldMenu from "./FieldMenu"
import { assertInstanceOf } from "ol-util"

describe("FieldMenu", () => {
  it("Includes links to field management and widget management", async () => {
    const field = factories.makeField()
    setMockResponse.get(urls.fieldDetails(field.name), field)
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <FieldMenu field={field} />
      </Router>
    )
    const dropdown = await screen.findByText("settings")
    await user.click(dropdown)
    const links = await waitFor(async () => {
      const found = await screen.findAllByRole("link")
      expect(found.length).toBe(2)
      found.every(link => assertInstanceOf(link, HTMLAnchorElement))
      return found as HTMLAnchorElement[]
    })

    expect(links[0].href).toContain(`/infinite/fields/${field.name}/manage/`)
    expect(links[1].href).toContain(
      `/infinite/fields/${field.name}/manage/widgets/`
    )
  })
})
