import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Firestore } from "@google-cloud/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Read service account
const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "serviceAccountKey.json"), "utf8")
);

// 2. Initialize Firestore directly with the exact Project ID and Database ID
const db = new Firestore({
    projectId: "ics-project-ii-509310",
    databaseId: "ics-project-ii",
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key
    }
});

// Client config for frontend authentication
const firebaseConfig = {
    apiKey: "AIzaSyCcz2roxXctLoB_Mk2LsUKW4l1d3U6xd4k",
    authDomain: "ics-project-ii.firebaseapp.com",
    projectId: "ics-project-ii-509310"
};

// Serve static frontend files from 'public'
app.use(express.static(path.join(__dirname, "public")));

// Endpoint to provide Firebase config to frontend scripts
app.get("/api/firebase-config", (req, res) => {
    res.json(firebaseConfig);
});

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
    const vehicleDoc = await db.collection("vehicles").doc(String(lookupKey)).get();
    if (vehicleDoc.exists) {
        return { ...vehicleData, ...vehicleDoc.data() };
    }

    // 2. Fallback: Query "vehicles" collection where rfid_tag_id matches
    if (vData.rfid_tag_id) {
        const querySnap = await db.collection("vehicles").where("rfid_tag_id", "==", vData.rfid_tag_id).get();
        if (!querySnap.empty) {
            return { ...vehicleData, ...querySnap.docs[0].data() };
        }
    }

    return vehicleData;
}

// API Route to get all violations
app.get("/api/violations", async (req, res) => {
    try {
        console.log("--> Fetching from project: ics-project-ii-509310 | database: ics-project-ii | collection: violations");

        const violationSnapshot = await db.collection("violations").get();
        console.log(`--> Retrieved ${violationSnapshot.size} records.`);

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