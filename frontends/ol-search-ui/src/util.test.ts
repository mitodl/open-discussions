import { languageName } from "./util"

describe("languageName", () => {
  it("Returns english name for 2-digit ISO-639-1 code", () => {
    expect(languageName("en")).toBe("English")
    expect(languageName("fi")).toBe("Finnish")
    expect(languageName("zh")).toBe("Chinese")
  })

  it("allows case-insensitive input", () => {
    expect(languageName("EN")).toBe("English")
    expect(languageName("eN")).toBe("English")
    expect(languageName("En")).toBe("English")
    expect(languageName("ZH")).toBe("Chinese")
    expect(languageName("zH")).toBe("Chinese")
  })

  it("Ignores trailing country codes", () => {
    expect(languageName("en-DE")).toBe("English")
    expect(languageName("fi-US")).toBe("Finnish")
    expect(languageName("zh-US")).toBe("Chinese")
  })

  it("Returns null if input is null or undefined", () => {
    expect(languageName(undefined)).toBe(null)
    expect(languageName(null)).toBe(null)
  })

  it("Returns null if input is not a 2-digit ISO-639-1 code", () => {
    expect(languageName("zz")).toBe(null)
    expect(languageName("")).toBe(null)
    expect(languageName("eng")).toBe(null)
  })
})
