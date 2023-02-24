import { renderHook, act } from '@testing-library/react-hooks/dom'
import useToggle from './useToggle'

test.each([
  { initialValue: true },
  { initialValue: false }
])("useToggle($initialValue)'s initial state is $initialValue", ({ initialValue }) => {
  const { result } = renderHook(() => useToggle(initialValue))
  expect(result.current[0]).toBe(initialValue)
})

test.each([
  { initialValue: true },
  { initialValue: false }
])("toggle.on sets value to true", ({ initialValue }) => {
  const { result } = renderHook(() => useToggle(initialValue))
  act(() => result.current[1].on())
  expect(result.current[0]).toBe(true)
})

test.each([
  { initialValue: true },
  { initialValue: false }
])("toggle.off sets value to false", ({ initialValue }) => {
  const { result } = renderHook(() => useToggle(initialValue))
  act(() => result.current[1].off())
  expect(result.current[0]).toBe(false)
})

test("toggle.set(val) sets value to val", () => {
  const { result } = renderHook(() => useToggle(false))
  act(() => result.current[1].set(false))
  expect(result.current[0]).toBe(false)

  act(() => result.current[1].set(true))
  expect(result.current[0]).toBe(true)

  act(() => result.current[1].set(true))
  expect(result.current[0]).toBe(true)

  act(() => result.current[1].set(false))
  expect(result.current[0]).toBe(false)
})

test("toggle.toggle() toggles value", () => {
  const { result } = renderHook(() => useToggle(false))
  act(() => result.current[1].toggle())
  expect(result.current[0]).toBe(true)

  act(() => result.current[1].toggle())
  expect(result.current[0]).toBe(false)
})

test("useToggle's toggler functions are render-stable", () => {
  const { result, rerender } = renderHook(() => useToggle(false))
  const toggler0 = result.current[1]
  rerender()
  const toggler1 = result.current[1]

  expect(toggler0).toBe(toggler1)
  expect(toggler0.on).toBe(toggler1.on)
  expect(toggler0.off).toBe(toggler1.off)
  expect(toggler0.toggle).toBe(toggler1.toggle)
  expect(toggler0.set).toBe(toggler1.set)
})
