export interface Passage {
  key: string;
  title: string;
  gradeLevel: string;
  text: string;
  wordCount: number;
}

export const WPM_BENCHMARKS: Record<string, number> = {
  "K": 20, "1st": 60, "2nd": 90, "3rd": 107, "4th": 123,
  "5th": 139, "6th": 150, "7th": 158, "8th": 167,
};

export const PASSAGES: Passage[] = [
  {
    key: "k-a",
    title: "My Dog",
    gradeLevel: "K",
    wordCount: 52,
    text: "I have a dog. His name is Max. Max is big and brown. He likes to run and jump. We go to the park. Max runs fast. I run too. We play with a red ball. Max catches the ball. He brings it back to me. I love my dog Max. He is my best friend.",
  },
  {
    key: "k-b",
    title: "The Garden",
    gradeLevel: "K",
    wordCount: 55,
    text: "My grandma has a garden. She grows red tomatoes and green beans. I help her water the plants. We use a little can. The water makes the plants happy. The sun helps them grow too. When the tomatoes are big and red, we pick them. Grandma makes soup with the tomatoes. It tastes so good.",
  },
  {
    key: "1st-a",
    title: "A New Day",
    gradeLevel: "1st",
    wordCount: 78,
    text: "Every morning the sun comes up. The birds start to sing. Maya wakes up and looks out her window. She can see the big oak tree in the yard. A robin sits on a branch. It has a red chest and a little yellow beak. Maya gets dressed and goes outside. She walks to the tree and stands very still. The robin looks at her with one bright eye. Then it flies away into the blue sky. Maya smiles and waves goodbye.",
  },
  {
    key: "1st-b",
    title: "The Bike Ride",
    gradeLevel: "1st",
    wordCount: 82,
    text: "Carlos got a new bike for his birthday. It was blue with silver handlebars. At first he was scared to ride it. His dad ran beside him and held the seat. Carlos pedaled fast. Then his dad let go. Carlos kept going all by himself. He rode down the path and around the big tree. His sister clapped and cheered. Carlos laughed out loud. He could not believe he was really riding. He went around again and again until the sun went down.",
  },
  {
    key: "2nd-a",
    title: "River Otters",
    gradeLevel: "2nd",
    wordCount: 112,
    text: "River otters are playful animals that live near water. They have thick, waterproof fur that keeps them warm even in cold rivers. Otters are strong swimmers. They use their long tails like rudders to steer through the water. Their webbed feet help them swim fast and catch slippery fish. Otters live in family groups called rafts. They hold hands while they sleep so they don't float away from each other. That might be the cutest thing in the animal world. Otters also love to play. They slide down muddy riverbanks just for fun. Scientists think play helps them practice the skills they need to survive. Next time you walk near a river, look carefully — you might spot an otter at play.",
  },
  {
    key: "2nd-b",
    title: "The Night Market",
    gradeLevel: "2nd",
    wordCount: 108,
    text: "Every Friday evening, Mei's family walked to the night market downtown. Colored lights hung between the stalls. The smell of grilled corn and spiced meats filled the air. Mei's favorite stall sold fresh mango with chili and lime. She held the little cup with both hands and took a small bite. Sweet, sour, and spicy all at once! Her little brother pointed at the fish tank where fat goldfish swam in circles. A musician played guitar near the fountain. People danced on the sidewalk. Mei's grandmother bought a bundle of fresh herbs. On the walk home, Mei held her grandmother's hand and felt warm and happy all the way down to her toes.",
  },
  {
    key: "3rd-a",
    title: "The Coral Reef",
    gradeLevel: "3rd",
    wordCount: 138,
    text: "Coral reefs are some of the most colorful places on Earth. Found in warm, shallow ocean water, they are home to thousands of different sea creatures. Coral itself is not a plant — it is actually a tiny animal. Millions of tiny corals called polyps grow together to form the stony structures we call a reef. Fish in every color imaginable weave through the coral branches. Sea turtles glide past slowly, munching on sea grass. Octopuses hide in rocky crevices, changing color to match their surroundings. Reefs cover less than one percent of the ocean floor, but they shelter about twenty-five percent of all ocean species. That makes them incredibly important. Unfortunately, rising ocean temperatures cause a process called coral bleaching, which turns the reef white and can kill it. Scientists around the world are working hard to protect these underwater cities before it is too late.",
  },
  {
    key: "3rd-b",
    title: "Harriet Tubman",
    gradeLevel: "3rd",
    wordCount: 142,
    text: "Harriet Tubman was born into slavery in Maryland around 1822. From her earliest years, she felt the deep unfairness of the life forced upon her. As a young woman, she made a daring decision to escape north to freedom. She traveled at night, guided by the North Star and the help of brave people along the Underground Railroad — a secret network of safe houses. Harriet made it to Philadelphia and found safety. But she did not stop there. Thirteen times she returned to the South to lead others to freedom. She guided more than seventy enslaved people, including family members, to safety. Slave owners offered big rewards for her capture, but she was never caught. She was so skilled and so brave that people called her Moses, after the biblical leader who freed his people. Her courage changed the lives of countless families forever.",
  },
  {
    key: "4th-a",
    title: "The Water Cycle",
    gradeLevel: "4th",
    wordCount: 168,
    text: "Water is always moving. It travels in a never-ending cycle that connects oceans, clouds, land, and living things. The process begins with evaporation. When the sun warms the surface of a lake, river, or ocean, liquid water turns into water vapor and rises invisibly into the atmosphere. As water vapor climbs higher, the air grows colder. The vapor cools and condenses — it turns back into tiny liquid droplets, forming clouds. When the droplets become heavy enough, they fall back to Earth as rain, snow, sleet, or hail. This is called precipitation. Some of that water flows across the land into rivers and streams, eventually finding its way back to the ocean. Some soaks deep into the ground, becoming groundwater. Plants pull water from the soil through their roots and release it through their leaves in a process called transpiration. This water vapor also rises and joins the cycle again. Every drop of water you have ever drunk has traveled through this cycle thousands of times.",
  },
  {
    key: "4th-b",
    title: "Frida Kahlo",
    gradeLevel: "4th",
    wordCount: 162,
    text: "Frida Kahlo was a Mexican painter whose powerful work expressed both physical and emotional pain, as well as great joy. Born in 1907 in Coyoacán, Mexico, Frida survived polio as a child and a serious bus accident as a teenager. The accident left her with injuries that caused her pain for the rest of her life. During her long recovery, she began to paint, using a special easel built so she could work while lying in bed. A mirror was attached to the easel so she could see herself, and she began painting detailed self-portraits. Her paintings are known for their bold colors, Mexican folk art influences, and deeply personal images. In her self-portraits, she often included animals, plants, and symbolic objects that reflected her culture and inner world. Though she struggled to gain recognition during her lifetime, Frida Kahlo is now considered one of the most important artists of the twentieth century.",
  },
  {
    key: "5th-a",
    title: "The Deep Ocean",
    gradeLevel: "5th",
    wordCount: 192,
    text: "The deep ocean is one of the least explored places on Earth. Below about two hundred meters, sunlight cannot penetrate the water. The deep sea is pitch black, bitterly cold, and under crushing pressure. Yet life thrives there in remarkable forms. Scientists estimate that the deep ocean may hold millions of undiscovered species. Many creatures in the deep sea produce their own light through a process called bioluminescence. The anglerfish, for example, dangles a glowing lure in front of its enormous mouth to attract prey. The vampire squid is named for its dark color and cloak-like fins, though it actually survives by eating drifting particles of organic material. Giant tube worms cluster around hydrothermal vents — cracks in the seafloor where superheated water erupts from inside the Earth. These worms can grow over two meters long and live without any sunlight at all. They rely on bacteria that convert chemicals from the vents into energy, a process called chemosynthesis. Exploring the deep ocean requires specially built submersibles that can withstand extreme pressure. Less than twenty percent of the ocean floor has been mapped in detail. The deep sea may hold answers to some of the biggest questions in science — including, possibly, the origins of life itself.",
  },
  {
    key: "5th-b",
    title: "César Chávez",
    gradeLevel: "5th",
    wordCount: 188,
    text: "César Chávez grew up in a family of migrant farmworkers who traveled across California and Arizona harvesting crops. He saw firsthand how poorly farmworkers were treated — low wages, dangerous conditions, no bathroom breaks, and no legal protections. These experiences shaped the course of his life. As a young adult, Chávez became a community organizer and dedicated himself to fighting for workers' rights through nonviolent action, inspired by the teachings of Mahatma Gandhi and Dr. Martin Luther King Jr. In 1962, he co-founded the National Farm Workers Association, which later became the United Farm Workers union. Chávez led powerful boycotts and strikes to pressure growers to pay fair wages and improve conditions. His most famous campaign was the Delano grape strike, which lasted five years and attracted national attention. Millions of Americans joined his call to boycott table grapes. Chávez used fasting as a form of peaceful protest, going without food for days at a time to draw attention to the workers' cause. His movement won historic protections for farmworkers in California. Today, his birthday, March 31, is a state holiday in California, and his legacy continues to inspire labor organizers around the world.",
  },
  {
    key: "6th-a",
    title: "The Science of Sleep",
    gradeLevel: "6th",
    wordCount: 218,
    text: "Sleep is not simply a time of rest — it is an active and essential process that keeps your brain and body healthy. While you sleep, your brain cycles through different stages, including light sleep, deep sleep, and rapid eye movement, or REM, sleep. During deep sleep, your body repairs tissues, builds bone and muscle, and strengthens the immune system. REM sleep is particularly important for learning and memory. When you experience REM sleep, your eyes move quickly under your eyelids, and your brain is nearly as active as when you are awake. Scientists believe this is when the brain sorts through the day's experiences and transfers important information from short-term to long-term memory. This is why students who sleep well after studying often perform better on tests. Teenagers need between eight and ten hours of sleep per night, but research shows that most get far less. Part of the problem is biology: the adolescent brain naturally shifts toward a later sleep schedule, making it hard to fall asleep before midnight. Early school start times conflict directly with this biological rhythm. Some school districts have experimented with later start times and found that student grades, mood, and health all improved. Sleep is not a luxury. It is as necessary as food and water — and sacrificing it for extra study time often backfires.",
  },
  {
    key: "6th-b",
    title: "Jazz and the Harlem Renaissance",
    gradeLevel: "6th",
    wordCount: 214,
    text: "In the 1920s, the neighborhood of Harlem in New York City became the center of a cultural explosion known as the Harlem Renaissance. African American artists, writers, musicians, and thinkers gathered there, creating work that celebrated Black life and identity at a time when segregation and racism defined much of American society. At the heart of this movement was jazz — a new kind of music born from African rhythms, blues, ragtime, and improvisation. Jazz broke the rigid rules of European classical music. Musicians created new melodies on the spot, responding to each other in real time. The result was exciting, unpredictable, and deeply human. Artists like Louis Armstrong, Duke Ellington, and Bessie Smith became national stars. Their music flowed out of Harlem clubs and onto radio broadcasts and recordings that reached listeners across the country. White audiences crowded into clubs to hear jazz even as they supported laws that segregated Black Americans in other parts of daily life — a painful irony that artists and writers of the era addressed directly in their work. The Harlem Renaissance produced novels, poems, paintings, and sculptures that challenged stereotypes and demanded that Black experiences and achievements be recognized. Its influence on American culture, music, and art cannot be overstated.",
  },
  {
    key: "7th-a",
    title: "Climate Feedback Loops",
    gradeLevel: "7th",
    wordCount: 228,
    text: "The Earth's climate is shaped not just by the amount of greenhouse gases in the atmosphere, but by a complex web of feedback loops — processes that amplify or reduce the effects of initial changes. Understanding these loops is essential to understanding why climate scientists are so concerned about even small increases in average global temperatures. One of the most worrying feedback loops involves Arctic sea ice. Sea ice is white and reflects most of the sunlight that hits it back into space — a property called high albedo. When temperatures rise and sea ice melts, the dark ocean water underneath is exposed. Dark surfaces absorb far more solar energy than reflective ice, which causes the ocean to warm further, which melts more ice, which exposes more dark water, and so on. This self-reinforcing cycle is called a positive feedback loop, meaning it amplifies the original warming rather than correcting for it. Another critical loop involves permafrost — the frozen ground in Arctic and subarctic regions. Permafrost contains enormous quantities of organic material that has been frozen for thousands of years. As temperatures rise and permafrost thaws, that organic material decomposes, releasing carbon dioxide and methane — potent greenhouse gases that cause further warming. Scientists warn that if these feedback loops reach tipping points — moments at which the process becomes self-sustaining regardless of human action — controlling climate change could become far more difficult.",
  },
  {
    key: "7th-b",
    title: "Malala Yousafzai",
    gradeLevel: "7th",
    wordCount: 222,
    text: "Malala Yousafzai grew up in the Swat Valley of Pakistan, a mountainous region known for its lush beauty. Her father, Ziauddin Yousafzai, ran a school and instilled in Malala a deep belief in the power of education. When the Taliban gained control of the region in 2007 and began banning girls from attending school, Malala spoke out. She began writing an anonymous blog for the BBC documenting daily life under Taliban rule, describing the fear and the determination of the girls in her community. As her activism became more public, she received death threats. In October 2012, when Malala was fifteen years old, a Taliban gunman boarded her school bus and shot her in the head. The attack shocked the world. Malala was airlifted to a hospital in the United Kingdom, where surgeons fought to save her life. She recovered and, rather than retreating into silence, emerged as an even stronger voice for girls' education. In 2013, she gave a landmark speech at the United Nations on her sixteenth birthday. In 2014, she became the youngest person ever to receive the Nobel Peace Prize. She used the prize money to fund girls' schools in Pakistan, Nigeria, and Syria. Malala's message is simple but powerful: one child, one teacher, one book, and one pen can change the world.",
  },
  {
    key: "8th-a",
    title: "The Ethics of Artificial Intelligence",
    gradeLevel: "8th",
    wordCount: 235,
    text: "Artificial intelligence is reshaping nearly every aspect of modern life, from the recommendations that appear in your social media feed to the algorithms that influence hiring decisions, medical diagnoses, and criminal sentencing. As AI systems become more powerful and more embedded in daily life, questions about their ethical implications have become increasingly urgent. One major concern is bias. AI systems learn from large datasets, and if those datasets reflect historical inequalities — and they often do — the systems will reproduce and even amplify those inequalities. Facial recognition software, for instance, has repeatedly been shown to misidentify people with darker skin tones at significantly higher rates than people with lighter skin tones, raising serious concerns about its use in law enforcement. Another concern is transparency. Many modern AI systems operate as so-called black boxes, producing outputs that even their designers cannot fully explain. When a loan application is rejected by an algorithm or a medical diagnosis is made with AI assistance, people deserve to understand why. The right to an explanation has become a central issue in AI regulation in Europe and is increasingly debated in the United States. There are also deeper questions about accountability — who is responsible when an AI system makes a harmful mistake? The company that built it? The company that deployed it? The user? These questions do not yet have clear legal answers. As AI capabilities accelerate, society's ability to govern them thoughtfully will determine whether this powerful technology serves everyone equitably or only benefits a few.",
  },
  {
    key: "8th-b",
    title: "The Reconstruction Era",
    gradeLevel: "8th",
    wordCount: 231,
    text: "The period following the Civil War, known as Reconstruction, lasted from 1865 to 1877 and represented one of the most transformative — and ultimately tragic — chapters in American history. With the end of slavery, nearly four million formerly enslaved people faced the enormous challenge of building free lives within a society that had been structured around their subjugation. The federal government took significant steps to support this transition. The Freedmen's Bureau was established to provide food, clothing, and legal assistance to formerly enslaved people and poor white Southerners. The Thirteenth, Fourteenth, and Fifteenth Amendments abolished slavery, granted citizenship and equal protection under the law, and extended voting rights to Black men. Black Americans exercised their new political rights with remarkable energy. Black men served in state legislatures and in Congress, and historically Black colleges and universities were founded during this period to provide the education that had been systematically denied. But Reconstruction was met with fierce and often violent resistance. White supremacist groups like the Ku Klux Klan used terrorism to suppress Black political participation. After federal troops withdrew from the South in 1877, a process of disenfranchisement began that would systematically strip Black Southerners of their rights for nearly a century. Reconstruction's unfinished work — full political and economic equality for Black Americans — became the central unresolved promise of American democracy, taken up again by the Civil Rights Movement nearly a century later.",
  },
];

export function getPassagesForGrade(gradeLevel: string): Passage[] {
  return PASSAGES.filter((p) => p.gradeLevel === gradeLevel);
}

export function getPassageByKey(key: string): Passage | undefined {
  return PASSAGES.find((p) => p.key === key);
}

export function getBenchmarkWPM(gradeLevel: string): number {
  return WPM_BENCHMARKS[gradeLevel] ?? 100;
}

export function getWPMLabel(wpm: number, gradeLevel: string): { label: string; color: string } {
  const benchmark = getBenchmarkWPM(gradeLevel);
  if (wpm >= benchmark * 1.15) return { label: "Advanced", color: "text-emerald-600" };
  if (wpm >= benchmark * 0.85) return { label: "On Track", color: "text-blue-600" };
  if (wpm >= benchmark * 0.6) return { label: "Developing", color: "text-amber-600" };
  return { label: "Needs Support", color: "text-rose-600" };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
