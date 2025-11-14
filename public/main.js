const messageEl = document.getElementById("message");
const walletButtonsDiv = document.getElementById("wallet-buttons");
const delegateSection = document.getElementById("delegate-section");

const SUPPORTED_WALLETS = ["nami", "eternl", "yoroi", "lace"];
let walletApi = null;
let bech32Address = null;

// Sleep utility
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Detect wallets
async function detectWallets() {
  messageEl.textContent = "🔍 Detecting wallets...";

  let tries = 0;
  while (tries < 20) {
    if (window.cardano && Object.keys(window.cardano).length > 0) break;
    await sleep(300);
    tries++;
  }

  if (!window.cardano) {
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

// Connect to wallet
async function connectWallet(walletName) {
  try {
    messageEl.textContent = `🔌 Connecting to ${walletName}...`;

    const wallet = window.cardano[walletName];
    walletApi = await wallet.enable();

    const usedAddresses = await walletApi.getUsedAddresses();
    const addrHex = usedAddresses[0];

    const addrBytes = window.Cardano.Address.from_bytes(
      Buffer.from(addrHex, "hex")
    );
    bech32Address = addrBytes.to_bech32();

    messageEl.textContent = `✅ Connected: ${bech32Address.slice(0, 15)}...`;

    showDelegateButton();

  } catch (err) {
    console.error(err);
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

// Placeholder for delegation logic
async function submitDelegation() {
  messageEl.textContent = "⏳ Building delegation...";

  // TODO: Fill in real-building logic later

  messageEl.textContent = "⚠️ Delegation logic not implemented yet.";
}

// Init after CSL is ready
window.addEventListener("load", async () => {
  // Wait until CSL WASM is fully initialized
  let tries = 0;
  while (!window.Cardano && tries < 20) {
    await sleep(200);
    tries++;
  }

  if (!window.Cardano) {
    messageEl.textContent = "❌ CSL not loaded.";
    return;
  }

  detectWallets();
});
