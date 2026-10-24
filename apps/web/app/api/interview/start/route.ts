import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/http";
import { AccessToken, RoomServiceClient, AgentDispatchClient } from "livekit-server-sdk";

export async function POST(_request: Request) {
    const { error, user } = await requireUser();
    if (error || !user) return error!;

    // --- Verify user has a resume and JD ---
    const [resume, jd] = await Promise.all([
        prisma.resume.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
        prisma.jobDescription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!resume || !jd) {
        return jsonError(400, "BAD_REQUEST", "Please upload a resume and job description before starting an interview.");
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
        return jsonError(503, "LIVEKIT_NOT_CONFIGURED", "LiveKit is not configured. Check LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in .env.");
    }

    const body = await _request.json().catch(() => ({}));
    const requestedLanguage = typeof body?.language === "string" ? body.language : "en";

    // --- Select a coding problem based on JD or question bank ---
    let codingQ = await prisma.question.findFirst({
        where: { type: "CODING", deletedAt: null },
    });

    const defaultCodingProblem = {
        id: "prob_two_sum_001",
        title: "Two Sum",
        statement: "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.",
        constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists. You may not use the same element twice.",
        examples: [
            { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
            { input: "nums = [3,2,4], target = 6", output: "[1,2]" }
        ],
        difficulty: "EASY",
        topicTags: ["Array", "Hash Table"],
        language: "python",
        starterCode: {
            python: "def two_sum(nums, target):\n    # Write your solution here\n    pass\n\nimport sys\nline = sys.stdin.read().strip().split()\nif line:\n    n = int(line[0]); target = int(line[1]); nums = list(map(int, line[2:]))\n    res = two_sum(nums, target)\n    print(' '.join(map(str, res)) if res else '')",
            javascript: "function twoSum(nums, target) {\n    // Write your solution here\n    return [];\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nif (input.length >= 2) {\n    const n = input[0], target = input[1], nums = input.slice(2);\n    console.log(twoSum(nums, target).join(' '));\n}",
            cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write solution\n    return {};\n}\n\nint main() {\n    int n, target;\n    if (cin >> n >> target) {\n        vector<int> nums(n);\n        for(int i=0; i<n; i++) cin >> nums[i];\n        auto res = twoSum(nums, target);\n        if (res.size() >= 2) cout << res[0] << ' ' << res[1] << endl;\n    }\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int target = sc.nextInt();\n            int[] nums = new int[n];\n            for (int i=0; i<n; i++) nums[i] = sc.nextInt();\n            int[] res = twoSum(nums, target);\n            if (res.length >= 2) System.out.println(res[0] + \" \" + res[1]);\n        }\n    }\n}"
        },
        testCases: [
            { input: "4 9 2 7 11 15", expected: "0 1", hidden: false },
            { input: "3 6 3 2 4", expected: "1 2", hidden: false },
            { input: "2 6 3 3", expected: "0 1", hidden: false },
            { input: "5 0 -1 0 1 2 3", expected: "0 2", hidden: true },
            { input: "4 8 1 4 5 3", expected: "2 3", hidden: true }
        ],
        referenceSolution: {
            python: "def two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n    return []"
        },
        expectedComplexity: {
            time: "O(n)",
            space: "O(n)",
            explanation: "Single-pass hash table lookup achieves O(n) time with O(n) auxiliary space."
        },
        commonMistakes: [
            "Brute force nested loops taking O(n^2) time",
            "Using the same element twice (e.g. nums[i] + nums[i] == target)",
            "Sorting the array first without keeping track of original indices",
            "Handling negative numbers or zero target incorrectly"
        ],
        hints: [
            "What kind of data structure allows O(1) average-time lookups for values you have already inspected?",
            "Consider a hash map storing each number as the key and its index as the value while iterating.",
            "Check if target minus the current number is already in your hash map before inserting the current number."
        ]
    };

    const codingProblem = codingQ ? {
        id: codingQ.id,
        title: codingQ.title || "Technical Coding Problem",
        statement: codingQ.text,
        constraints: codingQ.constraints || defaultCodingProblem.constraints,
        examples: codingQ.examples || defaultCodingProblem.examples,
        difficulty: codingQ.difficulty || "MEDIUM",
        topicTags: (codingQ as any).topicTags || defaultCodingProblem.topicTags,
        language: defaultCodingProblem.language,
        starterCode: codingQ.starterCode || defaultCodingProblem.starterCode,
        testCases: codingQ.testCases || defaultCodingProblem.testCases,
        referenceSolution: (codingQ as any).referenceSolution || defaultCodingProblem.referenceSolution,
        expectedComplexity: (codingQ as any).expectedComplexity || defaultCodingProblem.expectedComplexity,
        commonMistakes: (codingQ as any).commonMistakes || defaultCodingProblem.commonMistakes,
        hints: (codingQ as any).hints || defaultCodingProblem.hints,
    } : defaultCodingProblem;

    // --- Create the InterviewSession row ---
    const session = await prisma.interviewSession.create({
        data: {
            userId: user.id,
            resumeId: resume.id,
            jdId: jd.id,
            status: "CREATED",
            language: requestedLanguage,
            config: { type: "general", difficulty: "medium", language: requestedLanguage },
            skillGap: {},
            codingProblem: codingProblem as any,
        },
    });

    // --- Create the LiveKit room ---
    const roomName = `interview-${session.id}`;
    const host = livekitUrl.replace("ws://", "http://").replace("wss://", "https://");
    const roomService = new RoomServiceClient(host, apiKey, apiSecret);
    const dispatchClient = new AgentDispatchClient(host, apiKey, apiSecret);

    try {
        await roomService.createRoom({
            name: roomName,
            emptyTimeout: 300,
            metadata: JSON.stringify({ sessionId: session.id, interviewId: session.id }),
        });
    } catch (err: any) {
        // Room may already exist (idempotent), so only fail on unexpected errors
        if (!err?.message?.includes("already exists")) {
            console.error("[interview/start] Failed to create LiveKit room:", err);
            return jsonError(502, "LIVEKIT_ERROR", `Failed to create interview room: ${err.message}`);
        }
    }

    // --- Dispatch the interview-bot agent to the room ---
    try {
        await dispatchClient.createDispatch(roomName, "interview-bot", {
            metadata: JSON.stringify({ sessionId: session.id, interviewId: session.id }),
        });
        console.log(`[interview/start] Dispatched agent 'interview-bot' to room ${roomName}`);
    } catch (dispatchErr: any) {
        console.warn("[interview/start] Agent dispatch warning:", dispatchErr?.message || dispatchErr);
    }

    // --- Update session with the room name ---
    await prisma.interviewSession.update({
        where: { id: session.id },
        data: { livekitRoom: roomName, status: "IN_PROGRESS", startedAt: new Date() },
    });

    // --- Generate a short-lived participant token for the browser ---
    const at = new AccessToken(apiKey, apiSecret, {
        identity: user.id,
        name: user.name ?? "Candidate",
        ttl: "2h",
    });
    at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
    });
    const token = await at.toJwt();

    return jsonOk({
        sessionId: session.id,
        token,
        wsUrl: livekitUrl,
        roomName,
    });
}
