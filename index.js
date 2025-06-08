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
  maxOutputTokens: 400,
  temperature: 0.9,
  topP: 1,
  topK: 1,
};

const genAI = new GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);

async function run() {
  try {
    // Gunakan model yang masih tersedia
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Ganti dari gemini-pro
      generationConfig,
    });

    // Write your prompt here
    const prompt =
      "Buat tips tips coding menggunakan bahasa indonesia, dengan gaya bahasa tidak kaku dan keren buatlah dengan apik dan sempurna. Maksimal 280 karakter untuk Twitter.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Generated text:", text);
    console.log("Character count:", text.length);
    
    // Pastikan tidak melebihi batas Twitter (280 karakter)
    const tweetText = text.length > 280 ? text.substring(0, 277) + "..." : text;
    
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
