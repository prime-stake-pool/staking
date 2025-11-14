const API_BASE = "https://cardano-wallet-backend.vercel.app/api/";

const messageEl = document.getElementById("message");
const walletButtonsDiv = document.getElementById("wallet-buttons");
const delegateSection = document.getElementById("delegate-section");

const SUPPORTED_WALLETS = ["nami", "eternl", "yoroi", "lace"];
let selectedWallet = null;
let walletApi = null;
let bech32Address = null;

const sleep = ms => new Promise(res => setTimeout(res, ms));

// Load Cardano Serialization Library (CSL)
window.addEventListener("load", async () => {
  try {
    // Dynamically import the Cardano Serialization Library (CSL)
    const CardanoSerialization = await import("/libs/cardano_serialization_lib.min.js");
    
    // Ensure the CSL is correctly loaded
    if (!CardanoSerialization) {
      throw new Error("Cardano Serialization Library (CSL) not loaded properly.");
    }
    // Attach CSL to the global window object for accessibility
    window.Cardano = CardanoSerialization;
    
    console.log("✅ CSL Loaded:", window.Cardano);
    detectWallets();
  } catch (error) {
    console.error("❌ CSL NOT LOADED!", error);
    messageEl.textContent = "⚠️ Serialization library not loaded!";
  }
});

// Detect connected wallets
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

// Render buttons to connect supported wallets
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

// Connect to a wallet
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

// Show the "Delegate to PSP Pool" button after wallet is connected
function showDelegateButton() {
  delegateSection.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "delegate-btn";
  btn.textContent = "Delegate to PSP Pool";
  btn.onclick = submitDelegation;
  delegateSection.appendChild(btn);
}

// Submit delegation request to the backend API
async function submitDelegation() {
  try {
    messageEl.textContent = "⏳ Preparing delegation...";

    // Fetch UTXOs for the user's address
    const utxosRes = await fetch(`${API_BASE}utxos?address=${bech32Address}`);
    const utxos = await utxosRes.json();

    // Fetch the current epoch parameters
    const paramsRes = await fetch(`${API_BASE}epoch-params`);
    const params = await paramsRes.json();

    // Prepare the delegation body
    const body = {
      address: bech32Address,
      poolId: "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy",
    };

    // Submit the delegation request
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
