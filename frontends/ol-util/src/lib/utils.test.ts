import * as u from "./utils"

describe("capitalize", () => {
  it("Capitalizes the first letter of the the string", () => {
    expect(u.capitalize("hello world")).toBe("Hello world")
  })
  it("Does nothing to the empty string", () => {
    expect(u.capitalize("")).toBe("")
  })
})

describe("Initials", () => {
  it.each([
    { in: "ant bat cat", out: "AB" },
    { in: "dog Elephant frog", out: "DE" },
    { in: "goat", out: "G" },
    { in: "Horse", out: "H" },
    { in: "   iguana     jackal", out: "IJ" },
    { in: "", out: "" }
  ])("Gets the capitalized first letter of the first two words", testcase => {
    expect(u.initials(testcase.in)).toBe(testcase.out)
  })
})

describe("emptyOrNil", () => {
  it("Returns true for null and undefined", () => {
    expect(u.emptyOrNil(undefined)).toBe(true)
    expect(u.emptyOrNil(null)).toBe(true)
  })

  it("Returns true for empty objects, strings, sets, and arrays, and maps", () => {
    expect(u.emptyOrNil("")).toBe(true)
    expect(u.emptyOrNil([])).toBe(true)
    expect(u.emptyOrNil(new Set())).toBe(true)
    expect(u.emptyOrNil({})).toBe(true)
    expect(u.emptyOrNil(new Map())).toBe(true)
  })

  it("Returns true for numbers", () => {
    // _.isEmpty(5) returns true; this is different from ramda.
    expect(u.emptyOrNil(5)).toBe(true)
  })

  it("Returns false for and non-empty objects, strings, sets, and arrays, and maps", () => {
    expect(u.emptyOrNil("a")).toBe(false)
    expect(u.emptyOrNil([10])).toBe(false)
    expect(u.emptyOrNil(new Set([10]))).toBe(false)
    expect(u.emptyOrNil({ a: 10 })).toBe(false)
    expect(u.emptyOrNil(new Map([["a", 10]]))).toBe(false)
  })
})
