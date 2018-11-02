import React, {Component} from 'react'
import Octicon from 'react-component-octicons'



class mitodlWidgetListWrapper extends Component {
    render() {
      return (
        <div>
          {this.props.renderList(this.props.widgetInstances)}
        </div>
      )
    }
}

class mitodlWidgetWrapper extends Component {
    deleteWidget() {
      /**
       * Make request to server to delete widget
       */
      fetchJsonData(apiPath('widget', this.props.widgetListId, this.props.id), this.props.onChange, {method: 'DELETE'})
    }

    moveWidget(position) {
      /**
       * Make request to server to move widget up
       */
      fetchJsonData(apiPath('widget', this.props.widgetListId, this.props.id, {position: position}),
                    this.props.onChange, {method: 'PATCH'})
    }

  render() {
    return ()
  }
}


class DefaultWidgetWrapper extends Component {
  deleteWidget() {
    /**
     * Make request to server to delete widget
     */
    fetchJsonData(apiPath('widget', this.props.widgetListId, this.props.id), this.props.onChange, {method: 'DELETE'})
  }

  moveWidget(position) {
    /**
     * Make request to server to move widget up
     */
    fetchJsonData(apiPath('widget', this.props.widgetListId, this.props.id, {position: position}),
                  this.props.onChange, {method: 'PATCH'})
  }

  renderEditBar() {
    return (
      <div className={'edit-widget-bar btn-group card-header'}>
        <button className={'btn btn-info col'}
                disabled={this.props.position === 0}
                onClick={() => this.moveWidget(this.props.position - 1)}
                title={'Move widget up'}>
          <Octicon name={'chevron-up'}/>
        </button>
        <button className={'btn btn-info col'}
                disabled={this.props.position === this.props.listLength - 1}
                onClick={() => this.moveWidget(this.props.position + 1)}
                title={'Move widget down'}>
          <Octicon name={'chevron-down'}/>
        </button>
        <button className={'btn btn-info col'} onClick={() => this.props.editWidget(this.props.id)}
                title={'Update widget'}>
          <Octicon name={'pencil'}/>
        </button>
        <button className={'btn btn-danger col'} onClick={() => this.deleteWidget(this.props.id)}
                title={'Delete widget'}>
          <Octicon name={'x'}/>
        </button>
      </div>
    )
  }

  render() {
    return (
      <div className={'widget card mb-3 bg-light'} id={'widget-' + this.props.id}>
        {this.props.editModeActive ? this.renderEditBar() : null}
        {this.props.renderWidget(this.props.widgetProps)}
      </div>
    )
  }
}
