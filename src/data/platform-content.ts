export const BRAND = {
  name: "DSA Commit",
  headline: "Turn daily discipline into placement readiness.",
  subheadline:
    "A premium, zero-cost DSA ecosystem that guides students from confused beginner to interview-ready problem solver with roadmaps, streaks, mentors, and company-wise preparation.",
};

export type TopicSeed = {
  name: string;
  slug: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  sortOrder: number;
  conceptSummary: string;
  notes: string;
  difficultyProgression: string[];
  revisionChecklist: string[];
  quiz: Array<{ question: string; answer: string }>;
  estimatedHours: number;
  icon: string;
  accentColor: string;
};

export const topicSeed: TopicSeed[] = [
  {
    name: "Programming Logic",
    slug: "programming-logic",
    level: "BEGINNER",
    sortOrder: 1,
    conceptSummary:
      "Programming logic builds the habit of translating a messy prompt into clear inputs, steps, conditions, and expected outputs.",
    notes:
      "Focus on dry-running problems on paper before writing code. When students struggle early, it is usually because they jump to syntax before defining the state transitions clearly.",
    difficultyProgression: [
      "Trace simple if/else and loop flows",
      "Design small rule-based solutions",
      "Break down multi-step workflows with edge cases",
    ],
    revisionChecklist: [
      "Can restate the input, output, and rule clearly",
      "Can dry-run with sample data",
      "Can explain why each branch exists",
    ],
    quiz: [
      {
        question: "What should you define before writing code for a new problem?",
        answer: "The input, the expected output, and the rule that transforms one into the other.",
      },
      {
        question: "Why is dry-running important?",
        answer: "It exposes missing conditions and edge cases before implementation.",
      },
    ],
    estimatedHours: 6,
    icon: "BrainCircuit",
    accentColor: "amber",
  },
  {
    name: "Arrays",
    slug: "arrays",
    level: "BEGINNER",
    sortOrder: 2,
    conceptSummary:
      "Arrays teach indexing, iteration, and the mental model of contiguous data that powers most interview patterns.",
    notes:
      "Students should become comfortable with forward and reverse traversal, prefix/suffix thinking, and avoiding off-by-one mistakes. Arrays are also the gateway to time-space tradeoffs.",
    difficultyProgression: [
      "Traverse and update values safely",
      "Use prefix sums and in-place transforms",
      "Combine array patterns under time limits",
    ],
    revisionChecklist: [
      "Can reason about indexes confidently",
      "Can choose between brute force and prefix/suffix ideas",
      "Can identify in-place versus extra-space solutions",
    ],
    quiz: [
      {
        question: "When is an in-place array approach useful?",
        answer: "When you want to reduce extra memory usage and mutation is acceptable.",
      },
      {
        question: "What causes most array bugs in interviews?",
        answer: "Boundary conditions and incorrect index updates.",
      },
    ],
    estimatedHours: 10,
    icon: "Rows3",
    accentColor: "cyan",
  },
  {
    name: "Strings",
    slug: "strings",
    level: "BEGINNER",
    sortOrder: 3,
    conceptSummary:
      "String problems sharpen pattern detection, pointer movement, hashing intuition, and careful handling of character-based state.",
    notes:
      "Treat a string like a constrained array. Learn when order matters, when frequency matters, and how Unicode or casing assumptions affect a solution.",
    difficultyProgression: [
      "Count and compare characters",
      "Use maps for frequency patterns",
      "Combine windowing with string constraints",
    ],
    revisionChecklist: [
      "Can distinguish substring from subsequence",
      "Can build frequency maps quickly",
      "Can manage left and right pointers cleanly",
    ],
    quiz: [
      {
        question: "What is the difference between a substring and a subsequence?",
        answer: "A substring is contiguous, while a subsequence preserves order without requiring contiguity.",
      },
      {
        question: "What usually makes string problems faster than brute force?",
        answer: "Hash maps, two pointers, and sliding windows.",
      },
    ],
    estimatedHours: 9,
    icon: "TextCursorInput",
    accentColor: "emerald",
  },
  {
    name: "Time Complexity",
    slug: "time-complexity",
    level: "BEGINNER",
    sortOrder: 4,
    conceptSummary:
      "Time complexity is the decision lens that tells you whether a solution is interview-grade or too slow to scale.",
    notes:
      "Students should stop memorizing labels and start relating complexity to actual loop nesting, repeated work, and data structure choice. The goal is better instincts, not math theater.",
    difficultyProgression: [
      "Estimate simple loop complexity",
      "Compare common growth rates",
      "Optimize solutions using data structures and precomputation",
    ],
    revisionChecklist: [
      "Can compare O(n), O(n log n), and O(n^2)",
      "Can justify the cost of each major step",
      "Can spot repeated work worth caching or restructuring",
    ],
    quiz: [
      {
        question: "Why is O(n log n) usually preferred over O(n^2) for large inputs?",
        answer: "Because it grows much more slowly as the input size increases.",
      },
      {
        question: "What should you count when estimating complexity?",
        answer: "The dominant operations as input size grows, not constant factors.",
      },
    ],
    estimatedHours: 5,
    icon: "Gauge",
    accentColor: "orange",
  },
  {
    name: "Basic Recursion",
    slug: "basic-recursion",
    level: "BEGINNER",
    sortOrder: 5,
    conceptSummary:
      "Recursion helps students think in smaller subproblems and understand the stack behavior behind divide-and-conquer patterns.",
    notes:
      "Every recursive solution must answer three questions: what is the base case, what is the smaller subproblem, and how does the current frame use that result.",
    difficultyProgression: [
      "Write clean base cases",
      "Trace call stacks manually",
      "Convert repeated recursion to memoized or iterative forms",
    ],
    revisionChecklist: [
      "Can explain the base case immediately",
      "Can trace recursion depth without confusion",
      "Can identify repeated work",
    ],
    quiz: [
      {
        question: "What happens if a recursive function misses a base case?",
        answer: "It keeps calling itself until the stack overflows.",
      },
      {
        question: "Why do interviewers care about recursive tracing?",
        answer: "It proves you understand both control flow and stack state.",
      },
    ],
    estimatedHours: 7,
    icon: "Repeat2",
    accentColor: "rose",
  },
  {
    name: "Linked List",
    slug: "linked-list",
    level: "INTERMEDIATE",
    sortOrder: 6,
    conceptSummary:
      "Linked lists train pointer discipline and are a reliable test of whether a student can reason about references under pressure.",
    notes:
      "Most mistakes come from losing track of the next node during updates. Use named pointers and draw the transitions before mutating the list.",
    difficultyProgression: [
      "Traverse and update safely",
      "Reverse and split lists with pointers",
      "Combine cycle, merge, and fast-slow pointer patterns",
    ],
    revisionChecklist: [
      "Can move pointers without losing nodes",
      "Can explain fast-slow pointer use cases",
      "Can handle empty and single-node lists",
    ],
    quiz: [
      {
        question: "What is the most common linked list bug?",
        answer: "Overwriting a pointer before saving the next node.",
      },
      {
        question: "Why are fast and slow pointers useful?",
        answer: "They help detect cycles, find middles, and split lists efficiently.",
      },
    ],
    estimatedHours: 9,
    icon: "GitBranchPlus",
    accentColor: "sky",
  },
  {
    name: "Stack",
    slug: "stack",
    level: "INTERMEDIATE",
    sortOrder: 7,
    conceptSummary:
      "Stacks model last-in-first-out state and power parsing, monotonic patterns, and reversible workflows.",
    notes:
      "Students should connect stack usage to sequence validation, nested structures, and the need to remember the most recent unresolved state.",
    difficultyProgression: [
      "Model push-pop behavior",
      "Validate nested structures",
      "Use monotonic stacks for nearest greater or smaller patterns",
    ],
    revisionChecklist: [
      "Can identify LIFO scenarios quickly",
      "Can implement monotonic stack updates",
      "Can explain why stack order matters",
    ],
    quiz: [
      {
        question: "When is a stack better than a queue?",
        answer: "When the most recent unfinished state must be processed first.",
      },
      {
        question: "What does a monotonic stack store?",
        answer: "Elements in sorted order so comparisons stay efficient.",
      },
    ],
    estimatedHours: 8,
    icon: "PanelsTopLeft",
    accentColor: "violet",
  },
  {
    name: "Queue",
    slug: "queue",
    level: "INTERMEDIATE",
    sortOrder: 8,
    conceptSummary:
      "Queues are essential for breadth-first workflows, staged processing, and problems where the oldest pending item should be handled first.",
    notes:
      "Queues show up in BFS, scheduling, and simulation problems. Students should be comfortable with both standard and circular queue behavior.",
    difficultyProgression: [
      "Understand FIFO processing",
      "Implement queue wrappers cleanly",
      "Apply queues in graph and level-order traversal settings",
    ],
    revisionChecklist: [
      "Can distinguish FIFO from LIFO at a glance",
      "Can simulate queue operations correctly",
      "Can explain BFS level expansion",
    ],
    quiz: [
      {
        question: "What traversal pattern heavily depends on a queue?",
        answer: "Breadth-first search.",
      },
      {
        question: "Why use a circular queue?",
        answer: "To reuse space efficiently without shifting elements.",
      },
    ],
    estimatedHours: 7,
    icon: "Waypoints",
    accentColor: "lime",
  },
  {
    name: "Binary Search",
    slug: "binary-search",
    level: "INTERMEDIATE",
    sortOrder: 9,
    conceptSummary:
      "Binary search is less about memorizing a template and more about mastering ordered decision spaces.",
    notes:
      "The key skill is defining a monotonic condition that lets you discard half the search space every step. Students should practice leftmost and rightmost boundary variants.",
    difficultyProgression: [
      "Search exact values in sorted arrays",
      "Find boundaries with custom conditions",
      "Apply binary search on answers and feasibility checks",
    ],
    revisionChecklist: [
      "Can define low, high, and mid safely",
      "Can explain the monotonic predicate",
      "Can handle boundary problems without infinite loops",
    ],
    quiz: [
      {
        question: "What makes binary search valid?",
        answer: "The search space must allow a monotonic decision to remove half each step.",
      },
      {
        question: "Why is overflow-safe mid calculation taught?",
        answer: "To avoid integer overflow in languages with bounded integer types.",
      },
    ],
    estimatedHours: 9,
    icon: "SearchCheck",
    accentColor: "blue",
  },
  {
    name: "Hashing",
    slug: "hashing",
    level: "INTERMEDIATE",
    sortOrder: 10,
    conceptSummary:
      "Hashing trades space for speed and is often the difference between a brute force pass and an optimal solution.",
    notes:
      "The core habit is recognizing when membership, counting, or grouping needs O(1) average access. From there, map design becomes second nature.",
    difficultyProgression: [
      "Track counts and presence",
      "Group related values efficiently",
      "Combine hashing with windows and prefix logic",
    ],
    revisionChecklist: [
      "Can decide between map and set quickly",
      "Can model frequency counts cleanly",
      "Can avoid duplicate handling mistakes",
    ],
    quiz: [
      {
        question: "When is a set enough instead of a map?",
        answer: "When you only need presence checks and not counts or extra values.",
      },
      {
        question: "Why is hashing common in interview optimizations?",
        answer: "It usually reduces repeated linear searches to near-constant lookups.",
      },
    ],
    estimatedHours: 8,
    icon: "Hash",
    accentColor: "fuchsia",
  },
  {
    name: "Sliding Window",
    slug: "sliding-window",
    level: "INTERMEDIATE",
    sortOrder: 11,
    conceptSummary:
      "Sliding window problems reward students who can maintain the right invariant while a range expands and contracts.",
    notes:
      "The pattern becomes easier once you stop re-scanning the entire window and instead update only what changed when pointers move.",
    difficultyProgression: [
      "Handle fixed-size windows",
      "Maintain variable-size constraints",
      "Combine windows with maps and counts",
    ],
    revisionChecklist: [
      "Can define the window invariant clearly",
      "Can move left and right without double counting",
      "Can choose fixed versus dynamic windows correctly",
    ],
    quiz: [
      {
        question: "What makes sliding windows efficient?",
        answer: "Each element typically enters and leaves the window at most once.",
      },
      {
        question: "What is the window invariant?",
        answer: "The condition that must remain true for the current range.",
      },
    ],
    estimatedHours: 10,
    icon: "StretchHorizontal",
    accentColor: "teal",
  },
  {
    name: "Two Pointers",
    slug: "two-pointers",
    level: "INTERMEDIATE",
    sortOrder: 12,
    conceptSummary:
      "Two pointers simplify problems where order matters and decisions can be made from both ends or across a moving range.",
    notes:
      "Students should learn to justify why a pointer moves instead of guessing. Good pointer proofs separate confident solutions from random trial and error.",
    difficultyProgression: [
      "Use left-right scans on sorted inputs",
      "Maintain paired progress with invariants",
      "Blend pointers with greedy or window logic",
    ],
    revisionChecklist: [
      "Can explain why each pointer move is safe",
      "Can recognize when sorting unlocks the pattern",
      "Can handle duplicate values carefully",
    ],
    quiz: [
      {
        question: "Why do many two-pointer problems begin with sorting?",
        answer: "Because sorted order makes pointer decisions meaningful and monotonic.",
      },
      {
        question: "What is the main risk in two-pointer code?",
        answer: "Moving the wrong pointer and breaking the problem invariant.",
      },
    ],
    estimatedHours: 8,
    icon: "ArrowLeftRight",
    accentColor: "indigo",
  },
  {
    name: "Trees",
    slug: "trees",
    level: "ADVANCED",
    sortOrder: 13,
    conceptSummary:
      "Tree problems test recursive structure awareness, hierarchical state passing, and traversal fluency.",
    notes:
      "Practice every tree problem by asking what state needs to travel downward, what result needs to bubble upward, and whether preorder, inorder, postorder, or BFS fits best.",
    difficultyProgression: [
      "Traverse safely with DFS and BFS",
      "Compute subtree properties",
      "Solve path and structural transformation problems",
    ],
    revisionChecklist: [
      "Can pick the right traversal intentionally",
      "Can reason about subtree returns",
      "Can handle null children without confusion",
    ],
    quiz: [
      {
        question: "When is BFS better than DFS in trees?",
        answer: "When you care about level-by-level behavior or shortest unweighted distance.",
      },
      {
        question: "What makes postorder common in tree DP?",
        answer: "Children are processed before the parent uses their results.",
      },
    ],
    estimatedHours: 12,
    icon: "TreePine",
    accentColor: "green",
  },
  {
    name: "BST",
    slug: "bst",
    level: "ADVANCED",
    sortOrder: 14,
    conceptSummary:
      "Binary Search Trees combine tree traversal with ordering guarantees, which makes pruning and validation far more powerful.",
    notes:
      "Students should understand both local parent-child constraints and the global range constraints that define a valid BST.",
    difficultyProgression: [
      "Search and insert using ordering",
      "Validate BST ranges correctly",
      "Solve kth-order and predecessor-successor variants",
    ],
    revisionChecklist: [
      "Can use value ranges for validation",
      "Can explain inorder sorted property",
      "Can prune branches with confidence",
    ],
    quiz: [
      {
        question: "Why is inorder traversal useful for BSTs?",
        answer: "It visits values in sorted order.",
      },
      {
        question: "What common mistake breaks BST validation?",
        answer: "Checking only parent-child relationships instead of the full valid range.",
      },
    ],
    estimatedHours: 7,
    icon: "GitFork",
    accentColor: "emerald",
  },
  {
    name: "Heap",
    slug: "heap",
    level: "ADVANCED",
    sortOrder: 15,
    conceptSummary:
      "Heaps make it efficient to keep track of the smallest or largest evolving element in a dynamic system.",
    notes:
      "If a problem keeps asking for the current best item while data changes, a heap should come to mind. Students should also distinguish min-heap from max-heap use cases quickly.",
    difficultyProgression: [
      "Use heaps for top-k and priority retrieval",
      "Merge multiple ordered streams",
      "Combine heaps with frequency or interval logic",
    ],
    revisionChecklist: [
      "Can choose min-heap versus max-heap correctly",
      "Can justify heap size bounds",
      "Can compare heap and sort tradeoffs",
    ],
    quiz: [
      {
        question: "What kind of problems often need heaps?",
        answer: "Top-k, scheduling, and streaming best-element problems.",
      },
      {
        question: "Why not sort every time instead of using a heap?",
        answer: "Repeated sorting is more expensive when the data changes incrementally.",
      },
    ],
    estimatedHours: 9,
    icon: "BarChart3",
    accentColor: "amber",
  },
  {
    name: "Graph",
    slug: "graph",
    level: "ADVANCED",
    sortOrder: 16,
    conceptSummary:
      "Graphs extend traversal thinking to arbitrary relationships and are central to connectivity, dependency, and shortest path problems.",
    notes:
      "Students should master adjacency representations, visited state, and the choice between DFS, BFS, and topological thinking before chasing more exotic graph algorithms.",
    difficultyProgression: [
      "Model graphs with adjacency lists",
      "Solve connectivity with DFS and BFS",
      "Handle topological ordering and cycle detection",
    ],
    revisionChecklist: [
      "Can build the graph from input correctly",
      "Can mark visited state at the right time",
      "Can explain directed versus undirected behavior",
    ],
    quiz: [
      {
        question: "What is topological sort used for?",
        answer: "Ordering tasks with directed dependencies and no cycles.",
      },
      {
        question: "Why is visited tracking important in graphs?",
        answer: "It prevents repeated work and infinite traversal loops.",
      },
    ],
    estimatedHours: 12,
    icon: "Network",
    accentColor: "sky",
  },
  {
    name: "Dynamic Programming",
    slug: "dynamic-programming",
    level: "ADVANCED",
    sortOrder: 17,
    conceptSummary:
      "Dynamic programming is disciplined state design for problems with overlapping subproblems and optimal substructure.",
    notes:
      "The fastest way to improve at DP is to write down the state, transition, base case, and iteration order before coding. Without that, DP becomes memorization instead of reasoning.",
    difficultyProgression: [
      "Spot repeated subproblems",
      "Define state and transitions clearly",
      "Optimize memory and derive tabulation orders",
    ],
    revisionChecklist: [
      "Can define the DP state in one sentence",
      "Can justify each transition",
      "Can compare memoization and tabulation",
    ],
    quiz: [
      {
        question: "What usually signals a DP problem?",
        answer: "Repeated subproblems combined with a need for optimal or counted results.",
      },
      {
        question: "Why does state design matter more than code syntax in DP?",
        answer: "A wrong state makes the recurrence incorrect even if the code compiles.",
      },
    ],
    estimatedHours: 16,
    icon: "Blocks",
    accentColor: "rose",
  },
  {
    name: "Trie",
    slug: "trie",
    level: "ADVANCED",
    sortOrder: 18,
    conceptSummary:
      "Tries are ideal when prefix-heavy queries must be answered faster than repeated full-string comparisons.",
    notes:
      "Students should connect tries to autocomplete, dictionary validation, and prefix grouping. The key tradeoff is higher memory for faster prefix lookups.",
    difficultyProgression: [
      "Insert and search words",
      "Support prefix queries",
      "Layer tries into search suggestion systems",
    ],
    revisionChecklist: [
      "Can explain trie node structure",
      "Can differentiate exact-word and prefix checks",
      "Can justify the memory tradeoff",
    ],
    quiz: [
      {
        question: "Why is a trie faster for prefix search than scanning all words?",
        answer: "It follows only the relevant character path instead of comparing every candidate.",
      },
      {
        question: "What extra marker does a trie usually need?",
        answer: "An end-of-word marker to distinguish complete words from prefixes.",
      },
    ],
    estimatedHours: 6,
    icon: "Radar",
    accentColor: "violet",
  },
  {
    name: "Backtracking",
    slug: "backtracking",
    level: "ADVANCED",
    sortOrder: 19,
    conceptSummary:
      "Backtracking explores decision trees systematically while pruning branches that cannot lead to valid answers.",
    notes:
      "The discipline in backtracking is to choose, explore, and undo state cleanly. If undo logic is sloppy, the search becomes impossible to reason about.",
    difficultyProgression: [
      "Generate combinations and subsets",
      "Add constraints and pruning",
      "Solve search problems with strong branch elimination",
    ],
    revisionChecklist: [
      "Can define the decision at each level",
      "Can undo state changes safely",
      "Can explain the pruning rule",
    ],
    quiz: [
      {
        question: "Why is pruning important in backtracking?",
        answer: "It avoids exploring branches that cannot produce valid solutions.",
      },
      {
        question: "What is the core backtracking loop?",
        answer: "Choose, explore, and undo.",
      },
    ],
    estimatedHours: 10,
    icon: "GitBranch",
    accentColor: "orange",
  },
  {
    name: "Greedy",
    slug: "greedy",
    level: "ADVANCED",
    sortOrder: 20,
    conceptSummary:
      "Greedy algorithms work when the best local move can be proven to build a globally optimal result.",
    notes:
      "The skill is not guessing greedily, but proving why that choice remains safe. Exchange arguments and sorted order often make the proof clearer.",
    difficultyProgression: [
      "Recognize greedy-friendly structure",
      "Prove local choices are safe",
      "Combine ordering with scheduling or interval reasoning",
    ],
    revisionChecklist: [
      "Can state the greedy choice clearly",
      "Can justify it with a proof sketch",
      "Can recognize when greedy fails and DP is needed",
    ],
    quiz: [
      {
        question: "What makes greedy hard for students?",
        answer: "The solution needs proof, not just intuition.",
      },
      {
        question: "What often helps build greedy proofs?",
        answer: "Sorting, invariants, and exchange arguments.",
      },
    ],
    estimatedHours: 9,
    icon: "TrendingUp",
    accentColor: "teal",
  },
  {
    name: "Segment Tree",
    slug: "segment-tree",
    level: "ADVANCED",
    sortOrder: 21,
    conceptSummary:
      "Segment trees support fast range queries and updates, making them powerful for mutable interval problems.",
    notes:
      "Students should first learn the shape of the tree and why query and update both decompose into logarithmic segments before touching lazy propagation.",
    difficultyProgression: [
      "Build the tree for range queries",
      "Handle point updates efficiently",
      "Extend to lazy propagation for range updates",
    ],
    revisionChecklist: [
      "Can explain node ranges clearly",
      "Can split queries into left and right contributions",
      "Can justify the O(log n) update path",
    ],
    quiz: [
      {
        question: "Why use a segment tree instead of recomputing every query?",
        answer: "It answers repeated range queries and updates much faster on mutable data.",
      },
      {
        question: "What does lazy propagation solve?",
        answer: "It postpones range updates so large interval modifications stay efficient.",
      },
    ],
    estimatedHours: 12,
    icon: "GalleryHorizontalEnd",
    accentColor: "blue",
  },
];

