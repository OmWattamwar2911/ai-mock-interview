import type { Difficulty, QuestionType } from "@prisma/client";

export type CompanyOaQuestion = {
  type: QuestionType;
  title: string;
  text: string;
  difficulty: Difficulty;
  skillTags: string[];
  companyTags: string[];
  roleTags: string[];
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<string, string>;
  testCases: Array<{ input: string; expected: string; hidden: boolean }>;
  referenceSolution: Record<string, string>;
  expectedPoints: Record<string, any>;
};

export const COMPANY_OA_QUESTIONS: CompanyOaQuestion[] = [
  // ─── GOOGLE ───────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Distributed Key-Value Range Query",
    text: `Google Cloud Spanner processes distributed range queries across shard replicas.
Given an array of integer keys stored in a distributed cluster and an integer window size K, find the maximum key in every contiguous window of size K moving from left to right.
Your solution must achieve O(N) linear time complexity using a monotonic deque or sliding window approach.`,
    difficulty: "MEDIUM",
    skillTags: ["Sliding Window", "Monotonic Deque", "Data Structures"],
    companyTags: ["Google"],
    roleTags: ["Backend", "Systems", "Fullstack"],
    constraints: `1 <= K <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4`,
    examples: [
      {
        input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        output: "3 3 5 5 6 7",
        explanation: "The window maximums are: max(1,3,-1)=3, max(3,-1,-3)=3, max(-1,-3,5)=5, max(-3,5,3)=5, max(5,3,6)=6, max(3,6,7)=7.",
      },
    ],
    starterCode: {
      python: `import sys
from collections import deque

def max_sliding_window(nums, k):
    # Write your solution here
    pass

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        k = int(data[0])
        nums = [int(x) for x in data[1:]]
        res = max_sliding_window(nums, k)
        print(' '.join(map(str, res)) if res is not None else '')`,
      javascript: `const fs = require('fs');

function maxSlidingWindow(nums, k) {
    // Write your solution here
    return [];
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
if (tokens.length >= 2) {
    const k = parseInt(tokens[0], 10);
    const nums = tokens.slice(1).map(Number);
    console.log(maxSlidingWindow(nums, k).join(' '));
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    // Write solution here
    return {};
}

int main() {
    int k;
    if (cin >> k) {
        vector<int> nums;
        int val;
        while (cin >> val) nums.push_back(val);
        auto res = maxSlidingWindow(nums, k);
        for (size_t i = 0; i < res.size(); i++) {
            cout << res[i] << (i + 1 == res.size() ? "" : " ");
        }
        cout << "\\n";
    }
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static int[] maxSlidingWindow(int[] nums, int k) {
        return new int[0];
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int k = sc.nextInt();
            List<Integer> list = new ArrayList<>();
            while (sc.hasNextInt()) list.add(sc.nextInt());
            int[] nums = list.stream().mapToInt(i -> i).toArray();
            int[] res = maxSlidingWindow(nums, k);
            for (int i = 0; i < res.length; i++) {
                System.out.print(res[i] + (i + 1 == res.length ? "" : " "));
            }
            System.out.println();
        }
    }
}`,
    },
    testCases: [
      { input: "3 1 3 -1 -3 5 3 6 7", expected: "3 3 5 5 6 7", hidden: false },
      { input: "1 1", expected: "1", hidden: false },
      { input: "1 1 -1", expected: "1 -1", hidden: false },
      { input: "2 9 11", expected: "11", hidden: true },
      { input: "3 4 3 2 1 5 6", expected: "4 3 2 5 6", hidden: true },
    ],
    referenceSolution: {
      python: `import sys
from collections import deque

def max_sliding_window(nums, k):
    if not nums or k <= 0:
        return []
    d = deque()
    res = []
    for i, n in enumerate(nums):
        while d and nums[d[-1]] < n:
            d.pop()
        d.append(i)
        if d[0] == i - k:
            d.popleft()
        if i >= k - 1:
            res.append(nums[d[0]])
    return res

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        k = int(data[0])
        nums = [int(x) for x in data[1:]]
        print(' '.join(map(str, max_sliding_window(nums, k))))`,
      javascript: `const fs = require('fs');

function maxSlidingWindow(nums, k) {
    if (!nums.length || k <= 0) return [];
    const deque = [];
    const res = [];
    for (let i = 0; i < nums.length; i++) {
        while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
            deque.pop();
        }
        deque.push(i);
        if (deque[0] === i - k) {
            deque.shift();
        }
        if (i >= k - 1) {
            res.push(nums[deque[0]]);
        }
    }
    return res;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
if (tokens.length >= 2) {
    const k = parseInt(tokens[0], 10);
    const nums = tokens.slice(1).map(Number);
    console.log(maxSlidingWindow(nums, k).join(' '));
}`,
    },
    expectedPoints: {
      optimalComplexity: "O(N) time and O(K) space",
      approach: "Double-ended queue (monotonic decreasing deque) storing indices.",
    },
  },

  // ─── AMAZON ───────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Warehouse Pallet Loading Optimization",
    text: `At an Amazon Fulfillment Center, incoming boxes have weights that need to be grouped into the minimum number of shipping pallets.
Each pallet has a maximum weight capacity C. Each pallet can carry at most 2 boxes due to balancing constraints.
Given the box weights and the pallet capacity, calculate the minimum number of pallets required to ship all boxes.`,
    difficulty: "EASY",
    skillTags: ["Greedy", "Two Pointers", "Sorting"],
    companyTags: ["Amazon"],
    roleTags: ["Backend", "Fullstack", "Systems"],
    constraints: `1 <= box.length <= 5 * 10^4\n1 <= box[i] <= capacity <= 3 * 10^4`,
    examples: [
      {
        input: "capacity = 3, boxes = [1, 2]",
        output: "1",
        explanation: "1 pallet carrying weights 1 and 2.",
      },
      {
        input: "capacity = 3, boxes = [3, 2, 2, 1]",
        output: "3",
        explanation: "Pallet 1: (1, 2), Pallet 2: (2), Pallet 3: (3).",
      },
    ],
    starterCode: {
      python: `import sys

def num_pallets(weights, capacity):
    # Write solution here
    pass

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        cap = int(data[0])
        weights = [int(x) for x in data[1:]]
        print(num_pallets(weights, cap))`,
      javascript: `const fs = require('fs');

function numPallets(weights, capacity) {
    // Write solution here
    return 0;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
if (tokens.length >= 2) {
    const cap = parseInt(tokens[0], 10);
    const weights = tokens.slice(1).map(Number);
    console.log(numPallets(weights, cap));
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int numPallets(vector<int>& weights, int capacity) {
    return 0;
}

int main() {
    int cap;
    if (cin >> cap) {
        vector<int> weights;
        int w;
        while (cin >> w) weights.push_back(w);
        cout << numPallets(weights, cap) << "\\n";
    }
    return 0;
}`,
    },
    testCases: [
      { input: "3 1 2", expected: "1", hidden: false },
      { input: "3 3 2 2 1", expected: "3", hidden: false },
      { input: "5 3 5 3 4", expected: "4", hidden: false },
      { input: "10 5 5 5 5", expected: "2", hidden: true },
      { input: "6 1 2 3 4 5", expected: "3", hidden: true },
    ],
    referenceSolution: {
      python: `import sys

def num_pallets(weights, capacity):
    weights.sort()
    i = 0
    j = len(weights) - 1
    pallets = 0
    while i <= j:
        if weights[i] + weights[j] <= capacity:
            i += 1
        j -= 1
        pallets += 1
    return pallets

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        cap = int(data[0])
        weights = [int(x) for x in data[1:]]
        print(num_pallets(weights, cap))`,
      javascript: `const fs = require('fs');

function numPallets(weights, capacity) {
    weights.sort((a, b) => a - b);
    let i = 0;
    let j = weights.length - 1;
    let pallets = 0;
    while (i <= j) {
        if (weights[i] + weights[j] <= capacity) {
            i++;
        }
        j--;
        pallets++;
    }
    return pallets;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
if (tokens.length >= 2) {
    const cap = parseInt(tokens[0], 10);
    const weights = tokens.slice(1).map(Number);
    console.log(numPallets(weights, cap));
}`,
    },
    expectedPoints: {
      approach: "Sort array and pair heaviest box with lightest box using two pointers.",
      complexity: "O(N log N) time, O(1) space.",
    },
  },

  // ─── STRIPE ───────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Idempotent Transaction Ledger Reconciler",
    text: `Stripe processes millions of transaction events that can arrive out of order or be retried due to network timeouts.
Each transaction has: [transaction_id, account_id, amount, idempotency_key].
An event is considered a duplicate if the idempotency_key has already been executed for that account_id.
Compute the final balance for all unique accounts sorted alphabetically by account_id.
Input format: First number N is the number of transactions, followed by N lines of: account_id amount idempotency_key.`,
    difficulty: "MEDIUM",
    skillTags: ["Hash Maps", "Ledger Reconcile", "String Parsing"],
    companyTags: ["Stripe"],
    roleTags: ["Backend", "Fullstack", "Systems"],
    constraints: `1 <= transactions <= 10^5\nAmount is an integer between -10^6 and 10^6.`,
    examples: [
      {
        input: "4\nacct_A 100 key_1\nacct_B 200 key_2\nacct_A 100 key_1\nacct_A 50 key_3",
        output: "acct_A: 150\nacct_B: 200",
        explanation: "The second key_1 for acct_A is duplicate and ignored. Final acct_A = 100 + 50 = 150, acct_B = 200.",
      },
    ],
    starterCode: {
      python: `import sys

def reconcile_transactions(lines):
    # Output lines formatted as: "account_id: balance" in sorted order
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().strip().splitlines()
    if raw:
        res = reconcile_transactions(raw[1:])
        if res:
            for r in res:
                print(r)`,
      javascript: `const fs = require('fs');

function reconcileTransactions(lines) {
    // Return array of strings: "account_id: balance" sorted by account_id
    return [];
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 1) {
    const res = reconcileTransactions(lines.slice(1));
    res.forEach(r => console.log(r));
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        map<string, long long> balances;
        set<pair<string, string>> seen;
        for (int i = 0; i < n; i++) {
            string acct, key;
            long long amt;
            cin >> acct >> amt >> key;
            if (seen.insert({acct, key}).second) {
                balances[acct] += amt;
            }
        }
        for (auto& p : balances) {
            cout << p.first << ": " << p.second << "\\n";
        }
    }
    return 0;
}`,
    },
    testCases: [
      {
        input: "4\nacct_A 100 key_1\nacct_B 200 key_2\nacct_A 100 key_1\nacct_A 50 key_3",
        expected: "acct_A: 150\nacct_B: 200",
        hidden: false,
      },
      {
        input: "3\nuser_1 500 k1\nuser_1 -200 k2\nuser_1 500 k1",
        expected: "user_1: 300",
        hidden: false,
      },
      {
        input: "1\nmerch_99 0 token_x",
        expected: "merch_99: 0",
        hidden: true,
      },
      {
        input: "5\na 10 k1\nb 20 k2\nc 30 k3\na -10 k4\nb 50 k2",
        expected: "a: 0\nb: 20\nc: 30",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def reconcile_transactions(lines):
    seen = set()
    balances = {}
    for line in lines:
        parts = line.strip().split()
        if len(parts) >= 3:
            acct, amt, key = parts[0], int(parts[1]), parts[2]
            dedup_key = (acct, key)
            if dedup_key not in seen:
                seen.add(dedup_key)
                balances[acct] = balances.get(acct, 0) + amt
    return [f"{acct}: {balances[acct]}" for acct in sorted(balances.keys())]

if __name__ == '__main__':
    raw = sys.stdin.read().strip().splitlines()
    if raw:
        res = reconcile_transactions(raw[1:])
        for r in res:
            print(r)`,
      javascript: `const fs = require('fs');

function reconcileTransactions(lines) {
    const seen = new Set();
    const balances = new Map();
    for (const line of lines) {
        const parts = line.trim().split(/\\s+/);
        if (parts.length >= 3) {
            const [acct, amtStr, key] = parts;
            const amt = parseInt(amtStr, 10);
            const dedupKey = \`\${acct}:::\${key}\`;
            if (!seen.has(dedupKey)) {
                seen.add(dedupKey);
                balances.set(acct, (balances.get(acct) || 0) + amt);
            }
        }
    }
    return Array.from(balances.keys())
        .sort()
        .map(acct => \`\${acct}: \${balances.get(acct)}\`);
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 1) {
    const res = reconcileTransactions(lines.slice(1));
    res.forEach(r => console.log(r));
}`,
    },
    expectedPoints: {
      approach: "Composite key Set tracking (account, idempotency_key) to discard duplicates; Hash Map accumulator with lexicographical sort.",
    },
  },

  // ─── META ─────────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Social Graph Friend Cluster Path",
    text: `On Meta's social graph, user connections form an undirected graph.
Given N users numbered 0 to N-1 and an adjacency list of friend connections, determine if there is a valid path connecting user S and user D without passing through any blocked user IDs.
Input format:
Line 1: N S D
Line 2: M (number of blocked users) followed by blocked user IDs
Remaining lines: pairs of friends U V`,
    difficulty: "MEDIUM",
    skillTags: ["Graphs", "BFS", "DFS", "Breadth-First Search"],
    companyTags: ["Meta"],
    roleTags: ["Backend", "Systems", "Fullstack"],
    constraints: `1 <= N <= 2 * 10^4\n0 <= edges <= 5 * 10^4`,
    examples: [
      {
        input: "4 0 3\n0\n0 1\n1 2\n2 3",
        output: "true",
        explanation: "Path: 0 -> 1 -> 2 -> 3 exists and no users are blocked.",
      },
      {
        input: "4 0 3\n1 1\n0 1\n1 2\n2 3",
        output: "false",
        explanation: "User 1 is blocked, so no connection can be made from 0 to 3.",
      },
    ],
    starterCode: {
      python: `import sys
from collections import deque, defaultdict

def has_path(n, start, end, blocked, edges):
    # Return True or False
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        first = [int(x) for x in lines[0].split()]
        n, s, d = first[0], first[1], first[2]
        blocked_tokens = [int(x) for x in lines[1].split()]
        num_blocked = blocked_tokens[0]
        blocked = set(blocked_tokens[1:]) if num_blocked > 0 else set()
        edges = []
        for line in lines[2:]:
            p = [int(x) for x in line.split()]
            if len(p) >= 2:
                edges.append((p[0], p[1]))
        print('true' if has_path(n, s, d, blocked, edges) else 'false')`,
      javascript: `const fs = require('fs');

function hasPath(n, start, end, blocked, edges) {
    return false;
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length >= 2) {
    const [n, s, d] = lines[0].split(/\\s+/).map(Number);
    const bTokens = lines[1].split(/\\s+/).map(Number);
    const blocked = new Set(bTokens.slice(1));
    const edges = lines.slice(2).map(l => l.split(/\\s+/).map(Number));
    console.log(hasPath(n, s, d, blocked, edges) ? 'true' : 'false');
}`,
    },
    testCases: [
      {
        input: "4 0 3\n0\n0 1\n1 2\n2 3",
        expected: "true",
        hidden: false,
      },
      {
        input: "4 0 3\n1 1\n0 1\n1 2\n2 3",
        expected: "false",
        hidden: false,
      },
      {
        input: "5 0 4\n1 2\n0 1\n1 3\n3 4\n0 2\n2 4",
        expected: "true",
        hidden: true,
      },
      {
        input: "3 0 2\n0\n0 1",
        expected: "false",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys
from collections import deque, defaultdict

def has_path(n, start, end, blocked, edges):
    if start in blocked or end in blocked:
        return False
    if start == end:
        return True
    adj = defaultdict(list)
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    
    q = deque([start])
    visited = {start}
    while q:
        curr = q.popleft()
        if curr == end:
            return True
        for nxt in adj[curr]:
            if nxt not in visited and nxt not in blocked:
                visited.add(nxt)
                q.append(nxt)
    return False

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        first = [int(x) for x in lines[0].split()]
        n, s, d = first[0], first[1], first[2]
        blocked_tokens = [int(x) for x in lines[1].split()]
        num_blocked = blocked_tokens[0]
        blocked = set(blocked_tokens[1:]) if num_blocked > 0 else set()
        edges = []
        for line in lines[2:]:
            p = [int(x) for x in line.split()]
            if len(p) >= 2:
                edges.append((p[0], p[1]))
        print('true' if has_path(n, s, d, blocked, edges) else 'false')`,
      javascript: `const fs = require('fs');

function hasPath(n, start, end, blocked, edges) {
    if (blocked.has(start) || blocked.has(end)) return false;
    if (start === end) return true;
    const adj = new Map();
    for (const [u, v] of edges) {
        if (!adj.has(u)) adj.set(u, []);
        if (!adj.has(v)) adj.set(v, []);
        adj.get(u).push(v);
        adj.get(v).push(u);
    }
    const q = [start];
    const visited = new Set([start]);
    while (q.length) {
        const curr = q.shift();
        if (curr === end) return true;
        for (const nxt of (adj.get(curr) || [])) {
            if (!visited.has(nxt) && !blocked.has(nxt)) {
                visited.add(nxt);
                q.push(nxt);
            }
        }
    }
    return false;
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length >= 2) {
    const [n, s, d] = lines[0].split(/\\s+/).map(Number);
    const bTokens = lines[1].split(/\\s+/).map(Number);
    const blocked = new Set(bTokens.slice(1));
    const edges = lines.slice(2).map(l => l.split(/\\s+/).map(Number));
    console.log(hasPath(n, s, d, blocked, edges) ? 'true' : 'false');
}`,
    },
    expectedPoints: {
      approach: "Standard BFS or DFS graph traversal skipping blocked nodes with a visited set.",
    },
  },

  // ─── MICROSOFT ────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Excel Spreadsheet Formula Evaluator",
    text: `Microsoft Excel evaluates cells that can contain either integer values or simple formulas that sum two cells.
Given N cells defined as: CELL_NAME VALUE_OR_FORMULA
Formulas are formatted as =CELL1+CELL2.
Evaluate all cell values and output them in alphabetical order by cell name.
Guarantee that there are no circular dependencies.`,
    difficulty: "MEDIUM",
    skillTags: ["Topological Sort", "Graphs", "Recursion", "Memoization"],
    companyTags: ["Microsoft"],
    roleTags: ["Backend", "Frontend", "Fullstack"],
    constraints: `1 <= N <= 10^4\nInteger values fit in standard 32-bit signed integers.`,
    examples: [
      {
        input: "3\nA1 10\nB1 =A1+15\nC1 =A1+B1",
        output: "A1: 10\nB1: 25\nC1: 35",
      },
    ],
    starterCode: {
      python: `import sys

def evaluate_spreadsheet(cells):
    # cells is list of (cell_name, expr)
    # Output "CELL: VALUE" sorted by CELL name
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().strip().splitlines()
    if raw:
        pairs = []
        for line in raw[1:]:
            parts = line.split()
            if len(parts) >= 2:
                pairs.append((parts[0], parts[1]))
        res = evaluate_spreadsheet(pairs)
        if res:
            for r in res:
                print(r)`,
      javascript: `const fs = require('fs');

function evaluateSpreadsheet(cells) {
    return [];
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 1) {
    const pairs = lines.slice(1).map(l => l.split(/\\s+/));
    const res = evaluateSpreadsheet(pairs);
    res.forEach(r => console.log(r));
}`,
    },
    testCases: [
      {
        input: "3\nA1 10\nB1 =A1+15\nC1 =A1+B1",
        expected: "A1: 10\nB1: 25\nC1: 35",
        hidden: false,
      },
      {
        input: "2\nX 5\nY =X+10",
        expected: "X: 5\nY: 15",
        hidden: false,
      },
      {
        input: "4\nZ 1\nA =B+C\nB =Z+2\nC =Z+3",
        expected: "A: 7\nB: 3\nC: 4\nZ: 1",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def evaluate_spreadsheet(cells):
    raw_map = {name: expr for name, expr in cells}
    memo = {}

    def resolve(val_str):
        if not val_str.startswith('='):
            return int(val_str)
        formula = val_str[1:]
        left_name, right_name = formula.split('+')
        left_val = eval_cell(left_name) if left_name in raw_map else int(left_name)
        right_val = eval_cell(right_name) if right_name in raw_map else int(right_name)
        return left_val + right_val

    def eval_cell(name):
        if name in memo:
            return memo[name]
        res = resolve(raw_map[name])
        memo[name] = res
        return res

    for name in raw_map:
        eval_cell(name)

    return [f"{k}: {memo[k]}" for k in sorted(memo.keys())]

if __name__ == '__main__':
    raw = sys.stdin.read().strip().splitlines()
    if raw:
        pairs = []
        for line in raw[1:]:
            parts = line.split()
            if len(parts) >= 2:
                pairs.append((parts[0], parts[1]))
        res = evaluate_spreadsheet(pairs)
        for r in res:
            print(r)`,
      javascript: `const fs = require('fs');

function evaluateSpreadsheet(cells) {
    const rawMap = new Map(cells);
    const memo = new Map();

    function evalCell(name) {
        if (memo.has(name)) return memo.get(name);
        const expr = rawMap.get(name);
        if (!expr.startsWith('=')) {
            const val = parseInt(expr, 10);
            memo.set(name, val);
            return val;
        }
        const [left, right] = expr.slice(1).split('+');
        const lVal = rawMap.has(left) ? evalCell(left) : parseInt(left, 10);
        const rVal = rawMap.has(right) ? evalCell(right) : parseInt(right, 10);
        const total = lVal + rVal;
        memo.set(name, total);
        return total;
    }

    for (const [name] of rawMap) {
        evalCell(name);
    }

    return Array.from(memo.keys())
        .sort()
        .map(k => \`\${k}: \${memo.get(k)}\`);
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 1) {
    const pairs = lines.slice(1).map(l => l.split(/\\s+/));
    const res = evaluateSpreadsheet(pairs);
    res.forEach(r => console.log(r));
}`,
    },
    expectedPoints: {
      approach: "Depth-first recursive evaluation with memoization (DAG resolution).",
    },
  },

  // ─── UBER ─────────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Surge Pricing Peak Interval Finder",
    text: `Uber dispatches ride requests that arrive with start and end timestamp intervals [start_i, end_i].
During periods of overlapping requests, surge pricing is activated.
Given an integer array of ride pickup timestamps and drop-off timestamps, determine the maximum number of concurrent active rides at any single moment in time.
Input format: First number N, followed by N lines of: start_time end_time.`,
    difficulty: "EASY",
    skillTags: ["Intervals", "Prefix Sums", "Two Pointers"],
    companyTags: ["Uber"],
    roleTags: ["Backend", "Systems", "Fullstack"],
    constraints: `1 <= N <= 10^5\n0 <= start_i < end_i <= 10^9`,
    examples: [
      {
        input: "3\n1 5\n2 8\n6 10",
        output: "2",
        explanation: "At time t = 3, rides (1, 5) and (2, 8) are both active (2 concurrent rides).",
      },
    ],
    starterCode: {
      python: `import sys

def max_concurrent_rides(intervals):
    # Write solution here
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().split()
    if raw:
        n = int(raw[0])
        intervals = []
        idx = 1
        for _ in range(n):
            intervals.append((int(raw[idx]), int(raw[idx+1])))
            idx += 2
        print(max_concurrent_rides(intervals))`,
      javascript: `const fs = require('fs');

function maxConcurrentRides(intervals) {
    return 0;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length > 1) {
    const n = tokens[0];
    const intervals = [];
    let idx = 1;
    for (let i = 0; i < n; i++) {
        intervals.push([tokens[idx], tokens[idx + 1]]);
        idx += 2;
    }
    console.log(maxConcurrentRides(intervals));
}`,
    },
    testCases: [
      { input: "3 1 5 2 8 6 10", expected: "2", hidden: false },
      { input: "3 1 2 2 3 3 4", expected: "1", hidden: false },
      { input: "4 0 10 1 5 2 7 3 9", expected: "4", hidden: true },
      { input: "2 1 100 50 100", expected: "2", hidden: true },
    ],
    referenceSolution: {
      python: `import sys

def max_concurrent_rides(intervals):
    events = []
    for s, e in intervals:
        events.append((s, 1))
        events.append((e, -1))
    events.sort(key=lambda x: (x[0], x[1]))
    max_c = 0
    curr = 0
    for t, delta in events:
        curr += delta
        max_c = max(max_c, curr)
    return max_c

if __name__ == '__main__':
    raw = sys.stdin.read().split()
    if raw:
        n = int(raw[0])
        intervals = []
        idx = 1
        for _ in range(n):
            intervals.append((int(raw[idx]), int(raw[idx+1])))
            idx += 2
        print(max_concurrent_rides(intervals))`,
      javascript: `const fs = require('fs');

function maxConcurrentRides(intervals) {
    const events = [];
    for (const [s, e] of intervals) {
        events.push([s, 1]);
        events.push([e, -1]);
    }
    events.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
    let maxC = 0;
    let curr = 0;
    for (const [, delta] of events) {
        curr += delta;
        maxC = Math.max(maxC, curr);
    }
    return maxC;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length > 1) {
    const n = tokens[0];
    const intervals = [];
    let idx = 1;
    for (let i = 0; i < n; i++) {
        intervals.push([tokens[idx], tokens[idx + 1]]);
        idx += 2;
    }
    console.log(maxConcurrentRides(intervals));
}`,
    },
    expectedPoints: {
      approach: "Sweep-line algorithm sorting start (+1) and end (-1) time boundaries.",
    },
  },

  // ─── APPLE ────────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Flash Storage Wear-Leveling Block Allocator",
    text: `Apple's SSD storage controller firmware implements wear-leveling algorithms to extend NAND flash lifespan.
Given N flash memory blocks numbered 0 to N-1 with their initial erase cycle counts, allocate blocks for K sequential write operations.
For each allocation, select the block with the lowest current erase count. If multiple blocks have identical lowest erase counts, break ties by selecting the block with the smallest block ID.
Each time a block is allocated, its erase count increases by 1.
Input format: First line: N K. Second line: N space-separated integers representing the initial erase counts of blocks 0 to N-1.`,
    difficulty: "MEDIUM",
    skillTags: ["Min-Heap", "Priority Queue", "Greedy", "Memory Management"],
    companyTags: ["Apple"],
    roleTags: ["Systems", "Backend", "Fullstack"],
    constraints: `1 <= N <= 10^5\n1 <= K <= 10^5\n0 <= initial erase counts <= 10^6`,
    examples: [
      {
        input: "3 5\n2 0 1",
        output: "1 1 2 0 1",
        explanation: "Allocations select the minimal erase count with smallest index on ties.",
      },
    ],
    starterCode: {
      python: `import sys
import heapq

def allocate_blocks(n, k, counts):
    # Return list of allocated block IDs
    pass

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        n, k = int(data[0]), int(data[1])
        counts = [int(x) for x in data[2:2+n]]
        res = allocate_blocks(n, k, counts)
        if res is not None:
            print(' '.join(map(str, res)))`,
      javascript: `const fs = require('fs');

function allocateBlocks(n, k, counts) {
    // Return array of allocated block IDs
    return [];
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length >= 2) {
    const n = tokens[0];
    const k = tokens[1];
    const counts = tokens.slice(2, 2 + n);
    console.log(allocateBlocks(n, k, counts).join(' '));
}`,
    },
    testCases: [
      { input: "3 5\n2 0 1", expected: "1 1 2 0 1", hidden: false },
      { input: "4 4\n5 5 5 5", expected: "0 1 2 3", hidden: false },
      { input: "2 6\n0 0", expected: "0 1 0 1 0 1", hidden: true },
      { input: "5 8\n10 3 7 3 5", expected: "1 3 1 3 1 3 4 1", hidden: true },
    ],
    referenceSolution: {
      python: `import sys
import heapq

def allocate_blocks(n, k, counts):
    heap = [(counts[i], i) for i in range(n)]
    heapq.heapify(heap)
    res = []
    for _ in range(k):
        cnt, b_id = heapq.heappop(heap)
        res.append(b_id)
        heapq.heappush(heap, (cnt + 1, b_id))
    return res

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        n, k = int(data[0]), int(data[1])
        counts = [int(x) for x in data[2:2+n]]
        res = allocate_blocks(n, k, counts)
        print(' '.join(map(str, res)))`,
      javascript: `const fs = require('fs');

class MinHeap {
    constructor() { this.data = []; }
    push(val) {
        this.data.push(val);
        this._up(this.data.length - 1);
    }
    pop() {
        if (!this.data.length) return null;
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length) {
            this.data[0] = last;
            this._down(0);
        }
        return top;
    }
    _compare(a, b) {
        if (a.count !== b.count) return a.count - b.count;
        return a.id - b.id;
    }
    _up(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this._compare(this.data[i], this.data[p]) < 0) {
                [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
                i = p;
            } else break;
        }
    }
    _down(i) {
        const len = this.data.length;
        while ((i << 1) + 1 < len) {
            let left = (i << 1) + 1;
            let right = left + 1;
            let best = left;
            if (right < len && this._compare(this.data[right], this.data[left]) < 0) {
                best = right;
            }
            if (this._compare(this.data[best], this.data[i]) < 0) {
                [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
                i = best;
            } else break;
        }
    }
}

function allocateBlocks(n, k, counts) {
    const heap = new MinHeap();
    for (let i = 0; i < n; i++) {
        heap.push({ count: counts[i], id: i });
    }
    const res = [];
    for (let step = 0; step < k; step++) {
        const top = heap.pop();
        res.push(top.id);
        heap.push({ count: top.count + 1, id: top.id });
    }
    return res;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length >= 2) {
    const n = tokens[0];
    const k = tokens[1];
    const counts = tokens.slice(2, 2 + n);
    console.log(allocateBlocks(n, k, counts).join(' '));
}`,
    },
    expectedPoints: {
      approach: "Min-heap storing (erase_count, block_id) pairs for O(K log N) wear-leveling.",
    },
  },

  // ─── NETFLIX ──────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Adaptive Bitrate Video Chunk LRU Cache",
    text: `Netflix Open Connect Appliances (OCAs) deploy at ISP networks worldwide to cache high-bitrate video chunks.
Implement an LRU (Least Recently Used) cache with fixed maximum capacity C for storing video chunks.
Supported operations:
- PUT <chunk_id> <bitrate>: Store chunk bitrate. If chunk exists, update its bitrate and mark as recently accessed. If inserting a new chunk exceeds capacity C, evict the least recently used chunk.
- GET <chunk_id>: Return chunk bitrate and mark as recently accessed. If chunk is not in cache, return -1.
Output the results of all GET requests separated by spaces.
Input format: First line: C Q (capacity, operation count). Next Q lines: operations.`,
    difficulty: "MEDIUM",
    skillTags: ["LRU Cache", "Hash Map", "Doubly Linked List", "Systems Design"],
    companyTags: ["Netflix"],
    roleTags: ["Backend", "Systems", "DevOps"],
    constraints: `1 <= C <= 5000\n1 <= Q <= 2 * 10^4`,
    examples: [
      {
        input: "2 6\nPUT 101 1080\nPUT 102 720\nGET 101\nPUT 103 480\nGET 102\nGET 103",
        output: "1080 -1 480",
        explanation: "102 was evicted when 103 was put because 101 had been accessed via GET.",
      },
    ],
    starterCode: {
      python: `import sys
from collections import OrderedDict

def simulate_cache(capacity, operations):
    # Return list of GET output values
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        c, q = [int(x) for x in lines[0].split()]
        ops = lines[1:1+q]
        res = simulate_cache(c, ops)
        if res:
            print(' '.join(map(str, res)))`,
      javascript: `const fs = require('fs');

function simulateCache(capacity, operations) {
    return [];
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [c, q] = lines[0].split(/\\s+/).map(Number);
    const ops = lines.slice(1, 1 + q);
    console.log(simulateCache(c, ops).join(' '));
}`,
    },
    testCases: [
      {
        input: "2 6\nPUT 101 1080\nPUT 102 720\nGET 101\nPUT 103 480\nGET 102\nGET 103",
        expected: "1080 -1 480",
        hidden: false,
      },
      {
        input: "1 4\nPUT 1 360\nGET 1\nPUT 2 720\nGET 1",
        expected: "360 -1",
        hidden: false,
      },
      {
        input: "3 5\nPUT 10 100\nPUT 20 200\nPUT 30 300\nGET 10\nGET 40",
        expected: "100 -1",
        hidden: true,
      },
      {
        input: "2 5\nPUT A 10\nPUT B 20\nPUT A 15\nPUT C 30\nGET B",
        expected: "-1",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys
from collections import OrderedDict

def simulate_cache(capacity, operations):
    cache = OrderedDict()
    res = []
    for op in operations:
        parts = op.split()
        cmd = parts[0]
        if cmd == 'PUT':
            cid, br = parts[1], parts[2]
            if cid in cache:
                cache.move_to_end(cid)
            cache[cid] = br
            if len(cache) > capacity:
                cache.popitem(last=False)
        elif cmd == 'GET':
            cid = parts[1]
            if cid in cache:
                cache.move_to_end(cid)
                res.append(cache[cid])
            else:
                res.append('-1')
    return res

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        c, q = [int(x) for x in lines[0].split()]
        ops = lines[1:1+q]
        print(' '.join(map(str, simulate_cache(c, ops))))`,
      javascript: `const fs = require('fs');

function simulateCache(capacity, operations) {
    const cache = new Map();
    const res = [];
    for (const op of operations) {
        const parts = op.split(/\\s+/);
        if (parts[0] === 'PUT') {
            const cid = parts[1];
            const br = parts[2];
            if (cache.has(cid)) {
                cache.delete(cid);
            }
            cache.set(cid, br);
            if (cache.size > capacity) {
                const oldest = cache.keys().next().value;
                cache.delete(oldest);
            }
        } else if (parts[0] === 'GET') {
            const cid = parts[1];
            if (cache.has(cid)) {
                const val = cache.get(cid);
                cache.delete(cid);
                cache.set(cid, val);
                res.push(val);
            } else {
                res.push('-1');
            }
        }
    }
    return res;
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [c, q] = lines[0].split(/\\s+/).map(Number);
    const ops = lines.slice(1, 1 + q);
    console.log(simulateCache(c, ops).join(' '));
}`,
    },
    expectedPoints: {
      approach: "Ordered dictionary / hash map with linked eviction ordering for O(1) LRU access.",
    },
  },

  // ─── META (FRONTEND) ──────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Virtual Feed DOM Windowing Engine",
    text: `Meta's Web Foundation team optimizes news feed rendering on Facebook and Instagram using virtualized DOM windowing.
Given N feed items where item i (0-indexed) has uniform height H pixels.
The user views the feed with a viewport of height V pixels at scroll offset Y pixels.
To smooth rapid scrolling, render B buffer items before the first visible item and B buffer items after the last visible item.
Item i occupies vertical span [i * H, (i + 1) * H). The viewport covers span [Y, Y + V). An item is visible if its span intersects the viewport.
Output the inclusive start and end item indices [start_idx, end_idx] to mount in the virtualized DOM, clamped to [0, N - 1]. If N == 0, output EMPTY.
Input format: Single line with 5 integers: N H V Y B.`,
    difficulty: "EASY",
    skillTags: ["DOM Windowing", "Virtualization", "Binary Search", "Math"],
    companyTags: ["Meta"],
    roleTags: ["Frontend", "Fullstack"],
    constraints: `0 <= N <= 10^6\n1 <= H, V <= 5000\n0 <= Y <= 10^8\n0 <= B <= 100`,
    examples: [
      {
        input: "100 50 200 120 1",
        output: "1 7",
        explanation: "Visible items span [120, 320) which are items 2..6. With buffer 1, range is 1..7.",
      },
    ],
    starterCode: {
      python: `import sys

def virtual_window(n, h, v, y, b):
    # Return string "start end" or "EMPTY"
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().split()
    if raw:
        n, h, v, y, b = [int(x) for x in raw]
        print(virtual_window(n, h, v, y, b))`,
      javascript: `const fs = require('fs');

function virtualWindow(n, h, v, y, b) {
    return "";
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length >= 5) {
    const [n, h, v, y, b] = tokens;
    console.log(virtualWindow(n, h, v, y, b));
}`,
    },
    testCases: [
      { input: "100 50 200 120 1", expected: "1 7", hidden: false },
      { input: "50 100 300 0 0", expected: "0 2", hidden: false },
      { input: "0 50 200 0 2", expected: "EMPTY", hidden: true },
      { input: "20 100 400 1800 3", expected: "15 19", hidden: true },
    ],
    referenceSolution: {
      python: `import sys

def virtual_window(n, h, v, y, b):
    if n == 0:
        return "EMPTY"
    first_visible = max(0, min(n - 1, y // h))
    last_visible = max(0, min(n - 1, (y + v - 1) // h))
    start_idx = max(0, first_visible - b)
    end_idx = min(n - 1, last_visible + b)
    return f"{start_idx} {end_idx}"

if __name__ == '__main__':
    raw = sys.stdin.read().split()
    if raw:
        n, h, v, y, b = [int(x) for x in raw]
        print(virtual_window(n, h, v, y, b))`,
      javascript: `const fs = require('fs');

function virtualWindow(n, h, v, y, b) {
    if (n === 0) return 'EMPTY';
    const firstVisible = Math.max(0, Math.min(n - 1, Math.floor(y / h)));
    const lastVisible = Math.max(0, Math.min(n - 1, Math.floor((y + v - 1) / h)));
    const startIdx = Math.max(0, firstVisible - b);
    const endIdx = Math.min(n - 1, lastVisible + b);
    return \`\${startIdx} \${endIdx}\`;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length >= 5) {
    const [n, h, v, y, b] = tokens;
    console.log(virtualWindow(n, h, v, y, b));
}`,
    },
    expectedPoints: {
      approach: "Constant-time O(1) floor division coordinate mapping clamped with buffer overscan.",
    },
  },

  // ─── AMAZON (DEVOPS) ──────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "AWS CloudFormation Resource Dependency Resolver",
    text: `AWS CloudFormation deploys cloud resources specified in infrastructure-as-code templates.
Each resource specifies zero or more dependencies via 'DependsOn'. All dependencies must be created before the dependent resource can be deployed.
Given N resources and their dependencies, determine a valid sequential deployment order.
If multiple resources are ready to deploy at the same step, break ties alphabetically by resource name.
If a circular dependency cycle exists, output CYCLIC_DEPENDENCY.
Input format: First line: N. Next N lines: RESOURCE_NAME K DEP_1 DEP_2 ... DEP_K.`,
    difficulty: "MEDIUM",
    skillTags: ["Topological Sort", "Cycle Detection", "Directed Acyclic Graph", "Kahn's Algorithm"],
    companyTags: ["Amazon"],
    roleTags: ["DevOps", "Systems", "Backend"],
    constraints: `1 <= N <= 5000\n0 <= dependencies per resource <= N`,
    examples: [
      {
        input: "4\nWebApp 2 Database Redis\nDatabase 1 VPC\nRedis 1 VPC\nVPC 0",
        output: "VPC Database Redis WebApp",
        explanation: "VPC deploys first, Database and Redis deploy next in alphabetical order, WebApp deploys last.",
      },
      {
        input: "2\nServiceA 1 ServiceB\nServiceB 1 ServiceA",
        output: "CYCLIC_DEPENDENCY",
        explanation: "ServiceA and ServiceB form a cycle.",
      },
    ],
    starterCode: {
      python: `import sys
import heapq

def resolve_deployment_order(resources):
    # resources is list of (name, [dep_names])
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        res_list = []
        for line in lines[1:1+n]:
            parts = line.split()
            if parts:
                name = parts[0]
                k = int(parts[1])
                deps = parts[2:2+k]
                res_list.append((name, deps))
        print(resolve_deployment_order(res_list))`,
      javascript: `const fs = require('fs');

function resolveDeploymentOrder(resources) {
    return "";
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const n = parseInt(lines[0], 10);
    const resources = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const parts = lines[i].split(/\\s+/);
        const name = parts[0];
        const k = parseInt(parts[1], 10);
        resources.push({ name, deps: parts.slice(2, 2 + k) });
    }
    console.log(resolveDeploymentOrder(resources));
}`,
    },
    testCases: [
      {
        input: "4\nWebApp 2 Database Redis\nDatabase 1 VPC\nRedis 1 VPC\nVPC 0",
        expected: "VPC Database Redis WebApp",
        hidden: false,
      },
      {
        input: "2\nServiceA 1 ServiceB\nServiceB 1 ServiceA",
        expected: "CYCLIC_DEPENDENCY",
        hidden: false,
      },
      {
        input: "3\nLambda 0\nS3Bucket 0\nDynamoDB 0",
        expected: "DynamoDB Lambda S3Bucket",
        hidden: true,
      },
      {
        input: "4\nFrontEnd 1 AuthAPI\nAuthAPI 1 UserDB\nUserDB 0\nAuditLog 1 UserDB",
        expected: "UserDB AuditLog AuthAPI FrontEnd",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys
import heapq
from collections import defaultdict

def resolve_deployment_order(resources):
    adj = defaultdict(list)
    in_degree = {}
    all_nodes = set()

    for name, deps in resources:
        all_nodes.add(name)
        if name not in in_degree:
            in_degree[name] = 0
        for d in deps:
            all_nodes.add(d)
            adj[d].append(name)
            in_degree[name] = in_degree.get(name, 0) + 1
            if d not in in_degree:
                in_degree[d] = 0

    q = [node for node in all_nodes if in_degree[node] == 0]
    heapq.heapify(q)
    order = []

    while q:
        curr = heapq.heappop(q)
        order.append(curr)
        for nxt in adj[curr]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                heapq.heappush(q, nxt)

    if len(order) < len(all_nodes):
        return "CYCLIC_DEPENDENCY"
    return ' '.join(order)

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        res_list = []
        for line in lines[1:1+n]:
            parts = line.split()
            if parts:
                name = parts[0]
                k = int(parts[1])
                deps = parts[2:2+k]
                res_list.append((name, deps))
        print(resolve_deployment_order(res_list))`,
      javascript: `const fs = require('fs');

function resolveDeploymentOrder(resources) {
    const adj = new Map();
    const inDegree = new Map();
    const allNodes = new Set();

    for (const { name, deps } of resources) {
        allNodes.add(name);
        if (!inDegree.has(name)) inDegree.set(name, 0);
        for (const d of deps) {
            allNodes.add(d);
            if (!adj.has(d)) adj.set(d, []);
            adj.get(d).push(name);
            inDegree.set(name, (inDegree.get(name) || 0) + 1);
            if (!inDegree.has(d)) inDegree.set(d, 0);
        }
    }

    const available = Array.from(allNodes).filter(node => (inDegree.get(node) || 0) === 0);
    available.sort();
    const order = [];

    while (available.length > 0) {
        const curr = available.shift();
        order.push(curr);
        for (const nxt of (adj.get(curr) || [])) {
            inDegree.set(nxt, inDegree.get(nxt) - 1);
            if (inDegree.get(nxt) === 0) {
                available.push(nxt);
                available.sort();
            }
        }
    }

    if (order.length < allNodes.size) {
        return 'CYCLIC_DEPENDENCY';
    }
    return order.join(' ');
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const n = parseInt(lines[0], 10);
    const resources = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const parts = lines[i].split(/\\s+/);
        const name = parts[0];
        const k = parseInt(parts[1], 10);
        resources.push({ name, deps: parts.slice(2, 2 + k) });
    }
    console.log(resolveDeploymentOrder(resources));
}`,
    },
    expectedPoints: {
      approach: "Lexicographical Kahn's topological sort with min-heap / priority queue.",
    },
  },

  // ─── BLOOMBERG ────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Real-Time Limit Order Book Aggregator",
    text: `Bloomberg Terminal market data engines process high-frequency limit buy (BUY) and sell (SELL) orders.
Each limit order specifies SIDE PRICE QUANTITY.
Orders at the same price accumulate quantity. A cancellation or execution arrives as a negative quantity: SIDE PRICE -QTY. If cumulative quantity at a price drops to 0 or below, that price level is removed.
Given N order updates, compute the final spread:
Output BID: <best_bid> ASK: <best_ask> SPREAD: <best_ask - best_bid> where best_bid is highest buy price and best_ask is lowest sell price.
If no buy or no sell orders exist, output NO_MARKET.
Input format: First line: N. Next N lines: SIDE PRICE QUANTITY.`,
    difficulty: "MEDIUM",
    skillTags: ["Order Book", "Sorted Map", "Binary Search", "Data Streams"],
    companyTags: ["Bloomberg"],
    roleTags: ["Backend", "Data Engineer", "Systems"],
    constraints: `1 <= N <= 5 * 10^4\n1 <= PRICE <= 10^6`,
    examples: [
      {
        input: "5\nBUY 100 50\nBUY 102 30\nSELL 105 20\nSELL 108 40\nBUY 102 -30",
        output: "BID: 100 ASK: 105 SPREAD: 5",
        explanation: "102 bid is removed by -30 cancellation. Highest remaining bid is 100, lowest ask is 105.",
      },
      {
        input: "2\nBUY 50 10\nBUY 52 20",
        output: "NO_MARKET",
        explanation: "No sell orders present.",
      },
    ],
    starterCode: {
      python: `import sys

def aggregate_order_book(orders):
    # orders is list of (side, price, qty)
    # Return formatted string or "NO_MARKET"
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        orders = []
        for line in lines[1:1+n]:
            parts = line.split()
            if len(parts) >= 3:
                orders.append((parts[0], int(parts[1]), int(parts[2])))
        print(aggregate_order_book(orders))`,
      javascript: `const fs = require('fs');

function aggregateOrderBook(orders) {
    return "NO_MARKET";
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const n = parseInt(lines[0], 10);
    const orders = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const parts = lines[i].split(/\\s+/);
        orders.push({ side: parts[0], price: parseInt(parts[1], 10), qty: parseInt(parts[2], 10) });
    }
    console.log(aggregateOrderBook(orders));
}`,
    },
    testCases: [
      {
        input: "5\nBUY 100 50\nBUY 102 30\nSELL 105 20\nSELL 108 40\nBUY 102 -30",
        expected: "BID: 100 ASK: 105 SPREAD: 5",
        hidden: false,
      },
      {
        input: "2\nBUY 50 10\nBUY 52 20",
        expected: "NO_MARKET",
        hidden: false,
      },
      {
        input: "4\nBUY 200 100\nSELL 205 100\nBUY 200 -100\nSELL 205 -50",
        expected: "NO_MARKET",
        hidden: true,
      },
      {
        input: "4\nBUY 300 10\nSELL 310 15\nBUY 305 5\nSELL 308 10",
        expected: "BID: 305 ASK: 308 SPREAD: 3",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def aggregate_order_book(orders):
    bids = {}
    asks = {}
    for side, price, qty in orders:
        if side == "BUY":
            bids[price] = bids.get(price, 0) + qty
            if bids[price] <= 0:
                del bids[price]
        elif side == "SELL":
            asks[price] = asks.get(price, 0) + qty
            if asks[price] <= 0:
                del asks[price]

    if not bids or not asks:
        return "NO_MARKET"

    best_bid = max(bids.keys())
    best_ask = min(asks.keys())
    spread = best_ask - best_bid
    return f"BID: {best_bid} ASK: {best_ask} SPREAD: {spread}"

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        orders = []
        for line in lines[1:1+n]:
            parts = line.split()
            if len(parts) >= 3:
                orders.append((parts[0], int(parts[1]), int(parts[2])))
        print(aggregate_order_book(orders))`,
      javascript: `const fs = require('fs');

function aggregateOrderBook(orders) {
    const bids = new Map();
    const asks = new Map();

    for (const { side, price, qty } of orders) {
        const map = side === 'BUY' ? bids : asks;
        const current = (map.get(price) || 0) + qty;
        if (current <= 0) {
            map.delete(price);
        } else {
            map.set(price, current);
        }
    }

    if (bids.size === 0 || asks.size === 0) return 'NO_MARKET';
    const bestBid = Math.max(...bids.keys());
    const bestAsk = Math.min(...asks.keys());
    return \`BID: \${bestBid} ASK: \${bestAsk} SPREAD: \${bestAsk - bestBid}\`;
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const n = parseInt(lines[0], 10);
    const orders = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const parts = lines[i].split(/\\s+/);
        orders.push({ side: parts[0], price: parseInt(parts[1], 10), qty: parseInt(parts[2], 10) });
    }
    console.log(aggregateOrderBook(orders));
}`,
    },
    expectedPoints: {
      approach: "Accumulate order volumes by price level using hash maps and compute best bid/ask bounds.",
    },
  },

  // ─── STRIPE (FRONTEND) ────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Payment Card Luhn Checksum & IIN Brand Classifier",
    text: `Stripe Elements securely validates credit card numbers in checkout forms.
Given a list of card strings:
1. Strip all spaces, dashes, and non-digit characters.
2. Validate using the Luhn checksum algorithm (doubling every 2nd digit from the right, subtracting 9 if > 9; sum must be divisible by 10).
3. If invalid or length < 13 or > 19, output INVALID.
4. If valid, classify the card network:
   - VISA: starts with 4, length 13, 16, or 19.
   - MASTERCARD: starts with 51-55 or 2221-2720, length 16.
   - AMEX: starts with 34 or 37, length 15.
   - DISCOVER: starts with 6011, 65, or 644-649, length 16.
   - Otherwise: OTHER.
Input format: First line: T. Next T lines: card number strings.`,
    difficulty: "EASY",
    skillTags: ["Luhn Algorithm", "Strings", "Validation", "Fintech"],
    companyTags: ["Stripe"],
    roleTags: ["Frontend", "Fullstack"],
    constraints: `1 <= T <= 1000`,
    examples: [
      {
        input: "3\n4104-3321-8196-0018\n5110 4332 1819 6003\n1234-5678-9012-3456",
        output: "VISA\nMASTERCARD\nINVALID",
        explanation: "First card is valid Visa, second is valid Mastercard, third fails Luhn checksum.",
      },
    ],
    starterCode: {
      python: `import sys

def validate_cards(cards):
    # Return list of brand strings or 'INVALID'
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        t = int(lines[0])
        res = validate_cards(lines[1:1+t])
        if res:
            for r in res:
                print(r)`,
      javascript: `const fs = require('fs');

function validateCards(cards) {
    return [];
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const t = parseInt(lines[0], 10);
    const res = validateCards(lines.slice(1, 1 + t));
    res.forEach(r => console.log(r));
}`,
    },
    testCases: [
      {
        input: "3\n4104-3321-8196-0018\n5110 4332 1819 6003\n1234-5678-9012-3456",
        expected: "VISA\nMASTERCARD\nINVALID",
        hidden: false,
      },
      {
        input: "2\n3410-433218-19607\n6011 1043 3218 1969",
        expected: "AMEX\nDISCOVER",
        hidden: false,
      },
      {
        input: "3\n4000\n9999-9999-9999-9999\n4104332181960018",
        expected: "INVALID\nINVALID\nVISA",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def validate_cards(cards):
    res = []
    for card in cards:
        digits = [c for c in card if c.isdigit()]
        num = ''.join(digits)
        if len(num) < 13 or len(num) > 19:
            res.append("INVALID")
            continue

        total = 0
        reverse_digits = [int(d) for d in num[::-1]]
        for i, d in enumerate(reverse_digits):
            if i % 2 == 1:
                doubled = d * 2
                total += (doubled - 9) if doubled > 9 else doubled
            else:
                total += d

        if total % 10 != 0:
            res.append("INVALID")
            continue

        if num.startswith('4') and len(num) in (13, 16, 19):
            res.append("VISA")
        elif len(num) == 16 and (51 <= int(num[:2]) <= 55 or 2221 <= int(num[:4]) <= 2720):
            res.append("MASTERCARD")
        elif len(num) == 15 and (num.startswith('34') or num.startswith('37')):
            res.append("AMEX")
        elif len(num) == 16 and (num.startswith('6011') or num.startswith('65') or 644 <= int(num[:3]) <= 649):
            res.append("DISCOVER")
        else:
            res.append("OTHER")
    return res

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        t = int(lines[0])
        res = validate_cards(lines[1:1+t])
        for r in res:
            print(r)`,
      javascript: `const fs = require('fs');

function validateCards(cards) {
    const res = [];
    for (const card of cards) {
        const num = card.replace(/\\D/g, '');
        if (num.length < 13 || num.length > 19) {
            res.push('INVALID');
            continue;
        }
        let total = 0;
        const rev = num.split('').reverse().map(Number);
        for (let i = 0; i < rev.length; i++) {
            if (i % 2 === 1) {
                const doubled = rev[i] * 2;
                total += doubled > 9 ? doubled - 9 : doubled;
            } else {
                total += rev[i];
            }
        }
        if (total % 10 !== 0) {
            res.push('INVALID');
            continue;
        }
        if (num.startsWith('4') && [13, 16, 19].includes(num.length)) {
            res.push('VISA');
        } else if (num.length === 16 && ((parseInt(num.slice(0, 2), 10) >= 51 && parseInt(num.slice(0, 2), 10) <= 55) || (parseInt(num.slice(0, 4), 10) >= 2221 && parseInt(num.slice(0, 4), 10) <= 2720))) {
            res.push('MASTERCARD');
        } else if (num.length === 15 && (num.startsWith('34') || num.startsWith('37'))) {
            res.push('AMEX');
        } else if (num.length === 16 && (num.startsWith('6011') || num.startsWith('65') || (parseInt(num.slice(0, 3), 10) >= 644 && parseInt(num.slice(0, 3), 10) <= 649))) {
            res.push('DISCOVER');
        } else {
            res.push('OTHER');
        }
    }
    return res;
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const t = parseInt(lines[0], 10);
    const res = validateCards(lines.slice(1, 1 + t));
    res.forEach(r => console.log(r));
}`,
    },
    expectedPoints: {
      approach: "Luhn formula checksum calculation with standard ISO/IEC 7812 IIN range evaluation.",
    },
  },

  // ─── SALESFORCE ───────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Multi-Tenant API Token Bucket Rate Limiter",
    text: `Salesforce Multi-Tenant Cloud enforces API fair usage across tenant organizations using token buckets.
All tenants share identical bucket parameters:
- CAPACITY: Maximum tokens a tenant bucket holds.
- REFILL_RATE: Tokens refilled per second (accrues continuously: elapsed_seconds * REFILL_RATE).
Each tenant starts with a full bucket (CAPACITY tokens) at timestamp 0.
Given CAPACITY, REFILL_RATE, and N chronologically ordered incoming requests:
TIMESTAMP TENANT_ID TOKENS_REQUESTED
For each request:
- Add tokens accrued since the tenant's last request: min(CAPACITY, current_tokens + (timestamp - last_timestamp) * REFILL_RATE).
- If available tokens >= TOKENS_REQUESTED, deduct tokens and output ALLOW.
- Otherwise, output DENY (tokens are unchanged).
Input format: First line: CAPACITY REFILL_RATE N. Next N lines: TIMESTAMP TENANT_ID TOKENS_REQUESTED.`,
    difficulty: "MEDIUM",
    skillTags: ["Token Bucket", "Rate Limiting", "Hash Map", "System Architecture"],
    companyTags: ["Salesforce"],
    roleTags: ["Backend", "DevOps", "Systems"],
    constraints: `1 <= CAPACITY <= 10^5\n1 <= REFILL_RATE <= 10^4\n1 <= N <= 2 * 10^4`,
    examples: [
      {
        input: "10 2 4\n0 OrgA 8\n1 OrgA 5\n2 OrgB 5\n5 OrgA 6",
        output: "ALLOW\nDENY\nALLOW\nALLOW",
        explanation: "At t=1, OrgA has 2 + 2 = 4 tokens, insufficient for 5 tokens requested (DENY). At t=5, OrgA has 4 + 8 = 12 -> clamped to 10 tokens, sufficient for 6 (ALLOW).",
      },
    ],
    starterCode: {
      python: `import sys

def rate_limiter(capacity, refill_rate, requests):
    # requests is list of (timestamp, tenant_id, tokens)
    # Return list of 'ALLOW' or 'DENY'
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        cap, rate, n = [int(x) for x in lines[0].split()]
        reqs = []
        for line in lines[1:1+n]:
            parts = line.split()
            if len(parts) >= 3:
                reqs.append((int(parts[0]), parts[1], int(parts[2])))
        res = rate_limiter(cap, rate, reqs)
        if res:
            for r in res:
                print(r)`,
      javascript: `const fs = require('fs');

function rateLimiter(capacity, refillRate, requests) {
    return [];
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [cap, rate, n] = lines[0].split(/\\s+/).map(Number);
    const reqs = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const parts = lines[i].split(/\\s+/);
        reqs.push({ t: Number(parts[0]), org: parts[1], req: Number(parts[2]) });
    }
    const res = rateLimiter(cap, rate, reqs);
    res.forEach(r => console.log(r));
}`,
    },
    testCases: [
      {
        input: "10 2 4\n0 OrgA 8\n1 OrgA 5\n2 OrgB 5\n5 OrgA 6",
        expected: "ALLOW\nDENY\nALLOW\nALLOW",
        hidden: false,
      },
      {
        input: "5 1 3\n0 Tenant1 6\n1 Tenant1 5\n10 Tenant1 5",
        expected: "DENY\nDENY\nALLOW",
        hidden: false,
      },
      {
        input: "10 5 3\n0 OrgX 10\n1 OrgX 4\n1 OrgX 2",
        expected: "ALLOW\nALLOW\nDENY",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def rate_limiter(capacity, refill_rate, requests):
    tokens = {}
    last_time = {}
    res = []
    for t, org, req in requests:
        if org not in tokens:
            tokens[org] = float(capacity)
            last_time[org] = t
        else:
            elapsed = t - last_time[org]
            tokens[org] = min(float(capacity), tokens[org] + elapsed * refill_rate)
            last_time[org] = t

        if tokens[org] >= req:
            tokens[org] -= req
            res.append("ALLOW")
        else:
            res.append("DENY")
    return res

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        cap, rate, n = [int(x) for x in lines[0].split()]
        reqs = []
        for line in lines[1:1+n]:
            parts = line.split()
            if len(parts) >= 3:
                reqs.append((int(parts[0]), parts[1], int(parts[2])))
        res = rate_limiter(cap, rate, reqs)
        for r in res:
            print(r)`,
      javascript: `const fs = require('fs');

function rateLimiter(capacity, refillRate, requests) {
    const tokens = new Map();
    const lastTime = new Map();
    const res = [];

    for (const { t, org, req } of requests) {
        if (!tokens.has(org)) {
            tokens.set(org, capacity);
            lastTime.set(org, t);
        } else {
            const elapsed = t - lastTime.get(org);
            tokens.set(org, Math.min(capacity, tokens.get(org) + elapsed * refillRate));
            lastTime.set(org, t);
        }

        if (tokens.get(org) >= req) {
            tokens.set(org, tokens.get(org) - req);
            res.push('ALLOW');
        } else {
            res.push('DENY');
        }
    }
    return res;
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [cap, rate, n] = lines[0].split(/\\s+/).map(Number);
    const reqs = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const parts = lines[i].split(/\\s+/);
        reqs.push({ t: Number(parts[0]), org: parts[1], req: Number(parts[2]) });
    }
    const res = rateLimiter(cap, rate, reqs);
    res.forEach(r => console.log(r));
}`,
    },
    expectedPoints: {
      approach: "Stateful token bucket refill arithmetic per tenant key.",
    },
  },

  // ─── ADOBE ────────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Vector Canvas Undo-Redo Document State Manager",
    text: `Adobe Creative Cloud applications maintain an undo-redo command history stack for canvas state management.
Starting with an empty canvas document (""), process N commands:
- TYPE <text>: Appends <text> to the canvas. Clears redo history.
- DELETE <k>: Deletes the last k characters from canvas (or clears canvas if k >= length). Clears redo history.
- UNDO: Reverts the last TYPE or DELETE operation. Does nothing if undo history is empty.
- REDO: Re-applies the most recently undone operation. Does nothing if redo history is empty.
Output the final canvas string, or EMPTY if canvas is empty.
Input format: First line: N. Next N lines: commands.`,
    difficulty: "EASY",
    skillTags: ["Stack", "Command Pattern", "State Management", "String Manipulation"],
    companyTags: ["Adobe"],
    roleTags: ["Frontend", "Fullstack"],
    constraints: `1 <= N <= 10^4`,
    examples: [
      {
        input: "6\nTYPE hello\nTYPE _world\nDELETE 6\nUNDO\nREDO\nTYPE !",
        output: "hello!",
        explanation: "UNDO restored '_world', REDO re-deleted it, TYPE added '!'.",
      },
    ],
    starterCode: {
      python: `import sys

def execute_canvas_commands(commands):
    # Return final canvas string or 'EMPTY'
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        print(execute_canvas_commands(lines[1:1+n]))`,
      javascript: `const fs = require('fs');

function executeCanvasCommands(commands) {
    return "EMPTY";
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const n = parseInt(lines[0], 10);
    console.log(executeCanvasCommands(lines.slice(1, 1 + n)));
}`,
    },
    testCases: [
      {
        input: "6\nTYPE hello\nTYPE _world\nDELETE 6\nUNDO\nREDO\nTYPE !",
        expected: "hello!",
        hidden: false,
      },
      {
        input: "4\nTYPE first\nUNDO\nUNDO\nREDO",
        expected: "first",
        hidden: false,
      },
      {
        input: "5\nTYPE abc\nDELETE 10\nTYPE xyz\nUNDO\nREDO",
        expected: "xyz",
        hidden: true,
      },
      {
        input: "2\nUNDO\nREDO",
        expected: "EMPTY",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def execute_canvas_commands(commands):
    curr = ""
    undo_stack = []
    redo_stack = []
    for cmd in commands:
        if cmd.startswith("TYPE "):
            text = cmd[5:]
            undo_stack.append(curr)
            curr += text
            redo_stack.clear()
        elif cmd.startswith("DELETE "):
            k = int(cmd[7:])
            undo_stack.append(curr)
            curr = curr[:-k] if k < len(curr) else ""
            redo_stack.clear()
        elif cmd == "UNDO":
            if undo_stack:
                redo_stack.append(curr)
                curr = undo_stack.pop()
        elif cmd == "REDO":
            if redo_stack:
                undo_stack.append(curr)
                curr = redo_stack.pop()
    return curr if curr else "EMPTY"

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n = int(lines[0])
        print(execute_canvas_commands(lines[1:1+n]))`,
      javascript: `const fs = require('fs');

function executeCanvasCommands(commands) {
    let curr = '';
    const undoStack = [];
    const redoStack = [];

    for (const line of commands) {
        if (line.startsWith('TYPE ')) {
            const text = line.slice(5);
            undoStack.push(curr);
            curr += text;
            redoStack.length = 0;
        } else if (line.startsWith('DELETE ')) {
            const k = parseInt(line.slice(7), 10);
            undoStack.push(curr);
            curr = k < curr.length ? curr.slice(0, curr.length - k) : '';
            redoStack.length = 0;
        } else if (line === 'UNDO') {
            if (undoStack.length > 0) {
                redoStack.push(curr);
                curr = undoStack.pop();
            }
        } else if (line === 'REDO') {
            if (redoStack.length > 0) {
                undoStack.push(curr);
                curr = redoStack.pop();
            }
        }
    }
    return curr || 'EMPTY';
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const n = parseInt(lines[0], 10);
    console.log(executeCanvasCommands(lines.slice(1, 1 + n)));
}`,
    },
    expectedPoints: {
      approach: "Dual stack undo/redo history maintaining immutable document state snapshots.",
    },
  },

  // ─── GOOGLE (DATA ENGINEER) ───────────────────────────────────────────────
  {
    type: "CODING",
    title: "Search Stream Heavy Hitters Frequency Estimator",
    text: `Google Search log analytics pipelines monitor real-time query terms to identify trending heavy hitters.
Given a sequence of N search queries, identify all terms that occur strictly more than floor(N / K) times.
Output the qualifying queries in alphabetical order separated by spaces. If no query exceeds the frequency threshold, output NONE.
Input format: First line: N K. Next N lines: query strings.`,
    difficulty: "MEDIUM",
    skillTags: ["Frequency Counting", "Hash Map", "Streaming Algorithms", "Top-K"],
    companyTags: ["Google"],
    roleTags: ["Data Engineer", "Backend", "Fullstack"],
    constraints: `1 <= N <= 10^5\n1 <= K <= N`,
    examples: [
      {
        input: "8 3\npython\ngoogle\nsearch\ngoogle\nreact\ngoogle\npython\npython",
        output: "google python",
        explanation: "N=8, K=3. Threshold is floor(8/3)=2. 'google' (3) and 'python' (3) occur > 2 times.",
      },
    ],
    starterCode: {
      python: `import sys

def find_heavy_hitters(n, k, queries):
    # Return string of terms or 'NONE'
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n, k = [int(x) for x in lines[0].split()]
        print(find_heavy_hitters(n, k, lines[1:1+n]))`,
      javascript: `const fs = require('fs');

function findHeavyHitters(n, k, queries) {
    return "NONE";
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [n, k] = lines[0].split(/\\s+/).map(Number);
    console.log(findHeavyHitters(n, k, lines.slice(1, 1 + n)));
}`,
    },
    testCases: [
      {
        input: "8 3\npython\ngoogle\nsearch\ngoogle\nreact\ngoogle\npython\npython",
        expected: "google python",
        hidden: false,
      },
      {
        input: "4 2\na\nb\nc\nd",
        expected: "NONE",
        hidden: false,
      },
      {
        input: "6 4\ncloud\nai\ncloud\nllm\nai\ncloud",
        expected: "ai cloud",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys
from collections import Counter

def find_heavy_hitters(n, k, queries):
    counts = Counter(queries)
    threshold = n // k
    qualified = [q for q, c in counts.items() if c > threshold]
    if not qualified:
        return "NONE"
    return ' '.join(sorted(qualified))

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n, k = [int(x) for x in lines[0].split()]
        print(find_heavy_hitters(n, k, lines[1:1+n]))`,
      javascript: `const fs = require('fs');

function findHeavyHitters(n, k, queries) {
    const counts = new Map();
    for (const q of queries) {
        counts.set(q, (counts.get(q) || 0) + 1);
    }
    const threshold = Math.floor(n / k);
    const qualified = [];
    for (const [q, c] of counts.entries()) {
        if (c > threshold) qualified.push(q);
    }
    if (!qualified.length) return 'NONE';
    qualified.sort();
    return qualified.join(' ');
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [n, k] = lines[0].split(/\\s+/).map(Number);
    console.log(findHeavyHitters(n, k, lines.slice(1, 1 + n)));
}`,
    },
    expectedPoints: {
      approach: "Linear hash-table frequency counting with majority-element threshold filtering.",
    },
  },

  // ─── LINKEDIN ─────────────────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Member Connection Degree Explorer",
    text: `LinkedIn displays connection degrees between professional profiles: 1st-degree (direct friends) and 2nd-degree (connections of 1st-degree connections who are neither the target member nor a 1st-degree connection).
Given an undirected member connection graph and a TARGET_ID, find all 2nd-degree connections.
Output 2nd-degree member IDs in ascending sorted order separated by spaces. If none exist, output NONE.
Input format: First line: M TARGET_ID (edge count, target ID). Next M lines: U V.`,
    difficulty: "EASY",
    skillTags: ["Graphs", "BFS", "Adjacency List", "Breadth-First Search"],
    companyTags: ["LinkedIn"],
    roleTags: ["Fullstack", "Backend"],
    constraints: `1 <= M <= 5 * 10^4\n1 <= Member IDs <= 10^6`,
    examples: [
      {
        input: "5 1\n1 2\n1 3\n2 4\n3 4\n3 5",
        output: "4 5",
        explanation: "1st degree of 1: {2, 3}. 2nd degree: 4 and 5.",
      },
    ],
    starterCode: {
      python: `import sys

def find_second_degree(m, target, edges):
    # Return string of sorted IDs or 'NONE'
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        m, target = [int(x) for x in lines[0].split()]
        edges = []
        for line in lines[1:1+m]:
            parts = [int(x) for x in line.split()]
            if len(parts) >= 2:
                edges.append((parts[0], parts[1]))
        print(find_second_degree(m, target, edges))`,
      javascript: `const fs = require('fs');

function findSecondDegree(m, target, edges) {
    return "NONE";
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [m, target] = lines[0].split(/\\s+/).map(Number);
    const edges = [];
    for (let i = 1; i <= m && i < lines.length; i++) {
        edges.push(lines[i].split(/\\s+/).map(Number));
    }
    console.log(findSecondDegree(m, target, edges));
}`,
    },
    testCases: [
      {
        input: "5 1\n1 2\n1 3\n2 4\n3 4\n3 5",
        expected: "4 5",
        hidden: false,
      },
      {
        input: "3 1\n1 2\n2 3\n1 3",
        expected: "NONE",
        hidden: false,
      },
      {
        input: "6 10\n10 20\n20 30\n30 40\n10 50\n50 60\n60 30",
        expected: "30 60",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys
from collections import defaultdict

def find_second_degree(m, target, edges):
    adj = defaultdict(set)
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)

    first_degree = adj[target]
    second_degree = set()
    for friend in first_degree:
        for fof in adj[friend]:
            if fof != target and fof not in first_degree:
                second_degree.add(fof)

    if not second_degree:
        return "NONE"
    return ' '.join(map(str, sorted(second_degree)))

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        m, target = [int(x) for x in lines[0].split()]
        edges = []
        for line in lines[1:1+m]:
            parts = [int(x) for x in line.split()]
            if len(parts) >= 2:
                edges.append((parts[0], parts[1]))
        print(find_second_degree(m, target, edges))`,
      javascript: `const fs = require('fs');

function findSecondDegree(m, target, edges) {
    const adj = new Map();
    for (const [u, v] of edges) {
        if (!adj.has(u)) adj.set(u, new Set());
        if (!adj.has(v)) adj.set(v, new Set());
        adj.get(u).add(v);
        adj.get(v).add(u);
    }
    const first = adj.get(target) || new Set();
    const second = new Set();
    for (const f of first) {
        for (const fof of (adj.get(f) || new Set())) {
            if (fof !== target && !first.has(fof)) {
                second.add(fof);
            }
        }
    }
    if (second.size === 0) return 'NONE';
    const sorted = Array.from(second).sort((a, b) => a - b);
    return sorted.join(' ');
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [m, target] = lines[0].split(/\\s+/).map(Number);
    const edges = [];
    for (let i = 1; i <= m && i < lines.length; i++) {
        edges.push(lines[i].split(/\\s+/).map(Number));
    }
    console.log(findSecondDegree(m, target, edges));
}`,
    },
    expectedPoints: {
      approach: "Two-step breadth-first expansion across graph adjacency sets.",
    },
  },

  // ─── MICROSOFT (SYSTEMS / DEVOPS) ─────────────────────────────────────────
  {
    type: "CODING",
    title: "Azure VM Resource Bin Packing Optimizer",
    text: `Azure hypervisor schedulers pack containerized VM instances onto physical host servers to minimize hardware footprint.
Each host server provides a maximum capacity of C CPU compute cores.
Given N VM instances requiring cores[0], cores[1], ..., cores[N-1], find the minimum number of host servers required using the First Fit Decreasing (FFD) packing heuristic.
Input format: First line: N C. Second line: N space-separated integers representing core requirements.`,
    difficulty: "HARD",
    skillTags: ["Dynamic Programming", "Bin Packing", "Branch and Bound", "Greedy"],
    companyTags: ["Microsoft"],
    roleTags: ["Systems", "DevOps", "Backend"],
    constraints: `1 <= N <= 1000\n1 <= cores[i] <= C <= 10^4`,
    examples: [
      {
        input: "6 10\n4 8 2 6 5 3",
        output: "3",
        explanation: "FFD groups: (8,2), (6,4), (5,3) into 3 servers of capacity 10.",
      },
    ],
    starterCode: {
      python: `import sys

def ffd_pack(n, c, cores):
    # Return string integer of bins
    pass

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        n, c = int(data[0]), int(data[1])
        cores = [int(x) for x in data[2:2+n]]
        print(ffd_pack(n, c, cores))`,
      javascript: `const fs = require('fs');

function ffdPack(n, c, cores) {
    return 0;
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length >= 2) {
    const n = tokens[0];
    const c = tokens[1];
    const cores = tokens.slice(2, 2 + n);
    console.log(ffdPack(n, c, cores));
}`,
    },
    testCases: [
      { input: "6 10\n4 8 2 6 5 3", expected: "3", hidden: false },
      { input: "4 5\n2 2 2 2", expected: "2", hidden: false },
      { input: "5 12\n12 12 12 12 12", expected: "5", hidden: true },
      { input: "7 15\n9 8 7 6 5 4 3", expected: "3", hidden: true },
    ],
    referenceSolution: {
      python: `import sys

def ffd_pack(n, c, cores):
    cores.sort(reverse=True)
    bins = []
    for item in cores:
        placed = False
        for i in range(len(bins)):
            if bins[i] + item <= c:
                bins[i] += item
                placed = True
                break
        if not placed:
            bins.append(item)
    return str(len(bins))

if __name__ == '__main__':
    data = sys.stdin.read().split()
    if data:
        n, c = int(data[0]), int(data[1])
        cores = [int(x) for x in data[2:2+n]]
        print(ffd_pack(n, c, cores))`,
      javascript: `const fs = require('fs');

function ffdPack(n, c, cores) {
    cores.sort((a, b) => b - a);
    const bins = [];
    for (const item of cores) {
        let placed = false;
        for (let i = 0; i < bins.length; i++) {
            if (bins[i] + item <= c) {
                bins[i] += item;
                placed = true;
                break;
            }
        }
        if (!placed) {
            bins.push(item);
        }
    }
    return String(bins.length);
}

const tokens = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
if (tokens.length >= 2) {
    const n = tokens[0];
    const c = tokens[1];
    const cores = tokens.slice(2, 2 + n);
    console.log(ffdPack(n, c, cores));
}`,
    },
    expectedPoints: {
      approach: "First-Fit Decreasing (FFD) approximation heuristic achieving 11/9 OPT + 6/9 bounds.",
    },
  },

  // ─── UBER (DATA ENGINEER) ─────────────────────────────────────────────────
  {
    type: "CODING",
    title: "Driver Dispatch Nearest Geohash Cluster",
    text: `Uber's dispatch matching engine pairs riders with the nearest available drivers.
Given rider pickup location (R_x, R_y) and N driver locations (D_id, X_i, Y_i), find the K closest drivers ranked by squared Euclidean distance: (X_i - R_x)^2 + (Y_i - R_y)^2.
If drivers are equidistant, break ties by selecting the smaller D_id.
Output the K driver IDs separated by spaces in order from closest to farthest.
Input format: First line: N K R_x R_y. Next N lines: D_id X_i Y_i.`,
    difficulty: "EASY",
    skillTags: ["Geometry", "Sorting", "Priority Queue", "Math"],
    companyTags: ["Uber"],
    roleTags: ["Backend", "Data Engineer", "Systems"],
    constraints: `1 <= K <= N <= 5 * 10^4\n-10^4 <= Coordinates <= 10^4`,
    examples: [
      {
        input: "4 2 0 0\n101 1 2\n102 3 3\n103 -1 -1\n104 2 1",
        output: "103 101",
        explanation: "103 has dist 2. 101 and 104 have dist 5; 101 is chosen by smaller ID.",
      },
    ],
    starterCode: {
      python: `import sys

def find_nearest_drivers(n, k, rx, ry, drivers):
    # drivers is list of (did, x, y)
    # Return string of driver IDs
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n, k, rx, ry = [int(x) for x in lines[0].split()]
        drivers = []
        for line in lines[1:1+n]:
            parts = [int(x) for x in line.split()]
            if len(parts) >= 3:
                drivers.append((parts[0], parts[1], parts[2]))
        print(find_nearest_drivers(n, k, rx, ry, drivers))`,
      javascript: `const fs = require('fs');

function findNearestDrivers(n, k, rx, ry, drivers) {
    return "";
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [n, k, rx, ry] = lines[0].split(/\\s+/).map(Number);
    const drivers = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const [did, x, y] = lines[i].split(/\\s+/).map(Number);
        drivers.push({ did, x, y });
    }
    console.log(findNearestDrivers(n, k, rx, ry, drivers));
}`,
    },
    testCases: [
      {
        input: "4 2 0 0\n101 1 2\n102 3 3\n103 -1 -1\n104 2 1",
        expected: "103 101",
        hidden: false,
      },
      {
        input: "3 1 10 10\n201 10 12\n202 10 9\n203 12 10",
        expected: "202",
        hidden: false,
      },
      {
        input: "5 3 0 0\n1 5 0\n2 -5 0\n3 0 5\n4 0 -5\n5 1 1",
        expected: "5 1 2",
        hidden: true,
      },
    ],
    referenceSolution: {
      python: `import sys

def find_nearest_drivers(n, k, rx, ry, drivers):
    scored = []
    for did, x, y in drivers:
        dist_sq = (x - rx) ** 2 + (y - ry) ** 2
        scored.append((dist_sq, did))
    scored.sort(key=lambda item: (item[0], item[1]))
    res = [str(item[1]) for item in scored[:k]]
    return ' '.join(res)

if __name__ == '__main__':
    lines = sys.stdin.read().strip().splitlines()
    if lines:
        n, k, rx, ry = [int(x) for x in lines[0].split()]
        drivers = []
        for line in lines[1:1+n]:
            parts = [int(x) for x in line.split()]
            if len(parts) >= 3:
                drivers.append((parts[0], parts[1], parts[2]))
        print(find_nearest_drivers(n, k, rx, ry, drivers))`,
      javascript: `const fs = require('fs');

function findNearestDrivers(n, k, rx, ry, drivers) {
    const scored = [];
    for (const { did, x, y } of drivers) {
        const distSq = (x - rx) ** 2 + (y - ry) ** 2;
        scored.push({ did, distSq });
    }
    scored.sort((a, b) => a.distSq !== b.distSq ? a.distSq - b.distSq : a.did - b.did);
    return scored.slice(0, k).map(d => d.did).join(' ');
}

const lines = fs.readFileSync(0, 'utf8').trim().split('\\n').map(s => s.trim()).filter(Boolean);
if (lines.length > 0) {
    const [n, k, rx, ry] = lines[0].split(/\\s+/).map(Number);
    const drivers = [];
    for (let i = 1; i <= n && i < lines.length; i++) {
        const [did, x, y] = lines[i].split(/\\s+/).map(Number);
        drivers.push({ did, x, y });
    }
    console.log(findNearestDrivers(n, k, rx, ry, drivers));
}`,
    },
    expectedPoints: {
      approach: "Squared Euclidean distance computation with custom tie-breaker sorting.",
    },
  },
];
