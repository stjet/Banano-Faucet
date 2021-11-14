const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider('https://rpc.xdaichain.com');
const signer = provider.getSigner();

let wallet = new ethers.Wallet(process.env.privkey);
wallet = wallet.connect(provider);

async function send_xdai(addr, amount) {
  let transaction = {
    to: addr,
    value: ethers.utils.parseEther(amount),
  };
  try {
    wallet.sendTransaction(transaction)
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

async function get_bal(addr) {
  return ethers.utils.formatEther(await provider.getBalance(addr));
}

async function faucet_dry(addr) {
  if (Number(await get_bal(addr)) > 0.06) {
    return false;
  }
  return true;
}

module.exports = {
  faucet_dry: faucet_dry,
  get_bal: get_bal,
  send_xdai: send_xdai
}