export type CompanySeed = {
  name: string;
  slug: string;
  overview: string;
  industry: string;
  website: string;
  hiringFocusAreas: string[];
  commonFocusTopics: string[];
  rolePreferences: string[];
  oaPattern: string[];
  interviewRounds: string[];
  preparationTips: string[];
  recommendedRoadmap: string[];
  featured: boolean;
};

export const companySeed: CompanySeed[] = [
  {
    name: "Google",
    slug: "google",
    overview:
      "Google interviews reward clarity, strong fundamentals, and the ability to communicate tradeoffs in clean DSA solutions.",
    industry: "Consumer internet",
    website: "https://careers.google.com",
    hiringFocusAreas: ["Graph", "Tree", "Dynamic Programming", "Binary Search"],
    commonFocusTopics: ["graph", "trees", "dynamic-programming", "binary-search"],
    rolePreferences: ["SWE Intern", "Software Engineer", "University Grad"],
    oaPattern: ["2 coding questions in 90 minutes", "Mixed easy-medium with one deeper optimization"],
    interviewRounds: ["Technical screen", "2-3 coding rounds", "Googliness and behavioral round"],
    preparationTips: [
      "Narrate tradeoffs before finalizing the approach",
      "Practice graph and tree traversal under time pressure",
      "Write edge cases before coding",
    ],
    recommendedRoadmap: ["arrays", "binary-search", "trees", "graph", "dynamic-programming"],
    featured: true,
  },
  {
    name: "Amazon",
    slug: "amazon",
    overview:
      "Amazon favors reliable implementation, strong data structure choice, and structured communication aligned with practical execution.",
    industry: "E-commerce and cloud",
    website: "https://www.amazon.jobs",
    hiringFocusAreas: ["Array", "Hashing", "Tree", "Heap"],
    commonFocusTopics: ["arrays", "hashing", "trees", "heap"],
    rolePreferences: ["SDE Intern", "SDE I", "New Grad"],
    oaPattern: ["Online assessment with coding plus work style section", "High emphasis on implementation speed"],
    interviewRounds: ["OA", "1-2 technical interviews", "Leadership principles discussion"],
    preparationTips: [
      "Practice medium array and hashing problems repeatedly",
      "Use examples to validate assumptions early",
      "Tie choices back to scale and reliability",
    ],
    recommendedRoadmap: ["arrays", "hashing", "sliding-window", "trees", "heap"],
    featured: true,
  },
  {
    name: "Microsoft",
    slug: "microsoft",
    overview:
      "Microsoft looks for balanced problem-solving, collaboration, and strong command over core DSA patterns without overcomplication.",
    industry: "Software and cloud",
    website: "https://careers.microsoft.com",
    hiringFocusAreas: ["Tree", "Graph", "Linked List", "DP"],
    commonFocusTopics: ["trees", "graph", "linked-list", "dynamic-programming"],
    rolePreferences: ["Intern", "Software Engineer", "Explore"],
    oaPattern: ["Coding-heavy screen with clean explanation expected", "Often medium-level patterns with a twist"],
    interviewRounds: ["Technical phone round", "2-4 onsite or virtual coding rounds", "Behavioral conversation"],
    preparationTips: [
      "Explain brute force before optimization",
      "Use simple, readable code over clever shortcuts",
      "Revise trees, graphs, and linked lists weekly",
    ],
    recommendedRoadmap: ["linked-list", "trees", "graph", "dynamic-programming"],
    featured: true,
  },
  {
    name: "Adobe",
    slug: "adobe",
    overview:
      "Adobe interviews often reward practical problem decomposition, careful edge-case handling, and strong comfort with mid-level DSA.",
    industry: "Productivity software",
    website: "https://careers.adobe.com",
    hiringFocusAreas: ["Array", "String", "Tree", "Greedy"],
    commonFocusTopics: ["arrays", "strings", "trees", "greedy"],
    rolePreferences: ["Intern", "Member of Technical Staff"],
    oaPattern: ["Time-boxed coding round with one easy and one medium-hard challenge"],
    interviewRounds: ["OA", "Technical interviews", "Manager or hiring panel"],
    preparationTips: [
      "Focus on code readability and test coverage thinking",
      "Rehearse greedy and tree proof explanations",
      "Revise string pattern questions frequently",
    ],
    recommendedRoadmap: ["strings", "arrays", "trees", "greedy"],
    featured: false,
  },
  {
    name: "Flipkart",
    slug: "flipkart",
    overview:
      "Flipkart tends to ask implementation-oriented DSA with product-scale instincts around efficiency and correctness.",
    industry: "Commerce",
    website: "https://www.flipkartcareers.com",
    hiringFocusAreas: ["Array", "Heap", "Hashing", "Graph"],
    commonFocusTopics: ["arrays", "heap", "hashing", "graph"],
    rolePreferences: ["Intern", "SDE 1"],
    oaPattern: ["Competitive-style coding with medium-hard emphasis", "Speed and correctness matter"],
    interviewRounds: ["OA", "Technical rounds", "Hiring manager"],
    preparationTips: [
      "Time yourself solving array plus heap combinations",
      "Practice fast dry-runs before coding",
      "Review graph basics for surprise follow-ups",
    ],
    recommendedRoadmap: ["arrays", "hashing", "heap", "graph"],
    featured: false,
  },
  {
    name: "Walmart",
    slug: "walmart",
    overview:
      "Walmart evaluates well-rounded DSA fundamentals with emphasis on robustness, optimization, and scalable thought process.",
    industry: "Retail and enterprise tech",
    website: "https://careers.walmart.com",
    hiringFocusAreas: ["Binary Search", "Array", "Tree", "Queue"],
    commonFocusTopics: ["binary-search", "arrays", "trees", "queue"],
    rolePreferences: ["Intern", "Software Engineer"],
    oaPattern: ["Straightforward coding assessment with room for edge-case discussion"],
    interviewRounds: ["Screening", "Technical coding rounds", "Behavioral fit"],
    preparationTips: [
      "Be crisp while explaining time complexity",
      "Practice BFS and queue-based thinking",
      "Keep binary search boundary handling sharp",
    ],
    recommendedRoadmap: ["arrays", "queue", "binary-search", "trees"],
    featured: false,
  },
  {
    name: "Atlassian",
    slug: "atlassian",
    overview:
      "Atlassian interviews usually favor clarity, collaboration, and elegant solutions over noisy complexity.",
    industry: "SaaS",
    website: "https://www.atlassian.com/company/careers",
    hiringFocusAreas: ["String", "Hashing", "Graph", "Backtracking"],
    commonFocusTopics: ["strings", "hashing", "graph", "backtracking"],
    rolePreferences: ["Intern", "Graduate", "Software Engineer"],
    oaPattern: ["Clean problem statements with deeper follow-up discussion"],
    interviewRounds: ["Technical coding", "System or project discussion", "Values interview"],
    preparationTips: [
      "Explain assumptions before diving into code",
      "Practice backtracking and graph reasoning aloud",
      "Keep examples small and precise during interviews",
    ],
    recommendedRoadmap: ["strings", "hashing", "graph", "backtracking"],
    featured: true,
  },
  {
    name: "TCS",
    slug: "tcs",
    overview:
      "TCS preparation benefits from consistency, broad-topic coverage, and repeated practice of foundation-first DSA.",
    industry: "IT services",
    website: "https://www.tcs.com/careers",
    hiringFocusAreas: ["Programming Logic", "Array", "String", "Queue"],
    commonFocusTopics: ["programming-logic", "arrays", "strings", "queue"],
    rolePreferences: ["Ninja", "Digital", "Prime"],
    oaPattern: ["Aptitude plus coding mix with accessible fundamentals"],
    interviewRounds: ["Aptitude and coding", "Technical and HR rounds"],
    preparationTips: [
      "Do not skip the basics in favor of random hard questions",
      "Build consistency through daily check-ins",
      "Revise logic and arrays repeatedly",
    ],
    recommendedRoadmap: ["programming-logic", "arrays", "strings", "queue"],
    featured: false,
  },
  {
    name: "Infosys",
    slug: "infosys",
    overview:
      "Infosys rewards structured preparation, algorithmic basics, and confidence on explainable solutions rather than only hard puzzles.",
    industry: "IT services",
    website: "https://www.infosys.com/careers",
    hiringFocusAreas: ["Programming Logic", "Array", "Recursion", "Tree"],
    commonFocusTopics: ["programming-logic", "arrays", "basic-recursion", "trees"],
    rolePreferences: ["Specialist Programmer", "Digital Specialist Engineer"],
    oaPattern: ["Coding questions mixed with reasoning sections"],
    interviewRounds: ["Assessment", "Technical interview", "HR discussion"],
    preparationTips: [
      "Practice recursive thinking and tree traversals",
      "Strengthen implementation accuracy on easier problems",
      "Keep a revision list of weak topics",
    ],
    recommendedRoadmap: ["programming-logic", "arrays", "basic-recursion", "trees"],
    featured: false,
  },
  {
    name: "Zoho",
    slug: "zoho",
    overview:
      "Zoho often values solid problem solving with efficient code, curiosity, and the ability to reason independently.",
    industry: "Product software",
    website: "https://www.zoho.com/careers",
    hiringFocusAreas: ["String", "Array", "DP", "Trie"],
    commonFocusTopics: ["strings", "arrays", "dynamic-programming", "trie"],
    rolePreferences: ["Developer", "Intern", "Member Technical Staff"],
    oaPattern: ["Coding rounds with practical implementation depth", "Strong follow-up emphasis on approach"],
    interviewRounds: ["Coding tests", "Technical interviews", "Managerial discussion"],
    preparationTips: [
      "Practice turning brute force into optimized approaches",
      "Revise string and DP patterns consistently",
      "Explain tradeoffs with confidence and simplicity",
    ],
    recommendedRoadmap: ["arrays", "strings", "dynamic-programming", "trie"],
    featured: true,
  },
];

