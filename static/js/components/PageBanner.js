// @flow
import React from "react"
import styled, { css } from "styled-components"

import { PHONE_WIDTH } from "../lib/constants"

const bannerHeight = "200px"
const tallBannerHeight = "252px"
const shortMobileBannerHeight = "115px"
const channelBannerBg = "#20316d"

const imageHeight = css`
  @media (max-width: ${PHONE_WIDTH}px) {
    height: ${props =>
    props.compactOnMobile ? shortMobileBannerHeight : bannerHeight};
  }
  @media (min-width: ${PHONE_WIDTH + 1}px) {
    height: ${props => (props.tall ? tallBannerHeight : bannerHeight)};
  }
`

export const BannerContainer = styled.div`
  position: absolute;
  width: 100%;
  z-index: -1;
`

const imageStylesheet = `
  width: 100%;
  display: block;
`

const StyledImage = styled.img`
  ${imageStylesheet} object-fit: cover;
  ${imageHeight};
`

const PlaceholderDiv = styled.div`
  ${imageStylesheet}
  background-color: ${channelBannerBg};
  ${imageHeight}
`

type ImgProps = {
  src: ?string,
  alt?: string,
  tall?: boolean,
  compactOnMobile?: boolean
}

export const BannerImage = ({ src, alt, tall, compactOnMobile }: ImgProps) =>
  src ? (
    <StyledImage
      src={src}
      tall={tall}
      alt={alt || ""}
      compactOnMobile={compactOnMobile}
    />
  ) : (
    <PlaceholderDiv />
  )

export const BannerPageWrapper = styled.div`
  position: relative;
  width: 100%;
`

export const BannerPageHeader = styled.div`
  margin-bottom: 20px;
  ${imageHeight};
`

export const Gradient = styled.div`
  background-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.19),
    rgba(0, 0, 0, 0.5)
  );
  position: absolute;
  width: 100%;
  display: block;
  top: 0;
  ${imageHeight};
`
