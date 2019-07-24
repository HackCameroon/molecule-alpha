/*
 *
 * CreateProjectContainer reducer
 *
 */

import { combineReducers } from 'redux';

import ActionTypes from './constants';
import { ContainerState, ContainerActions } from './types';

export const initialState: ContainerState = {
  default: null,
};

// function createProjectContainerReducer(state: ContainerState = initialState, action: ContainerActions ) {
//   switch (action.type) {
//     case ActionTypes.DEFAULT_ACTION:
//       return state;
//     default:
//       return state;
//   }
// }

// export default createProjectContainerReducer;

export default combineReducers<ContainerState, ContainerActions>({
  default: (state = initialState, action) => {
    switch (action.type) {
      case ActionTypes.DEFAULT_ACTION:
        return state;
      default:
        return state;
    }
  },
});