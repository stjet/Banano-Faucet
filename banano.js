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

module.exports = {
  send_banano: send_banano,
  faucet_dry: faucet_dry,
  check_bal: check_bal
}