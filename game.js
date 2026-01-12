// ============================================
// HAND THROW - Boom Blox Style Game
// Babylon.js + MediaPipe Hands
// ============================================

// DOM Elements
const canvas = document.getElementById('renderCanvas');
const webcamVideo = document.getElementById('webcam');
const handCanvas = document.getElementById('hand-canvas');
const handCtx = handCanvas.getContext('2d');
const crosshair = document.getElementById('crosshair');
const scoreEl = document.getElementById('score');
const throwsEl = document.getElementById('throws');
const throwIndicator = document.getElementById('throw-indicator');
const instructions = document.getElementById('instructions');
const startBtn = document.getElementById('start-btn');

// Level UI Elements
const levelNumberEl = document.getElementById('level-number');
const levelNameEl = document.getElementById('level-name');
const levelDescEl = document.getElementById('level-desc');
const throwsRemainingEl = document.getElementById('throws-remaining');
const gameOverEl = document.getElementById('game-over');
const finalLevelEl = document.getElementById('final-level');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const levelCompleteEl = document.getElementById('level-complete');
const completedLevelNameEl = document.getElementById('completed-level-name');
const throwsSavedEl = document.getElementById('throws-saved');
const levelScoreEl = document.getElementById('level-score');
const nextLevelBtn = document.getElementById('next-level-btn');

// Game State
let score = 0;
let throws = 0;
let gameStarted = false;
let handPosition = { x: 0.5, y: 0.5 }; // Normalized 0-1
let previousHandZ = 0;
let handVelocityZ = 0;
let canThrow = true;
let throwCooldown = 500; // ms between throws

// Level System
let currentLevel = 1;
let throwsRemaining = 10;
const THROWS_PER_LEVEL = 10;
const MAX_LEVEL = 20;

// Block Types for level building (all sizes doubled for toy block feel)
const BLOCK_TYPES = {
    STANDARD: { width: 2, height: 1.6, depth: 6, mass: 10 },
    SMALL_CUBE: { width: 1.6, height: 1.6, depth: 1.6, mass: 4 },
    LARGE_CUBE: { width: 4, height: 4, depth: 4, mass: 30 },
    PLANK: { width: 8, height: 0.8, depth: 2, mass: 8 },
    PILLAR: { width: 1.2, height: 5, depth: 1.2, mass: 6 },
    PILLAR_TALL: { width: 1.2, height: 8, depth: 1.2, mass: 10 },
    PILLAR_THIN: { width: 0.5, height: 5, depth: 0.5, mass: 3 }, // Thin pillar for jail bars
    PLATFORM: { width: 6, height: 1, depth: 6, mass: 0, isStatic: true },
    PLATFORM_DYNAMIC: { width: 6, height: 1, depth: 6, mass: 20 }, // Can be knocked down!
    HEAVY: { width: 3, height: 2, depth: 3, mass: 50 },
};

// Beeple textures for blocks (loaded once, randomly assigned)
let beepleTextures = [];

