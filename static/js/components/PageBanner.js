// @flow
import React from "react"
import styled from "styled-components"

const bannerHeight = "200px"
const channelBannerBg = "#20316d"

export const BannerContainer = styled.div`
  position: absolute;
  width: 100%;
  z-index: -1;
`

const imageStylesheet = `
  width: 100%;
  display: block;
  height: ${bannerHeight};
`

const StyledImage = styled.img`
  ${imageStylesheet} object-fit: cover;
`

const PlaceholderDiv = styled.div`
  ${imageStylesheet}
  background-color: ${channelBannerBg};
`

type ImgProps = {
  src: ?string,
  alt?: string
}

export const BannerImage = ({ src, alt }: ImgProps) =>
  src ? <StyledImage src={src} alt={alt || ""} /> : <PlaceholderDiv />

export const BannerPageWrapper = styled.div`
  position: relative;
  width: 100%;
`

export const BannerPageHeader = styled.div`
  margin-bottom: 20px;
  min-height: ${bannerHeight};
`

export const Gradient = styled.div`
  background-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.19),
    rgba(0, 0, 0, 0.5)
  );
  position: absolute;
  height: ${bannerHeight};
  width: 100%;
  display: block;
  top: 0;
`
