const messageEl = document.getElementById("message");
const walletButtonsDiv = document.getElementById("wallet-buttons");
const delegateSection = document.getElementById("delegate-section");

const SUPPORTED_WALLETS = ["nami", "eternl", "yoroi", "lace"];
let selectedWallet = null;
let walletApi = null;
let bech32Address = null;

// Paths to CSL JS/WASM
const cardanoJsPath = "/libs/cardano_serialization_lib.min.js";
const wasmPath = "/libs/cardano_serialization_lib_bg.wasm";

// Utility to load JS dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.type = "module";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Utility to load WASM dynamically
async function loadWasm(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch WASM at ${path}`);
  const bytes = await response.arrayBuffer();
  return bytes; // You can pass bytes to CSL if needed
}

// Load CSL if not already present
async function loadCardanoSerializationLib() {
  try {
    // Load the JavaScript file first
    await loadScript(cardanoJsPath);
    console.log("✅ CSL JavaScript loaded");

    // Load the WebAssembly file
    await loadWasm(wasmPath);
    console.log("✅ CSL WebAssembly loaded");

  } catch (err) {
    console.error("❌ CSL failed to load:", err);
    messageEl.textContent = "⚠️ Serialization library not loaded!";
    return false;
  }
  return true;
}

// Detect and connect supported wallets
async function detectWallets() {
  messageEl.textContent = "🔍 Detecting wallets...";

  let attempts = 0;
  while (attempts < 20) {
    if (window.cardano && Object.keys(window.cardano).length > 0) {
      console.log("Wallets detected:", window.cardano);
      break;
    }
    await sleep(300);
    attempts++;
  }

  if (!window.cardano || Object.keys(window.cardano).length === 0) {
    messageEl.textContent = "⚠️ No Cardano wallets detected.";
    return;
  }

  renderWalletButtons();
}

// Render wallet connect buttons
function renderWalletButtons() {
  walletButtonsDiv.innerHTML = "";

  SUPPORTED_WALLETS.forEach(name => {
    const wallet = window.cardano[name];
    if (wallet) {
      const btn = document.createElement("button");
      btn.textContent = `Connect ${wallet.name || name}`;
      btn.onclick = () => connectWallet(name);
      walletButtonsDiv.appendChild(btn);
    }
  });

  messageEl.textContent = walletButtonsDiv.innerHTML
    ? "💡 Select your Cardano wallet to connect:"
    : "⚠️ No supported wallets found.";
}

// Connect to selected wallet
async function connectWallet(walletName) {
  try {
    messageEl.textContent = `🔌 Connecting to ${walletName}...`;

    const wallet = window.cardano[walletName];
    if (!wallet) throw new Error(`${walletName} not found`);

    walletApi = await wallet.enable();
    selectedWallet = walletName;

    const usedAddresses = await walletApi.getUsedAddresses();
    if (!usedAddresses || usedAddresses.length === 0)
      throw new Error("No used addresses found");

    const addrHex = usedAddresses[0];
    const addrBytes = window.Cardano.Address.from_bytes(Buffer.from(addrHex, "hex"));
    bech32Address = addrBytes.to_bech32();

    messageEl.textContent = `✅ Connected: ${bech32Address.substring(0, 15)}...`;

    showDelegateButton();
  } catch (err) {
    console.error("Wallet connection error:", err);
    messageEl.textContent = `❌ Wallet connection failed: ${err.message}`;
  }
}

// Show delegate button
function showDelegateButton() {
  delegateSection.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "delegate-btn";
  btn.textContent = "Delegate to PSP Pool";
  btn.onclick = submitDelegation;
  delegateSection.appendChild(btn);
}

// Submit delegation transaction
async function submitDelegation() {
  try {
    messageEl.textContent = "⏳ Preparing delegation...";

    const utxosRes = await fetch(`${API_BASE}utxos?address=${bech32Address}`);
    const utxos = await utxosRes.json();

    const paramsRes = await fetch(`${API_BASE}epoch-params`);
    const params = await paramsRes.json();

    const body = {
      address: bech32Address,
      poolId: "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy",
    };

    const submitRes = await fetch(`${API_BASE}submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await submitRes.json();
    if (!submitRes.ok) throw new Error(result.error);

    messageEl.textContent = `🎉 Delegation submitted! TxHash: ${result.txHash}`;
  } catch (err) {
    console.error("Delegation error:", err);
    messageEl.textContent = `❌ Delegation failed: ${err.message}`;
  }
}

// Sleep utility
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Initialize application
window.addEventListener("load", async () => {
  if (!window.Cardano) {
    const success = await loadCardanoSerializationLib();
    if (!success) return;
  }

  console.log("✅ CSL Loaded:", window.Cardano);
  detectWallets();
});