// Level Definitions
// Each level has: name, description, dudePosition, blocks array
// Blocks: { type, position: {x, y, z}, rotation: y-rotation in degrees (optional) }
const LEVELS = [
    // Level 1: Big platform on 4 large cube supports (doubled sizes)
    {
        name: "Level 1",
        description: "Knock down the dude!",
        dudePosition: { x: 0, z: -8 },
        blocks: [
            // 4 large cube supports at corners (4x4x4 cubes, y=2 puts bottom on ground)
            { type: 'LARGE_CUBE', position: { x: -4, y: 2, z: -5 } },
            { type: 'LARGE_CUBE', position: { x: -4, y: 2, z: -11 } },
            { type: 'LARGE_CUBE', position: { x: 4, y: 2, z: -5 } },
            { type: 'LARGE_CUBE', position: { x: 4, y: 2, z: -11 } },
            // Dynamic platform on top (6x1x6, can be knocked down!)
            { type: 'PLATFORM_DYNAMIC', position: { x: 0, y: 4.5, z: -8 } }
        ]
    },

    // Level 2: Jenga Tower (middle blocks missing)
    {
        name: "Level 2",
        description: "Knock down the dude!",
        dudePosition: { x: 0, z: -8 },
        blocks: [
            // Layer 1 - 2 outer blocks along X (y = 0.8)
            { type: 'STANDARD', position: { x: -2, y: 0.8, z: -8 } },
            { type: 'STANDARD', position: { x: 2, y: 0.8, z: -8 } },
            // Layer 2 - 2 outer blocks along Z, rotated 90° (y = 2.4)
            { type: 'STANDARD', position: { x: 0, y: 2.4, z: -6 }, rotation: 90 },
            { type: 'STANDARD', position: { x: 0, y: 2.4, z: -10 }, rotation: 90 },
            // Layer 3 - 2 outer blocks along X (y = 4.0)
            { type: 'STANDARD', position: { x: -2, y: 4.0, z: -8 } },
            { type: 'STANDARD', position: { x: 2, y: 4.0, z: -8 } },
            // Layer 4 - 2 outer blocks along Z, rotated 90° (y = 5.6)
            { type: 'STANDARD', position: { x: 0, y: 5.6, z: -6 }, rotation: 90 },
            { type: 'STANDARD', position: { x: 0, y: 5.6, z: -10 }, rotation: 90 },
            // Layer 5 - 2 outer blocks along X (y = 7.2)
            { type: 'STANDARD', position: { x: -2, y: 7.2, z: -8 } },
            { type: 'STANDARD', position: { x: 2, y: 7.2, z: -8 } },
            // Top plank for Beeple to sit on (thinner, y = 8.4)
            { type: 'PLANK', position: { x: 0, y: 8.4, z: -8 } },
        ]
    },

    // Level 3: Table with Jail Bars
    {
        name: "Level 3",
        description: "Knock down the dude!",
        dudePosition: { x: 0, z: -8 },
        blocks: [
            // Table legs - 4 thin pillars (y = 2.5 puts bottom on ground, top at y=5)
            { type: 'PILLAR_THIN', position: { x: -3, y: 2.5, z: -6 } },
            { type: 'PILLAR_THIN', position: { x: 3, y: 2.5, z: -6 } },
            { type: 'PILLAR_THIN', position: { x: -3, y: 2.5, z: -10 } },
            { type: 'PILLAR_THIN', position: { x: 3, y: 2.5, z: -10 } },
            // Table top - dynamic platform (top of pillars at y=5, platform center at y=5.5)
            { type: 'PLATFORM_DYNAMIC', position: { x: 0, y: 5.5, z: -8 } },
            // Jail bars in front of Beeple (standing on platform, blocking throws from camera)
            { type: 'PILLAR_THIN', position: { x: -2, y: 8.5, z: -10.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: -1, y: 8.5, z: -10.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 0, y: 8.5, z: -10.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 1, y: 8.5, z: -10.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 2, y: 8.5, z: -10.5 }, skipForDudeHeight: true },
        ]
    },

    // Level 4: Staircase (side view, fully supported) - TWO DUDES!
    {
        name: "Level 4",
        description: "Knock down BOTH dudes!",
        dudePositions: [
            { x: -4, z: -8 },  // Dude on step 1 (lowest)
            { x: 0, z: -8 },   // Dude on step 2 (middle)
        ],
        blocks: [
            // Step 1 (1 cube tall) - left side, dude #1 here
            { type: 'LARGE_CUBE', position: { x: -4, y: 2, z: -8 } },
            // Step 2 (2 cubes tall) - middle, dude #2 here
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 6, z: -8 } },
            // Step 3 (3 cubes tall) - right side, no dude
            { type: 'LARGE_CUBE', position: { x: 4, y: 2, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 4, y: 6, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 4, y: 10, z: -8 } },
        ]
    },

    // Level 5: Double Lockdown - Two fortified jail cells
    {
        name: "Level 5",
        description: "Knock down BOTH dudes!",
        dudePositions: [
            { x: -5, z: -8 },  // Dude in left jail
            { x: 5, z: -8 },   // Dude in right jail
        ],
        blocks: [
            // LEFT JAIL - Heavy cube base (very hard to knock down)
            { type: 'HEAVY', position: { x: -5, y: 1, z: -8 } },
            // Left jail platform
            { type: 'PLATFORM_DYNAMIC', position: { x: -5, y: 3, z: -8 } },
            // Left jail front bars - standing on ground (PILLAR_TALL height=8, so y=4 puts bottom on ground)
            { type: 'PILLAR_TALL', position: { x: -7, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -6, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -5, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -4, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -3, y: 4, z: -11 }, skipForDudeHeight: true },
            // Left jail side bars
            { type: 'PILLAR_TALL', position: { x: -8, y: 4, z: -9 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -8, y: 4, z: -7 }, skipForDudeHeight: true },

            // RIGHT JAIL - Heavy cube base
            { type: 'HEAVY', position: { x: 5, y: 1, z: -8 } },
            // Right jail platform
            { type: 'PLATFORM_DYNAMIC', position: { x: 5, y: 3, z: -8 } },
            // Right jail front bars - standing on ground
            { type: 'PILLAR_TALL', position: { x: 3, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 4, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 5, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 6, y: 4, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 7, y: 4, z: -11 }, skipForDudeHeight: true },
            // Right jail side bars
            { type: 'PILLAR_TALL', position: { x: 8, y: 4, z: -9 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 8, y: 4, z: -7 }, skipForDudeHeight: true },

            // Center divider wall (heavy blocks between the jails)
            { type: 'HEAVY', position: { x: 0, y: 1, z: -8 } },
            { type: 'HEAVY', position: { x: 0, y: 3, z: -8 } },
        ]
    },

    // Level 6: Three Tables - 3 separate tables in triangle formation
    {
        name: "Level 6",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -5 },   // Front left table
            { x: 6, z: -5 },    // Front right table
            { x: 0, z: -11 },   // Back center table
        ],
        blocks: [
            // FRONT LEFT TABLE
            { type: 'PILLAR', position: { x: -8, y: 2.5, z: -3 } },
            { type: 'PILLAR', position: { x: -4, y: 2.5, z: -3 } },
            { type: 'PILLAR', position: { x: -8, y: 2.5, z: -7 } },
            { type: 'PILLAR', position: { x: -4, y: 2.5, z: -7 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: -6, y: 5.5, z: -5 } },

            // FRONT RIGHT TABLE
            { type: 'PILLAR', position: { x: 4, y: 2.5, z: -3 } },
            { type: 'PILLAR', position: { x: 8, y: 2.5, z: -3 } },
            { type: 'PILLAR', position: { x: 4, y: 2.5, z: -7 } },
            { type: 'PILLAR', position: { x: 8, y: 2.5, z: -7 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 6, y: 5.5, z: -5 } },

            // BACK CENTER TABLE
            { type: 'PILLAR', position: { x: -2, y: 2.5, z: -9 } },
            { type: 'PILLAR', position: { x: 2, y: 2.5, z: -9 } },
            { type: 'PILLAR', position: { x: -2, y: 2.5, z: -13 } },
            { type: 'PILLAR', position: { x: 2, y: 2.5, z: -13 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 0, y: 5.5, z: -11 } },
        ]
    },

    // Level 7: Staircase Towers - 3 towers at different heights
    {
        name: "Level 7",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -6 },   // Short tower, close
            { x: 0, z: -10 },   // Medium tower, middle
            { x: 6, z: -14 },   // Tall tower, far
        ],
        blocks: [
            // Short tower (front left) - 1 cube
            { type: 'LARGE_CUBE', position: { x: -6, y: 2, z: -6 } },

            // Medium tower (center) - 2 cubes
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -10 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 6, z: -10 } },

            // Tall tower (back right) - 3 cubes
            { type: 'LARGE_CUBE', position: { x: 6, y: 2, z: -14 } },
            { type: 'LARGE_CUBE', position: { x: 6, y: 6, z: -14 } },
            { type: 'LARGE_CUBE', position: { x: 6, y: 10, z: -14 } },
        ]
    },

    // Level 8: The Pyramid - beeples at each level
    {
        name: "Level 8",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -4, z: -8 },  // Bottom left
            { x: 4, z: -8 },   // Bottom right
            { x: 0, z: -8 },   // Top
        ],
        blocks: [
            // Bottom row - 3 large cubes (2 with beeples)
            { type: 'LARGE_CUBE', position: { x: -4, y: 2, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 4, y: 2, z: -8 } },

            // Middle row - 2 large cubes
            { type: 'LARGE_CUBE', position: { x: -2, y: 6, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 2, y: 6, z: -8 } },

            // Top - 1 large cube (beeple here)
            { type: 'LARGE_CUBE', position: { x: 0, y: 10, z: -8 } },
        ]
    },

    // Level 9: The Shooting Gallery - targets at different depths
    {
        name: "Level 9",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -5 },   // Front left (easy)
            { x: 6, z: -9 },    // Middle right (medium)
            { x: 0, z: -14 },   // Far back (hard)
        ],
        blocks: [
            // FRONT LEFT - simple cube (easy target)
            { type: 'LARGE_CUBE', position: { x: -6, y: 2, z: -5 } },

            // MIDDLE RIGHT - elevated platform
            { type: 'LARGE_CUBE', position: { x: 6, y: 2, z: -9 } },
            { type: 'LARGE_CUBE', position: { x: 6, y: 6, z: -9 } },

            // Partial wall protecting middle target
            { type: 'STANDARD', position: { x: 4, y: 0.8, z: -7 } },
            { type: 'STANDARD', position: { x: 4, y: 2.4, z: -7 } },

            // FAR BACK - protected by walls
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -14 } },

            // Wall in front of back target
            { type: 'STANDARD', position: { x: -2, y: 0.8, z: -11 } },
            { type: 'STANDARD', position: { x: 2, y: 0.8, z: -11 } },
            { type: 'STANDARD', position: { x: -2, y: 2.4, z: -11 } },
            { type: 'STANDARD', position: { x: 2, y: 2.4, z: -11 } },
        ]
    },

    // Level 10: The Gauntlet - 3 different challenges
    {
        name: "Level 10",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -7, z: -6 },
            { x: 0, z: -12 },
            { x: 7, z: -6 },
        ],
        blocks: [
            // Left: Simple cube stack
            { type: 'LARGE_CUBE', position: { x: -7, y: 2, z: -6 } },
            { type: 'LARGE_CUBE', position: { x: -7, y: 6, z: -6 } },

            // Center: Protected bunker with bars
            { type: 'HEAVY', position: { x: 0, y: 1, z: -12 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 0, y: 2.5, z: -12 } },
            { type: 'PILLAR_THIN', position: { x: -2, y: 5.5, z: -13.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: -1, y: 5.5, z: -13.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 0, y: 5.5, z: -13.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 1, y: 5.5, z: -13.5 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 2, y: 5.5, z: -13.5 }, skipForDudeHeight: true },

            // Right: Wobbly pillar tower
            { type: 'PILLAR', position: { x: 7, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: 7, y: 7.5, z: -6 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 7, y: 10.5, z: -6 } },
        ]
    },

    // Level 11: Domino Chaos - two domino lines, beeples scattered
    {
        name: "Level 11",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -6 },   // Start of front line
            { x: 6, z: -6 },    // End of front line
            { x: 0, z: -12 },   // End of back line
        ],
        blocks: [
            // Front domino line (left to right)
            { type: 'PILLAR', position: { x: -4, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: -2, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: 0, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: 2, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: 4, y: 2.5, z: -6 } },

            // Front beeple platforms
            { type: 'LARGE_CUBE', position: { x: -6, y: 2, z: -6 } },
            { type: 'LARGE_CUBE', position: { x: 6, y: 2, z: -6 } },

            // Back domino line (diagonal)
            { type: 'PILLAR', position: { x: -4, y: 2.5, z: -10 } },
            { type: 'PILLAR', position: { x: -2, y: 2.5, z: -10 } },
            { type: 'PILLAR', position: { x: 0, y: 2.5, z: -10 } },
            { type: 'PILLAR', position: { x: 2, y: 2.5, z: -10 } },

            // Back beeple on tall platform
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -12 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 6, z: -12 } },
        ]
    },

    // Level 12: The Bridge - two platforms connected by planks
    {
        name: "Level 12",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -8 },
            { x: 0, z: -8 },   // On the bridge
            { x: 6, z: -8 },
        ],
        blocks: [
            // Left platform on pillars
            { type: 'PILLAR', position: { x: -8, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: -4, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: -8, y: 2.5, z: -10 } },
            { type: 'PILLAR', position: { x: -4, y: 2.5, z: -10 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: -6, y: 5.5, z: -8 } },

            // Bridge in the middle (planks)
            { type: 'PLANK', position: { x: 0, y: 5.9, z: -8 } },

            // Right platform on pillars
            { type: 'PILLAR', position: { x: 4, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: 8, y: 2.5, z: -6 } },
            { type: 'PILLAR', position: { x: 4, y: 2.5, z: -10 } },
            { type: 'PILLAR', position: { x: 8, y: 2.5, z: -10 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 6, y: 5.5, z: -8 } },
        ]
    },

    // Level 13: Double Cage - two cages at different heights
    {
        name: "Level 13",
        description: "Knock down BOTH dudes!",
        dudePositions: [
            { x: -5, z: -8 },   // Left cage (ground level)
            { x: 5, z: -8 },    // Right cage (elevated)
        ],
        blocks: [
            // LEFT CAGE (ground level)
            { type: 'PLATFORM_DYNAMIC', position: { x: -5, y: 0.5, z: -8 } },
            { type: 'PILLAR_TALL', position: { x: -7, y: 4.5, z: -6 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -3, y: 4.5, z: -6 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -7, y: 4.5, z: -10 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: -3, y: 4.5, z: -10 }, skipForDudeHeight: true },

            // RIGHT CAGE (elevated on cubes)
            { type: 'LARGE_CUBE', position: { x: 5, y: 2, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 5, y: 6, z: -8 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 5, y: 8.5, z: -8 } },
            { type: 'PILLAR_TALL', position: { x: 3, y: 12.5, z: -6 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 7, y: 12.5, z: -6 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 3, y: 12.5, z: -10 }, skipForDudeHeight: true },
            { type: 'PILLAR_TALL', position: { x: 7, y: 12.5, z: -10 }, skipForDudeHeight: true },
        ]
    },

    // Level 14: Twin Skyscrapers - two towers at different depths
    {
        name: "Level 14",
        description: "Knock down BOTH dudes!",
        dudePositions: [
            { x: -5, z: -6 },   // Front tower
            { x: 5, z: -12 },   // Back tower (taller)
        ],
        blocks: [
            // Front tower (shorter, closer)
            { type: 'HEAVY', position: { x: -5, y: 1, z: -6 } },
            { type: 'LARGE_CUBE', position: { x: -5, y: 4, z: -6 } },
            { type: 'PILLAR', position: { x: -5, y: 8.5, z: -6 } },
            { type: 'SMALL_CUBE', position: { x: -5, y: 11.8, z: -6 } },

            // Back tower (taller, further)
            { type: 'HEAVY', position: { x: 5, y: 1, z: -12 } },
            { type: 'LARGE_CUBE', position: { x: 5, y: 4, z: -12 } },
            { type: 'PILLAR', position: { x: 5, y: 8.5, z: -12 } },
            { type: 'LARGE_CUBE', position: { x: 5, y: 13, z: -12 } },
            { type: 'PILLAR', position: { x: 5, y: 17.5, z: -12 } },
            { type: 'SMALL_CUBE', position: { x: 5, y: 20.8, z: -12 } },
        ]
    },

    // Level 15: The Amphitheater - semicircle of platforms
    {
        name: "Level 15",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -6 },
            { x: 0, z: -10 },
            { x: 6, z: -6 },
        ],
        blocks: [
            // Left low platform
            { type: 'LARGE_CUBE', position: { x: -6, y: 2, z: -6 } },

            // Center high platform (back)
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -10 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 6, z: -10 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 10, z: -10 } },

            // Right low platform
            { type: 'LARGE_CUBE', position: { x: 6, y: 2, z: -6 } },
        ]
    },

    // Level 16: Double House of Cards - two precarious structures
    {
        name: "Level 16",
        description: "Knock down BOTH dudes!",
        dudePositions: [
            { x: -5, z: -6 },   // Front left structure
            { x: 5, z: -12 },   // Back right structure (taller)
        ],
        blocks: [
            // FRONT LEFT STRUCTURE (shorter)
            { type: 'PLANK', position: { x: -6, y: 0.4, z: -6 } },
            { type: 'PLANK', position: { x: -4, y: 0.4, z: -6 } },
            { type: 'PLANK', position: { x: -5, y: 1.2, z: -5 }, rotation: 90 },
            { type: 'PLANK', position: { x: -5, y: 1.2, z: -7 }, rotation: 90 },
            { type: 'PLATFORM_DYNAMIC', position: { x: -5, y: 2.0, z: -6 } },

            // BACK RIGHT STRUCTURE (taller, more layers)
            { type: 'PLANK', position: { x: 4, y: 0.4, z: -12 } },
            { type: 'PLANK', position: { x: 6, y: 0.4, z: -12 } },
            { type: 'PLANK', position: { x: 5, y: 1.2, z: -11 }, rotation: 90 },
            { type: 'PLANK', position: { x: 5, y: 1.2, z: -13 }, rotation: 90 },
            { type: 'PLANK', position: { x: 4, y: 2.0, z: -12 } },
            { type: 'PLANK', position: { x: 6, y: 2.0, z: -12 } },
            { type: 'PLANK', position: { x: 5, y: 2.8, z: -11 }, rotation: 90 },
            { type: 'PLANK', position: { x: 5, y: 2.8, z: -13 }, rotation: 90 },
            { type: 'PLATFORM_DYNAMIC', position: { x: 5, y: 3.6, z: -12 } },
        ]
    },

    // Level 17: The Zigzag - staggered path of blocks
    {
        name: "Level 17",
        description: "Knock down BOTH dudes!",
        dudePositions: [
            { x: -4, z: -5 },
            { x: 4, z: -11 },
        ],
        blocks: [
            // Zigzag path of cubes
            { type: 'LARGE_CUBE', position: { x: -4, y: 2, z: -5 } },
            { type: 'LARGE_CUBE', position: { x: -2, y: 2, z: -6 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -7 } },
            { type: 'LARGE_CUBE', position: { x: 2, y: 2, z: -8 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -9 } },
            { type: 'LARGE_CUBE', position: { x: 2, y: 2, z: -10 } },
            { type: 'LARGE_CUBE', position: { x: 4, y: 2, z: -11 } },
        ]
    },

    // Level 18: The Fortress - multiple defenders at different positions
    {
        name: "Level 18",
        description: "Knock down all THREE dudes!",
        dudePositions: [
            { x: -6, z: -6 },   // Outside left (easy)
            { x: 6, z: -6 },    // Outside right (easy)
            { x: 0, z: -14 },   // Deep inside fortress (hard)
        ],
        blocks: [
            // Outside left platform
            { type: 'LARGE_CUBE', position: { x: -6, y: 2, z: -6 } },

            // Outside right platform (elevated)
            { type: 'LARGE_CUBE', position: { x: 6, y: 2, z: -6 } },
            { type: 'LARGE_CUBE', position: { x: 6, y: 6, z: -6 } },

            // Fortress walls protecting inner beeple
            { type: 'HEAVY', position: { x: -3, y: 1, z: -10 } },
            { type: 'HEAVY', position: { x: 0, y: 1, z: -10 } },
            { type: 'HEAVY', position: { x: 3, y: 1, z: -10 } },
            { type: 'HEAVY', position: { x: -3, y: 3, z: -10 } },
            { type: 'HEAVY', position: { x: 0, y: 3, z: -10 } },
            { type: 'HEAVY', position: { x: 3, y: 3, z: -10 } },

            // Side walls
            { type: 'HEAVY', position: { x: -4, y: 1, z: -12 } },
            { type: 'HEAVY', position: { x: 4, y: 1, z: -12 } },

            // Inner beeple on elevated platform
            { type: 'LARGE_CUBE', position: { x: 0, y: 2, z: -14 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 6, z: -14 } },
        ]
    },

    // Level 19: The Variety Pack - 4 beeples on different structures
    {
        name: "Level 19",
        description: "Knock down all FOUR dudes!",
        dudePositions: [
            { x: -7, z: -5 },   // Wobbly pillar tower (front left)
            { x: 7, z: -5 },    // Table (front right)
            { x: -4, z: -12 },  // Cube stack (back left)
            { x: 4, z: -12 },   // Protected platform (back right)
        ],
        blocks: [
            // FRONT LEFT - Wobbly pillar tower
            { type: 'PILLAR', position: { x: -7, y: 2.5, z: -5 } },
            { type: 'PILLAR', position: { x: -7, y: 7.5, z: -5 } },
            { type: 'SMALL_CUBE', position: { x: -7, y: 10.8, z: -5 } },

            // FRONT RIGHT - Table
            { type: 'PILLAR', position: { x: 5, y: 2.5, z: -3 } },
            { type: 'PILLAR', position: { x: 9, y: 2.5, z: -3 } },
            { type: 'PILLAR', position: { x: 5, y: 2.5, z: -7 } },
            { type: 'PILLAR', position: { x: 9, y: 2.5, z: -7 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 7, y: 5.5, z: -5 } },

            // BACK LEFT - Tall cube stack
            { type: 'LARGE_CUBE', position: { x: -4, y: 2, z: -12 } },
            { type: 'LARGE_CUBE', position: { x: -4, y: 6, z: -12 } },
            { type: 'LARGE_CUBE', position: { x: -4, y: 10, z: -12 } },

            // BACK RIGHT - Protected platform with bars
            { type: 'HEAVY', position: { x: 4, y: 1, z: -12 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 4, y: 2.5, z: -12 } },
            { type: 'PILLAR_THIN', position: { x: 2, y: 5.5, z: -13 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 4, y: 5.5, z: -13 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 6, y: 5.5, z: -13 }, skipForDudeHeight: true },
        ]
    },

    // Level 20: The Final Boss - everything combined
    {
        name: "Level 20",
        description: "Knock down all FIVE dudes!",
        dudePositions: [
            { x: -8, z: -5 },
            { x: 8, z: -5 },
            { x: -4, z: -10 },
            { x: 4, z: -10 },
            { x: 0, z: -14 },
        ],
        blocks: [
            // Front left - wobbly tower
            { type: 'PILLAR', position: { x: -8, y: 2.5, z: -5 } },
            { type: 'PILLAR', position: { x: -8, y: 7.5, z: -5 } },
            { type: 'SMALL_CUBE', position: { x: -8, y: 10.8, z: -5 } },

            // Front right - wobbly tower
            { type: 'PILLAR', position: { x: 8, y: 2.5, z: -5 } },
            { type: 'PILLAR', position: { x: 8, y: 7.5, z: -5 } },
            { type: 'SMALL_CUBE', position: { x: 8, y: 10.8, z: -5 } },

            // Middle left - protected platform
            { type: 'HEAVY', position: { x: -4, y: 1, z: -10 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: -4, y: 2.5, z: -10 } },
            { type: 'PILLAR_THIN', position: { x: -6, y: 5.5, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: -4, y: 5.5, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: -2, y: 5.5, z: -11 }, skipForDudeHeight: true },

            // Middle right - protected platform
            { type: 'HEAVY', position: { x: 4, y: 1, z: -10 } },
            { type: 'PLATFORM_DYNAMIC', position: { x: 4, y: 2.5, z: -10 } },
            { type: 'PILLAR_THIN', position: { x: 2, y: 5.5, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 4, y: 5.5, z: -11 }, skipForDudeHeight: true },
            { type: 'PILLAR_THIN', position: { x: 6, y: 5.5, z: -11 }, skipForDudeHeight: true },

            // Back center - the big boss on pyramid
            { type: 'LARGE_CUBE', position: { x: -2, y: 2, z: -14 } },
            { type: 'LARGE_CUBE', position: { x: 2, y: 2, z: -14 } },
            { type: 'LARGE_CUBE', position: { x: 0, y: 6, z: -14 } },
            // Defensive wall in front
            { type: 'STANDARD', position: { x: -3, y: 0.8, z: -12 } },
            { type: 'STANDARD', position: { x: 0, y: 0.8, z: -12 } },
            { type: 'STANDARD', position: { x: 3, y: 0.8, z: -12 } },
            { type: 'STANDARD', position: { x: -3, y: 2.4, z: -12 } },
            { type: 'STANDARD', position: { x: 0, y: 2.4, z: -12 } },
            { type: 'STANDARD', position: { x: 3, y: 2.4, z: -12 } },
        ]
    },
];

