# Minecraft Mods Telegram Bot

A Telegram bot for searching and downloading Minecraft mods, shaders, and resource packs via Modrinth and CurseForge APIs.

[🇷🇺 Русская версия](README.md)

## 🚀 Features

- 🔍 Search mods, shaders, and resource packs
- 📥 Automatic file downloads (up to 50 MB)
- 🔗 Direct links for larger files
- ⚡ Optimized for Vercel (Serverless)
- 🛡️ Rate limiting (3 requests per minute)
- 📊 Logging with Supabase
- 🎮 Support for game versions and loaders (Forge/Fabric/Quilt)

## 📋 Requirements

- Node.js 18+
- Telegram Bot Token (from @BotFather)
- CurseForge API Key (optional)
- Supabase project
- Vercel account

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Fill in your .env file

# Run locally
npm run dev
```

## 🔧 Setup

### 1. Create Telegram Bot

1. Open [@BotFather](https://t.me/botfather) in Telegram
2. Send `/newbot`
3. Follow instructions
4. Copy your bot token

### 2. Setup Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Copy Project URL and API Key
3. Run SQL script from `supabase-setup.sql` in SQL Editor

### 3. Configure Environment

Create `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
CURSEFORGE_API_KEY=your_api_key_optional
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
WEBHOOK_DOMAIN=your-project.vercel.app
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Add environment variables
vercel env add TELEGRAM_BOT_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add WEBHOOK_DOMAIN

# Set webhook
# Open: https://your-project.vercel.app/api/webhook
```

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [Setup Guide](SETUP_GUIDE.md) - Detailed setup instructions
- [Supabase Guide](SUPABASE_GUIDE.md) - Database setup
- [Architecture](ARCHITECTURE.md) - System architecture
- [Contributing](CONTRIBUTING.md) - Development guide
- [Features](FEATURES.md) - Features and roadmap
- [Cheatsheet](CHEATSHEET.md) - Quick reference

## 🛠️ Tech Stack

- **Bot Framework:** Telegraf
- **Language:** TypeScript
- **Hosting:** Vercel (Serverless)
- **Database:** Supabase (PostgreSQL)
- **APIs:** Modrinth, CurseForge

## 📊 Project Structure

```
├── api/
│   └── webhook.ts          # Vercel serverless endpoint
├── src/
│   ├── api/
│   │   ├── modrinth.ts     # Modrinth API client
│   │   └── curseforge.ts   # CurseForge API client
│   ├── utils/
│   │   ├── download.ts     # Download utilities
│   │   └── helpers.ts      # Helper functions
│   ├── bot.ts              # Main bot logic
│   ├── config.ts           # Configuration
│   ├── database.ts         # Supabase integration
│   └── keyboards.ts        # Inline keyboards
├── .env.example
├── package.json
├── tsconfig.json
└── vercel.json
```

## 🔒 Security

- Rate limiting: 3 requests per minute per user
- All API keys in environment variables
- Row Level Security in Supabase
- Error handling without crashes

## 📈 Monitoring

### Vercel Logs

```bash
vercel logs --follow
```

### Supabase Analytics

```sql
-- Top users
SELECT user_id, COUNT(*) as requests
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY requests DESC
LIMIT 10;

-- Popular searches
SELECT query, COUNT(*) as count
FROM search_history
GROUP BY query
ORDER BY count DESC
LIMIT 20;
```

## 🐛 Troubleshooting

### Bot not responding

1. Check token: `echo $TELEGRAM_BOT_TOKEN`
2. Check logs: `vercel logs`
3. Reset webhook: Open `/api/webhook` in browser

### Supabase errors

1. Check URL and key in `.env`
2. Verify tables are created
3. Check RLS policies

### Deploy errors

1. Check environment variables: `vercel env ls`
2. Rebuild: `npm run build`
3. Redeploy: `vercel --prod --force`

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- [Modrinth API](https://docs.modrinth.com)
- [CurseForge API](https://docs.curseforge.com)
- [Telegraf Documentation](https://telegraf.js.org)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## 💬 Support

- Open an issue on GitHub
- Check documentation files
- Review troubleshooting section

---

Made with ❤️ for Minecraft community