export type BadgeSeed = {
  name: string;
  slug: string;
  description: string;
  criteria: string;
  category: "STREAK" | "CONSISTENCY" | "MASTERY" | "COMMUNITY" | "CHALLENGE" | "COMPANY_PREP";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  icon: string;
  pointValue: number;
};

export const badgeSeed: BadgeSeed[] = [
  {
    name: "First Check-in",
    slug: "first-checkin",
    description: "Started the discipline journey with a logged day.",
    criteria: "Complete your first daily check-in.",
    category: "STREAK",
    rarity: "COMMON",
    icon: "Sparkles",
    pointValue: 10,
  },
  {
    name: "7 Day Challenger",
    slug: "7-day-challenger",
    description: "Completed a full week of commitment without breaking rhythm.",
    criteria: "Finish the 7-day challenge or maintain a 7-day streak.",
    category: "CHALLENGE",
    rarity: "RARE",
    icon: "Flame",
    pointValue: 40,
  },
  {
    name: "Consistency Engine",
    slug: "consistency-engine",
    description: "Built dependable momentum across the full month.",
    criteria: "Reach 80 or higher monthly commitment score.",
    category: "CONSISTENCY",
    rarity: "EPIC",
    icon: "Activity",
    pointValue: 75,
  },
  {
    name: "Topic Closer",
    slug: "topic-closer",
    description: "Closed a roadmap topic with deep, repeatable confidence.",
    criteria: "Reach 100% completion on any topic progress tracker.",
    category: "MASTERY",
    rarity: "RARE",
    icon: "Target",
    pointValue: 50,
  },
  {
    name: "Company Sprint",
    slug: "company-sprint",
    description: "Stayed focused on a target company path and closed the loop.",
    criteria: "Solve five tagged questions for a single company in one week.",
    category: "COMPANY_PREP",
    rarity: "EPIC",
    icon: "Building2",
    pointValue: 60,
  },
  {
    name: "Wall of Commitment",
    slug: "wall-of-commitment",
    description: "Inspired the community by showing up publicly and consistently.",
    criteria: "Publish 10 public commitment posts.",
    category: "COMMUNITY",
    rarity: "LEGENDARY",
    icon: "Trophy",
    pointValue: 100,
  },
];

