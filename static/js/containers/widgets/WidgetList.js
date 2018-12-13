// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import { Loading } from "../../components/Loading"
import WidgetInstance from "../../components/widgets/WidgetInstance"

import { actions } from "../../actions"

import type { Dispatch } from "redux"
import type {
  WidgetInstance as WidgetInstanceType,
  WidgetListResponse
} from "../../flow/widgetTypes"

type Props = {
  loaded: boolean,
  widgetListId: number,
  loadWidgets: () => Promise<WidgetListResponse>,
  widgetInstances: Array<WidgetInstanceType>
}

export class WidgetList extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.widgetListId !== this.props.widgetListId) {
      this.loadData()
    }
  }

  loadData = async () => {
    const { loadWidgets } = this.props
    await loadWidgets()
  }

  render() {
    const { widgetInstances, loaded } = this.props
    if (!loaded) {
      return <Loading />
    }

    return (
      <div className="widget-list">
        {widgetInstances.map(widgetInstance => (
          <WidgetInstance
            widgetInstance={widgetInstance}
            key={widgetInstance.id}
          />
        ))}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  loaded:          state.widgets.loaded,
  widgetInstances: state.widgets.data.widgets
})

const mapDispatchToProps = (dispatch: Dispatch<any>, ownProps) => ({
  loadWidgets: async () => dispatch(actions.widgets.get(ownProps.widgetListId))
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(WidgetList)
