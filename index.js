const swig = require('swig');
const express = require('express');
const axios = require('axios')

const Database = require("@replit/database")

const db = new Database()

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')

const banano = require('./banano.js')

const app = express();

app.use(express.static('files'))

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(cookieParser());

app.get('/', async function (req, res) {
  let errors = false;
  let address = false;
  let given = false;
  let amount = 0;
  //render template 
  return res.send(swig.renderFile("./templates/index.html", {errors: errors, address: address, given: given, amount: amount}));
})

app.post('/', async function (req, res) {
  let errors = false;
  let address = false;
  let given = false;
  let amount = (Math.floor(Math.random()*8)/100)+0.02;
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
  if (captcha_resp['success'] && !dry) {
    //check cookie
    if (req.cookies['last_claim']){
      if (Number(req.cookies['last_claim'])+86400000 < Date.now()) {
        let db_result = await db.get(address);
        if (db_result) {
          if (Number(db_result)+86400000 < Date.now()) {
            //all clear, send bananos!
            send = await banano.send_banano(address, amount);
            if (send == false) {
              errors = "Invalid address"
            } else {
              res.cookie('last_claim', String(Date.now()));
              await db.set(address,String(Date.now()));
              given = true;
            }
          } else {
            errors = "Last claim too soon"
          }
        } else {
          await db.set(address,String(Date.now()));
          //all clear, send bananos!
          send = await banano.send_banano(address, amount);
          if (send == false) {
            errors = "Invalid address"
          } else {
            res.cookie('last_claim', String(Date.now()));
            await db.set(address,String(Date.now()));
            given = true;
          }
        }
      } else {
        //add errors
        errors = "Last claim too soon"
      }
    } else {
      //check db 
      let db_result = await db.get(address);
      if (db_result) {
        if (Number(db_result)+86400000 < Date.now()) {
          //all clear, send bananos!
          send = await banano.send_banano(address, amount);
          if (send == false) {
            errors = "Invalid address"
          } else {
            res.cookie('last_claim', String(Date.now()));
            await db.set(address,String(Date.now()));
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
          await db.set(address,String(Date.now()));
          given = true;
        }
      }
    }
  } else {
    errors = "captcha incorrect or faucet dry"
  }
  return res.send(swig.renderFile("./templates/index.html", {errors: errors, address: address, given: given, amount: amount}));
})

app.get('/game', function (req, res) {
  return res.send(swig.renderFile("./templates/game.html"));
})

app.listen(8081, () => {
  console.log(`App on`)
})