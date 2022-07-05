import React from "react"
import styled, { css } from "styled-components"

// TODO: Move contsants somewhere shared
const PHONE_WIDTH = 580

const bannerHeight = "200px"
const tallBannerHeight = "252px"
const shortMobileBannerHeight = "115px"
const channelBannerBg = "#20316d"

type ImgProps = {
  src?: string | null
  alt?: string
  tall?: boolean
  compactOnMobile?: boolean
}

const imageHeight = css<ImgProps>`
  @media (max-width: ${PHONE_WIDTH}px) {
    height: ${props =>
      props.compactOnMobile ? shortMobileBannerHeight : bannerHeight};
  }
  @media (min-width: ${PHONE_WIDTH + 1}px) {
    height: ${props => (props.tall ? tallBannerHeight : bannerHeight)};
  }
`

const imageWrapperHeight = css<ImgProps>`
  @media (max-width: ${PHONE_WIDTH}px) {
    min-height: ${props =>
      props.compactOnMobile ? shortMobileBannerHeight : bannerHeight};
  }
  @media (min-width: ${PHONE_WIDTH + 1}px) {
    min-height: ${props => (props.tall ? tallBannerHeight : bannerHeight)};
  }
`

const BannerContainer = styled.div`
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
  ${imageWrapperHeight}
`

const BannerImage = ({ src, alt, tall, compactOnMobile }: ImgProps) =>
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

const BannerPageWrapper = styled.div`
  position: relative;
  width: 100%;
`

const BannerPageHeader = styled.div`
  margin-bottom: 20px;
  ${imageWrapperHeight};
`

const Gradient = styled.div`
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

export {
  BannerImage,
  BannerPageWrapper,
  BannerPageHeader,
  Gradient,
  BannerContainer
}
