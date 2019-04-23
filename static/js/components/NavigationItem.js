// @flow
import React from "react"

export const NavigationExpansion = React.createContext<boolean>(false)

type Props = {
  badge?: Function,
  whenExpanded: Function
}

const NavigationItem = ({ badge, whenExpanded }: Props) => (
  <NavigationExpansion.Consumer>
    {expanded => (
      <React.Fragment>
        {badge ? badge() : null}
        {expanded ? whenExpanded() : null}
      </React.Fragment>
    )}
  </NavigationExpansion.Consumer>
)

export default NavigationItem
