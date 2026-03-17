// Configuration
const API_BASE_URL = "http://127.0.0.1:5000";
let linkToken = null;
let accessToken = null;
let handler = null;

// Initialize Plaid Link when page loads
document.addEventListener("DOMContentLoaded", () => {
    createLinkToken();
});

/**
 * Create a Plaid Link token
 */
async function createLinkToken() {
    try {
        showStatus("Loading...", "info");
        const response = await fetch(`${API_BASE_URL}/api/link-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        
        if (!response.ok) {
            throw new Error("Failed to create link token");
        }

        const data = await response.json();
        linkToken = data.link_token;

        showStatus("Ready to connect bank account", "success");
        console.log("Link token created successfully");
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
        console.error("Error creating link token:", error);
    }
}

/**
 * Initiate Plaid Link flow
 */
function initiatePlaidLink() {
    if (!linkToken) {
        showStatus("Link token not ready. Please refresh the page.", "error");
        return;
    }

    handler = Plaid.create({
        token: linkToken,
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
        onEvent: handlePlaidEvent,
    });

    handler.open();
}

/**
 * Handle successful Plaid Link completion
 */
async function handlePlaidSuccess(publicToken, metadata) {
    try {
        showStatus("Exchanging token...", "info");

        const response = await fetch(`${API_BASE_URL}/api/exchange-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                public_token: publicToken,
                user_id: "user-id",
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to exchange token");
        }

        const data = await response.json();
        accessToken = data.access_token;

        showStatus(
            `✓ Bank account connected! (Item: ${data.item_id})`,
            "success"
        );

        // Enable transactions button
        document.getElementById("transactionsBtn").disabled = false;

        updateDebugInfo({
            status: "Connected",
            publicToken: publicToken,
            itemId: data.item_id,
            institution: metadata.institution?.name,
        });

        console.log("Token exchanged successfully:", data);
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
        console.error("Error exchanging token:", error);
    }
}

/**
 * Handle Plaid Link exit
 */
function handlePlaidExit(err, metadata) {
    if (err) {
        console.error("Plaid Link exited with error:", err);
        showStatus(`Error: ${err.message}`, "error");
    } else {
        console.log("Plaid Link closed");
    }
}

/**
 * Handle Plaid Link events
 */
function handlePlaidEvent(eventName, metadata) {
    console.log(`Plaid event: ${eventName}`, metadata);
}

/**
 * Fetch transactions from the backend
 */
async function fetchTransactions() {
    if (!accessToken) {
        showStatus("Please connect your bank account first", "error");
        return;
    }

    try {
        document.getElementById("transactionsBtn").disabled = true;
        showStatus(
            "Fetching transactions... " +
                '<span class="spinner"></span>',
            "info"
        );

        const response = await fetch(`${API_BASE_URL}/api/transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                access_token: accessToken,
                user_id: "user-id",
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch transactions");
        }

        const data = await response.json();

        if (data.success) {
            displayTransactions(data.transactions);
            showStatus(
                `✓ Loaded ${data.transactions.length} of ${data.total_transactions} transactions`,
                "success"
            );
            updateDebugInfo({
                transactionsFetched: data.transactions.length,
                totalTransactions: data.total_transactions,
            });
        } else {
            throw new Error(data.error);
        }

        console.log("Transactions fetched:", data);
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
        console.error("Error fetching transactions:", error);
    } finally {
        document.getElementById("transactionsBtn").disabled = false;
    }
}

/**
 * Display transactions in the UI
 */
function displayTransactions(transactions) {
    const container = document.getElementById("transactionsContainer");
    const list = document.getElementById("transactionsList");

    if (transactions.length === 0) {
        list.innerHTML = "<p>No transactions found</p>";
        container.style.display = "block";
        return;
    }

    list.innerHTML = transactions
        .map((txn) => {
            const isExpense = txn.amount > 0;
            const className = isExpense ? "expense" : "income";
            const amountSymbol = isExpense ? "−" : "+";
            const amountColor = isExpense ? "#ef5350" : "#66bb6a";

            return `
        <div class="transaction-item ${className}">
            <div class="transaction-name">${txn.merchant_name || txn.name}</div>
            <div class="transaction-meta">
                <span class="transaction-date">${formatDate(txn.date)}</span>
                <span class="transaction-amount" style="color: ${amountColor};">
                    ${amountSymbol}$${Math.abs(txn.amount).toFixed(2)}
                </span>
            </div>
        </div>
      `;
        })
        .join("");

    container.style.display = "block";
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const statusEl = document.getElementById("linkStatus");
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

/**
 * Update debug information
 */
function updateDebugInfo(info) {
    const debugEl = document.getElementById("debugInfo");
    const currentDebug = debugEl.textContent
        ? JSON.parse(debugEl.textContent)
        : {};
    const updatedDebug = { ...currentDebug, ...info };
    debugEl.textContent = JSON.stringify(updatedDebug, null, 2);
}

/**
 * Reset the connection
 */
function resetConnection() {
    accessToken = null;
    linkToken = null;
    handler = null;

    document.getElementById("transactionsBtn").disabled = true;
    document.getElementById("transactionsContainer").style.display = "none";
    document.getElementById("debugInfo").textContent = "";
    document.getElementById("transactionsList").innerHTML = "";

    showStatus("Connection reset. Reconnecting...", "info");
    createLinkToken();
}
