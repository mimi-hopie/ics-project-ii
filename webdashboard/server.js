import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where 
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
const firebaseConfig = {
    projectId: "ics-project-ii-509310"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, "ics-project-ii");

// Serve static frontend files (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Helper function to fetch vehicle details
async function fetchVehicleData(vData) {
    let vehicleData = { 
        rfid_tag_id: vData.rfid_tag_id || null,
        registration_number: null, 
        vehicle_type: vData.vehicle_type || "Unknown" 
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

// API Route to get all violations
app.get("/api/violations", async (req, res) => {
    try {
        const violationsCol = collection(db, "violations");
        const violationSnapshot = await getDocs(violationsCol);

        const rowPromises = violationSnapshot.docs.map(async (violationDoc) => {
            const vData = violationDoc.data();
            const vehicleData = await fetchVehicleData(vData);

            const plateDisplay = vData.rfid_tag_id || vehicleData.rfid_tag_id || vehicleData.registration_number || "00 11 22 33";
            const vehicleType = vehicleData.vehicle_type || vData.vehicle_type || "Private";
            const location = vData.sensor_location || "Lab";
            const blockchainHash = vData.blockchain_hash || "-";
            const blockchainTxId = vData.blockchain_transaction_id || "-";

            let timestampMs = 0;
            let formattedDate = "N/A";
            let formattedTime = "";

            if (vData.violation_datetime) {
                const dateObj = typeof vData.violation_datetime.toDate === "function"
                    ? vData.violation_datetime.toDate()
                    : new Date(vData.violation_datetime);

                if (!isNaN(dateObj.getTime())) {
                    timestampMs = dateObj.getTime();
                    formattedDate = dateObj.toLocaleDateString("en-GB", { 
                        timeZone: "Africa/Nairobi",
                        day: "2-digit", 
                        month: "short", 
                        year: "numeric" 
                    });
                    formattedTime = dateObj.toLocaleTimeString("en-GB", { 
                        timeZone: "Africa/Nairobi",
                        hour: "2-digit", 
                        minute: "2-digit", 
                        hour12: false 
                    });
                }
            }

            return {
                plate: plateDisplay,
                type: vehicleType,
                location: location,
                blockchainHash: blockchainHash,
                blockchainTxId: blockchainTxId,
                timestampMs: timestampMs,
                formattedDate: formattedDate,
                formattedTime: formattedTime
            };
        });

        const violations = await Promise.all(rowPromises);

        res.json({
            totalCount: violationSnapshot.size,
            violations: violations
        });

    } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        res.status(500).json({ error: "Error connecting to database." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});