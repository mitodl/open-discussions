// @flow
import React from 'react';
import { connect } from 'react-redux';
import {
  updateCheckbox
} from '../actions';

class App extends React.Component {
  props: {
    dispatch: () => void,
    checkbox: {
      checked: boolean,
    },
  };

  handleClick(e) {
    const { dispatch } = this.props;
    dispatch(updateCheckbox(e.target.checked));
  }

  render() {
    const { checked } = this.props.checkbox;
    return <div>
      <div id="app-body">
        Click the checkbox:
        <input type="checkbox" checked={checked} onClick={this.handleClick.bind(this)} />
      </div>
    </div>;
  }
}

const mapStateToProps = (state) => {
  return {
    checkbox: state.checkbox,
  };
};

export default connect(mapStateToProps)(App);
