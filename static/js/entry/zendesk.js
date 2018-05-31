/* global SETTINGS:false zE:false _:false */
__webpack_public_path__ = `${SETTINGS.public_path}` // eslint-disable-line no-undef, camelcase
import _ from "lodash"

// Start of odl Zendesk Widget script
/* eslint-disable no-sequences, prefer-const */
/*<![CDATA[*/
window.zEmbed ||
  (function(e, t) {
    let n,
      o,
      d,
      i,
      s,
      a = [],
      r = document.createElement("iframe")
    ;(window.zEmbed = function() {
      a.push(arguments)
    }),
    (window.zE = window.zE || window.zEmbed),
    (r.src = "javascript:false"),
    (r.title = ""),
    (r.role = "presentation"),
    ((r.frameElement || r).style.cssText = "display: none"),
    (d = document.getElementsByTagName("script")),
    (d = d[d.length - 1]),
    d.parentNode.insertBefore(r, d),
    (i = r.contentWindow),
    (s = i.document)
    try {
      o = s
    } catch (e) {
      (n = document.domain),
      (r.src = `javascript:var d=document.open();d.domain="${n}";void(0);`),
      (o = s)
    }
    (o.open()._l = function() {
      const o = this.createElement("script")
      n && (this.domain = n),
      (o.id = "js-iframe-async"),
      (o.src = e),
      (this.t = +new Date()),
      (this.zendeskHost = t),
      (this.zEQueue = a),
      this.body.appendChild(o)
    }),
    o.write('<body onload="document._l();">'),
    o.close()
  })(
    "https://assets.zendesk.com/embeddable_framework/main.js",
    "odl.zendesk.com"
  )

// This will execute when Zendesk's Javascript is finished executing, and the
// Web Widget API is available to be used. Zendesk's various iframes may *not*
// have been inserted into the DOM yet.
zE(function() {
  // pre-populate feedback form
  if (SETTINGS.user_full_name) {
    zE.identify({ name: SETTINGS.user_full_name, email: SETTINGS.user_email })
  }

  zendeskPollForExistence("launcher")
  zendeskPollForExistence("webWidget")
})

const zendeskCallbacks = {
  // This object supports the following functions:
  //   launcherLoaded: runs when the launcher iframe's content is loaded
  //   webWidgetLoaded: runs when the submission form is loaded
  //
  // The `zendeskPollForExistence()` function will ensure that these functions
  // are called at the appropriate time. We have to ensure that the iframe
  // exists before we can start polling to see if the content has loaded
  // (so that we can call functions to fiddle with the HTML and styling inside
  // of it).

  launcherLoaded: () => {
    const iframe = document.querySelector("iframe.zEWidget-launcher")
    if (_.isNull(iframe)) {
      return
    }

    const btn = iframe.contentDocument.querySelector(".u-userLauncherColor")
    if (_.isNull(btn)) {
      return
    }

    const regularBackgroundColor = "rgba(0, 0, 0, .14)"
    const defaultHoverBackgroundColor = "#a31f34" // fall back color
    const hoverBackgroundColor = window.getComputedStyle(
      btn,
      defaultHoverBackgroundColor
    ).backgroundColor
    // We need to set a new background color, and unfortunately,
    // the existing background color is set with "!important".
    // As a result, the only way to override this existing color is to
    // *also* use "!important".
    const setHover = () => {
      btn.style.setProperty(
        "background-color",
        hoverBackgroundColor,
        "important"
      )
    }
    const unsetHover = () => {
      btn.style.setProperty(
        "background-color",
        regularBackgroundColor,
        "important"
      )
    }
    btn.onmouseenter = setHover
    btn.onmouseleave = unsetHover
    unsetHover()
  },
  webWidgetLoaded: () => {
    const iframe = document.querySelector("iframe.zEWidget-webWidget")

    // this is Zendesk's ID for the program selector field
    // which we want to hide in Discussions
    const programFieldName = "24690866"

    let tries = 0
    let programEl

    const intervalID = setInterval(() => {
      tries++

      programEl = iframe.contentDocument.querySelector(
        `input[name="${programFieldName}"]`
      )

      if (programEl) {
        programEl.parentNode.parentNode.style.setProperty(
          "display",
          "none",
          "important"
        )
        clearInterval(intervalID)
      } else if (tries > 100) {
        console.error("couldn't find program selector") // eslint-disable-line no-console
        clearInterval(intervalID)
      }
    }, 100)
  }
}

const zendeskPollForExistence = name => {
  let tries = 0
  const intervalID = setInterval(() => {
    tries += 1
    const iframe = document.querySelector(`iframe.zEWidget-${name}`)
    if (iframe) {
      clearInterval(intervalID)
      zendeskPollForLoaded(name)
    } else if (tries > 100) {
      // max 100 tries (10 seconds)
      console.error(`couldn't find Zendesk iframe: ${name}`) // eslint-disable-line no-console
      clearInterval(intervalID)
    }
  }, 100) // check every 100 milliseconds
}

const zendeskPollForLoaded = name => {
  let tries = 0
  let iframeDocument = null
  const intervalID = setInterval(() => {
    tries += 1
    const iframe = document.querySelector(`iframe.zEWidget-${name}`)
    try {
      iframeDocument = iframe.contentDocument
    } catch (err) {
      // cross-domain exception: can't continue
    }
    if (!iframeDocument) {
      console.error(`Can't access content of Zendesk iframe: ${name}`) // eslint-disable-line no-console
      clearInterval(intervalID)
      return
    }

    const div = iframeDocument.querySelector("div")
    if (div) {
      clearInterval(intervalID)
      const callback = zendeskCallbacks[`${name}Loaded`]
      if (callback) {
        callback()
      }
    } else if (tries > 100) {
      // max 100 tries (10 seconds)
      console.error(`couldn't load Zendesk iframe: ${name}`) // eslint-disable-line no-console
      clearInterval(intervalID)
    }
  }, 100) // check every 100 milliseconds
}