export type MentorSeed = {
  name: string;
  slug: string;
  email: string;
  companySlug: string;
  roleTitle: string;
  experienceYears: number;
  bio: string;
  expertiseTags: string[];
  officeHours: string;
  recommendedSetTitle: string;
  recommendedSetSummary: string;
  headline: string;
  featured: boolean;
};

export const mentorSeed: MentorSeed[] = [
  {
    name: "Aarav Menon",
    slug: "aarav-menon",
    email: "aarav@dsacommit.dev",
    companySlug: "google",
    roleTitle: "Software Engineer",
    experienceYears: 5,
    bio: "Helps students build calm problem-solving habits for graph, tree, and binary search interviews.",
    expertiseTags: ["Graph", "Binary Search", "Interview Communication"],
    officeHours: "Sat 11:00 AM IST",
    recommendedSetTitle: "Google Core Signals",
    recommendedSetSummary: "A 12-problem ladder covering graphs, BFS/DFS clarity, and binary search boundaries.",
    headline: "Turns noisy problem-solving into structured interview execution.",
    featured: true,
  },
  {
    name: "Meera Kapoor",
    slug: "meera-kapoor",
    email: "meera@dsacommit.dev",
    companySlug: "amazon",
    roleTitle: "SDE II",
    experienceYears: 6,
    bio: "Focuses on consistency, implementation speed, and production-grade edge-case thinking.",
    expertiseTags: ["Arrays", "Hashing", "Leadership Principle Framing"],
    officeHours: "Sun 10:30 AM IST",
    recommendedSetTitle: "Amazon Medium Mastery",
    recommendedSetSummary: "A disciplined set of medium-difficulty arrays, hashing, and heap questions.",
    headline: "Builds the habit of finishing solutions, not just starting them.",
    featured: true,
  },
  {
    name: "Rohan Iyer",
    slug: "rohan-iyer",
    email: "rohan@dsacommit.dev",
    companySlug: "microsoft",
    roleTitle: "Senior Software Engineer",
    experienceYears: 7,
    bio: "Guides students on how to balance correctness, readability, and collaboration in interviews.",
    expertiseTags: ["Tree", "Graph", "Readable Code"],
    officeHours: "Wed 8:00 PM IST",
    recommendedSetTitle: "Microsoft Clarity Pack",
    recommendedSetSummary: "A guided path through linked lists, trees, and graph traversal narration.",
    headline: "Believes clean explanations get remembered as much as correct answers.",
    featured: true,
  },
  {
    name: "Priya Nair",
    slug: "priya-nair",
    email: "priya@dsacommit.dev",
    companySlug: "adobe",
    roleTitle: "Member of Technical Staff",
    experienceYears: 4,
    bio: "Specializes in helping beginners convert basics into repeatable interview wins.",
    expertiseTags: ["Strings", "Greedy", "Roadmap Planning"],
    officeHours: "Fri 7:30 PM IST",
    recommendedSetTitle: "Adobe Practical DSA",
    recommendedSetSummary: "String and tree problems that sharpen clean implementation under pressure.",
    headline: "Makes the roadmap feel manageable even for late starters.",
    featured: false,
  },
  {
    name: "Dev Malhotra",
    slug: "dev-malhotra",
    email: "dev@dsacommit.dev",
    companySlug: "atlassian",
    roleTitle: "Senior Engineer",
    experienceYears: 8,
    bio: "Mentors students on high-signal communication and graph/backtracking problem design.",
    expertiseTags: ["Backtracking", "Graph", "Interview Storytelling"],
    officeHours: "Thu 9:00 PM IST",
    recommendedSetTitle: "Atlassian Thoughtful Solver Set",
    recommendedSetSummary: "A smaller, higher-quality set focused on reasoning depth instead of random volume.",
    headline: "Teaches students how to think aloud without sounding scattered.",
    featured: true,
  },
  {
    name: "Nisha Bansal",
    slug: "nisha-bansal",
    email: "nisha@dsacommit.dev",
    companySlug: "flipkart",
    roleTitle: "SDE I",
    experienceYears: 3,
    bio: "Strong on arrays, heaps, and the discipline required to get interview-ready while in college.",
    expertiseTags: ["Heap", "Array", "Placement Preparation"],
    officeHours: "Mon 8:30 PM IST",
    recommendedSetTitle: "Placement Sprint Batch",
    recommendedSetSummary: "A fast-paced set for students preparing for mass application cycles and OA rounds.",
    headline: "Brings structure to the chaotic final months before placements.",
    featured: false,
  },
  {
    name: "Sanjay Rao",
    slug: "sanjay-rao",
    email: "sanjay@dsacommit.dev",
    companySlug: "zoho",
    roleTitle: "Technical Lead",
    experienceYears: 9,
    bio: "Helps students build independent thinking on DP, tries, and interview simplification.",
    expertiseTags: ["DP", "Trie", "Optimization"],
    officeHours: "Tue 9:30 PM IST",
    recommendedSetTitle: "Zoho Deep Work Track",
    recommendedSetSummary: "A focused track for students who want to go from medium confidence to advanced readiness.",
    headline: "Pushes students to understand transitions instead of memorizing patterns.",
    featured: true,
  },
  {
    name: "Ishita Verma",
    slug: "ishita-verma",
    email: "ishita@dsacommit.dev",
    companySlug: "walmart",
    roleTitle: "Software Engineer",
    experienceYears: 5,
    bio: "Supports students with queue, tree, and binary search fundamentals that hold up in real interviews.",
    expertiseTags: ["Queue", "Binary Search", "Consistency Coaching"],
    officeHours: "Sat 5:00 PM IST",
    recommendedSetTitle: "Retail Tech Readiness",
    recommendedSetSummary: "Balanced preparation across arrays, queues, trees, and company-tagged practice.",
    headline: "Coaches students to keep momentum after the first burst of motivation fades.",
    featured: false,
  },
];

