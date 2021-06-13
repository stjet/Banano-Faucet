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

//const blacklist = ["ban_3qyp5xjybqr1go8xb1847tr6e1ujjxdrc4fegt1rzhmcmbtntio385n35nju","ban_118s5dp14cxmwkr8tuwosqrgzduzzoqhsxws5cjxrm3trksmf7kte1b3qxmb","ban_17xxqwmidqa8dq9eet3txheapkj719b9xko6cxummothbpwtfo5q5e1iap3w","ban_377wt3dw9e7dayixoecjytf5ezniz6yoq5g1j41szbcqffn5ah5pehtatzye","ban_1i773cuq35ouc7w7ee96rctgqtmrgqwoqh5cznod8ddus4561ngoxntz9njw","ban_1oknxoyqq3iom9f5xbhyt6w6m86bhd638nzttms6fmj4z4cusyn18kp1x735","ban_17xxqwmidqa8dq9eet3txheapkj719b9xko6cxummothbpwtfo5q5e1iap3w"];

const blacklist = ["ban_3qyp5xjybqr1go8xb1847tr6e1ujjxdrc4fegt1rzhmcmbtntio385n35nju"]

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
  let address = false;
  let given = false;
  let amount = (Math.floor(Math.random()*8)/100)+0.01;
  let current_bal = await banano.check_bal("ban_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps");
  if (Number(current_bal) > 100) {
    amount = (Math.floor(Math.random()*12)/100)+0.03;
  }
  let token = req.body['h-captcha-response'];
  address = req.body['addr'];
  let params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', process.env.secret);
  let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params)
  captcha_resp = captcha_resp.data;
  let dry = await banano.faucet_dry()

  if (await banano.address_related_to_blacklist(address, blacklist) || blacklist.includes(address)) {
    errors = "This address is blacklisted because it is cheating and farming faucets. If you think this is a mistake message me (u/prussia_dev) on reddit."
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal)}));
  }

  let ip = req.header('x-forwarded-for').slice(0,14);
  if (ip_cache[ip]) {
    ip_cache[ip] = ip_cache[ip]+1
    if (ip_cache[ip] > 3) {
      errors = "Too many claims from this IP"
      return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal)}));
    }
  } else {
    ip_cache[ip] = 1
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
  return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal)}));
})

app.listen(8081, () => {
  banano.recieve_deposits();
  console.log(`App on`)
})