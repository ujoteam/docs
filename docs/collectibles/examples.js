import Web3 from "web3";
import RegistryContracts from "ujo-contracts-registry";
import OracleContracts from "ujo-contracts-oracle";
import HandlerContracts from "ujo-contracts-handlers";
import BadgeContracts from "ujo-contracts-badges";
import Truffle from "truffle-contract";
import ethUtil from "ethereumjs-util";
import moment from "moment";
import { RSAA } from "redux-api-middleware";

import {
  WEB3_INJECTED,
  WEB3_CREATED,
  CHANGED_METAMASK_CREDENTIALS,
  GOT_EXCHANGE_RATE,
  TRANSACTION_ATTEMPT,
  TRANSACTION_SUBMITTED,
  TRANSACTION_MINED,
  TRANSACTION_DENIED,
  TRANSACTION_FAILURE,
  PURCHASED_PATRONAGE_BADGE,
  GET_NUMBER_OF_PATRONAGE_BADGES,
  GET_PATRONAGE_BADGES_REQUEST,
  GET_PATRONAGE_BADGES_SUCCESS,
  GET_PATRONAGE_BADGES_FAILURE,
  CONFIRMED_PATRONAGE_BADGE,
  USER_ENABLED_WEB3,
  USER_REJECTED_WEB3,
  RESET_WEB3_CONFIG,
  REQUEST_WEB3_PERMISSION,
  POST_API_SIGNATURE_REQUEST,
  POST_API_SIGNATURE_SUCCESS,
  POST_API_SIGNATURE_FAILURE
} from "../../constants/actionTypes";
import { PATRONAGE_BADGE_PRICE } from "../../constants/web3";
import {
  WEB3_ENDPOINT,
  EXPECTED_INJECTED_WEB3_NETWORK_NUMBER,
  API_ENDPOINT
} from "../../constants/endpoints";
import {
  getAccounts,
  getNetwork,
  getBalance,
  getTxReceipt,
  signMessage
} from "./web3Promisified";
import {
  fetchBadgeData,
  checkPendingBadges,
  prepareBadgesForRedux,
  decodeTxData,
  findEventData,
  confirmBadges,
  boostGas
} from "./helpers";

let registry;
let handler;
let oracle;
let badges;
let patronageBadgesProxy;
let patronageBadgesFunctions;

const initializeContracts = () => {
  registry = Truffle(RegistryContracts.Registry);
  registry.setProvider(window.web3.currentProvider);

  handler = Truffle(HandlerContracts.ETHUSDHandler);
  handler.setProvider(window.web3.currentProvider);

  oracle = Truffle(OracleContracts.USDETHOracle);
  oracle.setProvider(window.web3.currentProvider);

  badges = Truffle(BadgeContracts.UjoAutoBadges);
  badges.setProvider(window.web3.currentProvider);

  patronageBadgesProxy = Truffle(BadgeContracts.UjoPatronageBadges);
  patronageBadgesFunctions = Truffle(
    BadgeContracts.UjoPatronageBadgesFunctions
  );
  patronageBadgesProxy.setProvider(window.web3.currentProvider);
  patronageBadgesFunctions.setProvider(window.web3.currentProvider);
};

/*
  ethereumAddress will either be an address or falsey
  if falsey, it means the user denied our request or doesnt have injected web3
*/
export const initializeWeb3 = (
  web3PrivacySupported,
  ethereumAddress
) => async dispatch => {
  // if a user is not web3 enabled, or denied permission to web3 circa EIP1102...
  if (window.web3 === undefined || (web3PrivacySupported && !ethereumAddress)) {
    window.web3 = new Web3(new Web3.providers.HttpProvider(WEB3_ENDPOINT));
    initializeContracts();
    dispatch({
      type: WEB3_CREATED,
      network: EXPECTED_INJECTED_WEB3_NETWORK_NUMBER
    });
  }
  // the user is either on a legacy dapp browser or gave us permission to their web3
  else {
    window.web3 = new Web3(window.web3.currentProvider);
    initializeContracts();
    const [[address], network] = await Promise.all([
      getAccounts(),
      getNetwork()
    ]);
    // TODO: revisit
    const balance = address ? await getBalance(address) : 0;
    // const balance = 0;

    const validNetwork = EXPECTED_INJECTED_WEB3_NETWORK_NUMBER === network;

    dispatch({
      type: WEB3_INJECTED,
      ethereumAddress: address || "",
      network,
      validNetwork,
      balance
    });
  }
};

