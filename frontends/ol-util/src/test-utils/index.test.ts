import { createMatchMediaForJsDom } from "./index"

describe("createMatchMediaForJsDom", () => {
  it.each([
    { query: "min-width: 120px", width: 100, matches: false },
    { query: "min-width: 80px", width: 100, matches: true },
    { query: "max-width: 80px", width: 100, matches: false },
    { query: "max-width: 120px", width: 100, matches: true }
  ])("creates a matchMedia function that queries by width", ({ width, matches, query }) => {
    const mediaQuery = createMatchMediaForJsDom({width})
    expect(mediaQuery(query).matches)
  })
})
