import { toQueryString } from "./querystrings"
describe("toQueryString", () => {
  it("should return an empty string for empty params", () => {
    expect(toQueryString({})).toBe("")
  })

  it.each([
    { def: 10, abc: 1 },
    { abc: 1, def: 10 }
  ])(
    "should return a query string with params sorted lexicographically",
    params => {
      expect(toQueryString(params)).toBe("abc=1&def=10")
    }
  )
})
