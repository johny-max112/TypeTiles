export type TutorialRole = "student" | "teacher";

export type TutorialStep = {
  path: string;
  target: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
};

export const onboardingTours: Record<TutorialRole, TutorialStep[]> = {
  student: [
    {
      path: "/app",
      target: "welcome-title",
      title: "Welcome to Type Tiles",
      description: "Build typing speed and accuracy by matching the text shown on falling tiles.",
      side: "bottom",
    },
    {
      path: "/app",
      target: "main-navigation",
      title: "Homepage Navigation",
      description: "Use the navigation to move between practice, classroom play, results, and your profile. On a small screen, open the Menu first.",
      side: "right",
    },
    {
      path: "/app",
      target: "start-game",
      title: "Start a Game",
      description: "Choose Start Game to select a category and set up a solo typing session.",
      side: "bottom",
    },
    {
      path: "/app",
      target: "category-grid",
      title: "Practice Categories",
      description: "Choose from the available typing categories. Some categories are marked as coming soon.",
      side: "left",
    },
    {
      path: "/app/play",
      target: "practice-categories",
      title: "Practice Modes",
      description: "This setup page lets you choose a category and, where available, a word/phrase or full-sentence format.",
      side: "bottom",
    },
    {
      path: "/app/play",
      target: "practice-difficulty",
      title: "Choose a Difficulty",
      description: "Easy, Normal, and Hard change the typing challenge. You can also choose a round duration before starting.",
      side: "left",
    },
    {
      path: "/app",
      target: "progress-stats",
      title: "Track Your Progress",
      description: "Your dashboard summarizes best WPM, accuracy, combo, and your latest completed match.",
      side: "right",
    },
    {
      path: "/app/leaderboard",
      target: "leaderboard-heading",
      title: "Leaderboard",
      description: "Compare saved scores and typing stats on the global leaderboard.",
      side: "bottom",
    },
    {
      path: "/app/lobby",
      target: "classroom-room-code",
      title: "Join a Classroom",
      description: "Enter the room code shared by your teacher, then choose Join Classroom.",
      side: "bottom",
    },
    {
      path: "/app",
      target: "help-tutorial",
      title: "Help and Tutorial",
      description: "Use this button any time to replay your role-specific walkthrough.",
      side: "bottom",
    },
  ],
  teacher: [
    {
      path: "/app",
      target: "welcome-title",
      title: "Teacher Dashboard",
      description: "Your dashboard provides practice, classroom, deck, and progress entry points.",
      side: "bottom",
    },
    {
      path: "/app",
      target: "create-classroom-home",
      title: "Create a Classroom",
      description: "Open the classroom lobby to create and host a class session.",
      side: "bottom",
    },
    {
      path: "/app/lobby",
      target: "teacher-classroom-lobby",
      title: "Configure and Start a Match",
      description: "Create a room, then choose its content, format, difficulty, and duration. The lobby shows the room code and participants; share the code and start the match when ready.",
      side: "bottom",
    },
    {
      path: "/app",
      target: "custom-decks-home",
      title: "Manage Custom Decks",
      description: "Create and maintain private word, phrase, or sentence decks for classroom matches.",
      side: "bottom",
    },
    {
      path: "/app/student-progress",
      target: "teacher-progress-heading",
      title: "Review Student Progress",
      description: "Inspect students' completed classroom attempts, WPM, accuracy, and session history.",
      side: "bottom",
    },
    {
      path: "/app/results",
      target: "teacher-results-heading",
      title: "Review Results",
      description: "The Results area provides your saved match history and teacher session results.",
      side: "bottom",
    },
    {
      path: "/app/play",
      target: "practice-difficulty",
      title: "Solo Practice",
      description: "You can also configure a solo practice session with the available categories, difficulty, format, and duration.",
      side: "left",
    },
    {
      path: "/app",
      target: "help-tutorial",
      title: "Help and Tutorial",
      description: "Replay this teacher walkthrough from the dashboard whenever you need it.",
      side: "bottom",
    },
  ],
};
