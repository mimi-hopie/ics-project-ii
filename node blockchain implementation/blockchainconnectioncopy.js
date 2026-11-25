const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { JsonRpcProvider, Wallet, Contract, id } = require('ethers'); 
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "ics-project-ii-509310" 
});
const db = getFirestore(app, "ics-project-ii");

// FIX 1: Swapped to a more reliable public RPC node
const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com'); 
const privateKey = ''; 
const wallet = new Wallet(privateKey, provider);

const contractAddress = '';
const contractABI = [ {
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "rfidTag",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "violationHash",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "ViolationLogged",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_rfidTag",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_violationHash",
				"type": "string"
			}
		],
		"name": "logViolation",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]; 
const contract = new Contract(contractAddress, contractABI, wallet);

console.log("Connecting to Project: ics-project-ii-509310 | Database: ics-project-ii");
console.log("Listening for new violations in Firestore...");

// The callback must be async to support sequential processing
db.collection('violations').onSnapshot(async (snapshot) => {
  console.log(`\n--- SNAPSHOT TRIGGERED ---`);

  // FIX 2: Use for...of instead of .forEach() to process one by one
  for (const change of snapshot.docChanges()) {
    if (change.type === 'added' || change.type === 'modified') {
      const violationData = change.doc.data();

      // Skip if already processed
      if (violationData.blockchain_hash && violationData.blockchain_hash !== "") {
        continue; 
      }

      console.log(`\nProcessing violation: ${change.doc.id}`);
      
      const rfidTag = violationData.rfid_tag_id || "NONE";
      const payloadString = JSON.stringify({
        rfid_tag_id: rfidTag,
        sensor_location: violationData.sensor_location || "Line 5",
        vehicle_id: violationData.vehicle_id || "",
        timestamp: violationData.violation_datetime || Date.now()
      });
      const violationHash = id(payloadString);

      try {
        console.log(`Submitting hash for Tag [${rfidTag}]...`);
        const tx = await contract.logViolation(rfidTag, violationHash);
        
        console.log("Waiting for network confirmation (this takes ~15 seconds)...");
        await tx.wait(); // The loop will completely pause here until the block is mined
        
        console.log(`Confirmed! TX Hash: ${tx.hash}`);

        await change.doc.ref.update({
          blockchain_hash: violationHash,
          blockchain_transaction_id: tx.hash
        });
        console.log(`Updated Firestore document successfully.`);
      } catch (error) {
        console.error("Blockchain transaction failed:", error);
      }
    }
  }
}, (error) => {
  console.error("FIREBASE LISTENER ERROR:", error);
});

