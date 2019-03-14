// @flow
/* global SETTINGS:false */
import React, { useState } from "react"
import Carousel from "nuka-carousel"
import Dotdotdot from "react-dotdotdot"
import R from "ramda"

import Card from "./Card"

import { availabilityLabel, minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"

import type { Course } from "../flow/discussionTypes"

type Props = {|
  title: string,
  courses: Array<Course>,
  setShowCourseDrawer: Function
|}

const CAROUSEL_PAGE_SIZE = 3

const CAROUSEL_IMG_HEIGHT = 130
const CAROUSEL_IMG_WIDTH = 306

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
    <div className="row title course-title">
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

export default function CourseCarousel(props: Props) {
  const { title, courses, setShowCourseDrawer } = props

  const [index, setIndex] = useState(0)
  const canPageUp = index + CAROUSEL_PAGE_SIZE < courses.length
  const canPageDown = index !== 0

  return (
    <div className="course-carousel">
      <div className="title-and-controls">
        <div className="title">{title}</div>
        <div className="controls">
          <button
            className={`dark-outlined compact extra-compact prev ${
              canPageDown ? "" : "disabled"
            }`}
            disabled={!canPageDown}
            onClick={
              canPageDown
                ? () => setIndex(R.max(index - CAROUSEL_PAGE_SIZE, 0))
                : null
            }
          >
            <i className="material-icons">arrow_back</i>
            Previous
          </button>
          <button
            className={`dark-outlined compact extra-compact next ${
              canPageUp ? "" : "disabled"
            }`}
            onClick={
              canPageUp ? () => setIndex(index + CAROUSEL_PAGE_SIZE) : null
            }
            disabled={!canPageUp}
          >
            Next
            <i className="material-icons">arrow_forward</i>
          </button>
        </div>
      </div>
      <Carousel
        slideIndex={index}
        slidesToShow={3}
        slidesToScroll="auto"
        withoutControls={true}
        afterSlide={slideIndex => setIndex(slideIndex)}
        speed={800}
        easing="easeQuadInOut"
        cellSpacing={22}
        heightMode="current"
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
}
