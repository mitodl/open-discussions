// @flow
/* global SETTINGS:false */
import React from "react"
import Carousel from "nuka-carousel"
import Dotdotdot from "react-dotdotdot"

import Card from "./Card"

import { availabilityLabel, minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"

import type { Course } from "../flow/discussionTypes"

const CAROUSEL_IMG_HEIGHT = 130
const CAROUSEL_IMG_WIDTH = 306

type Props = {|
  title: string,
  courses: Array<Course>,
  setShowCourseDrawer: Function
|}

type CardProps = {|
  course: Course,
  setShowCourseDrawer: Function
|}

export const CarouselCourseCard = ({
  course,
  setShowCourseDrawer
}: CardProps) => (
  <Card
    borderless
    className="course"
    onClick={() => setShowCourseDrawer({ courseId: course.id })}
  >
    <div className="cover-image">
      <img
        src={embedlyThumbnail(
          SETTINGS.embedlyKey,
          course.image_src || "",
          CAROUSEL_IMG_HEIGHT,
          CAROUSEL_IMG_WIDTH
        )}
        height={CAROUSEL_IMG_HEIGHT}
      />
    </div>
    <div className="row topic-and-platform">
      {course.topics[0] ? (
        <div className="topic">{course.topics[0].name}</div>
      ) : null}
      <div className="platform">{course.platform.toUpperCase()}</div>
    </div>
    <div className="row course-title">
      <Dotdotdot clamp={3}>{course.title}</Dotdotdot>
    </div>
    <div className="row availability-and-price">
      <div className="availability">
        {availabilityLabel(course.availability)}
      </div>
      <div className="price">{minPrice(course)}</div>
    </div>
  </Card>
)

const prevButton = ({ previousSlide, currentSlide }) =>
  currentSlide === 0 ? null : (
    <div onClick={previousSlide} className="carousel-control prev">
      <i className="material-icons">chevron_left</i>
    </div>
  )

// const nextButton = ({ nextSlide }) => {
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

const CourseCarousel = ({ title, courses, setShowCourseDrawer }: Props) => (
  <div className="course-carousel">
    <div className="title-row">
      <div className="title">{title}</div>
    </div>
    <Carousel
      slidesToShow={3}
      slidesToScroll="auto"
      speed={800}
      easing="easeQuadInOut"
      cellSpacing={22}
      heightMode="current"
      renderCenterLeftControls={prevButton}
      renderCenterRightControls={nextButton}
      renderBottomCenterControls={null}
    >
      {courses.map((course, idx) => (
        <CarouselCourseCard
          key={idx}
          course={course}
          setShowCourseDrawer={setShowCourseDrawer}
        />
      ))}
    </Carousel>
  </div>
)
export default CourseCarousel
