// @flow
import React from 'react';
import { connect } from 'react-redux';

class HomePage extends React.Component {
  render() {
    return (
      <div>
        Home page
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(HomePage);
