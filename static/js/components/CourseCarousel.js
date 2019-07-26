// @flow
/* global SETTINGS:false */
import React from "react"
import Carousel from "nuka-carousel"

import LearningResourceCard from "./LearningResourceCard"

import { CAROUSEL_PAGE_SIZE } from "../lib/constants"

import type { Course } from "../flow/discussionTypes"
import R from "ramda"

type Props = {|
  title: string,
  courses: Array<Course>,
  setShowResourceDrawer: Function
|}

const prevButton = ({ previousSlide, currentSlide }) =>
  currentSlide === 0 ? null : (
    <div onClick={previousSlide} className="carousel-control prev">
      <i className="material-icons">chevron_left</i>
    </div>
  )

const nextButton = props => {
  const { slideCount, nextSlide, currentSlide, slidesToShow } = props
  const lastSlideIndex = slideCount - 1

  const disabled = currentSlide + slidesToShow > lastSlideIndex
  return disabled ? null : (
    <div onClick={nextSlide} className="carousel-control next">
      <i className="material-icons">chevron_right</i>
    </div>
  )
}

const CourseCarousel = ({ title, courses, setShowResourceDrawer }: Props) => (
  <div className="course-carousel">
    <div className="title-row">
      <div className="title">{title}</div>
    </div>
    <Carousel
      slidesToShow={CAROUSEL_PAGE_SIZE}
      slidesToScroll="auto"
      speed={800}
      easing="easeQuadInOut"
      cellSpacing={22}
      heightMode="max"
      renderCenterLeftControls={prevButton}
      renderCenterRightControls={nextButton}
      renderBottomCenterControls={null}
    >
      {courses.map((course, idx) => (
        <LearningResourceCard
          key={idx}
          object={R.merge({ object_type: "course" }, course)}
          setShowResourceDrawer={setShowResourceDrawer}
        />
      ))}
    </Carousel>
  </div>
)
export default CourseCarousel
