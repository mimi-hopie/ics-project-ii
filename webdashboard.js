import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";


const firebaseConfig = {
    projectId: "ics-project-ii-509310"
};
const app = initializeApp(firebaseConfig);

// Connect to the specific named database
const db = getFirestore(app, "ics-project-ii");

async function fetchAndRenderData() {
    try {
        const violationsCol = collection(db, "violations");
        const violationSnapshot = await getDocs(violationsCol);
        const tableBody = document.getElementById('tableBody');
        
        tableBody.innerHTML = ''; // Clear loading message
        document.getElementById('totalCount').innerText = violationSnapshot.size;

        // Process each violation document
        for (const violationDoc of violationSnapshot.docs) {
            const vData = violationDoc.data();
            const documentId = violationDoc.id; // e.g., 'violation_001'
            
            // Fetch corresponding vehicle data using the vehicle_id foreign key
            let vehicleData = { registration_number: 'Unknown', vehicle_type: 'Unknown' };
            if (vData.vehicle_id) {
                const vehicleRef = doc(db, "vehicles", vData.vehicle_id);
                const vehicleSnap = await getDoc(vehicleRef);
                if (vehicleSnap.exists()) {
                    vehicleData = vehicleSnap.data();
                }
            }

            // Format Timestamp
            let formattedDate = "N/A";
            let formattedTime = "";
            if (vData.violation_datetime) {
                const dateObj = vData.violation_datetime.toDate();
                formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                formattedTime = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            // Create table row (Using the document ID or a specific violation ID if present)
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${documentId}</td>
                <td class="plate-number">${vehicleData.registration_number}</td>
                <td>${vehicleData.vehicle_type}</td>
                <td>${vData.sensor_location || '-'}</td>
                <td class="datetime-cell">${formattedDate}<br><span style="color:#888; font-size:11px;">${formattedTime}</span></td>
            `;
            tableBody.appendChild(tr);
        }
    } catch (error) {
        console.error("Error fetching data: ", error);
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="5" style="color:red;">Error connecting to database. Check console.</td></tr>`;
    }
}

// Simple clock for the live indicator
setInterval(() => {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });
}, 1000);

// Execute data fetch
fetchAndRenderData();