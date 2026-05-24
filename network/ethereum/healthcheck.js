fetch("http://localhost:8545", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_blockNumber",
    params: [],
    id: 1,
  }),
})
  .then((r) => r.json())
  .then((j) => {
    if (!j.result) process.exit(1);
  })
  .catch(() => process.exit(1));
