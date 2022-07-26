import React from "react"
import styled, { css } from "styled-components"

// TODO: Move contsants somewhere shared
const PHONE_WIDTH = 580

const bannerHeight = "200px"
const tallBannerHeight = "252px"
const shortMobileBannerHeight = "115px"
const channelBannerBg = "#20316d"

interface ImgProps {
  /**
   * The `src` attribute for the banner image.
   */
  src?: string | null
  /**
   * The `alt` attribute for the banner image.
   */
  alt?: string
  /**
   * If `true`, the banner will be a bit taller on non-mobile screens.
   */
  tall?: boolean
  /**
   * If `true`, the banner will be a bit shorter on mobile screens.
   */
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
  ${imageStylesheet}
  object-fit: cover;
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

interface BannerPageProps extends ImgProps {
  className?: string;
  /**
   * Child elements placed below the banner.
   */
  children?: React.ReactNode;
  bannerContent?: React.ReactNode;
}

const BannerContent = styled.div`
  /*
  The goal here is to provide a container in which to insert extra content into
  the banner area. The container should be full width and height of the banner,
  which makes controlling styling on the consumer side easy.
  */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height:100%;
`

const BannerPage: React.FC<BannerPageProps> = ({ className, src, tall, compactOnMobile, bannerContent, alt, children }) => {
  return (
    <BannerPageWrapper className={className}>
      <BannerPageHeader tall={tall} compactOnMobile={compactOnMobile}>
        <BannerContainer>
          <BannerImage src={src} alt={alt} tall={tall} compactOnMobile={compactOnMobile} />
          <BannerContent>
            {bannerContent}
          </BannerContent>
        </BannerContainer>
      </BannerPageHeader>
      {children}
    </BannerPageWrapper>
  )
}

export {
  BannerImage,
  BannerPageWrapper,
  BannerPageHeader,
  Gradient,
  BannerContainer,
  BannerPage
}
