/*
 *
 * DashboardPage reducer
 *
 */

// import { combineReducers } from 'redux';

// import ActionTypes from './constants';
import { ContainerActions, ContainerState } from './types';

export const initialState: ContainerState = {

};

function dashboardPageReducer(state: ContainerState = initialState, action: ContainerActions) {
  switch (action.type) {
    default:
      return state;
  }
}

export default dashboardPageReducer;
