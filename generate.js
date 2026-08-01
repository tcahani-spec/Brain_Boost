const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is missing.");
  process.exit(1);
}

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Fetch 50 questions per batch to avoid API truncation
async function fetchBatch(gradeLabel, topics) {
  const prompt = `Generate exactly 50 distinct multiple-choice trivia questions for a ${gradeLabel} student.
Topics: ${topics}.
Do NOT include math equations or math word problems.
Return output strictly as a JSON array of objects. Each object must have keys:
- "q": string (the question)
- "options": array of 4 strings
- "answer": integer index (0-3) of the correct answer.`;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API call failed (HTTP ${response.status}): ${errText}`);
  }

  const data = await response.json();
  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  return JSON.parse(rawText);
}

async function main() {
  console.log("🚀 Starting Trivia Question Generation...");

  try {
    // William (2nd Grade) - 2 batches of 50 = 100 Questions
    console.log("Fetching Batch 1 for William (2nd Grade)...");
    const williamPart1 = await fetchBatch("2nd Grade", "Science, Spelling, Robots/AI, Simple Engineering");
    console.log("Fetching Batch 2 for William (2nd Grade)...");
    const williamPart2 = await fetchBatch("2nd Grade", "Animals, Space, Nature, Basic Technology");
    const williamAll = [...williamPart1, ...williamPart2];

    // Evan (4th Grade) - 2 batches of 50 = 100 Questions
    console.log("Fetching Batch 1 for Evan (4th Grade)...");
    const evanPart1 = await fetchBatch("4th Grade", "Earth Science, Advanced Vocabulary, Artificial Intelligence, Machines");
    console.log("Fetching Batch 2 for Evan (4th Grade)...");
    const evanPart2 = await fetchBatch("4th Grade", "Solar System, Grammar & Parts of Speech, Electricity & Circuits, Computer Logic");
    const evanAll = [...evanPart1, ...evanPart2];

    const outputData = {
      updatedAt: new Date().toISOString(),
      william: williamAll,
      evan: evanAll
    };

    fs.writeFileSync('questions.json', JSON.stringify(outputData, null, 2));
    console.log(`✅ Success! Saved ${williamAll.length} questions for William and ${evanAll.length} questions for Evan to questions.json.`);

  } catch (err) {
    console.error("❌ Generation failed:", err.message);
    process.exit(1);
  }
}

main();
