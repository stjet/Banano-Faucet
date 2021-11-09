const bananojs = require('bananojs');
bananojs.setBananodeApiUrl('https://kaliumapi.appditto.com/api');

async function send_banano(addr, amount) {
  try {
    await bananojs.sendBananoWithdrawalFromSeed(process.env.seed, 0, addr, amount);
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
  let bal_parts = await bananojs.getBananoPartsFromRaw(raw_bal);
  return bal_parts.banano
}

async function faucet_dry() {
  let bal = await check_bal("ban_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps");
  if (Number(bal) < 1) {
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
 
async function receive_deposits() {
  let rep = await bananojs.getAccountInfo(await bananojs.getBananoAccountFromSeed(process.env.seed, 0), true);
  rep = rep.representative;
  if (!rep) {
    //set self as rep if no other set rep
    await bananojs.receiveBananoDepositsForSeed(process.env.seed, 0, await bananojs.getBananoAccountFromSeed(process.env.seed, 0));
    return
  }
  await bananojs.receiveBananoDepositsForSeed(process.env.seed, 0, rep);
}

async function is_valid(address) {
  return await bananojs.getBananoAccountValidationInfo(address).valid
}

module.exports = {
  send_banano: send_banano,
  faucet_dry: faucet_dry,
  check_bal: check_bal,
  receive_deposits: receive_deposits,
  address_related_to_blacklist: address_related_to_blacklist,
  is_unopened: is_unopened,
  get_account_history: get_account_history,
  is_valid: is_valid
}