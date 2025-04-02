```
    _              _  _            ___                     _                    _ 
   / \     __ _   (_)| |  ___    / _ \  __   __ ___  _ __ | |  ___   _ __   __| |
  / _ \   / _` |  | || | / _ \  | | | | \ \ / // _ \| '__|| | / _ \ | '__| / _` |
 / ___ \ | (_| |  | || ||  __/  | |_| |  \ V /|  __/| |   | || (_) || |   | (_| |
/_/   \_\ \__, |  |_||_| \___|   \___/    \_/  \___||_|   |_| \___/ |_|    \__,_|
          |___/                                                                   
```

# Agile Overlord 💪

> **100% VIBE-CODED™** - No methodologies were harmed in the making of this app.

Agile Overlord is a simulation of managing an engineering team with AI agents playing the roles of your team members. Experience the joy of managing a software team without any of the awkward performance reviews!

## 🌟 Features

- **TeamChat** - A Slack-like interface where you can chat with your AI team members
- **GitHub** - *(Coming Soon)* Review pull requests and code from your AI team
- **Jira** - *(Coming Soon)* Manage tickets and watch as your AI team tackles them

## 🧠 AI Team Members

Your virtual engineering team consists of these distinguished professionals:

- **Steve Lobeemus** - Experienced Engineer, detail-oriented and solution-focused
- **Kathy Greenhill** - Creative Designer with a focus on usability and aesthetics
- **Samson Archmaze** - Enthusiastic Junior Developer eager to learn and contribute

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v8+)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/agile-overlord.git
   cd agile-overlord
   ```

2. Install dependencies for both client and server
   ```bash
   npm install
   cd client
   npm install
   cd ../server
   npm install
   cd ..
   ```

3. Create a `.env` file in the server directory
   ```bash
   echo "OPENAI_API_KEY=your_openai_api_key" > server/.env
   ```

### Running the App

1. Start both client and server with one command
   ```bash
   npm run dev
   ```

2. The app will be available at:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5001

## 💬 Using TeamChat

1. Select your user ("Big Boss Man") from the dropdown in the sidebar
2. Choose a channel to start chatting in
3. Post messages and watch as your AI team members respond naturally
4. Start threads and have focused conversations with up to 10 replies

## 🏗️ Architecture

Agile Overlord consists of:

- **Frontend**: React, TypeScript, TailwindCSS, Socket.io client
- **Backend**: Express, TypeScript, SQLite, Socket.io
- **AI**: OpenAI's GPT-4o API with function calling

## 📝 Documentation

Check out the docs in the `ai_docs` directory:

- [AI Agent Architecture](./ai_docs/ai_agent_architecture.md)
- [TeamChat Architecture](./ai_docs/teamchat_architecture.md)

## 🎮 Demo Video

*(Coming Soon)*

## 🧪 Environment Variables

### Server
- `PORT` - Server port (default: 5001)
- `OPENAI_API_KEY` - Your OpenAI API key for AI agent responses

### Client
- `VITE_API_URL` - Backend API URL (default: http://localhost:5001)

## 📦 Technologies

- React
- TypeScript
- TailwindCSS
- Express
- Socket.io
- SQLite
- OpenAI GPT-4o

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- OpenAI for the GPT-4o API
- The concept of AI agents simulating team dynamics
- Slack for UI inspiration

---

Made with ❤️ and 🤖 agents | No actual standups required