import React from "react"
import { Bucket } from "@mitodl/course-search-utils"

const featuredFacetNames = ["audience", "certification"]

interface Props {
  facet: Bucket
  isChecked: boolean
  onUpdate: React.ChangeEventHandler<HTMLInputElement>
  name: string
}

export const slugify = (text: string) =>
  text
    .split(" ")
    .map(subString => subString.toLowerCase())
    .join("-")
    .replace(/[\W_]/g, "-")

export default function SearchFacetItem(props: Props) {
  const { facet, isChecked, onUpdate, name } = props

  const facetId = slugify(`${name}-${facet.key}`)

  return (
    <div className={isChecked ? "facet-visible checked" : "facet-visible"}>
      <input
        type="checkbox"
        id={facetId}
        name={name}
        value={facet.key}
        checked={isChecked}
        onChange={onUpdate}
      />
      <div className="facet-label-div">
        <label
          htmlFor={facetId}
          className={
            featuredFacetNames.includes(name) ?
              "facet-key facet-key-large" :
              "facet-key"
          }
        >
          {facet.key}
        </label>
        <div className="facet-count">{facet.doc_count}</div>
      </div>
    </div>
  )
}
