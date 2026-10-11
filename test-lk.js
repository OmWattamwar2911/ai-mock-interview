require("dotenv").config({ path: "./.env" });
const http = require("http");

console.log("Checking prerequisites...");
console.log("DATABASE_URL set?", !!process.env.DATABASE_URL);
console.log("LIVEKIT_URL:", process.env.LIVEKIT_URL);
console.log("LIVEKIT_API_KEY set?", !!process.env.LIVEKIT_API_KEY);
console.log("LIVEKIT_API_SECRET set?", !!process.env.LIVEKIT_API_SECRET);

const lkUrl = process.env.LIVEKIT_URL || "ws://localhost:7880";
const httpUrl = lkUrl.replace("ws://", "http://").replace("wss://", "https://");

console.log("Pinging LiveKit server at", httpUrl);
http.get(httpUrl, (res) => {
    console.log("LiveKit HTTP status:", res.statusCode);
}).on("error", (err) => {
    console.log("LiveKit HTTP connection failed:", err.message);
});
