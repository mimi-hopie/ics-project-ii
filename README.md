```markdown
# Nairobi BRT Lane Enforcement System

## Project Overview
This repository contains the web dashboard and system architecture for an IoT and Blockchain-Based System designed to detect unauthorized vehicles in Nairobi’s Bus Rapid Transit (BRT) lanes. 

Nairobi faces severe traffic congestion that affects daily travel and overall economic productivity, costing the city an estimated KES 100 billion annually. While the Kenya Urban Road Authority (KURA) is implementing a BRT system with an initial KES 7.6 billion investment in Line 5, its success is threatened by the persistent cultural problem of lane indiscipline and overlapping. 

To provide a cost-effective alternative to computationally expensive CCTV-based systems and labor-intensive manual policing, this system utilizes low-cost IoT edge devices for vehicle detection and blockchain technology to secure immutable, tamper-proof violation records. 

## System Architecture
The system operates across several integrated layers:
*   **IoT Edge Layer (Vehicle Detection):** An HC-SR04 ultrasonic sensor detects the physical presence of a vehicle in the lane. An RC522 RFID reader then scans the vehicle's passive RFID tag.
*   **Processing Layer:** An Arduino Uno R3 serves as the main microcontroller, coordinating the sensors and evaluating the read data using C++ firmware. 
*   **Network Layer:** An ESP8266 Wi-Fi module transmits the violation data from the edge device directly to the cloud database.
*   **Application Layer:** A Google Firebase NoSQL database (Firestore) stores real-time vehicle authorization status and violation logs.
*   **Blockchain Layer:** Solidity smart contracts deployed on an Ethereum Test Net record cryptographic hashes of the violations, establishing a secure audit trail that prevents evidence tampering.
*   **Administrative Dashboard:** A web-based application built with HTML, CSS, and JavaScript that retrieves and displays the violation records from Firebase for traffic authorities.

## Technology Stack
*   **Frontend Interface:** HTML5, CSS3, JavaScript (ES6), Firebase JS SDK.
*   **Database:** Google Firebase Cloud Firestore[cite: 1].
*   **IoT Hardware:** Arduino Uno R3, MFRC522 RFID Reader, HC-SR04 Ultrasonic Sensor, ESP8266 Wi-Fi Module.
*   **Firmware:** C++ via Arduino IDE.
*   **Blockchain:** Solidity, Ethereum Test Net.

## Database Schema (Firebase Firestore)
The NoSQL database relies on two primary collections to map vehicles to their respective violations.

### 1. `vehicles` Collection
Stores registered vehicles and their BRT authorization status.
*   **Document ID:** (e.g., `vehicle_001`)[cite: 1]
*   `registration_number` (String): The vehicle's license plate (e.g., "KBYA 123").
*   `vehicle_type` (String): The classification of the vehicle (e.g., "Motorcycle", "PSV").
*   `is_authorized_brt` (Boolean): Determines if the vehicle has BRT lane access permissions.
*   `rfid_tag_id` (String): The unique identifier from the vehicle's passive RFID tag.

### 2. `violations` Collection
Stores logs of unauthorized BRT lane access.
*   **Document ID:** (e.g., `violation_001`)
*   `vehicle_id` (String): Foreign key linking to the `vehicles` document ID (e.g., "vehicle_001").
*   `rfid_tag_id` (String): The RFID tag scanned during the violation.
*   `sensor_location` (String): The geographical installation point of the IoT sensor (e.g., "Thika Road - Garden City").
*   `violation_datetime` (Timestamp): The exact date and time the unauthorized access occurred.
*   `blockchain_hash` (String): The cryptographic hash returned by the Ethereum smart contract ensuring non-repudiation (initially blank until blockchain integration).

## Web Dashboard Setup & Installation
The administrative dashboard visualizes real-time unauthorized vehicle entries. Because the application utilizes the Firebase Modular SDK (ES6 imports), it must be run over a local web server to prevent CORS (Cross-Origin Resource Sharing) blockages in modern web browsers.

1.  **Clone or Download the Repository:**
    Ensure `webdashboard.html`, `webdashboard.css`, and `webdashboard.js` are located in the same root directory.
2.  **Configure Firebase:**
    In `webdashboard.js`, ensure the `projectId` matches your active Google Cloud Firestore project.
3.  **Launch Local Server:**
    *   Open the project folder in Visual Studio Code[cite: 1].
    *   Install the **Live Server** extension from the VS Code marketplace.
    *   Right-click `webdashboard.html` and select **Open with Live Server**.
4.  **View Dashboard:**
    The dashboard will launch in your default web browser, displaying live status and rendering data immediately from the `violations` collection.

## Blockchain Integration (Future Phase)
To fully realize the tamper-proof evidence capabilities:
1.  A Node.js backend environment will intercept the text-based violation data.
2.  The backend will hash the `violation_id` and `registration_number` and interact with the Ethereum Test Net via Solidity smart contracts.
3.  Upon successful block confirmation, the resulting transaction ID and block hash will be written back to the `blockchain_hash` string field in the corresponding Firestore document.

## Author
**Hope Murimi**  

```
