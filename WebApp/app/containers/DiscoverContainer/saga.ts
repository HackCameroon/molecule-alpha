import { take, fork, cancel } from "@redux-saga/core/effects";
import { connectWallet as  connectWalletSaga} from "domain/authentication/saga";
import { connectWallet } from "domain/authentication/actions";

export default function* root() {
  const connectWalletTask = yield fork(connectWalletSaga);
  yield take(connectWallet.success)
  yield cancel(connectWalletTask);
  // Refresh balances
}
