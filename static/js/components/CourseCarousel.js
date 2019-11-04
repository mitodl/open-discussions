// @flow
/* global SETTINGS:false */
import React, { useState } from "react"
import Carousel from "nuka-carousel"
import R from "ramda"

import LearningResourceCard from "./LearningResourceCard"

import { SEARCH_GRID_UI, SEARCH_UI_GRID_WIDTHS } from "../lib/search"
import { useDeviceCategory } from "../hooks/util"

import type { LearningResourceSummary } from "../flow/discussionTypes"

type Props = {|
  title: string,
  courses: Array<LearningResourceSummary>
|}

export default function CourseCarousel(props: Props) {
  const { title, courses } = props

  const [index, setIndex] = useState(0)
  const deviceCategory = useDeviceCategory()
  const pageSize = SEARCH_UI_GRID_WIDTHS[deviceCategory]
  const canPageUp = index + pageSize < courses.length
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
              canPageDown ? () => setIndex(R.max(index - pageSize, 0)) : null
            }
          >
            <i className="material-icons">arrow_back</i>
            Previous
          </button>
          <button
            className={`dark-outlined compact extra-compact next ${
              canPageUp ? "" : "disabled"
            }`}
            onClick={canPageUp ? () => setIndex(index + pageSize) : null}
            disabled={!canPageUp}
          >
            Next
            <i className="material-icons">arrow_forward</i>
          </button>
        </div>
      </div>
      <Carousel
        slideIndex={index}
        slidesToShow={pageSize}
        slidesToScroll="auto"
        withoutControls={true}
        afterSlide={slideIndex => setIndex(slideIndex)}
        speed={800}
        easing="easeQuadInOut"
        cellSpacing={22}
        heightMode="current"
      >
        {courses.map((course, idx) => (
          <LearningResourceCard
            key={idx}
            object={course}
            searchResultLayout={SEARCH_GRID_UI}
          />
        ))}
      </Carousel>
    </div>
  )
}
