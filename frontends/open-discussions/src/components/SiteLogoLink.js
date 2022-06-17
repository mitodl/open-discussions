// @flow
import React from "react"

type SiteLogoProps = {
  url: string
}

type SocialSiteLogoProps = SiteLogoProps & {
  site: string
}

export const SocialSiteLogoLink = ({ site, url }: SocialSiteLogoProps) => (
  <a href={url} target="_blank" rel="noopener noreferrer">
    <div className="circle-logo-wrapper">
      <svg className="social-logo">
        <use xlinkHref={`/static/images/social/feather-sprite.svg#${site}`} />
      </svg>
    </div>
  </a>
)

export const SiteLogoLink = ({ url }: SiteLogoProps) => (
  <a href={url} target="_blank" rel="noopener noreferrer">
    <div className="circle-logo-wrapper external-site-logo">www</div>
  </a>
)
