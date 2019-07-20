import jwtDecode from 'jwt-decode';
import { eventChannel } from 'redux-saga';
import { call, cancel, delay, fork, put, race, select, take } from 'redux-saga/effects';
import { ApplicationRootState } from 'types';
import { forwardTo } from 'utils/history';
import { getPermit as getPermitApi, login } from '../../api/api';
// import * as userProfileActions from '../userProfile/actions';
import * as authenticationActions from './actions';
import ActionTypes from './constants';
import { getBlockchainObjects, signMessage } from 'blockchainResources';
import { getType } from 'typesafe-actions';


export function* getPermit() {
  const { signerAddress } = yield call(getBlockchainObjects)
  try {
    const { data } = yield call(getPermitApi, signerAddress);
    const signedPermit = yield call(signMessage, data.permit);
    yield put(authenticationActions.saveAccessPermit(signedPermit));
    return signedPermit;
  } catch (error) {
    console.error(error);
  }
}

export function* getAccessToken(signedPermit, ethAddress) {
  try {
    const apiToken = yield call(login, signedPermit, ethAddress);
    yield put(authenticationActions.saveAccessToken(apiToken.data));
    const decodedToken = yield call(jwtDecode, apiToken.data.accessToken);
    yield put(authenticationActions.setUserType(decodedToken.type))
    return apiToken.data;
  } catch (error) {
    if (error.message.includes('Authentication Error')) {
      yield put(authenticationActions.logOut());
      yield put(authenticationActions.authenticate.failure('Looks like something went wrong. Please sign another message'));
    } else {
      yield put(authenticationActions.authenticate.failure('The server did not respond. Try again.'));
    }
  }
}

export function* refreshTokenPoller() {
  while (true) {
    const signedMessage = yield select((state: ApplicationRootState) => state.authentication.signedPermit);
    const apiToken = yield select((state: ApplicationRootState) => state.authentication.accessToken);

    const { signerAddress } = yield call(getBlockchainObjects);

    let delayDuration;
    let decodedToken;
    try {
      decodedToken = yield call(jwtDecode, apiToken);
    } catch (error) {
      const newToken = yield call(getAccessToken, signedMessage, signerAddress);
      decodedToken = yield call(jwtDecode, newToken);
    }

    delayDuration = (decodedToken.exp - Date.now() / 1000) * 0.9;
    // Only refresh the token when it is nearing expiry.
    if ((Date.now() / 1000) + (delayDuration + 1) > decodedToken.exp) {
      // console.log(`Token is expiring soon. Refreshing...`);
      yield call(getAccessToken, signedMessage, signerAddress);
      // console.log(`access token updated`);
    } else {
      // console.log(`token not refreshed, going to sleep for ${delayDuration}`);
      yield delay(delayDuration * 1000);
    }
  }
}

export function* loginFlow() {
  while (yield take(getType(authenticationActions.authenticate.request))) {

    try {
      const response = yield call(getPermit);
      const { signerAddress } = yield call(getBlockchainObjects);

      yield call(getAccessToken, response, signerAddress);
      // yield put(userProfileActions.getUserProfile.request());
      yield fork(refreshTokenPoller);
      yield call(forwardTo, '/dashboard'); // TODO: have this only redirect when on log in
    } catch (error) {
      yield put(authenticationActions.authenticate.failure(error.message));
      console.error(error);
    }
  }
}

export function* connectWallet() {
  try {
    const { signerAddress, provider } = yield call(getBlockchainObjects);
    if (provider) {
      yield put(authenticationActions.setEthAddress({ ethAddress: signerAddress }));
      const network = yield call([provider, provider.getNetwork]);
      yield put(authenticationActions.setNetworkId(network.chainId))
      yield put(authenticationActions.connectWallet.success());
    } else {
      yield put(authenticationActions.connectWallet.failure('Non-Ethereum browser detected. You should consider trying MetaMask!'));
    }
  } catch (error) {
    yield put(authenticationActions.connectWallet.failure(error.message));
  }
}

// Exported for testing purposes
export const addressChangeEventChannel = eventChannel(emit => {
  try {
    const { ethereum } = window as any;
    ethereum.on('accountsChanged', (accounts) => {
      emit(accounts);
    });
  }
  catch (e) {
    emit("Error")
  }
  return () => { };
});

export function* addressChangeListener() {
  while (true) {
    const newAddress = yield take(addressChangeEventChannel);
    localStorage.clear();
    yield put(authenticationActions.logOut());
    yield put(authenticationActions.setEthAddress({ ethAddress: newAddress[0] }));
    yield fork(connectWallet)
  }
}

export default function* rootAuthenticationSaga() {
  while (true) {
    // Start a task to unlock the wallet.
    const connectWalletTask = yield fork(connectWallet);

    // Wait till a response comes back a response on the wallet.
    const { success } = yield race({
      cancel: take(ActionTypes.CONNECT_WALLET_FAILURE),
      success: take(ActionTypes.CONNECT_WALLET_SUCCESS),
    });

    if (success) {
      // Cancel the task that we started
      yield cancel(connectWalletTask);

      // Start the addressChange listener
      yield fork(addressChangeListener);

      // Check store for existing signed message
      const signedMessage = yield select((state: ApplicationRootState) => state.authentication.signedPermit);

      let watcher;
      if (!signedMessage) {
        // Start the login listener
        watcher = yield fork(loginFlow);
      } else {
        // Start the refresh token listener
        watcher = yield fork(refreshTokenPoller);
      }

      // Wait till we receive a logout event
      yield take(ActionTypes.LOG_OUT);
      yield cancel(watcher);
    } else {
      yield delay(2000);
    }
  }
}
