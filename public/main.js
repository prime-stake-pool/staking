const messageEl = document.getElementById("message");
const walletButtonsDiv = document.getElementById("wallet-buttons");
const delegateSection = document.getElementById("delegate-section");

const SUPPORTED_WALLETS = ["nami", "eternl", "yoroi", "lace"];
let walletApi = null;
let bech32Address = null;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Wait for CSL before loading wallets
window.addEventListener("csl-loaded", async () => {
  messageEl.textContent = "Detecting wallets...";
  detectWallets();
});

// Detect wallets (Nami, Eternl, Yoroi, Lace)
async function detectWallets() {
  let tries = 0;
  while ((!window.cardano || Object.keys(window.cardano).length === 0) && tries < 20) {
    await sleep(300);
    tries++;
  }

  if (!window.cardano) {
    messageEl.textContent = "⚠️ No Cardano wallets detected.";
    return;
  }

  renderWalletButtons();
}

// Render wallet buttons dynamically
function renderWalletButtons() {
  walletButtonsDiv.innerHTML = "";

  SUPPORTED_WALLETS.forEach((key) => {
    const wallet = window.cardano[key];
    if (wallet) {
      const btn = document.createElement("button");
      btn.textContent = `Connect ${wallet.name || key}`;
      btn.onclick = () => connectWallet(key);
      walletButtonsDiv.appendChild(btn);
    }
  });

  if (walletButtonsDiv.innerHTML.trim() !== "") {
    messageEl.textContent = "💡 Select a wallet to connect:";
  } else {
    messageEl.textContent = "⚠️ No supported wallets found.";
  }
}

// Connect wallet
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

    messageEl.textContent = `✅ Connected: ${bech32Address.slice(0, 18)}...`;

    showDelegateButton();
  } catch (err) {
    console.error(err);
    messageEl.textContent = `❌ Wallet connection failed: ${err.message}`;
  }
}

// Show delegation button
function showDelegateButton() {
  delegateSection.innerHTML = "";

  const btn = document.createElement("button");
  btn.className = "delegate-btn";
  btn.textContent = "Delegate to PSP Pool";
  btn.onclick = submitDelegation;

  delegateSection.appendChild(btn);
}

// Placeholder delegation logic
async function submitDelegation() {
  messageEl.textContent = "⏳ Building delegation transaction...";

  // You can paste full delegation builder here later
  messageEl.textContent =
    "⚠️ Delegation transaction building is not implemented yet.";
}
