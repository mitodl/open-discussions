import React, { useCallback, useEffect, useState } from "react"
import isURL from "validator/lib/isURL"
import {
  createStylesheet,
  EmbedlyEventTypes,
  ensureEmbedlyPlatform,
  getEmbedlyKey
} from "./util"

type EmbedlyCardProps = {
  url: string
  className?: string
}

/**
 * Embedly cards are contained within an iframe.
 * Inserts a stylesheet into the card's iframe.
 */
const insertCardStylesheet = (e: Event) => {
  if (!(e.target instanceof HTMLIFrameElement)) return
  if (!e.target.contentDocument) return
  const stylesheet = `
  /* hide card title */
  .hdr { display: none; }
  /* reduce card padding */
  .pair-bd > *:last-child {
    padding-bottom: 0px;
  }
  #cards {
    padding: 0px;
  }
  `
  createStylesheet(e.target.contentDocument, stylesheet)
}

const EmbedlyCard: React.FC<EmbedlyCardProps> = ({ className, url }) => {
  const embedlyKey = getEmbedlyKey()
  const [container, setContainer] = useState<HTMLElement | null>(null)
  // TODO: Validate url
  const renderCard = useCallback((div: HTMLElement | null) => {
    if (!div) return
    div.addEventListener(EmbedlyEventTypes.CardCreated, insertCardStylesheet)
    setContainer(div)
  }, [])

  useEffect(() => {
    ensureEmbedlyPlatform()
  }, [])

  useEffect(() => {
    if (!container) return
    container.innerHTML = ""
    if (!isURL(url)) return
    const a = document.createElement("a")
    a.dataset.cardChrome = "0"
    a.dataset.cardControls = "0"
    a.dataset.cardKey = embedlyKey ?? ""
    a.href = url
    a.classList.add("embedly-card")
    container.appendChild(a)
  }, [embedlyKey, container, url])

  return <div className={className} ref={renderCard} />
}

export default EmbedlyCard
export type { EmbedlyCardProps }
