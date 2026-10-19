let violationsList = [];
let sortDescending = true; // Default: newest violations first

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (violationsList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No violations found.</td></tr>`;
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
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="6" style="color:red;">Error connecting to server. Check console.</td></tr>`;
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

// Execute data fetch
fetchAndRenderData();