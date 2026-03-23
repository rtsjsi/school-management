/** Education-themed lines; index chosen from the calendar date so it stays stable for the whole day. */
const THOUGHTS: { quote: string; attribution?: string }[] = [
  { quote: "Education is the most powerful weapon which you can use to change the world.", attribution: "Nelson Mandela" },
  { quote: "The beautiful thing about learning is that nobody can take it away from you.", attribution: "B.B. King" },
  { quote: "Teaching is the greatest act of optimism.", attribution: "Colleen Wilcox" },
  { quote: "Every student can learn, just not on the same day or in the same way.", attribution: "George Evans" },
  { quote: "What we learn with pleasure we never forget.", attribution: "Alfred Mercier" },
  { quote: "A teacher affects eternity; they can never tell where their influence stops.", attribution: "Henry Adams" },
  { quote: "The art of teaching is the art of assisting discovery.", attribution: "Mark Van Doren" },
  { quote: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", attribution: "Benjamin Franklin" },
  { quote: "Children must be taught how to think, not what to think.", attribution: "Margaret Mead" },
  { quote: "In learning you will teach, and in teaching you will learn.", attribution: "Phil Collins" },
  { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", attribution: "Plutarch" },
  { quote: "One child, one teacher, one book, one pen can change the world.", attribution: "Malala Yousafzai" },
  { quote: "Education breeds confidence. Confidence breeds hope. Hope breeds peace.", attribution: "Confucius" },
  { quote: "The task of the modern educator is not to cut down jungles, but to irrigate deserts.", attribution: "C.S. Lewis" },
  { quote: "Students don’t care how much you know until they know how much you care.", attribution: "Anonymous" },
  { quote: "Learning never exhausts the mind.", attribution: "Leonardo da Vinci" },
  { quote: "Who questions much, shall learn much, and retain much.", attribution: "Francis Bacon" },
  { quote: "The roots of education are bitter, but the fruit is sweet.", attribution: "Aristotle" },
  { quote: "It is easier to build strong children than to repair broken adults.", attribution: "Frederick Douglass" },
  { quote: "Education is not preparation for life; education is life itself.", attribution: "John Dewey" },
  { quote: "The mediocre teacher tells. The good teacher explains. The superior teacher demonstrates. The great teacher inspires.", attribution: "William Arthur Ward" },
  { quote: "If you can read this, thank a teacher.", attribution: "Anonymous" },
  { quote: "Small acts of kindness in a school ripple outward for years.", attribution: "Anonymous" },
  { quote: "Curiosity is the wick in the candle of learning.", attribution: "William Arthur Ward" },
  { quote: "Today’s patience is tomorrow’s breakthrough.", attribution: "Anonymous" },
  { quote: "Progress, not perfection, is the goal of every school day.", attribution: "Anonymous" },
  { quote: "Listen carefully; answers often arrive as questions.", attribution: "Anonymous" },
  { quote: "A calm word at the right moment can change a student’s story.", attribution: "Anonymous" },
  { quote: "Data informs us; people inspire us.", attribution: "Anonymous" },
  { quote: "Start where you are. Use what you have. Do what you can.", attribution: "Arthur Ashe" },
];

function daySeed(d: Date): number {
  return d.getUTCFullYear() * 372 + d.getUTCMonth() * 31 + d.getUTCDate();
}

export function getThoughtOfTheDay(date = new Date()): { quote: string; attribution?: string } {
  const i = daySeed(date) % THOUGHTS.length;
  return THOUGHTS[i]!;
}

export function formatWelcomeDate(date = new Date(), locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
