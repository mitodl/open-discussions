// @flow
import { assert } from "chai"

import { hasOnlyTwitterURLS, pullOutURLs } from "./html"

describe("html parsing functions", () => {
  it("pullOutURLs should pull out all URL attributes", () => {
    assert.deepEqual(
      pullOutURLs(`
        <a href="foobar.example.com"/>
        <img src="https://cats.example.com/images/1" />
        <script src="https://all-viruses.example.com/platform.js" />
    `),
      [
        "foobar.example.com",
        "https://cats.example.com/images/1",
        "https://all-viruses.example.com/platform.js"
      ]
    )
  })

  //
  ;[
    [
      `<a href="https://foobar.example.com"/>
      <img src="https://cats.example.com/images/1" />
      <script src="https://all-viruses.example.com/platform.js" />`,
      false
    ],
    [
      `<a href="https://platform.twitter.com"/>
      <img src="https://cats.example.com/images/1" />`,
      false
    ],
    [
      `<a class="twitter-timeline" href="https://twitter.com/TwitterDev?ref_src=twsrc%5Etfw">Tweets by TwitterDev</a>
      <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`,
      true
    ],
    [
      `<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">[FAQ] How can I find USGS historical photographs? Check out hundreds of still photographs dating from the 1870’s. <a href="https://t.co/m56BN9LFfd">https://t.co/m56BN9LFfd</a>  This image shows an engineer establishing plane table location by three point method, 1952. <a href="https://twitter.com/hashtag/tbt?src=hash&amp;ref_src=twsrc%5Etfw">#tbt</a> <a href="https://t.co/Z7jpRMRYwB">pic.twitter.com/Z7jpRMRYwB</a></p>&mdash; USGS (@USGS) <a href="https://twitter.com/USGS/status/1126513466351788032?ref_src=twsrc%5Etfw">May 9, 2019</a></blockquote>
      <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`,
      true
    ]
  ].forEach(([html, expectation]) => {
    it(`hasOnlyTwitterURLS should return ${String(
      expectation
    )} when we expect it to`, () => {
      assert.equal(hasOnlyTwitterURLS(html), expectation)
    })
  })
})
