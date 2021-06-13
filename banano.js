const bananojs = require('@bananocoin/bananojs');
bananojs.setBananodeApiUrl('https://kaliumapi.appditto.com/api');

async function send_banano(addr, amount) {
  try {
    await bananojs.sendBananoWithdrawalFromSeed(process.env.seed, 0, addr, amount);
    return true;
  } catch (e) {
    return false;
  }
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

async function address_related_to_blacklist(address, blacklisted_addresses) {
  let account_history = await bananojs.getAccountHistory(address, -1);
  for (let i=0; i < account_history.history.length; i++) {
    if (account_history.history[i].type == "send" && blacklisted_addresses.includes(account_history.history[i].account)) {
      return true
    }
  }
  return false
}
 
async function recieve_deposits() {
  await bananojs.receiveBananoDepositsForSeed(process.env.seed, 0, bananojs.getBananoAccountFromSeed(process.env.seed, 0));
}

module.exports = {
  send_banano: send_banano,
  faucet_dry: faucet_dry,
  check_bal: check_bal,
  recieve_deposits: recieve_deposits,
  address_related_to_blacklist: address_related_to_blacklist
}