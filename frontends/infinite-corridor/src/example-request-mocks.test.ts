import axios from "./libs/axios"
import { setMockResponse } from "./test-utils"
import { allowConsoleErrors } from "ol-util/src/test-utils"

describe("request mocking", () => {
  test("mocking specific responses and spying", async () => {
    setMockResponse.post(
      "/some-example",
      { someResponseKey: "response for request with {a:5}" },
      { requestBody: expect.objectContaining({ a: 5 }) }
    )
    setMockResponse.post(
      "/some-example",
      { someResponseKey: "response for request with {b:10}" },
      { requestBody: expect.objectContaining({ b: 10 }) }
    )
    setMockResponse.post(
      "/some-example",
      { someResponseKey: "fallback post response" }
      // if 3rd arg is undefined, the response (2nd arg) will be used for all unmatched request bodies
    )

    setMockResponse.patch("/another-example", { someResponseKey: "patched!" })

    const r0 = await axios.post("/some-example", { dog: "woof" })
    const r1 = await axios.patch("/another-example", { dog: "bark bark" })
    const r2 = await axios.post("/some-example", { baby: "sleep", b: 10 })
    const r3 = await axios.post("/some-example", { cat: "meow", a: 5 })

    // toHaveBeenNthCalledWith is 1-indexed
    expect(axios.post).toHaveBeenNthCalledWith(1, "/some-example", {
      dog: "woof"
    })
    expect(axios.patch).toHaveBeenNthCalledWith(1, "/another-example", {
      dog: "bark bark"
    })
    expect(axios.post).toHaveBeenNthCalledWith(2, "/some-example", {
      baby: "sleep",
      b:    10
    })
    expect(axios.post).toHaveBeenNthCalledWith(3, "/some-example", {
      cat: "meow",
      a:   5
    })

    expect(r0.data).toEqual({ someResponseKey: "fallback post response" })
    expect(r1.data).toEqual({ someResponseKey: "patched!" })
    expect(r2.data).toEqual({
      someResponseKey: "response for request with {b:10}"
    })
    expect(r3.data).toEqual({
      someResponseKey: "response for request with {a:5}"
    })
  })

  test("Error codes reject", async () => {
    setMockResponse.post("/some-example", "Bad request", { code: 400 })
    await expect(axios.post("/some-example", { a: 5 })).rejects.toEqual(
      expect.objectContaining({
        response: { data: "Bad request", status: 400 }
      })
    )
  })

  test("Errors if mock value is not set.", async () => {
    const { consoleError } = allowConsoleErrors()
    expect(consoleError).not.toHaveBeenCalled()
    let error: Error | null = null
    try {
      await axios.post("/some-example", { dog: "woof" })
    } catch (err) {
      error = err as Error
    }
    expect(error?.message).toBe("No response specified for post /some-example")
    expect(consoleError).toHaveBeenCalledWith(
      "No response specified for post /some-example"
    )
  })

  test("Manually resolving a response", async () => {
    let resolve: (value: number) => void = () => {
      throw new Error("Not yet assigned")
    }
    const responseBody = new Promise(resolver => {
      resolve = resolver
    })

    setMockResponse.get("/respond-when-i-say", responseBody)
    const response = axios.get("/respond-when-i-say")
    let responseStatus = "pending"
    response.then(() => {
      responseStatus = "resolved"
    })

    await Promise.resolve() // flush the event queue
    expect(responseStatus).toBe("pending") // response is still pending
    resolve(37)
    expect(await response).toEqual(
      expect.objectContaining({
        data:   37,
        status: 200
      })
    )
    expect(responseStatus).toBe("resolved")
  })
})
