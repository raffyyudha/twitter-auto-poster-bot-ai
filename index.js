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
  maxOutputTokens: 4000, // Maksimal banget!
  temperature: 0.9, // Lebih kreatif
  topP: 1,
  topK: 40,
};

const genAI = new GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig,
    });

    // Prompt bebas total - biar Gemini ekspresif
    const prompt = `
Buatlah thread Twitter yang SANGAT PANJANG dan DETAIL tentang coding/programming dalam bahasa Indonesia! 

Bebas mau berapa tweet aja - bisa 10, 15, bahkan 20 tweet! Yang penting informatif dan engaging.

Aturan bebas:
- Setiap tweet pisahkan dengan "---SPLIT---"
- Boleh panjang per tweet, nanti kita potong otomatis
- Pakai emoji sebanyak-banyaknya
- Gaya bahasa super santai dan gaul
- Kasih contoh code, pengalaman pribadi, cerita lucu
- Numbering bebas (1/, 2/, dst atau pakai emoji)
- Topik bebas: tips, tools, pengalaman, debugging, career, apapun!

Bikin thread yang viral-worthy! Orang yang baca harus bilang "WOW ini thread keren banget!"

GO WILD! 🚀🔥
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log("=".repeat(50));
    console.log("🤖 GEMINI GENERATED THREAD:");
    console.log("=".repeat(50));
    console.log(text);
    console.log("=".repeat(50));
    
    // Split thread - tanpa filter panjang
    const rawTweets = text.split('---SPLIT---').map(tweet => tweet.trim()).filter(tweet => tweet.length > 0);
    
    console.log(`\n🧵 Thread berisi ${rawTweets.length} tweets!`);
    
    // Auto-split tweet yang terlalu panjang jadi beberapa tweet
    const processedTweets = [];
    
    rawTweets.forEach((tweet, index) => {
      console.log(`\n--- Processing Tweet ${index + 1} ---`);
      console.log(`Original length: ${tweet.length} chars`);
      
      if (tweet.length <= 270) {
        // Tweet sudah pas
        processedTweets.push(tweet);
        console.log(`✅ Tweet ${index + 1}: OK (${tweet.length} chars)`);
      } else {
        // Split tweet panjang jadi beberapa
        const splitTweets = smartSplitLongTweet(tweet);
        processedTweets.push(...splitTweets);
        console.log(`🔄 Tweet ${index + 1}: Split menjadi ${splitTweets.length} tweets`);
        splitTweets.forEach((split, i) => {
          console.log(`   Part ${i + 1}: ${split.length} chars`);
        });
      }
    });
    
    console.log(`\n🎯 Final thread: ${processedTweets.length} tweets`);
    
    // Preview semua tweets
    processedTweets.forEach((tweet, index) => {
      console.log(`\n📱 Tweet ${index + 1}/${processedTweets.length} (${tweet.length} chars):`);
      console.log(`"${tweet}"`);
    });
    
    console.log(`\n🚀 Ready to post ${processedTweets.length} tweets!`);
    
    await sendThread(processedTweets);
    
  } catch (error) {
    console.error("Error in run function:", error);
  }
}

function smartSplitLongTweet(longTweet) {
  const maxLength = 270;
  const tweets = [];
  let remaining = longTweet;
  let partNumber = 1;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      // Sisa text sudah cukup pendek
      tweets.push(remaining);
      break;
    }
    
    // Cari tempat terbaik untuk potong
    let cutPoint = maxLength - 20; // Kasih ruang untuk "... (cont)"
    
    // Cari akhir kalimat terdekat
    const sentenceEnd = Math.max(
      remaining.lastIndexOf('.', cutPoint),
      remaining.lastIndexOf('!', cutPoint),
      remaining.lastIndexOf('?', cutPoint)
    );
    
    if (sentenceEnd > cutPoint * 0.6) {
      cutPoint = sentenceEnd + 1;
    } else {
      // Cari spasi terdekat
      const lastSpace = remaining.lastIndexOf(' ', cutPoint);
      if (lastSpace > cutPoint * 0.6) {
        cutPoint = lastSpace;
      }
    }
    
    const tweetText = remaining.substring(0, cutPoint).trim();
    tweets.push(tweetText + (remaining.length > cutPoint ? "... (cont)" : ""));
    
    remaining = remaining.substring(cutPoint).trim();
    partNumber++;
  }
  
  return tweets;
}

async function sendThread(tweets) {
  try {
    console.log("\n🚀 MULAI POSTING MEGA THREAD!");
    console.log(`📊 Total tweets: ${tweets.length}`);
    
    let previousTweetId = null;
    
    for (let i = 0; i < tweets.length; i++) {
      const tweetText = tweets[i];
      
      console.log(`\n📤 Posting tweet ${i + 1}/${tweets.length}...`);
      
      const tweetOptions = {
        text: tweetText
      };
      
      // Reply ke tweet sebelumnya (kecuali tweet pertama)
      if (previousTweetId) {
        tweetOptions.reply = {
          in_reply_to_tweet_id: previousTweetId
        };
      }
      
      const tweet = await twitterClient.v2.tweet(tweetOptions);
      previousTweetId = tweet.data.id;
      
      console.log(`✅ Success! Tweet ID: ${tweet.data.id}`);
      
      // Delay antar tweet - makin banyak tweet, delay makin lama
      if (i < tweets.length - 1) {
        const delay = Math.min(3000 + (i * 500), 10000); // Max 10 detik
        console.log(`⏳ Waiting ${delay/1000}s before next tweet...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log("\n🎉 MEGA THREAD POSTED SUCCESSFULLY! 🎉");
    console.log(`🔥 Posted ${tweets.length} tweets in thread`);
    console.log(`🚀 First tweet ID: ${tweets.length > 0 ? 'Check your timeline!' : 'N/A'}`);
    
  } catch (error) {
    console.error("❌ Error posting thread:", error);
    
    if (error.code === 429) {
      console.log("⚠️ Rate limit hit! Thread was too epic for Twitter API 😅");
      console.log("💡 Try running again in 15 minutes");
    } else if (error.code === 403) {
      console.log("⚠️ Permission denied. Check app permissions.");
    }
    
    throw error;
  }
}

// UNLEASH THE BEAST! 🚀
console.log("🔥 STARTING UNLIMITED THREAD GENERATOR...");
run();
