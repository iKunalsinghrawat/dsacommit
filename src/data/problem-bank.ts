export type ProblemSeed = {
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicSlug: string;
  problemStatement: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  hints: string[];
  editorial: string;
  similarProblemSlugs: string[];
  roleFocus?: string;
  frequency: number;
  estimatedMinutes: number;
  isFeatured?: boolean;
  companyTags: Array<{
    companySlug: string;
    frequency: number;
    role?: string;
    notes?: string;
  }>;
};

export const problemSeed: ProblemSeed[] = [
  {
    title: "Campus Water Bills",
    slug: "campus-water-bills",
    difficulty: "EASY",
    topicSlug: "programming-logic",
    problemStatement:
      "A hostel charges students based on tiered water usage. Given monthly units used, return the total bill using the slab rules and add a fixed maintenance fee.",
    examples: [
      {
        input: "units = 18, slabs = [[10,2],[10,3]], fee = 20",
        output: "66",
        explanation: "First 10 units cost 20, next 8 cost 24, plus 20 fee.",
      },
    ],
    constraints: ["0 <= units <= 10^5", "At most 10 billing slabs"],
    hints: [
      "Process slabs from lowest to highest and subtract the units already billed.",
      "Track the remaining units after each slab.",
    ],
    editorial:
      "This is a pure rule-application problem. The solution becomes clean once you define how many units each slab can consume and stop once no usage remains.",
    similarProblemSlugs: ["loop-ops-budget"],
    roleFocus: "Foundation",
    frequency: 2,
    estimatedMinutes: 15,
    isFeatured: true,
    companyTags: [
      { companySlug: "tcs", frequency: 3, role: "Ninja", notes: "Good for logic-building rounds." },
      { companySlug: "infosys", frequency: 2, role: "Assessment" },
    ],
  },
  {
    title: "Pair Sum Checkpoint",
    slug: "pair-sum-checkpoint",
    difficulty: "EASY",
    topicSlug: "arrays",
    problemStatement:
      "Given an array of integers and a target value, return whether any two numbers sum to the target.",
    examples: [
      {
        input: "nums = [3, 5, 1, 7], target = 8",
        output: "true",
        explanation: "1 and 7 form the target sum.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    hints: [
      "Start with the brute force pair scan.",
      "Then ask what information would let you decide in O(1) while iterating.",
    ],
    editorial:
      "A hash set stores seen values so each new number can immediately check whether its complement has already appeared. That reduces the solution from O(n^2) to O(n).",
    similarProblemSlugs: ["top-k-frequent-ids", "sorted-squares-merge"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 20,
    isFeatured: true,
    companyTags: [
      { companySlug: "amazon", frequency: 4, role: "SDE I" },
      { companySlug: "walmart", frequency: 3, role: "Intern" },
      { companySlug: "tcs", frequency: 2, role: "Digital" },
    ],
  },
  {
    title: "Rotate Array by K",
    slug: "rotate-array-by-k",
    difficulty: "EASY",
    topicSlug: "arrays",
    problemStatement:
      "Rotate the array to the right by k steps and return the resulting order.",
    examples: [
      {
        input: "nums = [1,2,3,4,5], k = 2",
        output: "[4,5,1,2,3]",
        explanation: "The last two elements move to the front.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "0 <= k <= 10^5"],
    hints: [
      "Reduce k with modulo length before doing anything else.",
      "There is a clean in-place reversal approach.",
    ],
    editorial:
      "After normalizing k, reverse the full array, then reverse the first k elements and the remaining suffix. This delivers O(n) time and O(1) extra space.",
    similarProblemSlugs: ["sorted-squares-merge"],
    roleFocus: "Placement",
    frequency: 3,
    estimatedMinutes: 20,
    companyTags: [
      { companySlug: "amazon", frequency: 3 },
      { companySlug: "flipkart", frequency: 3 },
      { companySlug: "zoho", frequency: 2 },
    ],
  },
  {
    title: "Longest Unique Substring",
    slug: "longest-unique-substring",
    difficulty: "MEDIUM",
    topicSlug: "strings",
    problemStatement:
      "Return the length of the longest substring with no repeating characters.",
    examples: [
      {
        input: "s = \"abcaef\"",
        output: "5",
        explanation: "\"bcaef\" is the longest substring with all unique characters.",
      },
    ],
    constraints: ["0 <= s.length <= 10^5", "String contains visible ASCII characters"],
    hints: [
      "A brute force substring check works, but it repeats too much work.",
      "Track the last seen index of each character while moving the left boundary.",
    ],
    editorial:
      "Sliding window plus a hash map gives the optimal solution. Whenever a duplicate appears inside the active window, move the left boundary just past the previous occurrence.",
    similarProblemSlugs: ["smallest-window-over-target", "anagram-window-alerts"],
    roleFocus: "Intern",
    frequency: 5,
    estimatedMinutes: 25,
    isFeatured: true,
    companyTags: [
      { companySlug: "google", frequency: 4 },
      { companySlug: "adobe", frequency: 4 },
      { companySlug: "zoho", frequency: 3 },
    ],
  },
  {
    title: "Anagram Window Alerts",
    slug: "anagram-window-alerts",
    difficulty: "MEDIUM",
    topicSlug: "strings",
    problemStatement:
      "Given a text and a pattern, return all starting indices where any permutation of the pattern appears in the text.",
    examples: [
      {
        input: "text = \"cbaebabacd\", pattern = \"abc\"",
        output: "[0, 6]",
        explanation: "The substrings at 0 and 6 are anagrams of \"abc\".",
      },
    ],
    constraints: ["1 <= text.length <= 10^5", "Pattern length is at most text length"],
    hints: [
      "All valid windows have fixed size equal to the pattern length.",
      "Compare counts incrementally instead of rebuilding maps for every window.",
    ],
    editorial:
      "Use a fixed-size sliding window with character counts. Only the entering and leaving characters change, which keeps the solution linear.",
    similarProblemSlugs: ["longest-unique-substring", "smallest-window-over-target"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 30,
    companyTags: [
      { companySlug: "adobe", frequency: 4 },
      { companySlug: "atlassian", frequency: 3 },
      { companySlug: "zoho", frequency: 3 },
    ],
  },
  {
    title: "Loop Ops Budget",
    slug: "loop-ops-budget",
    difficulty: "EASY",
    topicSlug: "time-complexity",
    problemStatement:
      "You are given a pseudocode snippet with simple nested loops. Return the asymptotic time complexity category from a small allowed list.",
    examples: [
      {
        input: "for i in n: for j in n:",
        output: "O(n^2)",
        explanation: "Both loops scale with n, so total work is multiplicative.",
      },
    ],
    constraints: ["Only O(1), O(log n), O(n), O(n log n), and O(n^2) outputs are used"],
    hints: [
      "Count how many times the inner work can run as n grows.",
      "Ignore constants and focus on the dominant term.",
    ],
    editorial:
      "This problem checks whether the student can translate structure into growth rate. The correct answer comes from identifying repeated work rather than exact runtime.",
    similarProblemSlugs: ["campus-water-bills"],
    roleFocus: "Foundation",
    frequency: 2,
    estimatedMinutes: 10,
    companyTags: [
      { companySlug: "walmart", frequency: 2 },
      { companySlug: "infosys", frequency: 2 },
    ],
  },
  {
    title: "Recursive Stairs Counter",
    slug: "recursive-stairs-counter",
    difficulty: "EASY",
    topicSlug: "basic-recursion",
    problemStatement:
      "A student can climb 1 or 2 steps at a time. Return how many distinct ways exist to reach step n.",
    examples: [
      {
        input: "n = 4",
        output: "5",
        explanation: "The valid paths are 1111, 112, 121, 211, and 22.",
      },
    ],
    constraints: ["1 <= n <= 45"],
    hints: [
      "What are the last moves that could land on step n?",
      "Try a recursive relation before optimizing repeated work.",
    ],
    editorial:
      "The recurrence is f(n) = f(n-1) + f(n-2). The recursive version is perfect for learning base cases, and memoization upgrades it to a practical solution.",
    similarProblemSlugs: ["climbing-stairs-cost-optimizer"],
    roleFocus: "Foundation",
    frequency: 3,
    estimatedMinutes: 20,
    companyTags: [
      { companySlug: "infosys", frequency: 3 },
      { companySlug: "tcs", frequency: 2 },
    ],
  },
  {
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "EASY",
    topicSlug: "linked-list",
    problemStatement:
      "Reverse a singly linked list and return the new head.",
    examples: [
      {
        input: "1 -> 2 -> 3 -> 4",
        output: "4 -> 3 -> 2 -> 1",
        explanation: "Every node must point to its previous node after reversal.",
      },
    ],
    constraints: ["List size is between 0 and 10^5"],
    hints: [
      "Track previous, current, and next carefully.",
      "Draw the pointer movement before coding.",
    ],
    editorial:
      "This problem is small but high-signal because it exposes pointer discipline. Store next before rewiring current, then advance the window.",
    similarProblemSlugs: ["linked-list-cycle-watch"],
    roleFocus: "Intern",
    frequency: 5,
    estimatedMinutes: 20,
    isFeatured: true,
    companyTags: [
      { companySlug: "microsoft", frequency: 4 },
      { companySlug: "amazon", frequency: 4 },
      { companySlug: "google", frequency: 3 },
    ],
  },
  {
    title: "Linked List Cycle Watch",
    slug: "linked-list-cycle-watch",
    difficulty: "MEDIUM",
    topicSlug: "linked-list",
    problemStatement:
      "Return whether a singly linked list contains a cycle.",
    examples: [
      {
        input: "3 -> 2 -> 0 -> -4, tail connects to index 1",
        output: "true",
        explanation: "The tail points back to value 2, creating a cycle.",
      },
    ],
    constraints: ["List size is between 0 and 10^5"],
    hints: [
      "A set works, but there is a constant-space method.",
      "Think about how two pointers moving at different speeds behave in a cycle.",
    ],
    editorial:
      "Floyd's tortoise and hare algorithm is ideal here. If a cycle exists, a fast pointer and a slow pointer must eventually meet inside it.",
    similarProblemSlugs: ["reverse-linked-list"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "microsoft", frequency: 4 },
      { companySlug: "google", frequency: 3 },
      { companySlug: "walmart", frequency: 2 },
    ],
  },
  {
    title: "Valid Bracket Streak",
    slug: "valid-bracket-streak",
    difficulty: "EASY",
    topicSlug: "stack",
    problemStatement:
      "Given a string of brackets, return whether the sequence is valid and balanced.",
    examples: [
      {
        input: "s = \"{[()]}\"",
        output: "true",
        explanation: "Every opening bracket is closed in the correct order.",
      },
    ],
    constraints: ["1 <= s.length <= 10^5"],
    hints: [
      "Closing brackets must match the most recent unmatched opening bracket.",
      "Store openings as you scan the string.",
    ],
    editorial:
      "A stack is the natural fit because the newest unmatched opening bracket must be resolved first. The sequence is valid only if every close matches and the stack ends empty.",
    similarProblemSlugs: ["min-stack-tracker"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 15,
    companyTags: [
      { companySlug: "amazon", frequency: 3 },
      { companySlug: "adobe", frequency: 3 },
      { companySlug: "infosys", frequency: 2 },
    ],
  },
  {
    title: "Min Stack Tracker",
    slug: "min-stack-tracker",
    difficulty: "MEDIUM",
    topicSlug: "stack",
    problemStatement:
      "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
    examples: [
      {
        input: "push(3), push(1), push(2), getMin()",
        output: "1",
        explanation: "The minimum remains available without scanning the full stack.",
      },
    ],
    constraints: ["At most 2 * 10^5 operations"],
    hints: [
      "Track more than just the value on each push.",
      "What minimum information must survive after a pop?",
    ],
    editorial:
      "Store the running minimum alongside each pushed value, or maintain a secondary min stack. Either approach keeps every operation at O(1).",
    similarProblemSlugs: ["valid-bracket-streak"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "amazon", frequency: 4 },
      { companySlug: "flipkart", frequency: 3 },
    ],
  },
  {
    title: "Queue Using Two Stacks",
    slug: "queue-using-two-stacks",
    difficulty: "MEDIUM",
    topicSlug: "queue",
    problemStatement:
      "Implement a queue using only stack operations.",
    examples: [
      {
        input: "push(1), push(2), pop(), peek()",
        output: "pop = 1, peek = 2",
        explanation: "The oldest pushed item must come out first.",
      },
    ],
    constraints: ["At most 10^5 operations"],
    hints: [
      "One stack can handle incoming elements.",
      "Only move elements when the outgoing stack is empty.",
    ],
    editorial:
      "Two stacks simulate FIFO behavior efficiently. Elements are reversed once into the output stack, which makes amortized operations O(1).",
    similarProblemSlugs: ["circular-queue-simulator"],
    roleFocus: "Intern",
    frequency: 3,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "walmart", frequency: 3 },
      { companySlug: "tcs", frequency: 2 },
    ],
  },
  {
    title: "Circular Queue Simulator",
    slug: "circular-queue-simulator",
    difficulty: "MEDIUM",
    topicSlug: "queue",
    problemStatement:
      "Design a fixed-size circular queue that supports enqueue, dequeue, front, rear, and isFull checks.",
    examples: [
      {
        input: "size = 3, enqueue(10), enqueue(20), enqueue(30), dequeue(), enqueue(40)",
        output: "queue = [20,30,40]",
        explanation: "The freed index is reused after the dequeue.",
      },
    ],
    constraints: ["1 <= capacity <= 10^4"],
    hints: [
      "Track head, tail, and current size explicitly.",
      "Wrap around using modulo arithmetic.",
    ],
    editorial:
      "A circular queue avoids shifting data by reusing empty slots. Modulo arithmetic turns the backing array into a ring.",
    similarProblemSlugs: ["queue-using-two-stacks"],
    roleFocus: "Placement",
    frequency: 2,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "walmart", frequency: 2 },
      { companySlug: "tcs", frequency: 2 },
    ],
  },
  {
    title: "First Bad Release",
    slug: "first-bad-release",
    difficulty: "EASY",
    topicSlug: "binary-search",
    problemStatement:
      "Versions are numbered from 1 to n and once a version is bad, every later version is also bad. Return the first bad version.",
    examples: [
      {
        input: "n = 8, firstBad = 5",
        output: "5",
        explanation: "Versions 5 to 8 are bad, so 5 is the leftmost bad version.",
      },
    ],
    constraints: ["1 <= n <= 2^31 - 1"],
    hints: [
      "The key is not to search for equality but for the first true position.",
      "Maintain a candidate answer when you move left.",
    ],
    editorial:
      "This is a boundary binary search. Whenever mid is bad, keep it as a possible answer and continue left to search for an earlier bad version.",
    similarProblemSlugs: ["search-rotated-array"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 20,
    companyTags: [
      { companySlug: "google", frequency: 3 },
      { companySlug: "walmart", frequency: 3 },
      { companySlug: "microsoft", frequency: 2 },
    ],
  },
  {
    title: "Search Rotated Array",
    slug: "search-rotated-array",
    difficulty: "MEDIUM",
    topicSlug: "binary-search",
    problemStatement:
      "Given a sorted array rotated at an unknown pivot, return the index of target or -1 if absent.",
    examples: [
      {
        input: "nums = [4,5,6,7,0,1,2], target = 0",
        output: "4",
        explanation: "The target appears after the rotation pivot.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "All values are distinct"],
    hints: [
      "At least one half is still sorted at every step.",
      "Use that sorted half to decide whether the target can lie there.",
    ],
    editorial:
      "Binary search still works because one side of mid is always ordered. Identify the sorted half first, then test whether the target belongs inside that interval.",
    similarProblemSlugs: ["first-bad-release"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 30,
    companyTags: [
      { companySlug: "google", frequency: 4 },
      { companySlug: "amazon", frequency: 3 },
      { companySlug: "walmart", frequency: 2 },
    ],
  },
  {
    title: "Top K Frequent IDs",
    slug: "top-k-frequent-ids",
    difficulty: "MEDIUM",
    topicSlug: "hashing",
    problemStatement:
      "Return the k most frequent numbers from the given array in any order.",
    examples: [
      {
        input: "nums = [1,1,1,2,2,3], k = 2",
        output: "[1,2]",
        explanation: "1 appears three times and 2 appears twice.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "1 <= k <= number of distinct values"],
    hints: [
      "First compute frequencies.",
      "Then choose whether sorting or a heap is better for the final step.",
    ],
    editorial:
      "Hashing finds the counts in one pass. A min-heap of size k or bucket-style grouping can extract the most frequent values efficiently.",
    similarProblemSlugs: ["pair-sum-checkpoint", "kth-largest-element-stream"],
    roleFocus: "Intern",
    frequency: 5,
    estimatedMinutes: 25,
    isFeatured: true,
    companyTags: [
      { companySlug: "amazon", frequency: 4 },
      { companySlug: "flipkart", frequency: 4 },
      { companySlug: "atlassian", frequency: 3 },
    ],
  },
  {
    title: "Group Shifted Anagrams",
    slug: "group-shifted-anagrams",
    difficulty: "MEDIUM",
    topicSlug: "hashing",
    problemStatement:
      "Group strings that become identical after sorting their characters.",
    examples: [
      {
        input: "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        output: "[[\"eat\",\"tea\",\"ate\"],[\"tan\",\"nat\"],[\"bat\"]]",
        explanation: "Words with the same sorted signature belong together.",
      },
    ],
    constraints: ["1 <= words.length <= 10^4", "Each word length <= 100"],
    hints: [
      "Create a canonical key for every word.",
      "Map each key to the list of matching words.",
    ],
    editorial:
      "Sorting each word creates a shared signature for every anagram group. A hash map from signature to words solves the grouping cleanly.",
    similarProblemSlugs: ["anagram-window-alerts"],
    roleFocus: "Placement",
    frequency: 3,
    estimatedMinutes: 20,
    companyTags: [
      { companySlug: "zoho", frequency: 3 },
      { companySlug: "atlassian", frequency: 3 },
      { companySlug: "adobe", frequency: 2 },
    ],
  },
  {
    title: "Smallest Window Over Target",
    slug: "smallest-window-over-target",
    difficulty: "MEDIUM",
    topicSlug: "sliding-window",
    problemStatement:
      "Given an array of positive integers and a target sum, return the minimum length subarray whose sum is at least target.",
    examples: [
      {
        input: "nums = [2,3,1,2,4,3], target = 7",
        output: "2",
        explanation: "The subarray [4,3] is the smallest valid window.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "All numbers are positive"],
    hints: [
      "Positive numbers make it safe to shrink from the left once the sum is large enough.",
      "Track the best valid window length whenever the condition holds.",
    ],
    editorial:
      "Because values are positive, expanding the right pointer only increases the sum, and shrinking the left pointer only decreases it. That monotonic behavior enables a linear sliding window.",
    similarProblemSlugs: ["longest-unique-substring", "max-points-from-cards"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "amazon", frequency: 4 },
      { companySlug: "google", frequency: 3 },
    ],
  },
  {
    title: "Max Points from Cards",
    slug: "max-points-from-cards",
    difficulty: "MEDIUM",
    topicSlug: "sliding-window",
    problemStatement:
      "You can take exactly k cards from either end of the array. Return the maximum score possible.",
    examples: [
      {
        input: "cards = [1,2,3,4,5,6,1], k = 3",
        output: "12",
        explanation: "Taking 6, 5, and 1 yields the best score.",
      },
    ],
    constraints: ["1 <= cards.length <= 10^5", "1 <= k <= cards.length"],
    hints: [
      "Instead of choosing k cards directly, think about the middle window you leave behind.",
      "A fixed-size minimum-sum window unlocks the answer.",
    ],
    editorial:
      "The best k-card pick is totalSum minus the minimum subarray sum of length n-k. Reframing the problem this way turns a seemingly branching choice into a simple window scan.",
    similarProblemSlugs: ["smallest-window-over-target"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 30,
    companyTags: [
      { companySlug: "amazon", frequency: 4 },
      { companySlug: "flipkart", frequency: 3 },
    ],
  },
  {
    title: "Container With Most Water",
    slug: "container-with-most-water",
    difficulty: "MEDIUM",
    topicSlug: "two-pointers",
    problemStatement:
      "Given line heights, choose two lines that form the container holding the maximum water.",
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation: "The lines at indices 1 and 8 create the best area.",
      },
    ],
    constraints: ["2 <= height.length <= 10^5"],
    hints: [
      "The width shrinks every step, so only a better minimum height can compensate.",
      "Move the shorter wall, not the taller one.",
    ],
    editorial:
      "The two-pointer proof comes from area being limited by the shorter wall. Moving the taller wall cannot improve the minimum height while the width decreases.",
    similarProblemSlugs: ["sorted-squares-merge"],
    roleFocus: "Placement",
    frequency: 5,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "google", frequency: 4 },
      { companySlug: "adobe", frequency: 3 },
      { companySlug: "atlassian", frequency: 2 },
    ],
  },
  {
    title: "Sorted Squares Merge",
    slug: "sorted-squares-merge",
    difficulty: "EASY",
    topicSlug: "two-pointers",
    problemStatement:
      "Given a non-decreasing array that may contain negatives, return a non-decreasing array of the squared values.",
    examples: [
      {
        input: "nums = [-4,-1,0,3,10]",
        output: "[0,1,9,16,100]",
        explanation: "Large negatives can produce the biggest squares.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5"],
    hints: [
      "The largest square must come from one of the ends.",
      "Fill the answer array from the back.",
    ],
    editorial:
      "Two pointers at both ends let you compare absolute values directly. The larger absolute value produces the next largest square.",
    similarProblemSlugs: ["container-with-most-water", "rotate-array-by-k"],
    roleFocus: "Intern",
    frequency: 3,
    estimatedMinutes: 20,
    companyTags: [
      { companySlug: "google", frequency: 3 },
      { companySlug: "walmart", frequency: 2 },
    ],
  },
  {
    title: "Binary Tree Level Order",
    slug: "binary-tree-level-order",
    difficulty: "MEDIUM",
    topicSlug: "trees",
    problemStatement:
      "Return the values of a binary tree level by level from left to right.",
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "[[3],[9,20],[15,7]]",
        explanation: "Nodes are grouped by their depth.",
      },
    ],
    constraints: ["0 <= nodes <= 2000"],
    hints: [
      "Breadth-first search naturally visits nodes by level.",
      "Process the queue size at the start of each level.",
    ],
    editorial:
      "A queue captures BFS perfectly. Reading the current queue length before processing a layer tells you how many nodes belong to that level.",
    similarProblemSlugs: ["right-view-of-tree", "number-of-islands"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "microsoft", frequency: 4 },
      { companySlug: "walmart", frequency: 3 },
      { companySlug: "google", frequency: 3 },
    ],
  },
  {
    title: "Diameter of Binary Tree",
    slug: "diameter-of-binary-tree",
    difficulty: "MEDIUM",
    topicSlug: "trees",
    problemStatement:
      "Return the length of the longest path between any two nodes in a binary tree.",
    examples: [
      {
        input: "root = [1,2,3,4,5]",
        output: "3",
        explanation: "The path 4 -> 2 -> 1 -> 3 has length 3 edges.",
      },
    ],
    constraints: ["1 <= nodes <= 10^4"],
    hints: [
      "The best path through a node depends on the heights of both subtrees.",
      "Compute height while updating the best diameter seen so far.",
    ],
    editorial:
      "A postorder DFS returns subtree height to the parent. At each node, combine left and right heights to update the longest path passing through that node.",
    similarProblemSlugs: ["binary-tree-level-order", "validate-bst"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 30,
    companyTags: [
      { companySlug: "microsoft", frequency: 4 },
      { companySlug: "google", frequency: 3 },
      { companySlug: "adobe", frequency: 2 },
    ],
  },
  {
    title: "Right View of Tree",
    slug: "right-view-of-tree",
    difficulty: "MEDIUM",
    topicSlug: "trees",
    problemStatement:
      "Return the visible node values when a binary tree is viewed from the right side.",
    examples: [
      {
        input: "root = [1,2,3,null,5,null,4]",
        output: "[1,3,4]",
        explanation: "At each level the rightmost node is visible.",
      },
    ],
    constraints: ["0 <= nodes <= 10^4"],
    hints: [
      "A level-order traversal can capture the final node of each level.",
      "A DFS that visits right child first also works.",
    ],
    editorial:
      "Both BFS and DFS are valid. BFS keeps the problem conceptually simple by recording the last node seen on every level.",
    similarProblemSlugs: ["binary-tree-level-order"],
    roleFocus: "Placement",
    frequency: 3,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "amazon", frequency: 3 },
      { companySlug: "google", frequency: 2 },
    ],
  },
  {
    title: "Validate BST",
    slug: "validate-bst",
    difficulty: "MEDIUM",
    topicSlug: "bst",
    problemStatement:
      "Return whether a binary tree satisfies all Binary Search Tree rules.",
    examples: [
      {
        input: "root = [2,1,3]",
        output: "true",
        explanation: "Every node fits its valid value range.",
      },
    ],
    constraints: ["1 <= nodes <= 10^4"],
    hints: [
      "The left child being smaller is not enough.",
      "Track the valid lower and upper bounds through recursion.",
    ],
    editorial:
      "A valid BST requires every node to remain inside the range defined by all of its ancestors. Recursive bounds capture that global rule cleanly.",
    similarProblemSlugs: ["diameter-of-binary-tree"],
    roleFocus: "Intern",
    frequency: 4,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "microsoft", frequency: 4 },
      { companySlug: "google", frequency: 4 },
      { companySlug: "zoho", frequency: 2 },
    ],
  },
  {
    title: "Kth Largest Element in a Stream",
    slug: "kth-largest-element-stream",
    difficulty: "MEDIUM",
    topicSlug: "heap",
    problemStatement:
      "Design a structure that continuously receives numbers and returns the kth largest value after each insertion.",
    examples: [
      {
        input: "k = 3, stream = [4,5,8,2], add(3), add(10)",
        output: "[4,5]",
        explanation: "The min-heap stores the top 3 elements seen so far.",
      },
    ],
    constraints: ["At most 10^5 insertions"],
    hints: [
      "You do not need all values, only the best k seen so far.",
      "A min-heap keeps the kth largest value at the root.",
    ],
    editorial:
      "Maintain a min-heap of size k. If a new value is larger than the heap root, insert it and remove the smallest. The root always stays equal to the kth largest.",
    similarProblemSlugs: ["top-k-frequent-ids", "stream-median-finder"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 30,
    companyTags: [
      { companySlug: "amazon", frequency: 3 },
      { companySlug: "flipkart", frequency: 3 },
      { companySlug: "walmart", frequency: 2 },
    ],
  },
  {
    title: "Merge K Sorted Lists",
    slug: "merge-k-sorted-lists",
    difficulty: "HARD",
    topicSlug: "heap",
    problemStatement:
      "Merge k sorted linked lists into one sorted linked list.",
    examples: [
      {
        input: "lists = [[1,4,5],[1,3,4],[2,6]]",
        output: "[1,1,2,3,4,4,5,6]",
        explanation: "Always take the smallest current head across the lists.",
      },
    ],
    constraints: ["k <= 10^4", "Total nodes <= 10^5"],
    hints: [
      "The smallest next node must be one of the current list heads.",
      "A heap avoids repeated scanning across all lists.",
    ],
    editorial:
      "Push the head of each non-empty list into a min-heap keyed by node value. Pop the smallest node, append it, and push its successor until the heap empties.",
    similarProblemSlugs: ["kth-largest-element-stream"],
    roleFocus: "Advanced Placement",
    frequency: 4,
    estimatedMinutes: 40,
    companyTags: [
      { companySlug: "google", frequency: 4 },
      { companySlug: "amazon", frequency: 3 },
      { companySlug: "microsoft", frequency: 3 },
    ],
  },
  {
    title: "Stream Median Finder",
    slug: "stream-median-finder",
    difficulty: "HARD",
    topicSlug: "heap",
    problemStatement:
      "Design a structure that returns the median after each inserted number in a running stream.",
    examples: [
      {
        input: "add(1), add(2), median(), add(3), median()",
        output: "[1.5, 2]",
        explanation: "The stream medians update after every insertion.",
      },
    ],
    constraints: ["At most 5 * 10^4 operations"],
    hints: [
      "Split the numbers into a lower half and an upper half.",
      "Balance two heaps so their sizes never differ by more than one.",
    ],
    editorial:
      "A max-heap stores the lower half and a min-heap stores the upper half. Rebalancing after each insertion keeps median lookup constant time.",
    similarProblemSlugs: ["kth-largest-element-stream"],
    roleFocus: "Advanced Placement",
    frequency: 3,
    estimatedMinutes: 40,
    companyTags: [
      { companySlug: "google", frequency: 3 },
      { companySlug: "flipkart", frequency: 2 },
    ],
  },
  {
    title: "Number of Islands",
    slug: "number-of-islands",
    difficulty: "MEDIUM",
    topicSlug: "graph",
    problemStatement:
      "Given a 2D grid of land and water, return the number of connected land components.",
    examples: [
      {
        input: "grid = [[1,1,0],[1,0,0],[0,1,1]]",
        output: "2",
        explanation: "There are two disconnected groups of land cells.",
      },
    ],
    constraints: ["1 <= rows, cols <= 300"],
    hints: [
      "Every time you discover unvisited land, one new island begins.",
      "Flood-fill the whole component so it is not counted twice.",
    ],
    editorial:
      "This is a classic DFS or BFS connected-components problem. The answer increases whenever a new unvisited land cell starts a traversal.",
    similarProblemSlugs: ["course-schedule-planner", "binary-tree-level-order"],
    roleFocus: "Intern",
    frequency: 5,
    estimatedMinutes: 30,
    isFeatured: true,
    companyTags: [
      { companySlug: "google", frequency: 4 },
      { companySlug: "atlassian", frequency: 3 },
      { companySlug: "microsoft", frequency: 3 },
    ],
  },
  {
    title: "Course Schedule Planner",
    slug: "course-schedule-planner",
    difficulty: "MEDIUM",
    topicSlug: "graph",
    problemStatement:
      "Given the number of courses and prerequisite pairs, return whether it is possible to finish every course.",
    examples: [
      {
        input: "numCourses = 2, prerequisites = [[1,0]]",
        output: "true",
        explanation: "Course 0 can be completed before course 1.",
      },
    ],
    constraints: ["1 <= numCourses <= 2000", "Prerequisite pairs <= 5000"],
    hints: [
      "The challenge is really cycle detection in a directed graph.",
      "Use indegree-based topological sort or DFS coloring.",
    ],
    editorial:
      "A valid course plan exists iff the prerequisite graph has no cycle. Kahn's algorithm is a clean way to detect that by counting how many nodes can be processed.",
    similarProblemSlugs: ["number-of-islands"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 35,
    companyTags: [
      { companySlug: "google", frequency: 4 },
      { companySlug: "microsoft", frequency: 3 },
      { companySlug: "atlassian", frequency: 3 },
    ],
  },
  {
    title: "Climbing Stairs Cost Optimizer",
    slug: "climbing-stairs-cost-optimizer",
    difficulty: "MEDIUM",
    topicSlug: "dynamic-programming",
    problemStatement:
      "Each stair has a cost, and you can climb one or two steps at a time. Return the minimum cost required to reach the top.",
    examples: [
      {
        input: "cost = [10,15,20]",
        output: "15",
        explanation: "Starting at step 1 and then jumping to the top is cheapest.",
      },
    ],
    constraints: ["2 <= cost.length <= 10^5"],
    hints: [
      "Let dp[i] mean the minimum cost to stand on step i.",
      "Each state depends only on the previous two states.",
    ],
    editorial:
      "This is a straightforward DP transition where each step inherits the cheaper of the two possible previous landings. The state can be compressed to constant space.",
    similarProblemSlugs: ["recursive-stairs-counter", "frog-jump-memo"],
    roleFocus: "Intern",
    frequency: 3,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "zoho", frequency: 3 },
      { companySlug: "microsoft", frequency: 2 },
    ],
  },
  {
    title: "Longest Increasing Subsequence Tracker",
    slug: "longest-increasing-subsequence-tracker",
    difficulty: "MEDIUM",
    topicSlug: "dynamic-programming",
    problemStatement:
      "Return the length of the longest strictly increasing subsequence in the array.",
    examples: [
      {
        input: "nums = [10,9,2,5,3,7,101,18]",
        output: "4",
        explanation: "One valid subsequence is [2,3,7,101].",
      },
    ],
    constraints: ["1 <= nums.length <= 2500"],
    hints: [
      "The O(n^2) DP is a good starting point.",
      "Think about what information the current number needs from previous positions.",
    ],
    editorial:
      "A classic DP keeps the best subsequence length ending at each index. For advanced revision, students can explore the O(n log n) patience sorting optimization.",
    similarProblemSlugs: ["frog-jump-memo"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 35,
    companyTags: [
      { companySlug: "google", frequency: 3 },
      { companySlug: "zoho", frequency: 3 },
      { companySlug: "microsoft", frequency: 2 },
    ],
  },
  {
    title: "Frog Jump Memo",
    slug: "frog-jump-memo",
    difficulty: "HARD",
    topicSlug: "dynamic-programming",
    problemStatement:
      "A frog starts on the first stone and each jump length can change by -1, 0, or +1. Return whether it can reach the last stone.",
    examples: [
      {
        input: "stones = [0,1,3,5,6,8,12,17]",
        output: "true",
        explanation: "The frog can reach the final stone through feasible jump transitions.",
      },
    ],
    constraints: ["2 <= stones.length <= 2000"],
    hints: [
      "State is not just the stone index, but also the previous jump length.",
      "Memoization avoids recomputing the same state repeatedly.",
    ],
    editorial:
      "This problem trains state design. Memoize whether a given stone and last jump can still reach the end, and only explore legal next jump lengths.",
    similarProblemSlugs: ["climbing-stairs-cost-optimizer"],
    roleFocus: "Advanced Placement",
    frequency: 3,
    estimatedMinutes: 45,
    companyTags: [
      { companySlug: "google", frequency: 3 },
      { companySlug: "zoho", frequency: 2 },
    ],
  },
  {
    title: "Trie Search Suggestions",
    slug: "trie-search-suggestions",
    difficulty: "MEDIUM",
    topicSlug: "trie",
    problemStatement:
      "Given a list of products and a search word, return up to three lexicographically smallest product suggestions after each typed character.",
    examples: [
      {
        input: "products = [\"mobile\",\"mouse\",\"moneypot\",\"monitor\",\"mousepad\"], searchWord = \"mouse\"",
        output: "[[\"mobile\",\"moneypot\",\"monitor\"],[\"mobile\",\"moneypot\",\"monitor\"],[\"mouse\",\"mousepad\"],[\"mouse\",\"mousepad\"],[\"mouse\",\"mousepad\"]]",
        explanation: "Suggestions narrow as the prefix grows.",
      },
    ],
    constraints: ["1 <= products.length <= 1000", "Each product length <= 3000"],
    hints: [
      "Prefix search is the real requirement here.",
      "A trie can store products along the relevant prefix paths.",
    ],
    editorial:
      "Sort the products and store or derive the first few suggestions along each trie path. Then each prefix query becomes a direct descent through the structure.",
    similarProblemSlugs: ["group-shifted-anagrams"],
    roleFocus: "Placement",
    frequency: 3,
    estimatedMinutes: 35,
    companyTags: [
      { companySlug: "zoho", frequency: 4 },
      { companySlug: "google", frequency: 2 },
    ],
  },
  {
    title: "Subset Generator",
    slug: "subset-generator",
    difficulty: "MEDIUM",
    topicSlug: "backtracking",
    problemStatement:
      "Return all possible subsets of a set of distinct integers.",
    examples: [
      {
        input: "nums = [1,2,3]",
        output: "[[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]]",
        explanation: "Each element is either taken or skipped.",
      },
    ],
    constraints: ["1 <= nums.length <= 15"],
    hints: [
      "At each index, you have two decisions: include or exclude.",
      "Undo the choice before exploring the next branch.",
    ],
    editorial:
      "The recursive decision tree is small enough to expose backtracking fundamentals clearly. Clean choose-explore-undo logic matters more than clever syntax.",
    similarProblemSlugs: ["word-search-path"],
    roleFocus: "Placement",
    frequency: 3,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "atlassian", frequency: 3 },
      { companySlug: "google", frequency: 2 },
    ],
  },
  {
    title: "Word Search Path",
    slug: "word-search-path",
    difficulty: "MEDIUM",
    topicSlug: "backtracking",
    problemStatement:
      "Return whether a word exists in a grid by moving horizontally or vertically without reusing the same cell.",
    examples: [
      {
        input: "board = [[A,B,C,E],[S,F,C,S],[A,D,E,E]], word = \"ABCCED\"",
        output: "true",
        explanation: "The word can be traced through adjacent cells without reuse.",
      },
    ],
    constraints: ["1 <= rows, cols <= 6", "1 <= word.length <= 15"],
    hints: [
      "Each starting cell is a possible root of the search.",
      "Mark cells as used during the current path and unmark them on backtrack.",
    ],
    editorial:
      "This is a grid backtracking problem with pruning. The path either succeeds or fails locally, so undoing visited state cleanly is essential.",
    similarProblemSlugs: ["subset-generator"],
    roleFocus: "Placement",
    frequency: 4,
    estimatedMinutes: 35,
    companyTags: [
      { companySlug: "atlassian", frequency: 4 },
      { companySlug: "google", frequency: 3 },
    ],
  },
  {
    title: "Task Scheduler Profit Pick",
    slug: "task-scheduler-profit-pick",
    difficulty: "MEDIUM",
    topicSlug: "greedy",
    problemStatement:
      "Each task takes one slot before its deadline and gives a profit. Return the maximum profit obtainable by scheduling tasks greedily.",
    examples: [
      {
        input: "tasks = [(100,2),(27,1),(15,2),(10,1)]",
        output: "127",
        explanation: "Schedule the most valuable compatible tasks before their deadlines.",
      },
    ],
    constraints: ["1 <= tasks.length <= 10^5"],
    hints: [
      "Sort tasks by profit and place them as late as possible before their deadlines.",
      "Greedy only works if profitable tasks do not block a better combination.",
    ],
    editorial:
      "Sorting by profit and placing each task in the latest available slot preserves room for other tasks. This is a classic greedy scheduling proof pattern.",
    similarProblemSlugs: ["gas-station-circuit"],
    roleFocus: "Advanced Placement",
    frequency: 2,
    estimatedMinutes: 35,
    companyTags: [
      { companySlug: "adobe", frequency: 2 },
      { companySlug: "flipkart", frequency: 2 },
    ],
  },
  {
    title: "Gas Station Circuit",
    slug: "gas-station-circuit",
    difficulty: "MEDIUM",
    topicSlug: "greedy",
    problemStatement:
      "Given gas available and travel cost at each station on a circular route, return the starting index that completes the circuit or -1 if impossible.",
    examples: [
      {
        input: "gas = [1,2,3,4,5], cost = [3,4,5,1,2]",
        output: "3",
        explanation: "Starting at index 3 completes the loop successfully.",
      },
    ],
    constraints: ["1 <= gas.length == cost.length <= 10^5"],
    hints: [
      "First check whether the total gas covers the total cost.",
      "If the running tank becomes negative, the current start cannot work.",
    ],
    editorial:
      "The greedy proof shows that if a start fails at some station, every station between the failed start and that point also fails. That lets you skip many candidates.",
    similarProblemSlugs: ["task-scheduler-profit-pick"],
    roleFocus: "Placement",
    frequency: 3,
    estimatedMinutes: 25,
    companyTags: [
      { companySlug: "adobe", frequency: 3 },
      { companySlug: "amazon", frequency: 2 },
    ],
  },
  {
    title: "Range Sum Query Mutable Lite",
    slug: "range-sum-query-mutable-lite",
    difficulty: "HARD",
    topicSlug: "segment-tree",
    problemStatement:
      "Design a data structure that supports point updates and range sum queries on an integer array.",
    examples: [
      {
        input: "nums = [1,3,5], sumRange(0,2), update(1,2), sumRange(0,2)",
        output: "[9,8]",
        explanation: "After updating index 1 from 3 to 2, the total sum changes accordingly.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "At most 10^5 operations"],
    hints: [
      "Recomputing every query from scratch is too slow after many updates.",
      "Each node should summarize a segment of the array.",
    ],
    editorial:
      "A segment tree stores range sums hierarchically. Point updates only touch one root-to-leaf path, which keeps both update and query around O(log n).",
    similarProblemSlugs: ["lazy-segment-painter"],
    roleFocus: "Advanced Placement",
    frequency: 2,
    estimatedMinutes: 45,
    companyTags: [
      { companySlug: "google", frequency: 2 },
      { companySlug: "zoho", frequency: 2 },
    ],
  },
  {
    title: "Lazy Segment Painter",
    slug: "lazy-segment-painter",
    difficulty: "HARD",
    topicSlug: "segment-tree",
    problemStatement:
      "Support painting an entire interval with a value and querying the sum of any interval afterward.",
    examples: [
      {
        input: "paint(1,3,5), sumRange(0,4)",
        output: "15",
        explanation: "Indices 1 through 3 become 5, so the total painted sum is 15.",
      },
    ],
    constraints: ["1 <= n <= 10^5", "At most 10^5 operations"],
    hints: [
      "Range updates should not descend into every child immediately.",
      "Store deferred updates on internal nodes until they are needed.",
    ],
    editorial:
      "Lazy propagation lets the tree postpone pushing updates down to children. This keeps range updates and range queries efficient even for very large intervals.",
    similarProblemSlugs: ["range-sum-query-mutable-lite"],
    roleFocus: "Advanced Placement",
    frequency: 2,
    estimatedMinutes: 50,
    companyTags: [
      { companySlug: "google", frequency: 2 },
      { companySlug: "atlassian", frequency: 1 },
    ],
  },
];
