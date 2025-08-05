const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const tokens = JSON.parse(fs.readFileSync('./data/tokens.json', 'utf8'));
let balances = JSON.parse(fs.readFileSync('./data/balances.json', 'utf8'));

function getToken(contract) {
  return tokens.find(t => t.contract === contract);
}

app.post('/wallet/getaccount', (req, res) => {
  const addr = req.body.address;
  const assetBalances = balances[addr] || {};
  const tokenBalances = Object.entries(assetBalances).map(([contract, balance]) => ({
    tokenId: contract,
    balance
  }));
  res.json({
    address: addr,
    balance: "10000000",
    assetV2: [],
    tokenBalances
  });
});

app.post('/wallet/getassetissuebyid', (req, res) => {
  const contract = req.body.value;
  const token = getToken(contract);
  if (token) {
    res.json({
      name: Buffer.from(token.name).toString('hex'),
      abbreviation: Buffer.from(token.symbol).toString('hex'),
      precision: token.decimals,
      url: token.logo
    });
  } else {
    res.json({});
  }
});

app.post('/market/getassetprice', (req, res) => {
  const contract = req.body.contract_address;
  const token = getToken(contract);
  if (token) {
    res.json({ price: token.price, change24h: token.change24h });
  } else {
    res.json({ price: 0, change24h: 0 });
  }
});

app.post('/wallet/triggerconstantcontract', (req, res) => {
  res.json({ constant_result: ["0"] });
});

app.post('/wallet/getnowblock', (req, res) => {
  res.json({ blockID: "fakeblock", block_header: { raw_data: { number: Date.now() } } });
});

app.post('/wallet/createtransaction', (req, res) => {
  const { owner_address, to_address, amount, contract } = req.body;
  if (!balances[owner_address] || !balances[owner_address][contract]) return res.json({ error: 'No balance' });
  let num = parseInt(balances[owner_address][contract]);
  if (num < amount) return res.json({ error: 'Not enough' });
  balances[owner_address][contract] = (num - amount).toString();
  if (!balances[to_address]) balances[to_address] = {};
  balances[to_address][contract] = ((parseInt(balances[to_address][contract] || 0)) + amount).toString();
  fs.writeFileSync('./data/balances.json', JSON.stringify(balances, null, 2));
  res.json({ result: 'ok', txid: `FAKE_${Date.now()}` });
});

app.post('/admin/airdrop', (req, res) => {
  const { toList, contract, amount } = req.body;
  toList.forEach(addr => {
    if (!balances[addr]) balances[addr] = {};
    balances[addr][contract] = amount;
  });
  fs.writeFileSync('./data/balances.json', JSON.stringify(balances, null, 2));
  res.json({ success: true });
});

// 推荐
app.listen(process.env.PORT || 8090, () => {
  console.log("假TRON主网节点已启动");
});
