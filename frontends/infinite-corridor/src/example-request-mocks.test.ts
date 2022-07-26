import axios from "./libs/axios"
import { setMockResponse } from "./test-utils"
import { makeRequest } from "./test-utils/mockAxios"

describe("request mocking", () => {
  test("mocking specific responses and spying", async () => {
    setMockResponse.post(
      "/some-example",
      { matches: "request with {a:5}" },
      { requestBody: expect.objectContaining({ a: 5 }) }
    )
    setMockResponse.post(
      "/some-example",
      { matches: "request with {b:10}" },
      { requestBody: expect.objectContaining({ b: 10 }) }
    )
    setMockResponse.post("/some-example", { matches: "all other bodies" })

    const r1 = await axios.post("/some-example", { dog: "woof" })
    const r2 = await axios.post("/some-example", { baby: "sleep", b: 10 })
    const r3 = await axios.post("/some-example", { cat: "meow", a: 5 })

    expect(makeRequest.mock.calls).toEqual([
      ["post", "/some-example", { dog: "woof" }],
      ["post", "/some-example", { baby: "sleep", b: 10 }],
      ["post", "/some-example", { cat: "meow", a: 5 }]
    ])

    expect(r1.data).toEqual({ matches: "all other bodies" })
    expect(r2.data).toEqual({ matches: "request with {b:10}" })
    expect(r3.data).toEqual({ matches: "request with {a:5}" })
  })
})
