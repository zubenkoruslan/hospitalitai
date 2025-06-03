const jwt = require("jsonwebtoken");
const axios = require("axios");

// Create a test JWT token
const token = jwt.sign(
  {
    userId: "6835cbc6a90037170a63dfcd",
    restaurantId: "6833a77e12eda941e14d71df",
    role: "restaurant",
    name: "Test User",
  },
  "your_very_secret_key_change_me",
  { expiresIn: "1h" }
);

console.log("Generated token:", token.substring(0, 50) + "...");

// Call the enhanced analytics endpoint
axios
  .get("http://localhost:3000/api/analytics/restaurant/enhanced", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  .then((response) => {
    console.log("Enhanced Analytics Response:");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  })
  .catch((error) => {
    console.error("Error calling enhanced analytics:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  });
