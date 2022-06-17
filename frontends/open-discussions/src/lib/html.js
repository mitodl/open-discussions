// @flow
import R from "ramda"

export const pullOutURLs = (htmlString: string): Array<string> => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, "text/html")

  return R.flatten(
    [
      ["a", "href"],
      ["img", "src"],
      ["script", "src"]
    ].map(([tagName, urlAttribute]) =>
      // $FlowFixMe
      [...doc.querySelectorAll(tagName)].map(el => el[urlAttribute])
    )
  )
}

const twitterHostNames = ["twitter.com", "platform.twitter.com", "t.co"]

export const hasOnlyTwitterURLS = (htmlString: string) => {
  for (const url of pullOutURLs(htmlString)) {
    const parsed = new URL(url)
    if (!twitterHostNames.includes(parsed.hostname)) {
      return false
    }
  }
  return true
}
