import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    projectId: "ics-project-ii-509310"
};
const app = initializeApp(firebaseConfig);

// Connect to the specific named database
const db = getFirestore(app, "ics-project-ii");

let violationsList = [];
let sortDescending = true; // Default: newest violations first

async function fetchVehicleData(vData) {
    let vehicleData = { 
        rfid_tag_id: vData.rfid_tag_id || null,
        registration_number: null, 
        vehicle_type: vData.vehicle_type || 'Unknown' 
    };

    const lookupKey = vData.rfid_tag_id || vData.vehicle_id;
    if (!lookupKey) return vehicleData;

    // 1. Try fetching directly by document ID in "vehicles"
    const vehicleRef = doc(db, "vehicles", String(lookupKey));
    const vehicleSnap = await getDoc(vehicleRef);

    if (vehicleSnap.exists()) {
        return { ...vehicleData, ...vehicleSnap.data() };
    }

    // 2. Fallback: Query "vehicles" collection where rfid_tag_id matches
    if (vData.rfid_tag_id) {
        const q = query(collection(db, "vehicles"), where("rfid_tag_id", "==", vData.rfid_tag_id));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
            return { ...vehicleData, ...querySnap.docs[0].data() };
        }
    }

    return vehicleData;
}

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (violationsList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4">No violations found.</td></tr>`;
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
            <td class="datetime-cell">${item.formattedDate}<br><span style="color:#888; font-size:11px;">${item.formattedTime}</span></td>
        `;
        tableBody.appendChild(tr);
    }
}

async function fetchAndRenderData() {
    try {
        const violationsCol = collection(db, "violations");
        const violationSnapshot = await getDocs(violationsCol);

        document.getElementById('totalCount').innerText = violationSnapshot.size;
        violationsList = [];

        // Process all violation documents concurrently for faster loading
        const rowPromises = violationSnapshot.docs.map(async (violationDoc) => {
            const vData = violationDoc.data();
            const vehicleData = await fetchVehicleData(vData);

            // Use rfid_tag_id for the plate (or replace with vehicleData.registration_number if preferred)
            const plateDisplay = vData.rfid_tag_id || vehicleData.rfid_tag_id || vehicleData.registration_number || 'Unknown';
            const vehicleType = vehicleData.vehicle_type || vData.vehicle_type || 'Unknown';
            const location = vData.sensor_location || '-';

            // Parse and format Date & Time
            let timestampMs = 0;
            let formattedDate = "N/A";
            let formattedTime = "";

            if (vData.violation_datetime) {
                const dateObj = typeof vData.violation_datetime.toDate === 'function'
                    ? vData.violation_datetime.toDate()
                    : new Date(vData.violation_datetime);

                if (!isNaN(dateObj.getTime())) {
                    timestampMs = dateObj.getTime();
                    formattedDate = dateObj.toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                    });
                    formattedTime = dateObj.toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    });
                }
            }

            return {
                plate: plateDisplay,
                type: vehicleType,
                location: location,
                timestampMs: timestampMs,
                formattedDate: formattedDate,
                formattedTime: formattedTime
            };
        });

        violationsList = await Promise.all(rowPromises);
        renderTable();

    } catch (error) {
        console.error("Error fetching data: ", error);
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="4" style="color:red;">Error connecting to database. Check console.</td></tr>`;
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