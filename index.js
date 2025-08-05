const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const TOKENS_PATH = path.join(__dirname, 'data', 'tokens.json');
const BALANCES_PATH = path.join(__dirname, 'data', 'balances.json');

// 加载假币信息
function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')); }
  catch { return []; }
}

// 加载余额
function loadBalances() {
  try { return JSON.parse(fs.readFileSync(BALANCES_PATH, 'utf8')); }
  catch { return {}; }
}

// 保存余额
function saveBalances(balances) {
  fs.writeFileSync(BALANCES_PATH, JSON.stringify(balances, null, 2), 'utf8');
}

// ---- 仿真官方节点API ----

// 获取当前块高等（钱包健康检查）
app.post('/wallet/getnowblock', (req, res) => {
  res.json({
    block_header: {
      raw_data: {
        number: Math.floor(Date.now() / 3000),
        timestamp: Date.now(),
      },
      witness_signature: "FAKE_SIGNATURE"
    }
  });
});

// 获取账户余额/资产
app.post('/wallet/getaccount', (req, res) => {
  const address = req.body.address || '';
  const balances = loadBalances();
  const tokens = loadTokens();

  let assets = [];
  let balance = 0;
  if (balances[address]) {
    for (let token of tokens) {
      if (balances[address][token.tokenId]) {
        assets.push({ key: token.tokenId, value: balances[address][token.tokenId] });
      }
    }
    // 可伪造主币余额（TRX）
    balance = 1000000000;
  }
  res.json({
    address,
    balance,
    assetV2: assets
  });
});

// 合约调用（显示合约余额/USDT等）
app.post('/wallet/triggerconstantcontract', (req, res) => {
  // 提取请求参数
  let address = '';
  try {
    const params = JSON.parse(req.body.parameter);
    address = params._owner || req.body.owner_address;
  } catch (e) {
    address = req.body.owner_address;
  }
  const contract = req.body.contract_address;
  const balances = loadBalances();

  let value = (balances[address] && balances[address][contract]) ? balances[address][contract] : 0;
  res.json({
    constant_result: [value.toString(16)] // 必须为16进制字符串
  });
});

// ---- 法币估值、logo、代币信息API ----

// 兼容TP/OKX等钱包获取token详情
app.get('/tokens/:id', (req, res) => {
  const tokens = loadTokens();
  let token = tokens.find(t => t.tokenId === req.params.id);
  if (token) {
    res.json(token);
  } else {
    res.status(404).json({ error: 'Token not found' });
  }
});

// ---- 批量空投/假转账（可用curl或postman调） ----
app.post('/admin/airdrop', (req, res) => {
  // 参数：toList=[地址列表], contract=合约, amount=数量
  const { toList, contract, amount } = req.body;
  if (!toList || !contract || !amount) {
    return res.json({ code: 1, msg: '参数错误' });
  }
  const balances = loadBalances();
  for (let addr of toList) {
    if (!balances[addr]) balances[addr] = {};
    balances[addr][contract] = (balances[addr][contract] || 0) + parseInt(amount);
  }
  saveBalances(balances);
  res.json({ code: 0, msg: '空投成功', toList });
});

// ---- 必须监听 process.env.PORT ----
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Fake TRON node running on port ${PORT}`);
});
