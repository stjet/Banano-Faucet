const bananojs = require('nanojs');
bananojs.setBananodeApiUrl('https://proxy.nanos.cc/proxy');

async function send_nano(addr, amount) {
  try {
    await bananojs.sendNanoWithdrawalFromSeed(process.env.seed, 0, addr, amount);
    return true;
  } catch (e) {
    return false;
  }
}

async function get_account_history(addr) {
  return await bananojs.getAccountHistory(addr, -1);
}

async function check_bal(addr) {
  let raw_bal = await bananojs.getAccountBalanceRaw(addr);
  let bal_parts = await bananojs.getNanoPartsFromRaw(raw_bal);
  return bal_parts
}

async function faucet_dry() {
  let bal = await check_bal("nano_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps");
  if (Number(bal.nanoshi) < 200) {
    return true;
  }
  return false;
}

function address_related_to_blacklist(account_history, blacklisted_addresses) {
  if (account_history.history) {
    for (let i=0; i < account_history.history.length; i++) {
      if (account_history.history[i].type == "send" && blacklisted_addresses.includes(account_history.history[i].account)) {
        return true
      }
    }
  }
  return false
}

async function is_unopened(address) {
  let account_history = await bananojs.getAccountHistory(address, -1);
  if (account_history.history == '') {
    return true
  }
  return false
}
 
async function recieve_deposits() {
  let rep = await bananojs.getAccountInfo(await bananojs.getNanoAccountFromSeed(process.env.seed, 0), true);
  rep = rep.representative;
  await bananojs.receiveNanoDepositsForSeed(process.env.seed, 0, rep);
}

module.exports = {
  send_nano: send_nano,
  faucet_dry: faucet_dry,
  check_bal: check_bal,
  recieve_deposits: recieve_deposits,
  address_related_to_blacklist: address_related_to_blacklist,
  is_unopened: is_unopened,
  get_account_history: get_account_history
}