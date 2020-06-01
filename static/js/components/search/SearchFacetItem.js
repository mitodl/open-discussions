// @flow
import React from "react"
import Dotdotdot from "react-dotdotdot"

type Props = {
  facet: Object,
  isChecked: boolean,
  onUpdate: Function,
  labelFunction: ?Function,
  name: string
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
            ["audience", "certification"].includes(name)
              ? "facet-key facet-key-large"
              : "facet-key"
          }
        >
          <Dotdotdot clamp={1}>{labelText}</Dotdotdot>
        </div>
        <div className="facet-count">{facet.doc_count}</div>
      </div>
    </div>
  )
}
