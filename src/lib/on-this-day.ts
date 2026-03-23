/**
 * “On this day” for the welcome screen — India context first, plus widely observed UN/world days.
 * Dates use calendar month 1–12 and day 1–31.
 */

type Scope = "india" | "world";

type Observance = { m: number; d: number; text: string; scope: Scope };

/**
 * Multiple rows allowed per calendar day; India-scoped lines are shown before world-scoped when both exist.
 */
const OBSERVANCES: Observance[] = [
  // January
  { m: 1, d: 1, text: "New Year’s Day — a fresh start for resolutions and new beginnings.", scope: "world" },
  { m: 1, d: 12, text: "National Youth Day (India) — birth anniversary of Swami Vivekananda.", scope: "india" },
  { m: 1, d: 15, text: "Army Day (India) — honours the soldiers of the Indian Army.", scope: "india" },
  { m: 1, d: 24, text: "National Girl Child Day (India) — promotes girls’ rights, education, and well-being.", scope: "india" },
  { m: 1, d: 25, text: "National Voters’ Day (India) — celebrates democratic participation and ethical voting.", scope: "india" },
  { m: 1, d: 26, text: "Republic Day (India) — the Constitution came into effect in 1950; the parade on Rajpath is iconic.", scope: "india" },
  { m: 1, d: 30, text: "Martyrs’ Day (India) — Mahatma Gandhi’s death anniversary; a moment of remembrance for peace.", scope: "india" },

  // February
  { m: 2, d: 14, text: "Birth anniversary of Galileo Galilei (1564) — pioneer of modern observational astronomy.", scope: "world" },
  { m: 2, d: 28, text: "National Science Day (India) — marks C. V. Raman’s discovery of the Raman effect (1928).", scope: "india" },

  // March
  { m: 3, d: 3, text: "World Wildlife Day — protects wild fauna and flora; India’s biodiversity is among the richest.", scope: "world" },
  { m: 3, d: 8, text: "International Women’s Day — celebrates women’s achievements; widely observed across India.", scope: "world" },
  { m: 3, d: 14, text: "Pi Day — 3/14 celebrates the mathematical constant π.", scope: "world" },
  { m: 3, d: 15, text: "World Consumer Rights Day — fair, safe, and informed choices for consumers.", scope: "world" },
  { m: 3, d: 21, text: "International Day of Forests (World Forest / Forestry Day) — trees and forests sustain water, soil, climate, and life.", scope: "world" },
  { m: 3, d: 22, text: "World Water Day — fresh water is precious; aligns with India’s rivers and conservation efforts.", scope: "world" },

  // April
  { m: 4, d: 1, text: "April Fools’ Day — a light tradition of harmless jokes in many countries.", scope: "world" },
  { m: 4, d: 7, text: "World Health Day — global focus on health and well-being for everyone.", scope: "world" },
  { m: 4, d: 14, text: "Ambedkar Jayanti (India) — birth anniversary of Dr. B. R. Ambedkar, architect of the Constitution.", scope: "india" },
  { m: 4, d: 18, text: "World Heritage Day — celebrates monuments and culture; India hosts many UNESCO World Heritage Sites.", scope: "world" },
  { m: 4, d: 22, text: "Earth Day — protecting the planet and sustainable living.", scope: "world" },

  // May
  { m: 5, d: 1, text: "International Workers’ Day / Labour Day — honours workers and labour rights.", scope: "world" },
  { m: 5, d: 3, text: "World Press Freedom Day — free, independent media and journalists’ safety.", scope: "world" },
  { m: 5, d: 8, text: "World Red Cross and Red Crescent Day — humanitarian service and compassion.", scope: "world" },
  { m: 5, d: 15, text: "International Day of Families — families as the basic unit of society.", scope: "world" },
  { m: 5, d: 21, text: "Anti-Terrorism Day (India) — remembers Rajiv Gandhi; promotes peace and harmony.", scope: "india" },
  { m: 5, d: 31, text: "World No Tobacco Day — tobacco risks and healthier choices.", scope: "world" },

  // June
  { m: 6, d: 1, text: "World Milk Day — dairy’s role in nutrition; India is among the world’s largest milk producers.", scope: "world" },
  { m: 6, d: 5, text: "World Environment Day — UN-led call for environmental action.", scope: "world" },
  { m: 6, d: 20, text: "World Refugee Day — solidarity with people forced to flee their homes.", scope: "world" },
  { m: 6, d: 21, text: "International Day of Yoga — yoga for harmony of body and mind; rooted in India’s heritage.", scope: "india" },

  // July
  { m: 7, d: 1, text: "National Doctors’ Day (India) — honours physicians and the medical profession.", scope: "india" },
  { m: 7, d: 11, text: "World Population Day — sustainable development and reproductive health.", scope: "world" },
  { m: 7, d: 28, text: "World Nature Conservation Day — protecting species and ecosystems.", scope: "world" },
  { m: 7, d: 29, text: "International Tiger Day — tiger conservation; India hosts most wild tigers in the world.", scope: "world" },

  // August
  { m: 8, d: 6, text: "Hiroshima Peace Day — remembrance and the pursuit of a world without nuclear weapons.", scope: "world" },
  { m: 8, d: 7, text: "National Handloom Day (India) — celebrates handloom weavers and India’s textile heritage.", scope: "india" },
  { m: 8, d: 15, text: "Independence Day (India) — India became independent in 1947; flag-hoisting and pride nationwide.", scope: "india" },
  { m: 8, d: 29, text: "National Sports Day (India) — birth anniversary of hockey legend Major Dhyan Chand.", scope: "india" },

  // September
  { m: 9, d: 5, text: "Teachers’ Day (India) — birth anniversary of Dr. Sarvepalli Radhakrishnan; gratitude to educators.", scope: "india" },
  { m: 9, d: 8, text: "International Literacy Day — literacy opens doors to learning and dignity.", scope: "world" },
  { m: 9, d: 14, text: "Hindi Diwas (India) — Hindi was adopted as an official language on this day in 1949.", scope: "india" },
  { m: 9, d: 15, text: "Engineers’ Day (India) — Sir M. Visvesvaraya’s birth anniversary.", scope: "india" },

  // October
  { m: 10, d: 2, text: "Gandhi Jayanti (India) — Mahatma Gandhi’s birth anniversary; also International Day of Non-Violence.", scope: "india" },
  { m: 10, d: 5, text: "World Teachers’ Day (UNESCO) — celebrates teachers around the world.", scope: "world" },
  { m: 10, d: 10, text: "World Mental Health Day — mental health is essential health.", scope: "world" },
  { m: 10, d: 16, text: "World Food Day — zero hunger and safe, nutritious food for all.", scope: "world" },
  { m: 10, d: 24, text: "United Nations Day — the UN Charter came into force in 1945.", scope: "world" },
  { m: 10, d: 31, text: "National Unity Day / Rashtriya Ekta Diwas (India) — Sardar Vallabhbhai Patel’s birth anniversary.", scope: "india" },

  // November
  { m: 11, d: 11, text: "National Education Day (India) — Maulana Abul Kalam Azad’s birth anniversary.", scope: "india" },
  { m: 11, d: 14, text: "Children’s Day (India) — Jawaharlal Nehru’s birth anniversary; celebrates children and their rights.", scope: "india" },
  { m: 11, d: 20, text: "World Children’s Day (UN) — promotes children’s welfare and rights worldwide.", scope: "world" },
  { m: 11, d: 26, text: "Constitution Day / Samvidhan Divas (India) — adoption of the Constitution in 1949.", scope: "india" },

  // December
  { m: 12, d: 1, text: "World AIDS Day — HIV/AIDS awareness, testing, and support.", scope: "world" },
  { m: 12, d: 5, text: "World Soil Day — healthy soils for healthy life and food security.", scope: "world" },
  { m: 12, d: 10, text: "Human Rights Day — Universal Declaration of Human Rights (1948).", scope: "world" },
  { m: 12, d: 14, text: "National Energy Conservation Day (India) — saving energy and building efficiency.", scope: "india" },
  { m: 12, d: 22, text: "National Mathematics Day (India) — Srinivasa Ramanujan’s birth anniversary.", scope: "india" },
  { m: 12, d: 25, text: "Christmas Day — celebrated by many as the birth of Jesus Christ.", scope: "world" },
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

/** One line (or combined lines) of observances for the given calendar date. */
export function getOnThisDayLine(date = new Date()): string {
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const hits = OBSERVANCES.filter((e) => e.m === m && e.d === day);
  if (hits.length > 0) {
    const sorted = [...hits].sort((a, b) => {
      if (a.scope === b.scope) return 0;
      return a.scope === "india" ? -1 : 1;
    });
    return sorted.map((h) => h.text).join(" · ");
  }
  const idx = dayOfYear(date) % GENERAL_TRIVIA.length;
  return GENERAL_TRIVIA[idx] ?? "Every day is a good day to learn something new.";
}