export const enableWeb3 = ethereumAddress => dispatch => {
  ethereumAddress
    ? dispatch({ type: USER_ENABLED_WEB3, ethereumAddress })
    : dispatch({ type: USER_REJECTED_WEB3 });
};

export const requestWeb3 = () => dispatch =>
  dispatch({ type: REQUEST_WEB3_PERMISSION });

export const updateWeb3InRedux = (
  ethereumAddress,
  network,
  balance
) => dispatch => {
  const validNetwork = EXPECTED_INJECTED_WEB3_NETWORK_NUMBER === network;

  dispatch({
    type: CHANGED_METAMASK_CREDENTIALS,
    ethereumAddress,
    network,
    validNetwork,
    balance
  });
};

export const getExchangeRate = async () => {
  const oracleDeployed = await oracle.deployed();
  const exchangeRate = await oracleDeployed.getUintPrice.call();
  return exchangeRate.toString(10);
};

export const updateExchangeRateInRedux = exchangeRate => dispatch => {
  return dispatch({
    type: GOT_EXCHANGE_RATE,
    exchangeRate
  });
};

export const resetWeb3 = () => dispatch => {
  return dispatch({ type: RESET_WEB3_CONFIG });
};

const handleTxSubmit = (dispatch, txHash, callback) => {
  dispatch({ type: TRANSACTION_SUBMITTED, txHash });
  if (callback) callback(txHash);
};

const handleTxCompletion = (dispatch, txReceipt, callback) => {
  dispatch({ type: TRANSACTION_MINED, txReceipt });
  if (callback) callback(txReceipt);
};

const handleTxError = (
  dispatch,
  error,
  receipt,
  userDeniedTxCb,
  txFailedCb
) => {
  if (error.message.includes("User denied transaction signature")) {
    dispatch({ type: TRANSACTION_DENIED });
    // TODO: better handling of below
    dispatch({
      type: "NEW_BANNER_MESSAGE",
      message: "You must accept the transaction",
      version: "warning"
    });
    if (userDeniedTxCb) userDeniedTxCb();
  } else {
    dispatch({ type: TRANSACTION_FAILURE, message: error.message, receipt });
    dispatch({
      type: "NEW_BANNER_MESSAGE",
      message:
        "Something went wrong. Please reach out to us with any infomation as to why.",
      version: "warning"
    });
    if (txFailedCb) txFailedCb();
  }
};

// eslint-disable-next-line max-params
const payHandler = async (
  dispatch,
  sender,
  cid,
  beneficiaries,
  amounts,
  wei,
  successCb,
  failureCb
) => {
  dispatch({ type: TRANSACTION_ATTEMPT });

  const deployedHandler = await handler.deployed();
  const deployedOracle = await oracle.deployed();

  const gasRequired = await deployedHandler.pay.estimateGas(
    cid,
    deployedOracle.address, // which oracle to use for reference
    sender,
    beneficiaries,
    amounts,
    [], // contract notifiers [none in this case]
    { from: sender, value: wei }
  );

  const gas = boostGas(gasRequired);

  deployedHandler
    .pay(cid, deployedOracle.address, sender, beneficiaries, amounts, [], {
      from: sender,
      value: wei,
      gas
    })
    .on("transactionHash", txHash =>
      handleTxSubmit(dispatch, txHash, successCb)
    )
    .on("receipt", txReceipt => handleTxCompletion(dispatch, txReceipt))
    .on("error", (error, receipt) =>
      handleTxError(dispatch, error, receipt, failureCb, failureCb)
    ); // TODO: different error / denial callbacks
};

