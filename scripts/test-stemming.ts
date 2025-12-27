import natural from 'natural';

const stemmer = natural.PorterStemmer;

// Test the stemming functionality
console.log('=== Testing Porter Stemmer ===\n');

// Test query words
const query = "how to apply for RSS?";
const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
const stemmedQueryWords = queryWords.map(word => stemmer.stem(word));

console.log(`Query: "${query}"`);
console.log(`Query words: [${queryWords.join(', ')}]`);
console.log(`Stemmed query words: [${stemmedQueryWords.join(', ')}]`);

console.log('\n=== Testing Title Matching ===\n');

// Test title words
const title = "UTAR Research Scholar Scheme (RSS) /Graduate Research Assistant (GRA) application link and details";
const titleLower = title.toLowerCase();
const titleWords = titleLower.split(/\s+/).map(w => stemmer.stem(w));

console.log(`Title: "${title}"`);
console.log(`Title words (first 10): [${titleWords.slice(0, 10).join(', ')}]`);

console.log('\n=== Checking Matches ===\n');

// Check if stemmed query words match stemmed title words
queryWords.forEach((word, index) => {
    const stemmedWord = stemmedQueryWords[index];
    const matches = titleWords.includes(stemmedWord);
    console.log(`"${word}" → "${stemmedWord}" : ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
});

console.log('\n=== Specific Word Tests ===\n');

// Test specific word variations
const testPairs = [
    ['apply', 'application'],
    ['submit', 'submission'],
    ['require', 'requirement'],
    ['applying', 'application'],
];

testPairs.forEach(([word1, word2]) => {
    const stem1 = stemmer.stem(word1);
    const stem2 = stemmer.stem(word2);
    const match = stem1 === stem2;
    console.log(`"${word1}" → "${stem1}" vs "${word2}" → "${stem2}" : ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
});
