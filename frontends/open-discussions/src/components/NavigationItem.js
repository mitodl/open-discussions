// @flow
import React from "react"

export const NavigationExpansion = React.createContext<boolean>(false)

type Props = {
  badge?: Function,
  whenExpanded: Function,
  fading?: boolean
}

const NavigationItem = ({ badge, whenExpanded, fading }: Props) => (
  <NavigationExpansion.Consumer>
    {expanded => (
      <React.Fragment>
        {badge ? badge() : null}
        {fading ? (
          <div className={expanded ? "fading-item expanded" : "fading-item"}>
            {whenExpanded()}
          </div>
        ) : expanded ? (
          whenExpanded()
        ) : null}
      </React.Fragment>
    )}
  </NavigationExpansion.Consumer>
)

export default NavigationItem