// eslint-disable-next-line max-params
export const tipArtist = (
  senderAddress,
  musicGroupCid,
  beneficiaries,
  splits,
  wei,
  successCb,
  failureCb
) => async dispatch => {
  // web3 doesn't work with Immutable
  const jsSplits = splits.toJS();
  const jsBeneficiaries = beneficiaries.toJS();

  let totalPaymentAllocated = window.web3.utils.toBN(0, 10);
  let totalAllocated = 0;
  const amounts = jsSplits.map(split => {
    // the last split should receive the remainder to completely match wei.
    // thus: it might sometimes be slightly higher or slightly lower based on rounding.
    if (totalAllocated === jsSplits.length - 1) {
      return wei.sub(totalPaymentAllocated).toString(10);
    }

    // divround == floor
    const paymentAllocation = wei
      .mul(window.web3.utils.toBN(split))
      .divRound(window.web3.utils.toBN("100"));
    totalPaymentAllocated = totalPaymentAllocated.add(paymentAllocation);
    totalAllocated += 1;
    return paymentAllocation.toString(10);
  });

  await payHandler(
    dispatch,
    senderAddress,
    musicGroupCid,
    jsBeneficiaries,
    amounts,
    wei,
    successCb,
    failureCb
  );
};

/* -------- RELEASE PURCHASES -------- */

export const buyRelease = (
  buyerAddress,
  releaseCid,
  beneficiaries,
  amounts,
  eth,
  successCb,
  failureCb
) => async dispatch => {
  let wei;
  if (eth) {
    wei = window.web3.utils.toWei(eth);
  }

  await payHandler(
    dispatch,
    buyerAddress,
    releaseCid,
    beneficiaries,
    amounts,
    wei,
    successCb,
    failureCb
  );
};

const getPatronageBadgesInstance = async () => {
  const deployedProxy = await patronageBadgesProxy.deployed();
  const patronageBadges = await patronageBadgesFunctions.at(
    deployedProxy.address
  );
  return patronageBadges;
};

/* -------- PATRONAGE BADGES -------- */
export const getBadgesByAddress = (
  walletAddress,
  personId
) => async dispatch => {
  dispatch({ type: GET_PATRONAGE_BADGES_REQUEST, personId });

  /*
    Event logs fired in Ethereum can be published with indexed
    paramaters, enabling efficient event log querying.
    When a badge gets purchased, the badge ID is stored in hex
    in a "LogBadgeMinted" event, which we use here to
    easily retrieve the users badges & associated badge numbers.
  */

  try {
    let confirmedBadgeData = [];
    const [ethNetwork, patronageBadgesInstance] = await Promise.all([
      getNetwork(),
      getPatronageBadgesInstance()
    ]);

    const badgesByAddress = await patronageBadgesInstance.getAllTokens.call(
      walletAddress
    );

    dispatch({
      type: GET_NUMBER_OF_PATRONAGE_BADGES,
      personId,
      numberOfBadges: badgesByAddress.length
    });

    // Turn the badgeIds into hex strings, so we can use them in the event filters
    const hexBadgesByAddress = badgesByAddress
      .map(ethUtil.intToHex)
      .map(hexString => window.web3.utils.padLeft(hexString, 64));

    if (hexBadgesByAddress.length) {
      // break the event querying up into smaller block chunks for optimization
      const BLOCK_INCREMENT = 5000;
      const startBlock = ethNetwork === "1" ? "6442621" : "3068896"; // start the search on the block with contract deployment tx
      // findEventData queries the blockchain in chunks of BLOCK_INCREMENT from startBlock to latest
      const eventData = await findEventData(
        hexBadgesByAddress,
        patronageBadgesInstance,
        BLOCK_INCREMENT,
        startBlock
      );
      // reformats the event data
      const decodedTxData = decodeTxData(eventData);
      // removes any confirmed badges from localStorage
      confirmedBadgeData = await confirmBadges(decodedTxData, walletAddress);
    }

    // given the nftCid and txHash, we attempt to remove the confirmed badge from LS (if its there)
    const pendingBadgeData = await checkPendingBadges(walletAddress);

    const data = prepareBadgesForRedux([
      ...confirmedBadgeData,
      ...pendingBadgeData
    ]);

    dispatch({ type: GET_PATRONAGE_BADGES_SUCCESS, data, personId });
  } catch (err) {
    dispatch({ type: GET_PATRONAGE_BADGES_FAILURE, err, personId });
  }
};

