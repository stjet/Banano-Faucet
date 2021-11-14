Hello! This is the code (under MIT License, so feel free to fork, I'd appreciate it if you credit me though) for the banano, nano, and xdai faucet at https://faucet.prussia.dev

Just forked this? Interested in making your own faucet? Follow the steps below

1. Get a seed and put as a env variable 'seed', change the faucet address variable in index.js to the seed's
2. Get a mongodb cluster (free) and put in the secret as env variable `dbpass`. Also change the mongodb connection string in database.js. And create hcaptcha account and change sitekey and add env variable `secret`
3. Change the frequency and payout amount (these are variables) in index.js
4. You probably want to change LOGO.png to your own
5. Install packages, run index.js. Congratulations, you have your very own banano and nano faucet

Also, you can also add env variable `privkey` for the xdai faucet.

If you want something more customized, or perhaps don't have enough programming experience to execute the instructions above, you can hire me. https://prussia.dev/to/discord