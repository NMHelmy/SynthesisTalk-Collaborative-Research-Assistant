import React, { useState, useEffect } from "react";
import { FiMenu, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import InsightsChart from "../components/InsightsChart";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState("normal");
  const [sessionId, setSessionId] = useState(null);

  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    let id = localStorage.getItem("sessionId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sessionId", id);
    }
    setSessionId(id);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleVisualize = async () => {
    const text = messages
      .filter((m) => m.role === "assistant" || m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const res = await fetch("http://127.0.0.1:8000/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const { data } = await res.json();
    console.log("📊 Chart data from API:", data);

    if (data && Array.isArray(data) && data.length > 0) {
      const chartMessage = {
        role: "assistant",
        type: "chart",
        data,
      };
      setMessages((prev) => [...prev, chartMessage]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Unable to extract insights. Try being more specific or numeric in your questions.",
        },
      ]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const newUserMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          prompt: input,
          mode: reasoningMode,
        }),
      });

      const data = await res.json();
      if (data.response) {
        const assistantMessage = { role: "assistant", content: data.response };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to contact server.");
    }

    setInput("");
    setLoading(false);
  };

  const handleWebSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      const { results } = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: results, mode: "normal" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen flex text-white font-sans" style={{ backgroundColor: "#2c2c2c" }}>
      {sidebarOpen && (
        <aside className="w-64 bg-black h-full flex flex-col p-4 z-10">
          <button className="flex items-center gap-2 mt-6 text-sm text-red-500" onClick={handleLogout}>
            <FiLogOut />
            Logout
          </button>
        </aside>
      )}

      <div className="flex-1 flex flex-col items-center justify-between relative w-full py-6">
        {!sidebarOpen && (
          <div className="absolute top-4 left-4 flex items-center gap-4 text-white text-2xl z-20">
            <button onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <button onClick={handleNewChat}>
              <img src="/assets/new_chat_icon.png" alt="New Chat" className="w-6 h-6" />
            </button>
          </div>
        )}

        <img src="/assets/logo.png" alt="Logo" className="absolute top-4 right-4 w-12 h-auto" />

        <div className="flex-1 flex flex-col space-y-4 w-full max-w-2xl px-4 overflow-y-auto hide-scrollbar">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-[#722f37] text-white self-end"
                  : "bg-gray-300 text-black self-start"
              }`}
              style={{ maxWidth: msg.type === "chart" ? "100%" : "80%" }}
            >
              {msg.type === "chart" ? (
                <div className="w-full max-w-xl bg-white rounded-xl shadow p-4">
                  <InsightsChart data={msg.data} />
                </div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{
                    __html: (msg.content || "")
                      .replace(/\n/g, "<br>")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                  }}
                />
              )}
            </div>
          ))}
          {loading && <div className="text-white text-sm">Thinking...</div>}
        </div>

        <footer className="w-full max-w-2xl bg-[#9b9b9b] rounded-lg px-6 py-6 text-black shadow-md mt-4">
          <div className="flex items-center gap-2 mb-5">
            <img src="/assets/plus_icon.png" alt="Add" className="w-5 h-5" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Let's chat..."
              className="w-full bg-transparent text-black placeholder-black text-lg outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend} disabled={loading}>
              <img src="/assets/send_icon.png" alt="Send" className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center gap-4 text-sm font-medium mb-4">
            {["normal", "cot", "react"].map((mode) => (
              <button
                key={mode}
                className={`px-3 py-1 rounded shadow ${
                  reasoningMode === mode ? "bg-blue-500 text-white" : "bg-white"
                }`}
                onClick={() => setReasoningMode(mode)}
              >
                {mode === "normal" ? "💬 Normal" : mode === "cot" ? "🔗 CoT" : "🤖 ReAct"}
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-4 text-sm font-medium">
            <button onClick={handleWebSearch} disabled={loading} className="bg-white px-3 py-1 rounded shadow">
              🔍 Web Search Results
            </button>
            <button className="bg-white px-3 py-1 rounded shadow">
              📄 Summarized key points
            </button>
            <button onClick={handleVisualize} className="bg-white px-3 py-1 rounded shadow">
              📊 Insights Visualized
            </button>
          </div>
        </footer>
      </div>

      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          {/* profile modal here */}
        </div>
      )}
    </div>
  );
}
