/**
 * Rotating appreciation lines for /welcome — one is chosen per page load.
 * Tone: warm, inclusive of all roles, school-appropriate.
 */

const MESSAGES: string[] = [
  "We're genuinely glad you're here. Every role — teaching, administration, and support — helps this school run and our students thrive. Thank you for showing up today. When you're ready, everything you need is in the sidebar.",
  "Your time and care matter more than you know. Whether the day is calm or full-on, what you do is seen and valued. We're grateful you're part of this team — explore the sidebar whenever you're ready to dive in.",
  "Welcome back. Schools don't run on timetables alone; they run on people who care, and you're one of them. Heartfelt thanks for being here. The sidebar is your gateway to the tools you use every day.",
  "It's good to see you. Behind every good day at school are staff who quietly carry the load — and you're part of that story. Thank you for your dedication. Take your time; the sidebar is there when you're ready.",
  "We appreciate you. Students are shaped by the adults who show up, day after day — and that includes you. Thank you for being here. Open the sidebar when you're ready to get to work.",
  "Thank you for choosing to be part of our school community. Your work reaches classrooms, corridors, and families in ways that truly add up. We're grateful you're with us — use the sidebar to go where you need to next.",
  "You make a difference here — in lessons, at the desk, and in every task that keeps the place humming. Thank you for what you bring. We're glad you're logged in; you'll find what you need in the sidebar.",
  "Education is a team effort, and every login matters. Thank you for showing up — your effort helps students feel safe, supported, and ready to learn. When you're ready, the sidebar has everything in one place.",
  "Your presence matters. Whether you're with students, behind a screen, or on your feet all day — you help this school feel like a community. Thank you for being here today. The sidebar is ready when you are.",
  "We're thankful for people like you who keep showing up with patience, skill, and heart. This school is better because you're part of it. Take a breath, then use the sidebar whenever you're ready to continue.",
  "Good people are the heart of every school — and we're lucky you're one of ours. Thank you for your commitment to our students and colleagues. Everything you need to work with is just a click away in the sidebar.",
  "Every day you help turn plans into real moments for children and families. That deserves real gratitude — thank you. We're glad you're here. Open the sidebar to pick up right where you need to be.",
];

/**
 * Returns a random thank-you message (new pick on each visit / refresh).
 */
export function getRandomWelcomeThankYou(): string {
  const i = Math.floor(Math.random() * MESSAGES.length);
  return MESSAGES[i] ?? MESSAGES[0];
}
