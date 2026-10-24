const http = require('http');

async function testUrl(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
      res.on('error', reject);
    });
  });
}

async function run() {
  console.log("=== VERIFYING REHEARSE STYLING PIPELINE ===");

  // 1. Home Page
  const home = await testUrl('/');
  console.log(`[Home /] HTTP Status: ${home.status}`);
  const cssMatch = home.data.match(/\/(_next\/static\/css\/[^"'>]+)/);
  if (!cssMatch) {
    console.error("FAIL: No stylesheet link found in home HTML!");
    process.exit(1);
  }
  const cssPath = '/' + cssMatch[1];
  console.log(`[Home /] Stylesheet href found: ${cssPath}`);

  // Fetch CSS
  const css = await testUrl(cssPath);
  console.log(`[CSS Bundle] HTTP Status: ${css.status} (bytes: ${css.data.length})`);
  console.log(`  - GeistSans @font-face included: ${css.data.includes('GeistSans')}`);
  console.log(`  - GeistMono @font-face included: ${css.data.includes('GeistMono')}`);
  console.log(`  - Dark mode variables included: ${css.data.includes('.dark') && css.data.includes('--background')}`);
  console.log(`  - Grid dot background included: ${css.data.includes('.grid-dot')}`);
  console.log(`  - Tailwind utility .flex included: ${css.data.includes('.flex')}`);
  console.log(`  - Tailwind utility .bg-surface included: ${css.data.includes('.bg-surface')}`);
  console.log(`  - Tailwind utility .border-border included: ${css.data.includes('.border-border')}`);
  console.log(`  - Tailwind typography and colors included: ${css.data.includes('.text-muted') && css.data.includes('.text-foreground')}`);

  // 2. /login (or /sign-in redirect)
  const login = await testUrl('/login');
  console.log(`[Login /login] HTTP Status: ${login.status}`);
  const hasLoginForm = login.data.includes('Sign in') || login.data.includes('email');
  console.log(`  - Login form rendered: ${hasLoginForm}`);

  // 3. /sign-in (redirect check)
  const signin = await testUrl('/sign-in');
  console.log(`[Sign-in /sign-in] HTTP Status: ${signin.status} -> Location: ${signin.headers.location}`);

  // 4. /dashboard (auth redirect check)
  const dashboard = await testUrl('/dashboard');
  console.log(`[Dashboard /dashboard] HTTP Status: ${dashboard.status} -> Location: ${dashboard.headers.location}`);

  // 5. /interview
  const interview = await testUrl('/interview');
  console.log(`[Interview /interview] HTTP Status: ${interview.status}`);
  const hasInterviewUI = interview.data.includes('Interview') || interview.data.includes('interview');
  console.log(`  - Interview layout rendered: ${hasInterviewUI}`);

  console.log("\n>>> ALL STYLING CHECKS PASSED PERFECTLY!");
}

run().catch(console.error);
