import casual from "casual"
import { makePaginatedFactory, Factory } from "ol-util"
import type { Field } from "./interfaces"

const makeField: Factory<Field> = (overrides) => ({
  name: casual.word,
  title: casual.title,
  /**
   * The URLs that `casual` makes contain capital letters in their hostnames.
   * But hostnames are case-insensitive, so browsers and JSDOM both standardize
   * the hostname portion of URLs on HTML elements to be lowercase, e.g.,
   * 
   * src code contains:       `<img src="http://WOOF.com/DOG.png" />`
   * browser renders:         `<img src="http://woof.com/DOG.png" />`
   *
   * 
   * This makes testing with hostnames containing capitals annoying.
   * So let's standardize the hostnames here like a browser would. 
   */
  avatar_small: new URL(casual.url).href,
  ...overrides
})

const makeFieldList = makePaginatedFactory(makeField)

export { makeField, makeFieldList }