// eslint-disable-next-line max-params
export const buyBadge = (
  badgeBuyerAddress,
  nftCid,
  beneficiaries,
  splits,
  amount,
  successCb,
  failureCb
) => async dispatch => {
  dispatch({ type: TRANSACTION_ATTEMPT });

  // web3 doesn't work with Immutable
  const jsBeneficiaries = beneficiaries.toJS();
  const jsSplits = splits.toJS();

  try {
    // data === nftCid
    const patronageBadgesInstance = await getPatronageBadgesInstance();

    const gasRequired = await patronageBadgesInstance.mint.estimateGas(
      badgeBuyerAddress,
      nftCid,
      jsBeneficiaries,
      jsSplits,
      PATRONAGE_BADGE_PRICE,
      {
        from: badgeBuyerAddress,
        value: amount,
        to: patronageBadgesInstance.address
      }
    );

    const gas = boostGas(gasRequired);

    patronageBadgesInstance
      .mint(
        badgeBuyerAddress,
        nftCid,
        jsBeneficiaries,
        jsSplits,
        PATRONAGE_BADGE_PRICE,
        {
          from: badgeBuyerAddress,
          value: amount,
          to: patronageBadgesInstance.address,
          gas
        }
      )
      .on("transactionHash", txHash =>
        handleTxSubmit(dispatch, txHash, successCb)
      )
      .on("receipt", txReceipt => handleTxCompletion(dispatch, txReceipt))
      .on("error", (error, receipt) =>
        handleTxError(dispatch, error, receipt, failureCb, failureCb)
      ); // TODO: different error / denial callbacks
  } catch (err) {
    dispatch({ type: TRANSACTION_FAILURE, err });
  }
};

export const attemptToConfirmBadge = (
  badge,
  badgeBuyerId
) => async dispatch => {
  const badgeTxs = badge.get("txInfo").toJS();
  const { txHash } = badgeTxs[badgeTxs.length - 1]; // the last badge is always the pending one
  const txReceipt = await getTxReceipt(txHash);
  if (txReceipt) {
    const { timeMinted } = window.web3.eth.abi.decodeLog(
      [
        { indexed: true, name: "tokenId", type: "uint256" },
        { indexed: false, name: "nftcid", type: "string" },
        { indexed: false, name: "timeMinted", type: "uint256" },
        { indexed: false, name: "buyer", type: "address" },
        { indexed: false, name: "issuer", type: "address" }
      ],
      txReceipt.logs[0].data,
      txReceipt.logs[0].topics
    );
    const badgeDate = moment
      .unix(timeMinted)
      .utc()
      .format("MMMM Do, YYYY");
    const txInfo = { badgeDate, txHash };
    dispatch({ type: CONFIRMED_PATRONAGE_BADGE, badge, badgeBuyerId, txInfo });
    return true;
  }
  return false;
};

export const addBadgeToRedux = (
  nftCid,
  txHash,
  badgeBuyerId
) => async dispatch => {
  const badge = await fetchBadgeData(nftCid, "pending", txHash);
  dispatch({ type: PURCHASED_PATRONAGE_BADGE, badge, badgeBuyerId });
};

export const signMusicReleaseMetadata = async (
  musicReleaseCid,
  signerAddress
) => {
  const message = `
    You are registering a new MusicRelease with the ID ${musicReleaseCid}\n
    This will be associated with your ethereum address ${signerAddress}.\n
    Please sign to confirm
  `;
  const signature = await signMessage(signerAddress, message);
  return { signature, message };
};

export const postAPISignature = (
  ethereumAddress,
  message,
  signature
) => dispatch => {
  const signatureData = {
    message,
    ethereumAddress,
    signature
  };
  dispatch({
    [RSAA]: {
      endpoint: `${API_ENDPOINT}/signedmessages`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signatureData),
      types: [
        POST_API_SIGNATURE_REQUEST,
        POST_API_SIGNATURE_SUCCESS,
        POST_API_SIGNATURE_FAILURE
      ]
    }
  });
};
