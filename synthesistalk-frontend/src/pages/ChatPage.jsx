import React, { useState, useRef, useEffect } from "react";
import { FiMenu, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { uploadDocument, listFiles } from "../api/api";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState("normal");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [showFiles, setShowFiles] = useState(false);
  const [uploadedFilesToSend, setUploadedFilesToSend] = useState([]);

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
    if (!input.trim() && uploadedFilesToSend.length === 0) return;

    setLoading(true);

    let finalPrompt = input.trim();  // your actual message
    let displayMessage = "";         // what shows in chat
    let extractedTexts = [];

    if (uploadedFilesToSend.length > 0) {
      try {
        // Step 1: Upload the files
        const formData = new FormData();
        uploadedFilesToSend.forEach((file) => formData.append("files", file));
        await fetch("http://localhost:8000/api/upload", {
          method: "POST",
          body: formData,
        });

        console.log("Uploaded files:", uploadedFilesToSend.map(f => f.name));

        await fetchFiles(); // update sidebar

        // Step 2: Extract text from each uploaded file
        for (const file of uploadedFilesToSend) {
          const filename = encodeURIComponent(file.name);
          const res = await fetch(`http://localhost:8000/api/extract/${filename}`);
          if (!res.ok) {
            const error = await res.json();
            console.error("❌ Extraction error:", error);
            throw new Error(error.detail || "Extraction failed");
          }
          const data = await res.json();
          if (data.text) {
            extractedTexts.push(`--- Content of ${file.name} ---\n${data.text}`);
          }
          // Show file in chat
          displayMessage += `📄 ${file.name}\n`;
        }

        // Step 3: Combine for LLM
        finalPrompt = extractedTexts.join("\n\n") +
          (finalPrompt ? `\n\nUser's question:\n${finalPrompt}` : "");

      } catch (err) {
        alert("Failed to process uploaded files");
        setLoading(false);
        return;
      }
    }

    // Step 4: Show the user's message in chat
    if (input.trim()) displayMessage += `\n${input.trim()}`;
    const newUserMessage = { role: "user", content: displayMessage };
    setMessages((prev) => [...prev, newUserMessage]);

    // Step 5: Send to LLM
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, mode: reasoningMode }),
      });

      const data = await res.json();

      if (data.response) {
        const assistantMessage = { role: "assistant", content: data.response };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Failed to contact server.");
    }

    setInput("");
    setUploadedFilesToSend([]);
    setLoading(false);
  };


  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setUploadedFilesToSend((prev) => [...prev, ...selected]);
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

          <div className="text-white mb-4">
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer select-none"
              onClick={() => setShowFiles((prev) => !prev)}
            >
              <img src="/assets/folder_icon.png" alt="Files" className="w-5 h-5" />
              <span className="text-sm font-semibold">
                Uploaded Documents {showFiles ? "▼" : "▶"}
              </span>
            </div>

            {showFiles && (
              <ul className="ml-2 space-y-2 text-sm text-white">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center bg-gray-800 p-2 rounded shadow text-white"
                  >
                    <span
                      className="truncate max-w-[160px] cursor-pointer hover:underline"
                      onClick={() =>
                        window.open(`http://localhost:8000/uploads/${encodeURIComponent(file.filename)}`, "_blank")
                      }
                    >
                      {file.filename}
                    </span>
                    <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `http://localhost:8000/api/files/${encodeURIComponent(file.filename)}`,
                          {
                            method: "DELETE",
                          }
                        );
                        if (!response.ok) {
                          const error = await response.json();
                          alert(`Failed to delete: ${error.detail || "Unknown error"}`);
                        } else {
                          fetchFiles(); // refresh file list
                        }
                      } catch (err) {
                        console.error("Delete failed:", err);
                        alert("Failed to delete file. Please try again.");
                      }
                    }}
                    className="text-red-400 hover:text-red-600 text-xs ml-2"
                    title="Delete file"
                  >
                    🗑️
                  </button>

                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="flex items-center gap-2 mt-6 text-sm text-red-500" onClick={handleLogout}>
            <FiLogOut />
            Logout
          </button>
        </aside>
      )}

      {/* Main Chat Area */}
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
        <div className="text-3xl font-semibold mb-8 text-center">Where should we begin?</div>

        {/* Message History */}
        <div className="flex flex-col space-y-4 w-full max-w-2xl px-4 overflow-y-auto mb-6 h-[60vh]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                msg.role === "user" ? "bg-blue-600 text-white self-end" : "bg-gray-300 text-black self-start"
              }`}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: msg.content.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                }}
              />
            </div>
          ))}
          {loading && <div className="text-white text-sm">Thinking...</div>}
        </div>

        {/* Input Footer */}
        <footer className="w-full max-w-2xl bg-[#9b9b9b] rounded-lg px-6 pt-6 pb-6 text-black shadow-md relative">
          <div className="flex flex-col items-start gap-2 mb-3">
            {uploadedFilesToSend.length > 0 && (
              <div className="flex flex-wrap gap-2 ml-1">
                {uploadedFilesToSend.map((file, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800 text-white text-sm px-3 py-1 rounded-full shadow flex items-center gap-2"
                  >
                    <span className="truncate max-w-[140px]">📄 {file.name}</span>
                    <button
                      onClick={() =>
                        setUploadedFilesToSend((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-gray-300 hover:text-red-400 text-xs"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 w-full">
              <button onClick={handleUploadClick}>
                <img src="/assets/plus_icon.png" alt="Add" className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                style={{ display: "none" }}
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Let's chat..."
                  className="w-full bg-transparent text-black placeholder-black text-lg outline-none"
                />
              </div>
              <button onClick={handleSend} disabled={loading}>
                <img src="/assets/send_icon.png" alt="Send" className="w-5 h-5" />
              </button>
            </div>
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
              <p className="text-sm text-gray-500">You are currently logged in to SynthesisTalk.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
