// @flow
import { useDeviceCategory } from "../hooks/util"

type Props = {
  children: React$Node,
  onlyOn: Array<string>
}

export default function ResponsiveWrapper(props: Props) {
  const { children, onlyOn } = props

  const deviceCategory = useDeviceCategory()

  return onlyOn.includes(deviceCategory) ? children : null
}
