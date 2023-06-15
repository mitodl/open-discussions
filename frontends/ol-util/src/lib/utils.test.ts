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

describe("formatDurationClockTime", () => {
  it("Correctly formats the duration to a human readable string", () => {
    expect(u.formatDurationClockTime("PT1H23M3S")).toBe("1:23:03")
    expect(u.formatDurationClockTime("PT1H3M3S")).toBe("1:03:03")
    expect(u.formatDurationClockTime("PT45M7S")).toBe("45:07")
    expect(u.formatDurationClockTime("PT6M21S")).toBe("6:21")
    expect(u.formatDurationClockTime("PT44S")).toBe("0:44")
  })
})

describe("pluralize", () => {
  test("If 'plural' is not provided, appends an 's' iff count != 1", () => {
    expect(u.pluralize("dog", 0)).toBe("dogs")
    expect(u.pluralize("dog", 1)).toBe("dog")
    expect(u.pluralize("dog", 2)).toBe("dogs")
    expect(u.pluralize("dog", 500)).toBe("dogs")
  })

  test("If 'plural' is provided, returns it iff count != 1", () => {
    expect(u.pluralize("pup", 0, "puppies")).toBe("puppies")
    expect(u.pluralize("pup", 1, "puppies")).toBe("pup")
    expect(u.pluralize("pup", 2, "puppies")).toBe("puppies")
    expect(u.pluralize("pup", 500, "puppies")).toBe("puppies")
  })
})
