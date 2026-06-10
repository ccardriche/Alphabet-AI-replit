import { db } from "@workspace/db";
import { elaSkillsTable } from "@workspace/db/schema";

const GRADES = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

const SKILLS_TEMPLATE: Record<string, Array<{ name: string; sub: string; i: number }>> = {
  RL: [
    { name: "Key Ideas and Details", sub: "Ask and answer questions about key details in a text", i: 1 },
    { name: "Central Message or Theme", sub: "Retell stories and demonstrate understanding of the central message or theme", i: 2 },
    { name: "Character, Setting, Events", sub: "Describe characters, settings, and major events using key details", i: 3 },
    { name: "Vocabulary in Context", sub: "Determine meanings of words and phrases as used in a literary text", i: 4 },
    { name: "Story Structure", sub: "Explain major differences between texts that tell stories vs. texts that give information", i: 5 },
    { name: "Point of View", sub: "Identify who is telling the story at various points in a text", i: 6 },
    { name: "Text Comparisons", sub: "Compare and contrast experiences of characters in stories", i: 9 },
  ],
  RI: [
    { name: "Text Details & Questions", sub: "Ask and answer questions about key details in an informational text", i: 1 },
    { name: "Main Idea & Details", sub: "Identify the main idea and key details of an informational text", i: 2 },
    { name: "Text Connections", sub: "Describe the connection between two pieces of information in a text", i: 3 },
    { name: "Technical Vocabulary", sub: "Determine the meaning of academic and domain-specific vocabulary", i: 4 },
    { name: "Text Features", sub: "Use various text features to locate information relevant to a given topic", i: 5 },
    { name: "Author's Purpose", sub: "Identify the author's main purpose in a text", i: 6 },
    { name: "Text Evidence", sub: "Explain how an author uses reasons and evidence to support points", i: 8 },
  ],
  RF: [
    { name: "Print Concepts", sub: "Demonstrate understanding of the organization and basic features of print", i: 1 },
    { name: "Phonological Awareness", sub: "Demonstrate understanding of spoken words, syllables, and phonemes", i: 2 },
    { name: "Phonics & Word Recognition", sub: "Know and apply grade-level phonics and word analysis skills in decoding words", i: 3 },
    { name: "Reading Fluency", sub: "Read with sufficient accuracy and fluency to support comprehension", i: 4 },
  ],
  W: [
    { name: "Opinion Writing", sub: "Write opinion pieces supporting a point of view with reasons and information", i: 1 },
    { name: "Informative Writing", sub: "Write informative/explanatory texts to examine a topic and convey ideas", i: 2 },
    { name: "Narrative Writing", sub: "Write narratives to develop real or imagined experiences or events", i: 3 },
    { name: "Research Projects", sub: "Conduct short research projects that build knowledge through investigation", i: 7 },
    { name: "Using Text Evidence", sub: "Draw evidence from literary or informational texts to support analysis", i: 9 },
  ],
  SL: [
    { name: "Collaborative Discussion", sub: "Engage effectively in a range of collaborative discussions with diverse partners", i: 1 },
    { name: "Interpreting Information", sub: "Determine the main ideas and supporting details presented in diverse media", i: 2 },
    { name: "Presentation of Ideas", sub: "Report on a topic using appropriate facts and relevant descriptive details", i: 4 },
  ],
  L: [
    { name: "Grammar & Usage", sub: "Demonstrate command of conventions of standard English grammar and usage", i: 1 },
    { name: "Capitalization & Punctuation", sub: "Demonstrate command of English capitalization, punctuation, and spelling conventions", i: 2 },
    { name: "Vocabulary Strategies", sub: "Determine or clarify the meaning of unknown words using context clues", i: 4 },
    { name: "Figurative Language", sub: "Demonstrate understanding of figurative language, word relationships, and nuances", i: 5 },
    { name: "Academic Vocabulary", sub: "Acquire and use accurately grade-appropriate academic and domain-specific words", i: 6 },
  ],
};

const domainLabel: Record<string, string> = {
  RL: "Reading: Literature", RI: "Reading: Informational", RF: "Reading: Foundations",
  W: "Writing", SL: "Speaking & Listening", L: "Language",
};

const gradeCode: Record<string, string> = {
  K: "K", "1st": "1", "2nd": "2", "3rd": "3", "4th": "4",
  "5th": "5", "6th": "6", "7th": "7", "8th": "8",
};

const gradeNum: Record<string, number> = {
  K: 0, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4,
  "5th": 5, "6th": 6, "7th": 7, "8th": 8,
};

async function main() {
  const rows: (typeof elaSkillsTable.$inferInsert)[] = [];

  for (const grade of GRADES) {
    const gCode = gradeCode[grade];
    for (const [domCode, skills] of Object.entries(SKILLS_TEMPLATE)) {
      for (let idx = 0; idx < skills.length; idx++) {
        const s = skills[idx];
        const skillCode = `${domCode}.${gCode}.${s.i}`;
        const ccss = skillCode;
        const difficulty = 0.5 + (gradeNum[grade] / 8) * 2.0 + (idx / skills.length) * 0.4;
        rows.push({
          skillCode,
          skillName: s.name,
          domainCode: domCode,
          domain: domainLabel[domCode] ?? domCode,
          gradeLevel: grade,
          description: s.sub,
          parentCcssCode: ccss,
          standardLeafCode: ccss,
          difficulty: Math.round(difficulty * 100) / 100,
          discrimination: 1.0,
          guessing: 0.25,
          subSkillOrder: idx + 1,
          active: true,
          culturallyRelevantThemes: [],
          nextSkillCodes: [],
        });
      }
    }
  }

  console.log(`Inserting ${rows.length} skills...`);

  // Batch in chunks of 50
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(elaSkillsTable).values(rows.slice(i, i + 50)).onConflictDoNothing();
    process.stdout.write(".");
  }

  const result = await db.$count(elaSkillsTable);
  console.log(`\nDone. Total skills in DB: ${result}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
