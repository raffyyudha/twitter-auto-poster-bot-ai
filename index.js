// By VishwaGauravIn (https://itsvg.in)
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const SECRETS = require("./SECRETS");

const twitterClient = new TwitterApi({
  appKey: SECRETS.APP_KEY,
  appSecret: SECRETS.APP_SECRET,
  accessToken: SECRETS.ACCESS_TOKEN,
  accessSecret: SECRETS.ACCESS_SECRET,
});

const generationConfig = {
  maxOutputTokens: 1000, // Naikkan dari 400 ke 1000
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
};

const genAI = new GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);

async function run() {
  try {
    // Gunakan model yang masih tersedia
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Ganti dari gemini-pro
      generationConfig,
    });

    // Write your prompt here - prompt yang lebih detail
    const prompt = `
Buatlah tips coding dalam bahasa Indonesia dengan gaya santai dan keren. 
Berikan 3-5 tips praktis yang bermanfaat untuk programmer.
Format: 
- Gunakan emoji yang relevan
- Bahasa gaul tapi tetap informatif  
- Maksimal 250 karakter total untuk Twitter
- Jangan terlalu formal, bikin engaging

Contoh style: "🔥 Pro tip: Selalu commit code dengan message yang jelas bro! Future you akan berterima kasih 😎"
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Generated text:", text);
    console.log("Character count:", text.length);
    
    // Potong kalau masih terlalu panjang, tapi kasih ruang lebih
    const tweetText = text.length > 270 ? text.substring(0, 267) + "..." : text;
    
    await sendTweet(tweetText);
  } catch (error) {
    console.error("Error in run function:", error);
  }
}

async function sendTweet(tweetText) {
  try {
    const tweet = await twitterClient.v2.tweet(tweetText);
    console.log("Tweet sent successfully!");
    console.log("Tweet ID:", tweet.data.id);
    return tweet;
  } catch (error) {
    console.error("Error sending tweet:", error);
    throw error;
  }
}

// Jalankan fungsi
run();
