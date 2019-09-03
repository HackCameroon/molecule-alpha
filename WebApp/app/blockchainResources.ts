import { Web3Provider, JsonRpcSigner } from "ethers/providers";
import { ethers } from "ethers";

export interface BlockchainResources {
  approvedNetwork: boolean,
  networkId: number,
  daiAddress: string,
  marketRegistryAddress: string,
  marketFactoryAddress: string,
  signer: JsonRpcSigner,
  provider: Web3Provider,
  signerAddress: string,
  ethereum: any,
  isStatus: boolean,
  isToshi: boolean,
  isMetaMask: boolean,
  isCipher: boolean,
  signedMsgRegex: RegExp
}

export let blockchainResources: BlockchainResources = {
  approvedNetwork: false,
  networkId: 0,
  daiAddress: "0x",
  marketRegistryAddress: "0x",
  marketFactoryAddress: "0x",
  // @ts-ignore
  signer: null,
  signerAddress: "",
  isCipher: false,
  isMetaMask: false,
  isStatus: false,
  isToshi: false,
  signedMsgRegex: /0x[A-Fa-f0-9]+/
};

async function fetchFromWindow() {
  const { web3 } = window as any;
  blockchainResources.provider = await new ethers.providers.Web3Provider(web3.currentProvider);
  // @ts-ignore
  await blockchainResources.provider.ready;
  // const signer = await provider.getSigner();
  const signer = await blockchainResources.provider.getSigner();
  blockchainResources.signer = signer;
  blockchainResources.signerAddress = await signer.getAddress();
}

export async function initBlockchainResources() {
  const { web3, ethereum } = window as any;

  try {

    blockchainResources.isToshi = !!web3.currentProvider.isToshi;
    blockchainResources.isCipher = !!web3.currentProvider.isCipher;
    blockchainResources.isMetaMask = !!web3.currentProvider.isMetaMask;
    let isStatus = false;

    let accountArray: string[] | any = [];
    if (blockchainResources.isMetaMask) {
      accountArray = await ethereum.send('eth_requestAccounts');
      if (accountArray.code && accountArray.code == 4001) {
        throw ("Connection rejected");
      }
    } else if (blockchainResources.isToshi) {
      // Unlocked already
    } else if (blockchainResources.isCipher) {

    } else {
      if (ethereum) {
        blockchainResources.isStatus = !!ethereum.isStatus;
        if (isStatus) {
          await ethereum.enable();
        }
      }
    }
    
    blockchainResources.provider = await new ethers.providers.Web3Provider(web3.currentProvider);
    // @ts-ignore
    await blockchainResources.provider.ready;
    blockchainResources.signer = await blockchainResources.provider.getSigner();
    blockchainResources.signerAddress = await blockchainResources.signer.getAddress();

    const chainId = (await blockchainResources.provider.getNetwork()).chainId;
    blockchainResources.networkId = chainId;

    blockchainResources.marketRegistryAddress = `${process.env.MARKET_REGISTRY_ADDRESS}`;
    blockchainResources.marketFactoryAddress = `${process.env.MARKET_FACTORY_ADDRESS}`;

    if (chainId == 1) {
      blockchainResources.daiAddress = `${process.env.MAINNET_DAI_ADDRESS}`;
      blockchainResources.approvedNetwork = true;
    } else if (chainId == 5) {
      blockchainResources.daiAddress = `${process.env.GOERLI_DAI_ADDRESS}`;
      blockchainResources.approvedNetwork = true;
    } else if (chainId == 4) {
      blockchainResources.daiAddress = `${process.env.RINKEBY_DAI_ADDRESS}`;
      blockchainResources.approvedNetwork = true;
    } else if (chainId == 42) {
      blockchainResources.daiAddress = `${process.env.KOVAN_DAI_ADDRESS}`;
      blockchainResources.approvedNetwork = true;
    } else if (chainId == 3) {
      blockchainResources.daiAddress = `${process.env.ROPSTEN_DAI_ADDRESS}`;
      blockchainResources.approvedNetwork = true;
    } else if (chainId == Number(process.env.LOCAL_CHAIN_ID)) {
      blockchainResources.daiAddress = `${process.env.LOCAL_DAI_ADDRESS}`;
      blockchainResources.approvedNetwork = true;
    } else {
      throw "Invalid network"
    }
  }
  catch (e) {
    throw e;
  }
}

export async function resetBlockchainObjects() {
  blockchainResources = {
    approvedNetwork: false,
    networkId: 0,
    daiAddress: "0x",
    // @ts-ignore
    signer: undefined,
  };
}

export async function signMessage(message: string) {
  try {
    const data = ethers.utils.toUtf8Bytes(message);
    const signer = await blockchainResources.provider.getSigner();
    const addr = await signer.getAddress();
    const sig = await blockchainResources.provider.send('personal_sign', [ethers.utils.hexlify(data), addr.toLowerCase()]);
    return sig;
  }
  catch (e) {
    throw e;
  }
}

export async function verifySignature(message: string, signature: string) {
  try {
    const result = await ethers.utils.verifyMessage(message, signature);
    return result;
  }
  catch (e) {
    throw e;
  }
}

export async function getBlockchainObjects(): Promise<BlockchainResources> {
  try {
    if (blockchainResources.daiAddress == "0x") {
      await initBlockchainResources();
    } else {
      await fetchFromWindow();
    }
    return blockchainResources;
  }
  catch (e) {
    throw e;
  }
}

export async function getGasPrice() {
  let priceData = await (await fetch("https://ethgasstation.info/json/ethgasAPI.json")).json();
  return ethers.utils.parseUnits(`${(priceData.average / 10) + 1.5}`, 'gwei'); // This adds 1 Gwei to the average for a safe fast action
}
