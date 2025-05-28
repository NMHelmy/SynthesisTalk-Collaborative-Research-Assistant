import React from "react";
import { FiPlus } from "react-icons/fi";
import { MdSend } from "react-icons/md";

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col justify-between">
        <div>
          <div className="text-xl font-bold mb-6">SynthesisTalk</div>
          <button className="w-full bg-gray-700 py-2 rounded mb-2 hover:bg-gray-600">
            New Topic
          </button>
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-1">Uploaded Files</p>
            <ul className="text-sm space-y-1">
              <li className="truncate">document1.pdf</li>
              <li className="truncate">research-notes.txt</li>
            </ul>
          </div>
        </div>
        <div className="text-sm text-gray-500">User Profile Icon</div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-col flex-1">
        {/* Top Bar */}
        <header className="flex justify-between items-center bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="text-sm text-gray-400">Model: NGU LLM ▼</div>
          <div className="text-xl font-bold">Paper Mind</div>
        </header>

        {/* Chat Messages */}
        <section className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-center text-gray-500">Where should we begin?</div>
          {/* Messages would go here */}
        </section>

        {/* Chat Input */}
        <footer className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <button className="p-2 bg-gray-700 rounded">
              <FiPlus />
            </button>
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-gray-700 rounded placeholder-gray-400 focus:outline-none"
            />
            <button className="p-2 bg-blue-600 rounded hover:bg-blue-700">
              <MdSend />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 space-x-4 text-sm text-gray-300">
            <button className="hover:underline">Web Search Results</button>
            <button className="hover:underline">Summarized Key Points</button>
            <button className="hover:underline">Insights Visualized</button>
          </div>
        </footer>
      </main>
    </div>
  );
}