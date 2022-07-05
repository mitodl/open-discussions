// @flow
/* global SETTINGS: false */
import React from "react"
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import SearchPage from "./pages/SearchPage"

import { connect } from "react-redux"


const App = () => {
  return (
  	<BrowserRouter  basename="/infinite">
	    <Switch>
	      <Route
	        path='/search'
	        component={SearchPage}
	      />
	    </Switch>
	  </BrowserRouter>
  )
}

export default App
