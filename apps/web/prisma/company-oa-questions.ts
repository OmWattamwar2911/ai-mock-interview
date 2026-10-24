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
];