export const mentorPostSeed = [
  {
    mentorSlug: "aarav-menon",
    title: "Stop solving graph questions without naming the state first",
    excerpt: "Most graph confusion starts because students do not define node state and visited policy up front.",
    content:
      "Before coding a graph problem, state the graph representation, the traversal goal, and exactly when a node becomes visited. That one-minute pause reduces half of the mistakes students make under pressure.",
    tags: ["Graph", "Interview Strategy"],
    recommendedProblemSlugs: ["number-of-islands", "course-schedule-planner"],
  },
  {
    mentorSlug: "meera-kapoor",
    title: "Medium difficulty is where placement readiness is actually built",
    excerpt: "Students lose momentum chasing hard problems too early and never become reliable on the patterns that companies ask most.",
    content:
      "A strong medium-level foundation in arrays, hashing, sliding window, and heaps is the best return on effort for most internship and placement rounds. Finish the medium ladder, then expand.",
    tags: ["Consistency", "Amazon"],
    recommendedProblemSlugs: ["top-k-frequent-ids", "max-points-from-cards"],
  },
  {
    mentorSlug: "rohan-iyer",
    title: "Readable code buys you trust in interviews",
    excerpt: "Interviewers want to collaborate with someone whose reasoning is easy to follow.",
    content:
      "Name the helper function after the property it computes. Use variables that reveal intent. If you can make your code feel reviewable, you lower the interviewer’s cognitive load and raise your signal.",
    tags: ["Code Quality", "Microsoft"],
    recommendedProblemSlugs: ["diameter-of-binary-tree", "validate-bst"],
  },
  {
    mentorSlug: "dev-malhotra",
    title: "Backtracking becomes easier when you verbalize the decision tree",
    excerpt: "Instead of saying recursive call, say choose-explore-undo.",
    content:
      "At each frame, explain what decision is being made and what would make the branch invalid. That habit naturally leads to better pruning and far less confusion when constraints pile up.",
    tags: ["Backtracking"],
    recommendedProblemSlugs: ["subset-generator", "word-search-path"],
  },
  {
    mentorSlug: "sanjay-rao",
    title: "DP is state design, not pattern collection",
    excerpt: "The fastest way to get stuck in DP is to jump into code before defining the state and the transition clearly.",
    content:
      "Write the state in plain language first. Then ask what smaller states are needed to compute it. Once those two lines are solid, the recurrence usually writes itself.",
    tags: ["DP", "Preparation"],
    recommendedProblemSlugs: ["climbing-stairs-cost-optimizer", "frog-jump-memo"],
  },
];