// Debug: Allow starting at specific level via URL param
// e.g., index.html?level=5
function getStartingLevel() {
    const params = new URLSearchParams(window.location.search);
    const level = parseInt(params.get('level'));
    if (level && level >= 1 && level <= LEVELS.length) {
        return level;
    }
    return 1;
}

// Check for test level from editor
function getTestLevel() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === 'true') {
        const testData = localStorage.getItem('testLevel');
        if (testData) {
            try {
                return JSON.parse(testData);
            } catch (e) {
                console.error('Failed to parse test level:', e);
            }
        }
    }
    return null;
}

// Babylon.js globals
let engine, scene, camera, havokInstance, havokPlugin;
let blocks = [];
let ground;
// Support multiple dudes per level
let dudes = [];              // Array of visual GLB models
let dudePhysicsBoxes = [];   // Array of invisible physics proxies
let dudeInitialYs = [];      // Array of initial Y positions
let dudeInitialPositions = []; // Array of starting X/Z for fall detection
let dudesFallenCount = 0;    // How many dudes have fallen
let totalDudes = 0;          // Total dudes in current level

// Throwable object - the dildo!
let dildoTemplate = null;  // Template mesh to clone for throwing
const dildoScale = 0.3;    // Scaled down to match physics chain

// Floppy dildo settings
const DILDO_SEGMENTS = 6;        // Number of segments
const DILDO_SEGMENT_LENGTH = 0.4; // Length of each segment
const DILDO_SEGMENT_RADIUS = 0.35; // Radius of segments - thicker for better collision
const DILDO_SPRING_STIFFNESS = 50; // How stiff the joints are (lower = floppier)
const DILDO_SPRING_DAMPING = 5;    // How much the wobble dampens
const DILDO_THROW_FORCE = 250;     // Throw force - higher to move heavy blocks

// Track all thrown dildos for cleanup between levels
let thrownDildos = [];

// Throw sounds - alternate between them
const throwSounds = [
    new Audio('sounds/Throw01.mp3'),
    new Audio('sounds/Throw02.mp3')
];
let currentThrowSoundIndex = 0;

// Wood hit sounds - cycle through them on block collisions
const woodHitSounds = [
    new Audio('sounds/WoodHit01.mp3'),
    new Audio('sounds/WoodHit02.mp3'),
    new Audio('sounds/WoodHit03.mp3')
];
let currentWoodHitSoundIndex = 0;
let lastWoodHitTime = 0;
const WOOD_HIT_COOLDOWN = 100; // ms between wood hit sounds to prevent spam

// Environment (Beeple Studios)
let studioEnvironment = null;

