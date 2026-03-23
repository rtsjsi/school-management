/**
 * Short “on this day” notes for the welcome screen (history + light trivia).
 * Dates use calendar month 1–12 and day 1–31.
 */

type DayEntry = { m: number; d: number; text: string };

const DATED: DayEntry[] = [
  { m: 1, d: 1, text: "New Year’s Day — many cultures mark a fresh start and new resolutions." },
  { m: 1, d: 12, text: "National Youth Day (India) — birth anniversary of Swami Vivekananda." },
  { m: 1, d: 15, text: "Army Day in India — honours the soldiers of the Indian Army." },
  { m: 1, d: 26, text: "Republic Day (India) — the Constitution came into effect in 1950." },
  { m: 2, d: 14, text: "Birth anniversary of astronomer Galileo Galilei (1564) — “father” of modern observational astronomy." },
  { m: 2, d: 28, text: "National Science Day (India) — marks the discovery of the Raman effect (1928)." },
  { m: 3, d: 8, text: "International Women’s Day — celebrates women’s achievements worldwide." },
  { m: 3, d: 14, text: "Pi Day — 3/14 celebrates the mathematical constant π." },
  { m: 3, d: 22, text: "World Water Day — reminds us that fresh water is a shared resource worth protecting." },
  { m: 4, d: 1, text: "April Fools’ Day — a light tradition of harmless jokes in several countries." },
  { m: 4, d: 7, text: "World Health Day — raises awareness about global health and well-being." },
  { m: 4, d: 22, text: "Earth Day — focuses on protecting the environment and sustainable living." },
  { m: 5, d: 1, text: "International Workers’ Day — honours labour and workers’ contributions." },
  { m: 5, d: 31, text: "World No Tobacco Day — highlights risks of tobacco and promotes healthier choices." },
  { m: 6, d: 5, text: "World Environment Day — the UN’s day for encouraging environmental action." },
  { m: 6, d: 21, text: "International Yoga Day — yoga promotes balance of body and mind." },
  { m: 7, d: 1, text: "National Doctors’ Day (India) — honours physicians and the medical profession." },
  { m: 7, d: 11, text: "World Population Day — focuses on population issues and sustainable development." },
  { m: 8, d: 6, text: "Hiroshima Peace Day — remembers the atomic bombing and the pursuit of peace." },
  { m: 8, d: 15, text: "Independence Day (India) — India became independent in 1947." },
  { m: 8, d: 29, text: "National Sports Day (India) — birth anniversary of hockey legend Major Dhyan Chand." },
  { m: 9, d: 5, text: "Teachers’ Day (India) — birth anniversary of Dr. Sarvepalli Radhakrishnan." },
  { m: 9, d: 8, text: "International Literacy Day — literacy opens doors to learning and opportunity." },
  { m: 9, d: 15, text: "Engineers’ Day (India) — marks Sir M. Visvesvaraya’s birth anniversary." },
  { m: 10, d: 2, text: "Gandhi Jayanti (India) — birth anniversary of Mahatma Gandhi, apostle of non-violence." },
  { m: 10, d: 5, text: "World Teachers’ Day (UNESCO) — celebrates teachers globally." },
  { m: 10, d: 24, text: "United Nations Day — marks the UN Charter coming into force in 1945." },
  { m: 11, d: 11, text: "National Education Day (India) — birth anniversary of Maulana Abul Kalam Azad." },
  { m: 11, d: 14, text: "Children’s Day (India) — birth anniversary of Jawaharlal Nehru." },
  { m: 11, d: 20, text: "World Children’s Day (UN) — promotes children’s welfare and rights." },
  { m: 12, d: 1, text: "World AIDS Day — raises awareness about HIV/AIDS and support for those affected." },
  { m: 12, d: 10, text: "Human Rights Day — marks the adoption of the Universal Declaration of Human Rights (1948)." },
  { m: 12, d: 22, text: "National Mathematics Day (India) — birth anniversary of Srinivasa Ramanujan." },
  { m: 12, d: 25, text: "Christmas Day — celebrated by many as the birth of Jesus Christ." },
];

const GENERAL_TRIVIA: string[] = [
  "Honey never spoils — archaeologists have found edible honey in ancient Egyptian tombs.",
  "Octopuses have three hearts and blue blood.",
  "A group of flamingos is called a flamboyance.",
  "Bananas are berries, but strawberries aren’t — botanically speaking.",
  "Sharks existed before trees — by tens of millions of years.",
  "Venus is the hottest planet in our solar system, not Mercury.",
  "Your brain uses about 20% of your body’s energy though it’s only ~2% of body weight.",
  "Oxford University is older than the Aztec Empire.",
  "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
  "A day on Venus is longer than a year on Venus.",
  "Wombat poop is cube-shaped — nature’s odd engineering.",
  "The human nose can detect over a trillion different smells.",
  "Glass is an amorphous solid — it flows incredibly slowly over centuries.",
  "There are more possible games of chess than atoms in the observable universe (rough estimate).",
  "Dolphins may give each other names — signature whistles act like callsigns.",
  "The speed of light is about 299,792 km per second in a vacuum.",
  "Water expands when it freezes — most substances do the opposite.",
  "A jiffy is a real unit: about 1/100 s in computing, or the time light travels 1 cm in physics.",
  "The Pacific Ocean is wider than the Moon’s diameter.",
  "Reading fiction can improve empathy — stepping into another’s shoes in prose.",
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** One line of history or trivia for the given calendar date. */
export function getOnThisDayLine(date = new Date()): string {
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const hit = DATED.find((e) => e.m === m && e.d === day);
  if (hit) return hit.text;
  const idx = dayOfYear(date) % GENERAL_TRIVIA.length;
  return GENERAL_TRIVIA[idx] ?? "Every day is a good day to learn something new.";
}