export const challengeSeed = [
  {
    title: "7 Day Discipline Challenge",
    slug: "7-day-discipline-challenge",
    description:
      "Show up every day for one focused week with a logged task, check-in, and at least one solved or revised problem.",
    type: "SEVEN_DAY",
    durationDays: 7,
    targetValue: 7,
    badgeSlug: "7-day-challenger",
  },
  {
    title: "30 Day Commitment Sprint",
    slug: "30-day-commitment-sprint",
    description:
      "Build placement momentum across a full month through streaks, revision discipline, and measurable problem progress.",
    type: "THIRTY_DAY",
    durationDays: 30,
    targetValue: 24,
    badgeSlug: "consistency-engine",
  },
] as const;

export const landingTestimonials = [
  {
    name: "Riya Sharma",
    title: "Placed at a product company after 4 months",
    quote:
      "This was the first time my DSA preparation felt like a system instead of random guilt. The streaks and roadmap kept me honest.",
  },
  {
    name: "Karthik S",
    title: "Internship convert, tier-3 college",
    quote:
      "Company-wise prep changed everything. I stopped solving random questions and started solving the right ones.",
  },
  {
    name: "Zoya Khan",
    title: "Went from inconsistent beginner to daily solver",
    quote:
      "The commitment wall and challenge scores gave me the accountability I was missing for years.",
  },
];