// Play wood hit sound (with cooldown to prevent spam)
function playWoodHitSound() {
    const now = performance.now();
    if (now - lastWoodHitTime < WOOD_HIT_COOLDOWN) return;

    lastWoodHitTime = now;
    const sound = woodHitSounds[currentWoodHitSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Wood hit sound blocked:', e));
    currentWoodHitSoundIndex = (currentWoodHitSoundIndex + 1) % woodHitSounds.length;
}

// Beeple hit sounds - cycle through them, cut off previous when new one plays
const beepleHitSounds = [
    new Audio('sounds/beeplehit1.mp3'),
    new Audio('sounds/beeplehit2.mp3'),
    new Audio('sounds/beeplehit3.mp3'),
    new Audio('sounds/beeplehit4.mp3'),
    new Audio('sounds/beeplehit5.mp3'),
    new Audio('sounds/beeplehit6.mp3'),
    new Audio('sounds/beeplehit7.mp3'),
    new Audio('sounds/beeplehit8.mp3'),
    new Audio('sounds/beeplehit9.mp3')
];
let currentBeepleHitSoundIndex = 0;
let currentlyPlayingBeepleSound = null;
let lastBeepleHitTime = 0;
const BEEPLE_HIT_COOLDOWN = 150; // ms between beeple hit sounds

// Play beeple hit sound (cuts off previous sound)
function playBeepleHitSound() {
    const now = performance.now();
    if (now - lastBeepleHitTime < BEEPLE_HIT_COOLDOWN) return;

    lastBeepleHitTime = now;

    // Stop the currently playing beeple sound if any
    if (currentlyPlayingBeepleSound) {
        currentlyPlayingBeepleSound.pause();
        currentlyPlayingBeepleSound.currentTime = 0;
    }

    // Play the next sound in the cycle
    const sound = beepleHitSounds[currentBeepleHitSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Beeple hit sound blocked:', e));

    // Track the currently playing sound
    currentlyPlayingBeepleSound = sound;

    // Cycle to next sound
    currentBeepleHitSoundIndex = (currentBeepleHitSoundIndex + 1) % beepleHitSounds.length;
}

// ============================================
// VISUAL FEEDBACK (Screen Flash & Camera Shake)
// ============================================

// Create screen flash overlay (added to DOM once)
let flashOverlay = null;
function createFlashOverlay() {
    flashOverlay = document.createElement('div');
    flashOverlay.id = 'flash-overlay';
    flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.05s ease-out;
    `;
    document.body.appendChild(flashOverlay);
}

// Screen flash effect
function screenFlash(color = 'white', intensity = 0.3, duration = 100) {
    if (!flashOverlay) createFlashOverlay();

    flashOverlay.style.backgroundColor = color;
    flashOverlay.style.opacity = intensity;

    setTimeout(() => {
        flashOverlay.style.opacity = 0;
    }, duration);
}

// Camera shake effect
let isShaking = false;
let originalCameraTarget = null;

function cameraShake(intensity = 0.3, duration = 150) {
    if (!camera || isShaking) return;

    isShaking = true;
    originalCameraTarget = camera.target.clone();

    const startTime = performance.now();
    const shakeInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        if (elapsed >= duration) {
            clearInterval(shakeInterval);
            camera.target = originalCameraTarget;
            isShaking = false;
            return;
        }

        // Decay the shake over time
        const decay = 1 - (elapsed / duration);
        const shakeX = (Math.random() - 0.5) * intensity * decay;
        const shakeY = (Math.random() - 0.5) * intensity * decay;
        const shakeZ = (Math.random() - 0.5) * intensity * decay;

        camera.target = originalCameraTarget.add(new BABYLON.Vector3(shakeX, shakeY, shakeZ));
    }, 16); // ~60fps
}

// Simple impact flash - just an expanding sphere that fades out
function createImpactBurst(position, size = 1, color = new BABYLON.Color3(1, 1, 1)) {
    if (!scene || !position) return;

    // Single expanding sphere
    const flash = BABYLON.MeshBuilder.CreateSphere(`impact_${Date.now()}`, {
        diameter: 0.5 * size,
        segments: 8
    }, scene);
    flash.position = position.clone();

    const mat = new BABYLON.StandardMaterial(`flash_mat_${Date.now()}`, scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    mat.alpha = 0.8;
    flash.material = mat;

    // Quick expand and fade
    const startTime = performance.now();
    const duration = 150 * size;

    const observer = scene.onBeforeRenderObservable.add(() => {
        const progress = (performance.now() - startTime) / duration;

        if (progress >= 1) {
            scene.onBeforeRenderObservable.remove(observer);
            flash.dispose();
            mat.dispose();
            return;
        }

        // Expand and fade
        const scale = 1 + progress * 2 * size;
        flash.scaling.set(scale, scale, scale);
        mat.alpha = 0.8 * (1 - progress);
    });
}

// Combined hit feedback for blocks (subtle)
function blockHitFeedback(position) {
    screenFlash('white', 0.15, 80);
    cameraShake(0.2, 100);
    createImpactBurst(position, 0.8, new BABYLON.Color3(1, 0.9, 0.7)); // Warm wood color
}

// Combined hit feedback for Beeple (stronger)
function beepleHitFeedback(position) {
    screenFlash('red', 0.35, 120);
    cameraShake(0.5, 200);
    createImpactBurst(position, 2.0, new BABYLON.Color3(1, 0.3, 0.3)); // Red burst
}

// ============================================
// BABYLON.JS SETUP
// ============================================

async function initBabylon() {
    // Create engine
    engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
    });

    // Create scene
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.06, 1);

    // Configure Draco decoder for compressed meshes
    BABYLON.DracoCompression.Configuration = {
        decoder: {
            wasmUrl: "https://cdn.babylonjs.com/draco_wasm_wrapper_gltf.js",
            wasmBinaryUrl: "https://cdn.babylonjs.com/draco_decoder_gltf.wasm",
            fallbackUrl: "https://cdn.babylonjs.com/draco_decoder_gltf.js"
        }
    };

    // Initialize Havok Physics with substeps for stability
    havokInstance = await HavokPhysics();
    havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);

    // Reduced gravity (was -9.81) - makes things feel less chaotic
    scene.enablePhysics(new BABYLON.Vector3(0, -7.0, 0), havokPlugin);

    // More physics substeps = smoother, more stable simulation
    havokPlugin.setTimeStep(1/120); // Double the default rate

    // PAUSE physics until game starts - everything stays frozen
    scene.physicsEnabled = false;

    // Camera - positioned to see the tower
    camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,  // alpha
        Math.PI / 2.5, // beta - more horizontal view
        30,            // radius - pulled back a bit
        new BABYLON.Vector3(0, 3, 0), // lower target
        scene
    );
    camera.attachControl(canvas, false); // Allow some camera control

    // Lighting
    const ambientLight = new BABYLON.HemisphericLight(
        "ambient",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    ambientLight.intensity = 0.6;

    const mainLight = new BABYLON.DirectionalLight(
        "mainLight",
        new BABYLON.Vector3(-1, -2, 1),
        scene
    );
    mainLight.intensity = 0.8;
    mainLight.position = new BABYLON.Vector3(10, 20, -10);

    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, mainLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    // Intense dithering post-process effect
    BABYLON.Effect.ShadersStore["ditheringFragmentShader"] = `
        precision highp float;
        varying vec2 vUV;
        uniform sampler2D textureSampler;
        uniform vec2 screenSize;
        uniform float time;

        // 8x8 Bayer matrix for ordered dithering
        float bayer8x8(vec2 pos) {
            int x = int(mod(pos.x, 8.0));
            int y = int(mod(pos.y, 8.0));

            // Bayer 8x8 pattern
            int index = x + y * 8;
            float pattern[64];
            pattern[0] = 0.0; pattern[1] = 32.0; pattern[2] = 8.0; pattern[3] = 40.0;
            pattern[4] = 2.0; pattern[5] = 34.0; pattern[6] = 10.0; pattern[7] = 42.0;
            pattern[8] = 48.0; pattern[9] = 16.0; pattern[10] = 56.0; pattern[11] = 24.0;
            pattern[12] = 50.0; pattern[13] = 18.0; pattern[14] = 58.0; pattern[15] = 26.0;
            pattern[16] = 12.0; pattern[17] = 44.0; pattern[18] = 4.0; pattern[19] = 36.0;
            pattern[20] = 14.0; pattern[21] = 46.0; pattern[22] = 6.0; pattern[23] = 38.0;
            pattern[24] = 60.0; pattern[25] = 28.0; pattern[26] = 52.0; pattern[27] = 20.0;
            pattern[28] = 62.0; pattern[29] = 30.0; pattern[30] = 54.0; pattern[31] = 22.0;
            pattern[32] = 3.0; pattern[33] = 35.0; pattern[34] = 11.0; pattern[35] = 43.0;
            pattern[36] = 1.0; pattern[37] = 33.0; pattern[38] = 9.0; pattern[39] = 41.0;
            pattern[40] = 51.0; pattern[41] = 19.0; pattern[42] = 59.0; pattern[43] = 27.0;
            pattern[44] = 49.0; pattern[45] = 17.0; pattern[46] = 57.0; pattern[47] = 25.0;
            pattern[48] = 15.0; pattern[49] = 47.0; pattern[50] = 7.0; pattern[51] = 39.0;
            pattern[52] = 13.0; pattern[53] = 45.0; pattern[54] = 5.0; pattern[55] = 37.0;
            pattern[56] = 63.0; pattern[57] = 31.0; pattern[58] = 55.0; pattern[59] = 23.0;
            pattern[60] = 61.0; pattern[61] = 29.0; pattern[62] = 53.0; pattern[63] = 21.0;

            for (int i = 0; i < 64; i++) {
                if (i == index) return pattern[i] / 64.0;
            }
            return 0.0;
        }

        void main(void) {
            // === TWEAKABLE PARAMS ===
            float ditherStrength = 0.12;    // Intensity (0.1 = subtle, 1.0 = extreme)
            float ditherScale = 1.2;        // Cell size (1.0 = tiny, 4.0 = chunky)
            float scanlineIntensity = 0.001; // Scanlines (0 = off, 0.1 = strong)
            float colorLevels = 48.0;       // Color depth (8 = very posterized, 64 = subtle)
            float pixelScale = 1.2;         // Pixelation (1.0 = off, 4.0 = chunky pixels)

            // Get screen pixel position
            vec2 pixelPos = vUV * screenSize;

            // Pixelation - snap UV to lower resolution grid
            vec2 pixelatedUV = floor(vUV * screenSize / pixelScale) * pixelScale / screenSize;
            vec4 color = texture2D(textureSampler, pixelatedUV);

            // Calculate luminance for luminance-based dithering
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

            // Midtone boost - dither more in midtones, less in shadows/highlights
            // Creates a bell curve peaking at 0.5 luminance
            float midtoneFactor = 1.0 - abs(luminance - 0.5) * 2.0;
            midtoneFactor = midtoneFactor * midtoneFactor; // Square for smoother falloff

            // Apply dithering scaled by midtone factor
            vec2 scaledPos = pixelPos / ditherScale;
            float dither = bayer8x8(scaledPos);
            dither = (dither - 0.5) * ditherStrength * (0.5 + midtoneFactor * 0.8);

            // Add scanline effect
            float scanline = sin(pixelPos.y * 1.5) * scanlineIntensity;

            // Apply dither and scanlines
            color.rgb += vec3(dither) + vec3(scanline);

            // Color banding effect (reduce color depth)
            color.rgb = floor(color.rgb * colorLevels + 0.5) / colorLevels;

            gl_FragColor = color;
        }
    `;

    const ditheringEffect = new BABYLON.PostProcess(
        "dithering",
        "dithering",
        ["screenSize", "time"],
        null,
        1.0,
        camera
    );

    ditheringEffect.onApply = (effect) => {
        effect.setFloat2("screenSize", engine.getRenderWidth(), engine.getRenderHeight());
        effect.setFloat("time", performance.now() / 1000);
    };

    // Ground
    ground = BABYLON.MeshBuilder.CreateGround("ground", {
        width: 50,
        height: 50
    }, scene);
    
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.2);
    groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;
    ground.receiveShadows = true;

    // Ground physics
    new BABYLON.PhysicsAggregate(
        ground,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 0, friction: 0.8, restitution: 0.1 },
        scene
    );

    // Set starting level from URL param before creating tower
    currentLevel = getStartingLevel();

    // Load beeple textures before creating tower
    loadBeepleTextures();

    // Create the tower with dude on top
    await createTower(shadowGenerator);

    // Start render loop
    engine.runRenderLoop(() => {
        scene.render();
    });

    // Handle resize
    window.addEventListener('resize', () => {
        engine.resize();
    });

    return scene;
}

// ============================================
// TOWER CREATION (Level-based)
// ============================================


async function createTower(shadowGenerator) {
    // Clear existing blocks
    blocks.forEach(block => {
        if (block.physicsBody) {
            block.physicsBody.dispose();
        }
        block.dispose();
    });
    blocks = [];

    // Clear existing dudes
    dudes.forEach(dude => {
        if (dude) dude.dispose();
    });
    dudes = [];
    dudePhysicsBoxes.forEach(box => {
        if (box) {
            if (box.physicsBody) box.physicsBody.dispose();
            box.dispose();
        }
    });
    dudePhysicsBoxes = [];
    dudeInitialYs = [];
    dudeInitialPositions = [];
    dudesFallenCount = 0;
    totalDudes = 0;

    // Check for test level from editor first
    const testLevel = getTestLevel();
    let levelData;

    if (testLevel) {
        levelData = testLevel;
        console.log(`Loading TEST LEVEL: ${levelData.name}`);
    } else {
        const levelIndex = currentLevel - 1;
        levelData = LEVELS[levelIndex] || LEVELS[0];
        console.log(`Loading Level ${currentLevel}: ${levelData.name}`);
    }

    // Track the highest block Y for dude placement
    let maxBlockTopY = 0;

    // Create blocks from level definition
    levelData.blocks.forEach((blockDef, index) => {
        const blockType = BLOCK_TYPES[blockDef.type] || BLOCK_TYPES.STANDARD;

        const block = BABYLON.MeshBuilder.CreateBox(`block_${index}`, {
            width: blockType.width,
            height: blockType.height,
            depth: blockType.depth
        }, scene);

        // Position
        block.position = new BABYLON.Vector3(
            blockDef.position.x,
            blockDef.position.y,
            blockDef.position.z
        );

        // Rotation (convert degrees to radians)
        if (blockDef.rotation) {
            block.rotation.y = (blockDef.rotation * Math.PI) / 180;
        }

        // Material - random beeple texture for each block
        const mat = new BABYLON.StandardMaterial(`blockMat_${index}`, scene);

        // Pick a random beeple texture for this block
        if (beepleTextures.length > 0) {
            const randomTexture = beepleTextures[Math.floor(Math.random() * beepleTextures.length)];
            mat.diffuseTexture = randomTexture;
        }

        // Neutral tint to let the textures show through
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        mat.specularPower = 16;
        block.material = mat;

        // Shadow
        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(block);
        }
        block.receiveShadows = true;

        // Physics
        const blockAggregate = new BABYLON.PhysicsAggregate(
            block,
            BABYLON.PhysicsShapeType.BOX,
            {
                mass: blockType.isStatic ? 0 : blockType.mass,
                friction: 0.95,
                restitution: 0.0
            },
            scene
        );

        // Damping for dynamic blocks
        if (!blockType.isStatic && blockAggregate.body) {
            blockAggregate.body.setLinearDamping(0.9);
            blockAggregate.body.setAngularDamping(0.95);
        }

        // Store initial position for scoring
        block.metadata = {
            initialY: blockDef.position.y,
            scored: false,
            isStatic: blockType.isStatic || false
        };

        blocks.push(block);

        // Store block top Y for per-dude height calculation later
        if (!blockDef.skipForDudeHeight) {
            block.metadata.topY = blockDef.position.y + blockType.height / 2;
        }
    });

    // Support both single dudePosition and multiple dudePositions
    const dudePositionsArray = levelData.dudePositions || [levelData.dudePosition];
    totalDudes = dudePositionsArray.length;

    // Load each dude at their specified position
    for (const dudePos of dudePositionsArray) {
        // Calculate max block height near THIS dude's position
        let maxBlockTopY = 0;
        blocks.forEach(block => {
            if (block.metadata && block.metadata.topY !== undefined) {
                const dx = Math.abs(block.position.x - dudePos.x);
                const dz = Math.abs(block.position.z - dudePos.z);
                if (dx < 4 && dz < 4) {
                    if (block.metadata.topY > maxBlockTopY) {
                        maxBlockTopY = block.metadata.topY;
                    }
                }
            }
        });

        await loadDudeAtPosition(
            shadowGenerator,
            dudePos.x,
            dudePos.z,
            maxBlockTopY
        );
    }

    // Auto-fit camera to show all blocks and dudes
    fitCameraToLevel(levelData);
}

// Adjust camera to fit all level content in view
function fitCameraToLevel(levelData) {
    if (!camera || !levelData) return;

    // Calculate bounding box of all blocks
    let minX = Infinity, maxX = -Infinity;
    let minY = 0, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // Include all blocks
    levelData.blocks.forEach(blockDef => {
        const blockType = BLOCK_TYPES[blockDef.type] || BLOCK_TYPES.STANDARD;
        const x = blockDef.position.x;
        const y = blockDef.position.y + blockType.height / 2; // Top of block
        const z = blockDef.position.z;

        minX = Math.min(minX, x - blockType.width / 2);
        maxX = Math.max(maxX, x + blockType.width / 2);
        maxY = Math.max(maxY, y + 3); // Add height for dude on top
        minZ = Math.min(minZ, z - blockType.depth / 2);
        maxZ = Math.max(maxZ, z + blockType.depth / 2);
    });

    // Include dude positions (with estimated dude height)
    const dudePositionsArray = levelData.dudePositions || [levelData.dudePosition];
    dudePositionsArray.forEach(dudePos => {
        minX = Math.min(minX, dudePos.x - 2);
        maxX = Math.max(maxX, dudePos.x + 2);
        minZ = Math.min(minZ, dudePos.z - 2);
        maxZ = Math.max(maxZ, dudePos.z + 2);
    });

    // Calculate center and size
    const centerX = (minX + maxX) / 2;
    const centerY = maxY / 2;
    const centerZ = (minZ + maxZ) / 2;

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    // Calculate required radius to fit everything
    const maxSize = Math.max(sizeX, sizeY, sizeZ);
    const radius = Math.max(maxSize * 1.2, 25); // At least 25, or 1.2x the max dimension

    // Animate camera to new position
    const targetPosition = new BABYLON.Vector3(centerX, centerY, centerZ);

    // Smoothly animate camera
    BABYLON.Animation.CreateAndStartAnimation(
        "cameraTarget",
        camera,
        "target",
        30,
        15,
        camera.target,
        targetPosition,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    BABYLON.Animation.CreateAndStartAnimation(
        "cameraRadius",
        camera,
        "radius",
        30,
        15,
        camera.radius,
        radius,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    console.log(`Camera fit: center(${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)}), radius: ${radius.toFixed(1)}`);
}

async function loadDudeAtPosition(shadowGenerator, posX, posZ, platformTopY) {
    const targetHeight = 3;

    // The physics box height
    const physicsBoxHeight = 2.5;

    // Position so the BOTTOM of the physics box is on top of the platform
    const initialY = platformTopY + (physicsBoxHeight / 2); // half the box height, flush with surface

    // Store initial position for fall detection (so we check displacement, not absolute coords)
    const initialPosition = { x: posX, z: posZ };

    // Add to tracking arrays
    dudeInitialYs.push(initialY);
    dudeInitialPositions.push(initialPosition);

    // First, create an INVISIBLE physics box that will be the actual physics body
    // Make it a decent size so it collides properly
    const dudeIndex = dudePhysicsBoxes.length;
    const dudePhysicsBox = BABYLON.MeshBuilder.CreateBox(`dudePhysicsBox_${dudeIndex}`, {
        width: 1.2,
        height: physicsBoxHeight,
        depth: 1.2
    }, scene);
    dudePhysicsBox.position = new BABYLON.Vector3(posX, initialY, posZ);
    dudePhysicsBox.isVisible = false; // Invisible!
    
    // Add physics to the invisible box
    const physicsAggregate = new BABYLON.PhysicsAggregate(
        dudePhysicsBox,
        BABYLON.PhysicsShapeType.BOX,
        {
            mass: 3.0,      // Heavier to match block mass better
            friction: 0.98, // Very high friction to grip blocks
            restitution: 0.0  // No bounce
        },
        scene
    );

    // Very high damping - dude should be stable like a statue until hit
    if (physicsAggregate.body) {
        physicsAggregate.body.setLinearDamping(0.92);  // Very high - settles fast
        physicsAggregate.body.setAngularDamping(0.99); // Almost frozen rotation
    }

    try {
        console.log("Loading dude.glb...");
        
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "dude.glb",
            scene
        );

        console.log("Dude loaded!", result);

        // STOP ALL ANIMATIONS
        if (result.animationGroups) {
            result.animationGroups.forEach(animGroup => {
                animGroup.stop();
                animGroup.dispose(); // Get rid of them entirely
                console.log("Stopped and disposed animation:", animGroup.name);
            });
        }
        scene.stopAllAnimations();

        // Get the root mesh
        const meshes = result.meshes;
        
        // Find or create a root for the visual model
        let dude = meshes[0]; // Usually __root__

        // Calculate bounding box
        let minY = Infinity, maxY = -Infinity;

        meshes.forEach(mesh => {
            scene.stopAnimation(mesh);

            if (shadowGenerator && mesh.name !== "__root__") {
                shadowGenerator.addShadowCaster(mesh);
            }
            mesh.receiveShadows = true;

            // Get bounds
            if (mesh.getBoundingInfo) {
                const bounds = mesh.getBoundingInfo().boundingBox;
                minY = Math.min(minY, bounds.minimumWorld.y);
                maxY = Math.max(maxY, bounds.maximumWorld.y);
            }
        });

        const modelHeight = maxY - minY;
        console.log(`Dude model height: ${modelHeight.toFixed(2)}`);

        // Scale the visual model
        const scale = targetHeight / (modelHeight || 1);
        dude.scaling = new BABYLON.Vector3(scale, scale, scale);

        // Parent the visual to the physics box (NO physics on the visual!)
        dude.setParent(dudePhysicsBox);
        // Offset to align dude's feet with bottom of physics box
        // Physics box is 2.5 tall (center at 1.25 from bottom), dude is 3 tall (center at 1.5 from feet)
        dude.position = new BABYLON.Vector3(0, 0.25, 0);

        console.log(`Dude ${dudeIndex} attached to physics box at Y:`, initialY);

        // Add to arrays
        dudes.push(dude);
        dudePhysicsBoxes.push(dudePhysicsBox);
        
    } catch (error) {
        console.error("Error loading dude.glb:", error);

        // Fallback - create a visible cylinder attached to the physics box
        console.log("Creating placeholder dude...");

        let dude = BABYLON.MeshBuilder.CreateCylinder(`dudePlaceholder_${dudeIndex}`, {
            height: targetHeight,
            diameterTop: 0.8,
            diameterBottom: 1.2
        }, scene);

        const dudeMat = new BABYLON.StandardMaterial(`dudeMat_${dudeIndex}`, scene);
        dudeMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.6);
        dudeMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        dude.material = dudeMat;

        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(dude);
        }
        dude.receiveShadows = true;

        // Parent to physics box
        dude.setParent(dudePhysicsBox);
        dude.position = BABYLON.Vector3.Zero();

        // Add to arrays
        dudes.push(dude);
        dudePhysicsBoxes.push(dudePhysicsBox);
    }
}

// ============================================
// LOAD THROWABLE OBJECTS
// ============================================

async function loadDildoModel() {
    try {
        console.log("Loading dildo.glb...");

        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "dildo.glb",
            scene
        );

        // Stop any animations
        if (result.animationGroups) {
            result.animationGroups.forEach(ag => {
                ag.stop();
                ag.dispose();
            });
        }

        console.log("Dildo meshes loaded:", result.meshes.map(m => m.name));

        // Log details about each mesh
        result.meshes.forEach((mesh, i) => {
            const verts = mesh.getTotalVertices?.() || 0;
            console.log(`  [${i}] "${mesh.name}" - vertices: ${verts}, visible: ${mesh.isVisible}`);
        });

        // Find the first mesh with actual geometry (not __root__)
        dildoTemplate = result.meshes.find(m => m.name !== "__root__" && m.getTotalVertices() > 0);

        // If no mesh with geometry found, use root but we'll need to clone children
        if (!dildoTemplate) {
            dildoTemplate = result.meshes[0];
            console.log("Using root as template, will clone with children");
        }

        // Hide the template - we'll clone it when throwing
        result.meshes.forEach(mesh => {
            mesh.setEnabled(false);
        });

        // Store ALL meshes for cloning (in case we need children)
        dildoTemplate._allMeshes = result.meshes;

        console.log(`✅ Dildo template ready: "${dildoTemplate.name}" (${result.meshes.length} total meshes)`);

    } catch (error) {
        console.error("Error loading dildo.glb:", error);
        console.log("Will fall back to throwing balls");
        dildoTemplate = null;
    }
}

// ============================================
// BEEPLE TEXTURES FOR BLOCKS
// ============================================

function loadBeepleTextures() {
    console.log("Loading beeple textures...");

    // Load all 10 beeple textures
    for (let i = 1; i <= 10; i++) {
        const texture = new BABYLON.Texture(`textures/texture${i}.jpg`, scene);
        texture.uScale = 1;
        texture.vScale = 1;
        beepleTextures.push(texture);
    }

    console.log(`Loaded ${beepleTextures.length} beeple textures`);
}

// ============================================
// BEEPLE STUDIOS ENVIRONMENT
// ============================================

async function loadStudioEnvironment(shadowGenerator) {
    try {
        console.log("Loading beeple_studios.glb...");

        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "beeple_studios.glb",
            scene
        );

        console.log("Beeple Studios loaded!", result.meshes.length, "meshes");

        // Get the root mesh
        studioEnvironment = result.meshes[0];

        // Scale up the environment (it's small by default)
        // Original bounding box is roughly 8.5 x 6.2 x 11.3 units
        // We want it to be much larger to encompass the play area
        const envScale = 32;
        studioEnvironment.scaling = new BABYLON.Vector3(envScale, envScale, envScale);

        // Position the environment
        // Center it roughly where the game takes place
        // The tower is at Z=-8, so position environment accordingly
        studioEnvironment.position = new BABYLON.Vector3(0, 0, 0);

        // Make all meshes receive shadows
        result.meshes.forEach(mesh => {
            mesh.receiveShadows = true;
            // Don't cast shadows from environment (performance)
            // But make sure it doesn't block the game
            mesh.isPickable = false;
        });

        // Hide the default ground since we have the studio floor now
        if (ground) {
            ground.isVisible = false;
        }

        console.log(`✅ Beeple Studios environment loaded! Scale: ${envScale}x`);

    } catch (error) {
        console.error("Error loading beeple_studios.glb:", error);
        console.log("Continuing with default ground...");
    }
}

// Dancing Beeple - ambient character in the scene
let dancingBeeple = null;

async function loadDancingBeeple(shadowGenerator) {
    try {
        console.log("Loading dancing_beeple.glb...");

        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "dancing_beeple.glb",
            scene
        );

        console.log("Dancing Beeple loaded!", result.meshes.length, "meshes");

        // Get the root mesh
        dancingBeeple = result.meshes[0];

        // Scale him up to be visible
        const beepleScale = 3;
        dancingBeeple.scaling = new BABYLON.Vector3(beepleScale, beepleScale, beepleScale);

        // Position him off to the side - visible but not in the play area
        // Play area is roughly centered at x=0, z=-8
        dancingBeeple.position = new BABYLON.Vector3(15, 0, -5);
        dancingBeeple.rotation.y = -Math.PI / 3; // Angle toward the action

        // Add shadows
        result.meshes.forEach(mesh => {
            if (shadowGenerator && mesh.name !== "__root__") {
                shadowGenerator.addShadowCaster(mesh);
            }
            mesh.receiveShadows = true;
            mesh.isPickable = false; // Don't interfere with gameplay
        });

        // Keep animations playing (dancing!)
        if (result.animationGroups && result.animationGroups.length > 0) {
            result.animationGroups.forEach(anim => {
                anim.play(true); // Loop the animation
                console.log("Playing animation:", anim.name);
            });
        }

        console.log(`✅ Dancing Beeple loaded and grooving!`);

    } catch (error) {
        console.error("Error loading dancing_beeple.glb:", error);
    }
}

// ============================================
// FLOPPY DILDO CREATION
// ============================================

function createFloppyDildo(startPosition, throwDirection, handVelocity = { x: 0, y: 0, z: 0 }) {
    const segments = [];
    const joints = [];
    let visualDildo = null;
    let hasHitBlock = false; // Track if this dildo has already hit a block (for one-time wood sound)

    // Create each physics segment (INVISIBLE - just for physics)
    for (let i = 0; i < DILDO_SEGMENTS; i++) {
        const isBase = i === 0;

        // Segment gets slightly smaller toward the tip
        const taperFactor = 1 - (i / DILDO_SEGMENTS) * 0.3;
        const radius = DILDO_SEGMENT_RADIUS * taperFactor;

        // Create capsule shape for each segment
        const segment = BABYLON.MeshBuilder.CreateCapsule(`dildo_seg_${throws}_${i}`, {
            height: DILDO_SEGMENT_LENGTH,
            radius: radius,
            tessellation: 8,
            subdivisions: 1
        }, scene);

        // Hide the physics segments (visual dildo is shown instead)
        segment.isVisible = false;

        // Position segments in a line
        const offset = i * DILDO_SEGMENT_LENGTH * 0.9;
        segment.position = startPosition.add(throwDirection.scale(offset));

        // Add physics - heavier to impact the heavier blocks
        const segmentMass = isBase ? 3.0 : 1.5;  // Was 0.5/0.2 - much heavier now
        const aggregate = new BABYLON.PhysicsAggregate(
            segment,
            BABYLON.PhysicsShapeType.CAPSULE,
            {
                mass: segmentMass,
                friction: 0.7,      // More friction for solid feel
                restitution: 0.1    // Was 0.4 - less bouncy, more solid impact
            },
            scene
        );

        // Moderate damping - still floppy but not too wild
        if (aggregate.body) {
            aggregate.body.setLinearDamping(0.2);
            aggregate.body.setAngularDamping(0.3);

            // Enable continuous collision detection to prevent clipping
            aggregate.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
            // Set collision margin for better detection
            if (aggregate.shape) {
                aggregate.shape.filterMembershipMask = 1;
                aggregate.shape.filterCollideMask = 1;
            }

            // Add collision detection for hit sounds
            aggregate.body.setCollisionCallbackEnabled(true);
            const observable = havokPlugin.onCollisionObservable.add((event) => {
                if (event.type === 'COLLISION_STARTED') {
                    const collidedBody = event.collider === aggregate.body ? event.collidedAgainst : event.collider;
                    const collidedMesh = collidedBody?.transformNode;

                    if (collidedMesh) {
                        // Get impact position (use segment position as approximation)
                        const impactPos = segment.position.clone();

                        // Check if we hit a block (wood hit sound - only first time per dildo)
                        if (collidedMesh.name?.startsWith('block_') && !hasHitBlock) {
                            hasHitBlock = true;
                            playWoodHitSound();
                            blockHitFeedback(impactPos);
                        }
                        // Check if we hit Beeple (beeple hit sound + stronger feedback)
                        else if (collidedMesh.name?.startsWith('dudePhysicsBox_')) {
                            playBeepleHitSound();
                            beepleHitFeedback(impactPos);
                        }
                    }
                }
            });

            // Store observable for cleanup
            segment._collisionObservable = observable;
        }

        segments.push({ mesh: segment, aggregate: aggregate });

        // Create joint to previous segment
        if (i > 0) {
            const prevSegment = segments[i - 1];
            const jointDistance = DILDO_SEGMENT_LENGTH * 0.45;

            try {
                const joint = new BABYLON.Physics6DoFConstraint(
                    {
                        pivotA: new BABYLON.Vector3(0, jointDistance, 0),
                        pivotB: new BABYLON.Vector3(0, -jointDistance, 0),
                        axisA: new BABYLON.Vector3(0, 1, 0),
                        axisB: new BABYLON.Vector3(0, 1, 0),
                        perpAxisA: new BABYLON.Vector3(1, 0, 0),
                        perpAxisB: new BABYLON.Vector3(1, 0, 0)
                    },
                    [
                        { axis: BABYLON.PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
                        { axis: BABYLON.PhysicsConstraintAxis.LINEAR_Y, minLimit: 0, maxLimit: 0 },
                        { axis: BABYLON.PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
                        { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_X, minLimit: -Math.PI / 4, maxLimit: Math.PI / 4 },
                        { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_Y, minLimit: -Math.PI / 6, maxLimit: Math.PI / 6 },
                        { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_Z, minLimit: -Math.PI / 4, maxLimit: Math.PI / 4 }
                    ],
                    scene
                );

                prevSegment.aggregate.body.addConstraint(aggregate.body, joint);
                joints.push(joint);
            } catch (e) {
                console.warn("Joint creation failed:", e);
            }
        }
    }

    // Now attach the VISUAL dildo model to the middle segment
    if (dildoTemplate && dildoTemplate._allMeshes) {
        // Create container for visual
        visualDildo = new BABYLON.Mesh(`visual_dildo_${throws}`, scene);

        // Clone the GLB meshes
        const skipNames = ['plane', 'cube', 'floor', 'ground', 'grid', 'background', 'rect'];
        dildoTemplate._allMeshes.forEach(mesh => {
            const nameLower = mesh.name.toLowerCase();
            const shouldSkip = skipNames.some(skip => nameLower.includes(skip));

            if (mesh.name !== "__root__" && mesh.getTotalVertices() > 0 && !shouldSkip) {
                const clone = mesh.clone(`${mesh.name}_visual_${throws}`, visualDildo);
                clone.setEnabled(true);
                clone.isVisible = true;
            }
        });

        // Scale the visual
        visualDildo.scaling = new BABYLON.Vector3(dildoScale, dildoScale, dildoScale);

        // Update visual position each frame to follow physics
        const updateVisual = () => {
            if (visualDildo && !visualDildo.isDisposed() && segments[0]?.mesh) {
                // Position at base segment
                visualDildo.position = segments[0].mesh.position.clone();

                // Rotate to point from base toward tip
                if (segments.length > 1) {
                    const basePos = segments[0].mesh.position;
                    const tipPos = segments[segments.length - 1].mesh.position;
                    const direction = tipPos.subtract(basePos).normalize();

                    // Calculate rotation to align with direction
                    const up = new BABYLON.Vector3(0, 1, 0);
                    const angle = Math.acos(BABYLON.Vector3.Dot(up, direction));
                    const axis = BABYLON.Vector3.Cross(up, direction).normalize();

                    if (axis.length() > 0.001) {
                        visualDildo.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);
                    }
                }
            }
        };

        // Register update function
        const observer = scene.onBeforeRenderObservable.add(updateVisual);

        // Store observer for cleanup
        visualDildo._updateObserver = observer;

        console.log(`👀 Visual dildo attached!`);
    } else {
        console.log(`⚠️ No dildo template, using physics capsules as fallback visual`);
        // Make physics capsules visible as fallback
        segments.forEach((seg, i) => {
            seg.mesh.isVisible = true;
            const mat = new BABYLON.StandardMaterial(`fallback_mat_${throws}_${i}`, scene);
            const t = i / (segments.length - 1);
            mat.diffuseColor = BABYLON.Color3.Lerp(
                new BABYLON.Color3(0.95, 0.6, 0.7),
                new BABYLON.Color3(0.85, 0.4, 0.5),
                t
            );
            seg.mesh.material = mat;
        });
    }

    // Apply initial throw impulse to the base segment
    if (segments.length > 0) {
        // Calculate hand velocity magnitude
        const velocityMagnitude = Math.sqrt(
            handVelocity.x * handVelocity.x +
            handVelocity.y * handVelocity.y +
            handVelocity.z * handVelocity.z
        );

        // Vary throw force based on hand speed (faster = stronger throw)
        const forceVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3x
        const velocityBoost = 1.0 + Math.min(velocityMagnitude * 10, 0.5); // Up to 1.5x for fast hands
        const actualForce = DILDO_THROW_FORCE * forceVariation * velocityBoost;

        // Add slight random angle variation to throw direction
        const angleVariation = 0.08; // radians
        const variedDirection = throwDirection.clone();
        variedDirection.x += (Math.random() - 0.5) * angleVariation;
        variedDirection.y += (Math.random() - 0.5) * angleVariation * 0.5;
        variedDirection.normalize();

        const impulse = variedDirection.scale(actualForce);
        segments[0].aggregate.body.applyImpulse(impulse, segments[0].mesh.position);

        // Big random base spin + hand velocity influence
        // Hand movement amplifies and biases the spin direction
        const baseRandomSpin = 15; // Base random spin amount
        const handInfluence = 400; // How much hand velocity affects spin

        const spinX = (handVelocity.y * handInfluence) + (Math.random() - 0.5) * baseRandomSpin;
        const spinY = (handVelocity.z * handInfluence * 0.7) + (Math.random() - 0.5) * baseRandomSpin;
        const spinZ = (-handVelocity.x * handInfluence) + (Math.random() - 0.5) * baseRandomSpin;

        // Extra spin multiplier for fast hand movements
        const spinBoost = 1.0 + Math.min(velocityMagnitude * 15, 2.0);

        segments[0].aggregate.body.setAngularVelocity(new BABYLON.Vector3(
            spinX * spinBoost,
            spinY * spinBoost,
            spinZ * spinBoost
        ));

        console.log(`🌀 Throw: force=${actualForce.toFixed(0)}, spin=${(spinX*spinBoost).toFixed(1)},${(spinY*spinBoost).toFixed(1)},${(spinZ*spinBoost).toFixed(1)}, handMag=${velocityMagnitude.toFixed(3)}`);
    }

    // Store dildo for cleanup on level change (no auto-cleanup)
    thrownDildos.push({
        segments: segments,
        visualDildo: visualDildo
    });

    console.log(`🍆 Created floppy dildo with ${segments.length} physics segments!`);

    return segments;
}

// Clean up all thrown dildos (called between levels)
function clearThrownDildos() {
    thrownDildos.forEach(dildo => {
        // Remove visual update observer
        if (dildo.visualDildo?._updateObserver) {
            scene.onBeforeRenderObservable.remove(dildo.visualDildo._updateObserver);
        }

        // Dispose visual
        if (dildo.visualDildo) {
            dildo.visualDildo.getChildMeshes().forEach(m => m.dispose());
            dildo.visualDildo.dispose();
        }

        // Dispose physics segments
        dildo.segments.forEach(seg => {
            // Remove collision observable
            if (seg.mesh?._collisionObservable) {
                havokPlugin.onCollisionObservable.remove(seg.mesh._collisionObservable);
            }
            if (seg.aggregate?.body) {
                seg.aggregate.body.dispose();
            }
            if (seg.mesh) {
                seg.mesh.dispose();
            }
        });
    });

    thrownDildos = [];
    console.log('Cleared all thrown dildos');
}

// ============================================
// PROJECTILE THROWING
// ============================================

// Store current hand velocity for throwing
let currentHandVelocity = { x: 0, y: 0, z: 0 };

function throwBall() {
    if (!canThrow || !gameStarted) return;

    // Check if we have throws remaining
    if (throwsRemaining <= 0) {
        showGameOver();
        return;
    }

    canThrow = false;
    throws++;
    throwsRemaining--;
    throwsEl.textContent = `Throws: ${throws}`;
    updateThrowsUI();

    // Play alternating throw sound
    const sound = throwSounds[currentThrowSoundIndex];
    sound.currentTime = 0; // Reset to start in case it's still playing
    sound.play().catch(e => console.log('Sound play blocked:', e));
    currentThrowSoundIndex = (currentThrowSoundIndex + 1) % throwSounds.length;

    // Show throw feedback
    throwIndicator.className = 'thrown';
    throwIndicator.textContent = 'THROWN!';

    // Calculate throw direction from camera through crosshair position
    const screenX = handPosition.x * canvas.width;
    const screenY = handPosition.y * canvas.height;
    const ray = scene.createPickingRay(screenX, screenY, null, camera);

    // Start position: from camera, slightly in front
    const startDistance = 3;
    const startPosition = camera.position.add(camera.getForwardRay().direction.scale(startDistance));
    startPosition.y -= 0.5;

    // Create floppy dildo with hand velocity for spin!
    createFloppyDildo(startPosition, ray.direction, currentHandVelocity);

    // Cooldown
    setTimeout(() => {
        canThrow = true;

        // Check if out of throws after cooldown (and dude hasn't fallen)
        if (throwsRemaining <= 0 && !dudeFallen) {
            throwIndicator.className = 'thrown';
            throwIndicator.textContent = 'No throws left!';
            throwIndicator.style.background = 'rgba(255, 68, 68, 0.5)';

            // Give a moment to see if dude falls from last throw
            setTimeout(() => {
                if (dudesFallenCount < totalDudes && throwsRemaining <= 0) {
                    showGameOver();
                }
            }, 2000);
        } else {
            throwIndicator.className = 'ready';
            throwIndicator.textContent = 'Ready to throw!';
        }
    }, throwCooldown);
}

// ============================================
// SCORE CHECKING
// ============================================

function checkScore() {
    if (!gameStarted) return;

    // Check blocks
    blocks.forEach(block => {
        if (block.metadata && !block.metadata.scored) {
            // Check if block has fallen significantly
            const fallDistance = block.metadata.initialY - block.position.y;
            if (fallDistance > 1 || Math.abs(block.position.x) > 5 || Math.abs(block.position.z) > 5) {
                block.metadata.scored = true;
                score += 100;
                scoreEl.textContent = score;

                // Visual feedback - flash the score
                scoreEl.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    scoreEl.style.transform = 'scale(1)';
                }, 100);
            }
        }
    });

    // Check if each dude has fallen
    dudePhysicsBoxes.forEach((box, index) => {
        if (!box || box.metadata?.fallen) return; // Skip already fallen dudes

        const initialY = dudeInitialYs[index];
        const initialPos = dudeInitialPositions[index];
        if (!initialPos) return;

        // Dude's physics box is 2.5 units tall, so center at Y=1.25 means bottom is on ground
        // We consider "on ground" when Y < 2 (giving some margin)
        const onGround = box.position.y < 2;

        if (onGround) {
            // Mark this dude as fallen
            box.metadata = box.metadata || {};
            box.metadata.fallen = true;
            dudesFallenCount++;

            score += 1000; // Bonus for each dude knocked down!
            scoreEl.textContent = score;

            // Visual feedback
            scoreEl.style.transform = 'scale(1.5)';
            scoreEl.style.color = '#44ff44';

            console.log(`DUDE ${index + 1} KNOCKED DOWN! (${dudesFallenCount}/${totalDudes})`);

            // Show message
            throwIndicator.className = 'thrown';
            if (dudesFallenCount < totalDudes) {
                throwIndicator.textContent = `🎉 DUDE DOWN! ${dudesFallenCount}/${totalDudes} +1000 🎉`;
                throwIndicator.style.background = 'rgba(255, 200, 68, 0.8)';
                // Reset visual feedback after a moment
                setTimeout(() => {
                    scoreEl.style.transform = 'scale(1)';
                    scoreEl.style.color = '#ff4444';
                    throwIndicator.className = 'ready';
                    throwIndicator.textContent = 'Keep going!';
                    throwIndicator.style.background = 'rgba(68, 255, 68, 0.3)';
                }, 1000);
            } else {
                // ALL dudes down - level complete!
                throwIndicator.textContent = `🎉 ALL DUDES DOWN! +1000 🎉`;
                throwIndicator.style.background = 'rgba(68, 255, 68, 0.8)';

                // Show level complete after a short delay
                setTimeout(() => {
                    scoreEl.style.transform = 'scale(1)';
                    scoreEl.style.color = '#ff4444';
                    showLevelComplete();
                }, 1500);
            }
        }
    });
}

// ============================================
// MEDIAPIPE HANDS SETUP
// ============================================

async function initHandTracking() {
    // Set canvas size
    handCanvas.width = webcamVideo.videoWidth || 320;
    handCanvas.height = webcamVideo.videoHeight || 240;

    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onHandResults);

    // Setup camera
    const webcamCamera = new Camera(webcamVideo, {
        onFrame: async () => {
            await hands.send({ image: webcamVideo });
        },
        width: 320,
        height: 240
    });

    await webcamCamera.start();
    console.log("Hand tracking started!");
}

// Track hand movement for velocity-based throw detection
let previousWristX = 0;
let previousWristY = 0;
let velocityHistory = [];
const VELOCITY_HISTORY_SIZE = 5;

function onHandResults(results) {
    // Clear canvas
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Draw hand landmarks
        drawConnectors(handCtx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
        });
        drawLandmarks(handCtx, landmarks, {
            color: '#FF0000',
            lineWidth: 1,
            radius: 3
        });

        // Get index finger tip (landmark 8) for aiming
        const indexTip = landmarks[8];
        
        // Update hand position (mirrored)
        handPosition.x = 1 - indexTip.x; // Mirror X
        handPosition.y = indexTip.y;

        // Update crosshair position
        updateCrosshair();

        // Detect throw gesture using wrist movement
        const wrist = landmarks[0];
        
        // Calculate velocity based on X/Y movement (more reliable than Z)
        const velocityX = wrist.x - previousWristX;
        const velocityY = wrist.y - previousWristY;
        const velocityZ = previousHandZ - wrist.z; // Z toward camera

        // Store current velocity for use when throwing
        currentHandVelocity = { x: velocityX, y: velocityY, z: velocityZ };

        // Combined velocity magnitude
        const totalVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);
        
        // Track velocity history for smoothing
        velocityHistory.push(totalVelocity);
        if (velocityHistory.length > VELOCITY_HISTORY_SIZE) {
            velocityHistory.shift();
        }
        
        // Get max recent velocity
        const maxRecentVelocity = Math.max(...velocityHistory);
        
        // Update previous positions
        previousWristX = wrist.x;
        previousWristY = wrist.y;
        previousHandZ = wrist.z;

        // Throw detection - quick movement in any direction
        // Lowered threshold significantly for easier triggering
        const throwThreshold = 0.05; // Was 0.03 for Z only
        
        if (maxRecentVelocity > throwThreshold && canThrow && gameStarted) {
            console.log(`THROW! Velocity: ${maxRecentVelocity}`);
            throwBall();
            velocityHistory = []; // Reset after throw
        }

        // Update throw indicator
        if (canThrow && gameStarted) {
            throwIndicator.className = 'ready';
        }
    } else {
        // No hand detected
        if (gameStarted) {
            throwIndicator.className = '';
            throwIndicator.textContent = 'Show your hand to aim';
            throwIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
        }
    }
}

function updateCrosshair() {
    const x = handPosition.x * window.innerWidth;
    const y = handPosition.y * window.innerHeight;
    crosshair.style.left = `${x}px`;
    crosshair.style.top = `${y}px`;
}

// ============================================
// LEVEL MANAGEMENT
// ============================================

function updateLevelUI() {
    const levelData = LEVELS[currentLevel - 1] || LEVELS[0];

    levelNumberEl.textContent = `Level ${currentLevel}`;
    levelNameEl.textContent = levelData.name;
    levelDescEl.textContent = levelData.description;

    updateThrowsUI();
}

function updateThrowsUI() {
    throwsRemainingEl.textContent = `Throws: ${throwsRemaining}`;

    // Color coding based on throws remaining
    throwsRemainingEl.classList.remove('low', 'critical');
    if (throwsRemaining <= 2) {
        throwsRemainingEl.classList.add('critical');
    } else if (throwsRemaining <= 4) {
        throwsRemainingEl.classList.add('low');
    }
}

function showGameOver() {
    gameStarted = false;
    gameOverEl.classList.remove('hidden');
    finalLevelEl.textContent = currentLevel;
    finalScoreEl.textContent = score;
}

function showLevelComplete() {
    const levelData = LEVELS[currentLevel - 1] || LEVELS[0];

    levelCompleteEl.classList.remove('hidden');
    completedLevelNameEl.textContent = levelData.name;
    throwsSavedEl.textContent = throwsRemaining;
    levelScoreEl.textContent = score;

    // Pause physics while showing overlay
    scene.physicsEnabled = false;
}

async function nextLevel() {
    levelCompleteEl.classList.add('hidden');

    // Clear all thrown dildos from previous level
    clearThrownDildos();

    // Advance to next level
    currentLevel++;

    // Add bonus throws for next level
    throwsRemaining += THROWS_PER_LEVEL;

    // Check if we've beaten all levels
    if (currentLevel > LEVELS.length) {
        // Victory! Show game complete message
        throwIndicator.textContent = '🏆 YOU WIN! All levels complete! 🏆';
        throwIndicator.className = 'thrown';
        throwIndicator.style.background = 'rgba(255, 215, 0, 0.8)';
        return;
    }

    // Update UI
    updateLevelUI();

    // Reset dude fallen state
    dudeFallen = false;

    // Load the new level
    const shadowGenerator = scene.lights[1]?.getShadowGenerator?.();
    await createTower(shadowGenerator);

    // Re-enable physics
    scene.physicsEnabled = true;

    throwIndicator.className = 'ready';
    throwIndicator.textContent = 'Move hand forward to throw!';
    throwIndicator.style.background = 'rgba(68, 255, 68, 0.3)';
}

async function restartGame() {
    gameOverEl.classList.add('hidden');

    // Clear all thrown dildos
    clearThrownDildos();

    // Reset everything
    currentLevel = getStartingLevel();
    throwsRemaining = THROWS_PER_LEVEL;
    score = 0;
    throws = 0;
    dudeFallen = false;

    scoreEl.textContent = '0';
    throwsEl.textContent = 'Throws: 0';
    scoreEl.style.color = '#ff4444';

    updateLevelUI();

    // Load level 1
    const shadowGenerator = scene.lights[1]?.getShadowGenerator?.();
    await createTower(shadowGenerator);

    // Show instructions again
    instructions.classList.remove('hidden');
    gameStarted = false;
}

// ============================================
// GAME CONTROLS
// ============================================

function startGame() {
    gameStarted = true;
    instructions.classList.add('hidden');

    // Clean up preview renderer
    disposeDudePreview();

    throwIndicator.className = 'ready';
    throwIndicator.textContent = 'Ready to throw!';

    // Initialize level system
    currentLevel = getStartingLevel();
    throwsRemaining = THROWS_PER_LEVEL;
    updateLevelUI();

    // Enable physics now that game has started
    scene.physicsEnabled = true;

    // Start background music
    const backgroundMusic = new Audio('music.m4a');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch(e => console.log('Music autoplay blocked:', e));
}

async function resetGame() {
    // Clear all thrown dildos
    clearThrownDildos();

    score = 0;
    throws = 0;
    dudeFallen = false;
    scoreEl.textContent = '0';
    throwsEl.textContent = 'Throws: 0';
    scoreEl.style.color = '#ff4444';

    // Reset throws for current level (don't carry over on reset)
    throwsRemaining = THROWS_PER_LEVEL;
    updateThrowsUI();

    if (gameStarted) {
        throwIndicator.className = 'ready';
        throwIndicator.textContent = 'Move hand forward to throw!';
        throwIndicator.style.background = 'rgba(68, 255, 68, 0.3)';
    }

    // Get shadow generator reference
    const shadowGenerator = scene.lights[1]?.getShadowGenerator?.();
    await createTower(shadowGenerator);
}

// ============================================
// DUDE PREVIEW FOR INTRO MODAL
// ============================================

let previewEngine = null;
let previewScene = null;

async function initDudePreview() {
    const previewCanvas = document.getElementById('dude-preview');
    if (!previewCanvas) return;

    // Create separate engine for preview
    previewEngine = new BABYLON.Engine(previewCanvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
    });

    // Create scene
    previewScene = new BABYLON.Scene(previewEngine);
    previewScene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparent

    // Camera - looking at dude
    const previewCamera = new BABYLON.ArcRotateCamera(
        "previewCamera",
        -Math.PI / 2,
        Math.PI / 2.2,
        1.3,
        new BABYLON.Vector3(0, 1.5, 0),
        previewScene
    );

    // Lighting
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), previewScene);
    light.intensity = 1.0;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, 1), previewScene);
    dirLight.intensity = 0.5;

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "dude.glb",
            previewScene
        );

        // Stop animations
        if (result.animationGroups) {
            result.animationGroups.forEach(ag => {
                ag.stop();
                ag.dispose();
            });
        }

        // Scale and position
        const dude = result.meshes[0];
        dude.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
        dude.position.y = 1.5;

        // Rotate slowly
        previewScene.onBeforeRenderObservable.add(() => {
            dude.rotation.y += 0.01;
        });

        console.log("Dude preview loaded!");

    } catch (error) {
        console.error("Error loading dude preview:", error);
    }

    // Render loop
    previewEngine.runRenderLoop(() => {
        previewScene.render();
    });

    // Handle resize
    window.addEventListener('resize', () => {
        if (previewEngine) previewEngine.resize();
    });
}

function disposeDudePreview() {
    if (previewScene) {
        previewScene.dispose();
        previewScene = null;
    }
    if (previewEngine) {
        previewEngine.dispose();
        previewEngine = null;
    }
}

// ============================================
// INITIALIZE
// ============================================

async function init() {
    console.log("Initializing game...");

    // Initialize dude preview for intro modal
    await initDudePreview();

    // Start Babylon.js
    await initBabylon();
    console.log("Babylon.js initialized!");

    // Load the Beeple Studios environment
    const shadowGenerator = scene.lights[1]?.getShadowGenerator?.();
    await loadStudioEnvironment(shadowGenerator);

    // Load the dancing Beeple
    await loadDancingBeeple(shadowGenerator);

    // Load the dildo model
    await loadDildoModel();

    // Start hand tracking
    await initHandTracking();

    // Score checking loop
    setInterval(checkScore, 100);

    // Event listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    nextLevelBtn.addEventListener('click', nextLevel);

    // Initialize level UI
    currentLevel = getStartingLevel();
    updateLevelUI();

    // Keyboard controls (backup)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && canThrow && gameStarted) {
            throwBall();
        }
        if (e.code === 'KeyR') {
            resetGame();
        }
        
    });

    console.log("Game ready!");
}

// Start everything
init().catch(console.error);

// ============================================
// DEBUG: Inspect objects.glb contents
// ============================================
async function inspectObjectsGLB() {
    if (!scene) {
        console.log("Scene not ready yet, wait a moment and try again");
        return;
    }
    
    console.log("Loading objects.glb to inspect contents...");
    
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "objects.glb",
            scene
        );
        
        console.log("=== objects.glb Contents ===");
        console.log(`Total meshes: ${result.meshes.length}`);
        console.log("");
        
        result.meshes.forEach((mesh, index) => {
            const bounds = mesh.getBoundingInfo?.()?.boundingBox;
            const size = bounds ? {
                width: (bounds.maximum.x - bounds.minimum.x).toFixed(2),
                height: (bounds.maximum.y - bounds.minimum.y).toFixed(2),
                depth: (bounds.maximum.z - bounds.minimum.z).toFixed(2)
            } : "N/A";
            
            console.log(`[${index}] "${mesh.name}"`);
            console.log(`    Position: (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
            console.log(`    Size: ${typeof size === 'object' ? `${size.width} x ${size.height} x ${size.depth}` : size}`);
            console.log(`    Vertices: ${mesh.getTotalVertices?.() || 'N/A'}`);
            console.log("");
        });
        
        if (result.animationGroups?.length > 0) {
            console.log("=== Animations ===");
            result.animationGroups.forEach(anim => {
                console.log(`  - ${anim.name}`);
            });
        }
        
        // Position them off to the side so you can see them
        const rootMesh = result.meshes[0];
        if (rootMesh) {
            rootMesh.position.x = 10; // Move to the side
            console.log("Moved objects to X=10 so you can see them in the scene");
        }
        
        // Store reference for later use
        window.inspectedObjects = result;
        console.log("Objects stored in window.inspectedObjects for further inspection");
        
    } catch (error) {
        console.error("Error loading objects.glb:", error);
    }
}

// Make it available from console
window.inspectObjectsGLB = inspectObjectsGLB;
console.log("💡 Run inspectObjectsGLB() in console to see what's inside objects.glb");

