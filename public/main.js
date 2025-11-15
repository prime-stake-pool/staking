console.log("main.js loaded");

// Wait for CSL WASM to finish loading
window.addEventListener("csl-loaded", () => {
  console.log("CSL Ready");
  initApp();
});

function initApp() {
  // Detect wallets
  const wallets = detectWallets();

  // Example: add button handler
  document.getElementById("connectWallet").onclick = async () => {
    if (wallets.length === 0) {
      alert("No Cardano wallet detected.");
      return;
    }

    const walletName = wallets[0];
    const api = await window.cardano[walletName].enable();

    console.log(`Connected to ${walletName}`, api);

    // Example: get network
    const networkId = await api.getNetworkId();
    console.log("Network:", networkId);
  };
}

function detectWallets() {
  const w = window.cardano;
  if (!w) return [];

  const available = [];

  const knownWallets = ["nami", "eternl", "flint", "lace", "gero", "typhon"];

  for (const name of knownWallets) {
    if (w[name]) available.push(name);
  }

  console.log("Detected wallets:", available);
  return available;
}

