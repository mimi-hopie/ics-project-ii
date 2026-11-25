import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

let violationsList = [];
let sortDescending = true; // Default: newest violations first

// Verify authentication before loading dashboard data
async function initDashboard() {
    try {
        const configRes = await fetch('/api/firebase-config');
        const firebaseConfig = await configRes.json();

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                // Not logged in -> send to login page
                window.location.href = '/login.html';
            } else {
                // Logged in -> show user email and load violations
                const userEmailEl = document.getElementById('userEmail');
                if (userEmailEl) userEmailEl.innerText = user.email;
                fetchAndRenderData();
            }
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await signOut(auth);
                window.location.href = '/login.html';
            });
        }
    } catch (error) {
        console.error("Auth initialization failed:", error);
    }
}

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (violationsList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7">No violations found.</td></tr>`;
        return;
    }

    // Sort violations by date and time
    const sorted = [...violationsList].sort((a, b) => {
        return sortDescending ? (b.timestampMs - a.timestampMs) : (a.timestampMs - b.timestampMs);
    });

    for (const item of sorted) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="plate-number">${item.plate}</td>
            <td>${item.type}</td>
            <td>${item.location}</td>
            <td class="blockchain-cell">${item.blockchainHash}</td>
            <td class="blockchain-cell">${item.blockchainTxId}</td>
            <td class="datetime-cell">${item.formattedDate}<br><span style="color:#888; font-size:11px;">${item.formattedTime}</span></td>
            <td class="blockchain-cell">${item.edited}</td>
        `;
        tableBody.appendChild(tr);
    }
}

async function fetchAndRenderData() {
    try {
        const response = await fetch('/api/violations');
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();
        document.getElementById('totalCount').innerText = data.totalCount;
        violationsList = data.violations;

        renderTable();
    } catch (error) {
        console.error("Error fetching data: ", error);
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="7" style="color:red;">Error connecting to server. Check console.</td></tr>`;
    }
}

// Allow clicking the Date & Time header to toggle sort direction
const sortHeader = document.getElementById('sortDateHeader');
if (sortHeader) {
    sortHeader.addEventListener('click', () => {
        sortDescending = !sortDescending;
        const indicator = document.getElementById('sortIndicator');
        if (indicator) {
            indicator.innerText = sortDescending ? '▼' : '▲';
        }
        renderTable();
    });
}

// Simple clock for the live indicator
setInterval(() => {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        clockEl.innerText = now.toLocaleTimeString('en-GB', { 
            timeZone: 'Africa/Nairobi', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}, 1000);

// Initialize Auth & Dashboard
initDashboard();