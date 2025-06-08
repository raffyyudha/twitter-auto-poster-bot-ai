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
  maxOutputTokens: 2000, // Lebih besar untuk thread panjang
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
};

const genAI = new GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig,
    });

    // Prompt untuk thread panjang
    const prompt = `
Buatlah thread Twitter tentang tips coding dalam bahasa Indonesia. 
Format thread dengan 5-7 tweet yang saling berkaitan.

Aturan:
- Setiap tweet maksimal 270 karakter
- Tweet pertama: hook menarik + "🧵 THREAD"
- Tweet 2-6: isi tips dengan detail, pakai emoji dan contoh
- Tweet terakhir: kesimpulan + ajakan engagement
- Pisahkan setiap tweet dengan "---SPLIT---"
- Gaya: santai, informatif, engaging
- Pakai numbering (1/, 2/, dst) di awal setiap tweet

Contoh struktur:
🔥 5 Tips Coding yang Bikin Lo Jadi Developer Lebih Keren! 🧵 THREAD

1/ Pertama: Always use meaningful variable names...
2/ Kedua: Git commit messages matter...
dst...

Topik bisa tentang: best practices, debugging, tools, atau career tips.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log("Generated thread:", text);
    
    // Split thread menjadi tweet-tweet terpisah
    const tweets = text.split('---SPLIT---').map(tweet => tweet.trim()).filter(tweet => tweet.length > 0);
    
    console.log(`\nThread berisi ${tweets.length} tweets:`);
    tweets.forEach((tweet, index) => {
      console.log(`\n--- Tweet ${index + 1} (${tweet.length} chars) ---`);
      console.log(tweet);
    });
    
    // Validasi panjang setiap tweet
    const validTweets = tweets.map(tweet => {
      if (tweet.length > 270) {
        console.log(`⚠️ Tweet terlalu panjang (${tweet.length} chars), memotong...`);
        return smartTruncate(tweet, 270);
      }
      return tweet;
    });
    
    await sendThread(validTweets);
    
  } catch (error) {
    console.error("Error in run function:", error);
  }
}

function smartTruncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  
  // Cari titik atau tanda seru terakhir sebelum batas
  const lastSentenceEnd = Math.max(
    str.lastIndexOf('.', maxLength),
    str.lastIndexOf('!', maxLength),
    str.lastIndexOf('?', maxLength)
  );
  
  if (lastSentenceEnd > maxLength * 0.7) {
    return str.substring(0, lastSentenceEnd + 1);
  }
  
  // Jika tidak ada, potong di spasi terakhir
  const lastSpace = str.lastIndexOf(' ', maxLength - 3);
  if (lastSpace > maxLength * 0.7) {
    return str.substring(0, lastSpace) + "...";
  }
  
  // Last resort - potong paksa
  return str.substring(0, maxLength - 3) + "...";
}

async function sendThread(tweets) {
  try {
    console.log("\n🚀 Memulai posting thread...");
    
    let previousTweetId = null;
    
    for (let i = 0; i < tweets.length; i++) {
      const tweetText = tweets[i];
      
      console.log(`\nPosting tweet ${i + 1}/${tweets.length}...`);
      console.log(`Text: ${tweetText}`);
      
      const tweetOptions = {
        text: tweetText
      };
      
      // Kalau bukan tweet pertama, reply ke tweet sebelumnya
      if (previousTweetId) {
        tweetOptions.reply = {
          in_reply_to_tweet_id: previousTweetId
        };
      }
      
      const tweet = await twitterClient.v2.tweet(tweetOptions);
      previousTweetId = tweet.data.id;
      
      console.log(`✅ Tweet ${i + 1} berhasil! ID: ${tweet.data.id}`);
      
      // Delay 2 detik antar tweet untuk avoid rate limit
      if (i < tweets.length - 1) {
        console.log("⏳ Menunggu 2 detik...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log("\n🎉 Thread berhasil diposting!");
    console.log(`Total: ${tweets.length} tweets`);
    
  } catch (error) {
    console.error("❌ Error posting thread:", error);
    
    if (error.code === 429) {
      console.log("⚠️ Rate limit exceeded. Coba lagi dalam beberapa menit.");
    } else if (error.code === 403) {
      console.log("⚠️ Permission denied. Pastikan app permissions 'Read and Write'.");
    }
    
    throw error;
  }
}

// Jalankan fungsi
run();
