import React, { useState, useRef, useEffect } from "react";
import { FiMenu, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { uploadDocument, listFiles, deleteFile } from "../api/api";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState("normal"); // "normal", "cot", "react"
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await listFiles();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Failed to fetch files", error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newUserMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, mode: reasoningMode }),
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

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadDocument(file);
      fetchFiles();
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await deleteFile(filename);
      fetchFiles();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="relative h-screen flex text-white font-sans" style={{ backgroundColor: "#2c2c2c" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 bg-black h-full flex flex-col p-4 z-10">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setShowProfile(true)}>
              <img src="/assets/profile_icon.png" alt="Profile" className="w-6 h-6" />
            </button>
            <button className="text-white text-2xl" onClick={() => setSidebarOpen(false)}>
              <FiMenu />
            </button>
          </div>

          <button className="flex items-center gap-3 mb-4 text-white" onClick={handleNewChat}>
            <img src="/assets/new_chat_icon.png" alt="New Chat" className="w-5 h-5" />
            <span>New Topic</span>
          </button>

          <div className="flex flex-col gap-2 text-white mb-4">
            <div className="flex items-center gap-3">
              <img src="/assets/folder_icon.png" alt="Files" className="w-5 h-5" />
              <span>Uploaded Files</span>
            </div>
            <ul className="ml-8 list-disc text-sm text-gray-300">
              {files.map((file, i) => (
                <li key={i} className="flex items-center gap-2">
                  <a
                    href={`http://localhost:8000/uploads/${encodeURIComponent(file.filename)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {file.filename}
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`http://localhost:8000/extract/${encodeURIComponent(file.filename)}`);
                        const data = await res.json();
                        alert(data.text);
                      } catch (err) {
                        alert("Failed to extract text");
                      }
                    }}
                    className="text-purple-400 hover:text-purple-600 text-xs"
                  >
                    Extract
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button
            className="flex items-center gap-2 mt-6 text-sm text-red-500"
            onClick={handleLogout}
          >
            <FiLogOut />
            Logout
          </button>
        </aside>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col items-center justify-between relative w-full py-6">
        {/* Top controls */}
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
        <div className="text-3xl font-semibold mb-8 text-center">Where should we begin?</div>

        {/* Chat History */}
        <div className="flex flex-col space-y-4 w-full max-w-2xl px-4 overflow-y-auto mb-6 h-[60vh]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white self-end"
                  : "bg-gray-300 text-black self-start"
              }`}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: msg.content.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                }}
              />
            </div>
          ))}
          {loading && <div className="text-white text-sm">Thinking...</div>}
        </div>

        {/* Input Footer */}
        <footer className="w-full max-w-2xl bg-[#9b9b9b] rounded-lg px-6 py-6 text-black shadow-md">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={handleUploadClick}>
              <img src="/assets/plus_icon.png" alt="Add" className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Let's chat..."
              className="w-full bg-transparent text-black placeholder-black text-lg outline-none"
            />
            <button onClick={handleSend} disabled={loading}>
              <img src="/assets/send_icon.png" alt="Send" className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center gap-4 text-sm font-medium mb-4">
            <button
              className={`px-3 py-1 rounded shadow ${
                reasoningMode === "normal" ? "bg-blue-500 text-white" : "bg-white"
              }`}
              onClick={() => setReasoningMode("normal")}
            >
              💬 Normal
            </button>
            <button
              className={`px-3 py-1 rounded shadow ${
                reasoningMode === "cot" ? "bg-blue-500 text-white" : "bg-white"
              }`}
              onClick={() => setReasoningMode("cot")}
            >
              🔗 CoT
            </button>
            <button
              className={`px-3 py-1 rounded shadow ${
                reasoningMode === "react" ? "bg-blue-500 text-white" : "bg-white"
              }`}
              onClick={() => setReasoningMode("react")}
            >
              🤖 ReAct
            </button>
          </div>

          <div className="flex justify-center gap-4 text-sm font-medium">
            <button className="bg-white px-3 py-1 rounded shadow">🔍 Web Search Results</button>
            <button className="bg-white px-3 py-1 rounded shadow">📄 Summarized key points</button>
            <button className="bg-white px-3 py-1 rounded shadow">📊 Insights Visualized</button>
          </div>
        </footer>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-2xl p-6 w-96 shadow-lg relative text-center">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-3 right-4 text-xl text-gray-600 hover:text-black"
            >
              ×
            </button>

            <div className="flex flex-col items-center">
              <img
                src="/assets/profile_icon.png"
                alt="Profile"
                className="w-20 h-20 rounded-full mb-4 border-4 border-gray-300"
              />
              <h2 className="text-2xl font-bold mb-1">{user?.displayName || "Guest User"}</h2>
              <p className="text-sm text-gray-600 mb-4">{user?.email || "Signed in as Guest"}</p>
              <div className="w-full h-px bg-gray-200 my-4" />
              <p className="text-sm text-gray-500">
                You are currently logged in to SynthesisTalk.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
