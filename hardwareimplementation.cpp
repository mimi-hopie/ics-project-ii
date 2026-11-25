#include <SPI.h>
#include <Adafruit_PN532.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h> 

// ESP32 Pin Definitions
#define PN532_SS  5
#define TRIG_PIN  26
#define ECHO_PIN  27

// Initialize the PN532 using hardware SPI
Adafruit_PN532 nfc(PN532_SS);

// Wi-Fi Credentials
const char* ssid = "";
const char* password = "";

// Google Cloud Firestore REST API URL
const char* firestoreURL = "https://firestore.googleapis.com/v1/projects/ics-project-ii-509310/databases/ics-project-ii/documents/violations";

// NTP Server Settings
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0; 
const int   daylightOffset_sec = 0;

// Authorized Tags
String authorizedTags[] = {"01 02 03 04", "11 22 33 44"}; 
int numAuthorized = 2;

void setup() {
  Serial.begin(115200);
  Serial.println("Booting ESP32...");
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected successfully.");

  // Initialize PN532
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.print("Didn't find PN53x board. Check wiring and DIP switches!");
    while (1); // Halt if not found
  }
  // Configure PN532 to read RFID tags
  nfc.SAMConfig();
  Serial.println("PN532 NFC Module Initialized.");

  // Synchronize time via NTP
  Serial.println("Synchronizing time via NTP...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nTime synchronized.");
  
  Serial.println("Nairobi BRT Lane Monitoring System Initialized.");
}

void sendToFirebase(String tagID) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(firestoreURL);
    http.addHeader("Content-Type", "application/json");

    struct tm timeinfo;
    String timestamp = "";
    if (getLocalTime(&timeinfo)) {
      char timeStringBuff[30];
      strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
      timestamp = String(timeStringBuff);
    } else {
      timestamp = "2026-11-26T00:00:00Z"; 
    }


    String payload = "{\"fields\": {";
    payload += "\"rfid_tag_id\": {\"stringValue\": \"" + tagID + "\"},";
    payload += "\"sensor_location\": {\"stringValue\": \"Lab\"},";
    payload += "\"vehicle_type\": {\"stringValue\": \"\"},";
    payload += "\"vehicle_id\": {\"stringValue\": \"\"},";
    payload += "\"blockchain_hash\": {\"stringValue\": \"\"},";
    payload += "\"violation_datetime\": {\"timestampValue\": \"" + timestamp + "\"}";
    payload += "}}";

    Serial.println("Transmitting to Firebase: " + payload);
    
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
      Serial.print("Firebase Response Code: ");
      Serial.println(httpResponseCode); 
    } else {
      Serial.print("Error sending to Firebase: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  } else {
    Serial.println("Error: Wi-Fi disconnected.");
  }
}

void loop() {
  long duration, distance;
  
  // Trigger Ultrasonic Sensor
  digitalWrite(TRIG_PIN, LOW); 
  delayMicroseconds(2); 
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10); 
  digitalWrite(TRIG_PIN, LOW);
  
  duration = pulseIn(ECHO_PIN, HIGH, 30000); 
  distance = (duration / 2) / 29.1;

  // Process P1: Detect Vehicle Presence
  if (distance > 0 && distance < 15) {
    Serial.print("Vehicle detected at ");
    Serial.print(distance);
    Serial.println(" cm. Waiting for RFID scan...");

    unsigned long startTime = millis();
    bool tagRead = false;

    // Process P2: Read RFID Tag (10 second window)
    while (millis() - startTime < 10000) { 
      uint8_t success;
      uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  
      uint8_t uidLength;                        
      
      // Check for tag. Timeout set to 200ms to keep the while loop responsive.
      success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 200);
      
      if (success) {
        String tagID = "";
        for (uint8_t i = 0; i < uidLength; i++) {
          if (uid[i] < 0x10) tagID += "0";
          tagID += String(uid[i], HEX);
          if (i < uidLength - 1) tagID += " "; // Add space between bytes
        }
        tagID.toUpperCase();
        
        Serial.print("RFID Tag Read: ");
        Serial.println(tagID);
        
        // Process P3: Check Authorization
        bool isAuthorized = false;
        for (int i = 0; i < numAuthorized; i++) {
          if (tagID == authorizedTags[i]) {
            isAuthorized = true;
            break;
          }
        }
        
        // Process P4: Record Violation
        if (isAuthorized) {
          Serial.println("Status: AUTHORIZED BRT VEHICLE. No further action.");
        } else {
          Serial.println("Status: UNAUTHORIZED! Recording violation...");
          sendToFirebase(tagID);
        }
        
        tagRead = true;
        delay(3000); // Cooldown before detecting the next vehicle
        break;
      }
    }
    
    // Check for vehicle without any tag
    if (!tagRead) {
      Serial.println("Status: UNAUTHORIZED! No valid RFID tag detected.");
      sendToFirebase("NONE");
      delay(3000);
    }
  }
  delay(100);
}
