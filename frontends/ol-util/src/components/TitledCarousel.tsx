import React, { ElementType, useCallback, useRef, useState } from "react"
import Carousel from "nuka-carousel"
import { clamp } from "lodash"
import type { CarouselProps } from "nuka-carousel"
import styled from "styled-components"

type TitledCarouselProps = {
  children: React.ReactNode
  title: React.ReactNode
  as?: ElementType
  className?: string
  carouselClassName?: string
  pageSize: number
  /**
   * Animation duration in milliseconds.
   */
  animationDuration?: number
  cellSpacing?: CarouselProps["cellSpacing"]
  /**
   * React element to use as "Previous Page" button.
   *
   * @note Internally, the element will be cloned and props `disabled` and
   * `onClick` will be added.
   */
  previous?: React.ReactElement
  /**
   * React element to use as "Next Page" button.
   *
   * @note Internally, the element will be cloned and props `disabled` and
   * `onClick` will be added.
   */
  next?: React.ReactElement
}

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`

const defaultAnimationDuration = 800

const TitledCarousel: React.FC<TitledCarouselProps> = ({
  children,
  title,
  className,
  carouselClassName,
  pageSize,
  cellSpacing,
  animationDuration = defaultAnimationDuration,
  as: ContainerComponent = "div",
  previous = <button>Previous</button>,
  next = <button>Next</button>
}) => {
  const wasButtonChange = useRef(false)
  const [index, setIndex] = useState(0)
  const childCount = React.Children.count(children)
  const canPageUp = index + pageSize < childCount
  const canPageDown = index !== 0

  const pageDown = useCallback(() => {
    setIndex(currentIndex => clamp(currentIndex - pageSize, 0, childCount - 1))
    wasButtonChange.current = true
  }, [pageSize, childCount])
  const pageUp = useCallback(() => {
    setIndex(currentIndex => clamp(currentIndex + pageSize, 0, childCount - 1))
    wasButtonChange.current = true
  }, [pageSize, childCount])
  const syncIndexFromDrag = useCallback((sliderIndex: number) => {
    if (!wasButtonChange.current) {
      /**
       * This was a drag change, so we need to manually sync the index with our
       * state.
       */
      setIndex(sliderIndex)
    }
    wasButtonChange.current = false
  }, [])

  return (
    <ContainerComponent className={className}>
      <HeaderContainer>
        {title}
        <ButtonsContainer>
          {React.cloneElement(previous, {
            disabled: !canPageDown,
            onClick:  pageDown
          })}
          {React.cloneElement(next, {
            disabled: !canPageUp,
            onClick:  pageUp
          })}
        </ButtonsContainer>
      </HeaderContainer>
      <Carousel
        slideIndex={index}
        className={carouselClassName}
        slidesToShow={pageSize}
        afterSlide={syncIndexFromDrag}
        cellSpacing={cellSpacing}
        withoutControls={true}
        speed={animationDuration}
      >
        {children}
      </Carousel>
    </ContainerComponent>
  )
}

export default TitledCarousel
export type { TitledCarouselProps }
