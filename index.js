const express = require('express');
const axios = require('axios');
const nunjucks = require('nunjucks');

//const Database = require("@replit/database");

//const db = new Database();

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const banano = require('./banano.js');
const mongo = require('./database.js');

let db = mongo.getDb();
let collection;
//collection.find({}).forEach(console.dir)
db.then((db) => {collection = db.collection("collection"); 
});

nunjucks.configure('templates', { autoescape: true });

async function insert(addr,value) {
  await collection.insertOne({"address":addr,"value":value});
}

async function replace(addr,newvalue) {
  await collection.replaceOne({"address":addr}, {"address":addr,"value":newvalue});
}

async function find(addr) {
  return await collection.findOne({"address":addr});
}

const app = express();

app.use(express.static('files'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(cookieParser());

let ip_cache = {};
function clearCache() {
  ip_cache = {};
}
setInterval(clearCache, 145000000);

//If I am on break this is true. Reduces faucet payouts to 0.02
const on_break = false;
//If this is true, logs info
const logging = false;
//If this is true, no unopened accounts can claim
const no_unopened = false;

const faucet_addr = "ban_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps";

const blacklist = ["ban_3qyp5xjybqr1go8xb1847tr6e1ujjxdrc4fegt1rzhmcmbtntio385n35nju", "ban_1yozd3rq15fq9eazs91edxajz75yndyt5bpds1xspqfjoor9bdc1saqrph1w", "ban_1894qgm8jym5xohwkngsy5czixajk5apxsjowi83pz9g6zrfo1nxo4mmejm9", "ban_38jyaej59qs5x3zim7t4pw5dwixibkjw48tg1t3i9djyhtjf3au7c599bmg3", "ban_3a68aqticd6wup99zncicrbkuaonypzzkfmmn66bxexfmw1ckf3ewo3fmtm9"]

app.get('/', async function (req, res) {
  let errors = false;
  let address = false;
  let given = false;
  let amount = 0;
  //render template 
  return res.send(nunjucks.render('index.html', {errors: errors, address: address, given: given, amount: amount}));
})

app.post('/', async function (req, res) {
  let errors = false;
  let address = req.body['addr'];
  let given = false;
  let amount = (Math.floor(Math.random()*8)/100)+0.01;
  let current_bal = await banano.check_bal(faucet_addr);
  if (Number(current_bal) > 100) {
    amount = (Math.floor(Math.random()*12)/100)+0.03;
  }
  if (on_break) {
    amount = 0.02;
  }
  if (await banano.is_unopened(address)) {
    amount = 0.01;
  }
  let token = req.body['h-captcha-response'];
  let params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', process.env.secret);
  let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params)
  captcha_resp = captcha_resp.data;
  let dry = await banano.faucet_dry()

  let account_history = await banano.get_account_history(address);
  if (banano.address_related_to_blacklist(account_history, blacklist) || blacklist.includes(address)) {
    console.log(address)
    errors = "This address is blacklisted because it is cheating and farming faucets (or sent money to an address participating in cheating and farming). If you think this is a mistake message me (u/prussia_dev) on reddit. If you are a legitimate user impacted by this, please use a different address."
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break}));
  }

  if (await banano.is_unopened(address) && no_unopened) {
    errors = "Hello! Currently unopened accounts are not allowed to claim, because the faucet is under attack. We apologize to legitimate users."
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break}));
  }

  let ip = req.header('x-forwarded-for').slice(0,14);
  if (ip_cache[ip]) {
    ip_cache[ip] = ip_cache[ip]+1
    if (ip_cache[ip] > 3) {
      errors = "Too many claims from this IP"
      return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break}));
    }
  } else {
    ip_cache[ip] = 1
  }

  if (logging) {
    console.log(address)
    console.log(req.header('x-forwarded-for'))
  }

  if (captcha_resp['success'] && !dry) {
    //check cookie
    if (req.cookies['last_claim']){
      if (Number(req.cookies['last_claim'])+86400000 < Date.now()) {
        //let db_result = await db.get(address);
        let db_result = await find(address);
        if (db_result) {
          db_result = db_result['value'];
          if (Number(db_result)+86400000 < Date.now()) {
            //all clear, send bananos!
            send = await banano.send_banano(address, amount);
            if (send == false) {
              errors = "Invalid address"
            } else {
              res.cookie('last_claim', String(Date.now()));
              //await db.set(address,String(Date.now()));
              await replace(address,String(Date.now()));
              given = true;
            }
          } else {
            errors = "Last claim too soon"
          }
        } else {
          //all clear, send bananos!
          send = await banano.send_banano(address, amount);
          if (send == false) {
            errors = "Invalid address"
          } else {
            res.cookie('last_claim', String(Date.now()));
            //await db.set(address,String(Date.now()));
            await insert(address,String(Date.now()));
            given = true;
          }
        }
      } else {
        //add errors
        errors = "Last claim too soon"
      }
    } else {
      //check db 
      //let db_result = await db.get(address);
      let db_result = await find(address);
      if (db_result) {
        db_result = db_result['value'];
        if (Number(db_result)+86400000 < Date.now()) {
          //all clear, send bananos!
          send = await banano.send_banano(address, amount);
          if (send == false) {
            errors = "Invalid address"
          } else {
            res.cookie('last_claim', String(Date.now()));
            //await db.set(address,String(Date.now()));
            await replace(address,String(Date.now()));
            given = true;
          }
        } else {
          errors = "Last claim too soon"
        }
      } else {
        //all clear, send bananos!
        send = await banano.send_banano(address, amount);
        if (send == false) {
          errors = "Invalid address"
        } else {
          res.cookie('last_claim', String(Date.now()));
          //await db.set(address,String(Date.now()));
          await insert(address,String(Date.now()));
          given = true;
        }
      }
    }
  } else {
    errors = "captcha incorrect or faucet dry"
  }
  return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break}));
})

app.listen(8081, () => {
  banano.recieve_deposits();
  console.log(`App on`)
})