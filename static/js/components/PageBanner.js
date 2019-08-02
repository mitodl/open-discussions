// @flow
import React from "react"
import styled from "styled-components"

import { isMobileWidth } from "../lib/util"

const bannerHeight = "200px"
const tallBannerHeight = "252px"
const channelBannerBg = "#20316d"

const imageHeight = props =>
  props.tall && !isMobileWidth() ? tallBannerHeight : bannerHeight

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
  height: ${imageHeight};
`

const PlaceholderDiv = styled.div`
  ${imageStylesheet}
  background-color: ${channelBannerBg};
  height: ${imageHeight}
`

type ImgProps = {
  src: ?string,
  alt?: string,
  tall?: boolean
}

export const BannerImage = ({ src, alt, tall }: ImgProps) =>
  src ? (
    <StyledImage src={src} tall={tall} alt={alt || ""} />
  ) : (
    <PlaceholderDiv />
  )

export const BannerPageWrapper = styled.div`
  position: relative;
  width: 100%;
`

export const BannerPageHeader = styled.div`
  margin-bottom: 20px;
  min-height: ${imageHeight};
`

export const Gradient = styled.div`
  background-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.19),
    rgba(0, 0, 0, 0.5)
  );
  position: absolute;
  height: ${imageHeight}
  width: 100%;
  display: block;
  top: 0;
`
