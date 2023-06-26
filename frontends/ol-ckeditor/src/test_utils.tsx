import React from "react"
import type { CkeditorMarkdownProps } from "./components/CkeditorMarkdown"
/**
 * Replace the CkeditorMarkdown input with a textarea.
 *
 * This is useful because:
 *  1. running jest with CKEditor is hard... its packages are not transpiled, ie
 *     it includes raw ES6 imports as well as css/svg files.
 *  2. Even if we make the imports work, CKEditor can't function in jest's jsdom
 *     environment. So.... let's just use a textarea.
 */
const setupMockEditors = () => {
  jest.mock("./components/CkeditorMarkdown", () => ({
    __esModule: true,
    default:    ({ onChange, ...others }: CkeditorMarkdownProps) => (
      <textarea onChange={e => onChange(e.target.value)} {...others} />
    )
  }))
}

export { setupMockEditors }
