// @flow
import React from "react"
import Dotdotdot from "react-dotdotdot"
import {
  iconMap,
  OPEN_CONTENT,
  PROFESSIONAL,
  CERTIFICATE
} from "../../lib/constants"

type Props = {
  facet: Object,
  isChecked: boolean,
  onUpdate: Function,
  labelFunction: ?Function,
  name: string
}

const featuredFacetNames = ["audience", "certification"]

const tooltipTextMap = {
  [OPEN_CONTENT]: "For those looking to learn now",
  [PROFESSIONAL]: "For those looking to invest in professional development",
  [CERTIFICATE]:  "Recieve a certificate upon completion"
}

export default function SearchFacetItem(props: Props) {
  const { facet, isChecked, onUpdate, labelFunction, name } = props

  const labelText = labelFunction ? labelFunction(facet.key) : facet.key

  return (
    <div
      className={isChecked ? "facet-visible checked" : "facet-visible"}
      onClick={() => {
        onUpdate({
          target: {
            name,
            value:   facet.key,
            checked: !isChecked
          }
        })
      }}
    >
      <input
        type="checkbox"
        name={name}
        value={facet.key}
        checked={isChecked}
        onChange={onUpdate}
      />
      <div className="facet-label-div">
        <div
          className={
            featuredFacetNames.includes(name)
              ? "facet-key facet-key-large"
              : "facet-key"
          }
        >
          <Dotdotdot clamp={1}>{labelText}</Dotdotdot>
        </div>
        {featuredFacetNames.includes(name) ? (
          <div className="facet-icon">
            <span className="icon-tooltip-text">
              {tooltipTextMap[facet.key]}
            </span>
            <img src={iconMap[facet.key]} />
          </div>
        ) : (
          <div className="facet-count">{facet.doc_count}</div>
        )}
      </div>
    </div>
  )
}
