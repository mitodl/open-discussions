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

/**
 * Prefer direct use of `BannerPage` component.
 */
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

/**
 * Prefer direct use of `BannerPage` component.
 */
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

/**
 * Prefer direct use of `BannerPage` component.
 */
const BannerPageWrapper = styled.div`
  position: relative;
  width: 100%;
`

/**
 * Prefer direct use of `BannerPage` component.
 */
const BannerPageHeader = styled.header`
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
  omitBackground?: boolean
  className?: string
  /**
   * Child elements placed below the banner.
   */
  children?: React.ReactNode
  /**
   * Child elements within the banner.
   *
   * By default, the banner content will be vertically centered. Customize this
   * behavior with `bannerContainerClass`.
   */
  bannerContent?: React.ReactNode
  bannerContainerClass?: string
}

const BannerPageHeaderFlex = styled.header`
  ${imageWrapperHeight};
  display: flex;
  flex-direction: column;
  justify-content: center;
`

/**
 * Layout a page with a banner at top and content below. Supports optional
 * content with the banner.
 */
const BannerPage: React.FC<BannerPageProps> = ({
  className,
  src,
  tall,
  compactOnMobile,
  bannerContent,
  bannerContainerClass,
  alt,
  children,
  omitBackground
}) => {
  return (
    <BannerPageWrapper className={className}>
      <BannerPageHeaderFlex
        tall={tall}
        compactOnMobile={compactOnMobile}
        className={bannerContainerClass}
      >
        <BannerContainer>
          {!omitBackground && (
            <BannerImage
              src={src}
              alt={alt}
              tall={tall}
              compactOnMobile={compactOnMobile}
            />
          )}
        </BannerContainer>
        {bannerContent}
      </BannerPageHeaderFlex>
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
