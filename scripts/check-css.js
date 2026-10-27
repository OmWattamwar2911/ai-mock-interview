const http = require("http");

http.get("http://localhost:3000/", (res) => {
  console.log("Home page HTTP status:", res.statusCode);
  let html = "";
  res.on("data", (chunk) => (html += chunk));
  res.on("end", () => {
    const cssMatch = html.match(/href="([^"]+\.css[^"]*)"/);
    if (cssMatch) {
      const cssPath = cssMatch[1];
      console.log("CSS file linked in HTML:", cssPath);
      http.get("http://localhost:3000" + cssPath, (cssRes) => {
        console.log("CSS HTTP response status:", cssRes.statusCode);
        console.log("CSS Content-Type:", cssRes.headers["content-type"]);
        let cssData = "";
        cssRes.on("data", (chunk) => (cssData += chunk));
        cssRes.on("end", () => {
          console.log("CSS payload size (bytes):", cssData.length);
          console.log("CSS sample snippet:", cssData.slice(0, 80));
        });
      });
    } else {
      console.log("No <link rel='stylesheet'> found. Checking inline styles...");
    }
  });
}).on("error", (err) => {
  console.error("HTTP error:", err.message);
});
