import ControlledPromise from "./ControlledPromise"

describe("ControlledPromise", () => {
  const setup = () => {
    const didResolve = jest.fn()
    const didThrow = jest.fn()
    const cp = new ControlledPromise()
    cp.then(didResolve).catch(didThrow)
    return { didResolve, didThrow, cp }
  }

  it("resolves when told to, not earlier", async () => {
    const { didResolve, didThrow, cp } = setup()

    // didResolve not called synchronously
    expect(didResolve).not.toHaveBeenCalled()
    await new Promise(resolve => setTimeout(resolve, 10))

    // didResolve not called after 10ms
    expect(didResolve).not.toHaveBeenCalled()

    // didResolve called after resolve
    cp.resolve("hello!")
    await cp
    expect(didResolve).toHaveBeenCalledWith("hello!")

    // Never threw
    expect(didThrow).not.toHaveBeenCalled()
  })

  it("rejects when told to, not earlier", async () => {
    const { didResolve, didThrow, cp } = setup()
    await new Promise(resolve => setTimeout(resolve, 10))

    // didThrow not called synchronously
    expect(didThrow).not.toHaveBeenCalled()
    await new Promise(resolve => setTimeout(resolve, 10))

    // didThrow not called after 10ms
    expect(didThrow).not.toHaveBeenCalled()

    cp.reject(new Error("uh oh"))
    await Promise.allSettled([cp])

    // didThrow called after resolve
    expect(didThrow).toHaveBeenCalledWith(new Error("uh oh"))
    expect(didResolve).not.toHaveBeenCalled()
  })
})
