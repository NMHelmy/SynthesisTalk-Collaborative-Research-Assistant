import React, { useState, useRef, useEffect } from "react";
import { FiMenu, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { uploadDocument, listFiles } from "../api/api";
import { saveChatToFirestore, loadChatsFromFirestore } from "../chatStorage";
import { db } from "../firebase";
import { collection, query, getDocs, deleteDoc, addDoc, Timestamp } from "firebase/firestore";

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
  const [chatHistory, setChatHistory] = useState([]);
  const [chatId, setChatId] = useState(() => Date.now().toString());

  useEffect(() => {
    const fetchChats = async () => {
      const history = await loadChatsFromFirestore();
      setChatHistory(history);
    };
    fetchChats();
  }, []);

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
    setChatId(Date.now().toString());
  };

  const saveChatHistory = async (chatId, title, messages) => {
    await saveChatToFirestore(chatId, title, messages);
    const history = await loadChatsFromFirestore();
    setChatHistory(history);
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
        // Save metadata of uploaded files to Firestore
        for (const file of uploadedFilesToSend) {
          try {
            await addDoc(collection(db, "documents"), {
              filename: file.name,
              uploadedBy: user?.uid || "anonymous",
              uploadedAt: Timestamp.now(),
              downloadUrl: `http://localhost:8000/uploads/${encodeURIComponent(file.name)}`
            });
          } catch (error) {
            console.error("Failed to store file metadata:", error);
          }
        }

        console.log("Uploaded files:", uploadedFilesToSend.map(f => f.name));

        await fetchFiles(); // update sidebar

        // Step 2: Extract text from each uploaded file
        for (const file of uploadedFilesToSend) {
          const filename = encodeURIComponent(file.name);
          const res = await fetch(`http://localhost:8000/api/extract/${filename}`);
          if (!res.ok) {
            const error = await res.json();
            console.error("Extraction error:", error);
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
    if (input.trim()) {
      if (uploadedFilesToSend.length > 0) {
        displayMessage += `\n${input.trim()}`;
      } else {
        displayMessage += input.trim();
      }
    }
    const newUserMessage = { role: "user", content: displayMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

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
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Generate title based on first user message
        let title = "New Chat";
        const firstUserMessage = updatedMessages.find(m => m.role === "user");
        if (firstUserMessage) {
          const content = firstUserMessage.content.trim();
          if (content.startsWith("📄")) {
            const match = content.match(/^📄\s*(.+)/);
            if (match) {
              title = match[1].split("\n")[0].trim(); // Extract file name
            }
          } else {
            title = content.slice(0, 40); // Text input fallback
          }
        }

        saveChatHistory(chatId, title, finalMessages);
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

  const handleSummarizedKeyPoints = async () => {
    if (uploadedFilesToSend.length === 0) {
      alert("Please upload a document first.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload the document(s)
      const formData = new FormData();
      uploadedFilesToSend.forEach((file) => formData.append("files", file));
      await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      await fetchFiles(); // refresh sidebar

      // Step 2: Extract text
      let extractedTexts = [];
      for (const file of uploadedFilesToSend) {
        const filename = encodeURIComponent(file.name);
        const res = await fetch(`http://localhost:8000/api/extract/${filename}`);
        const data = await res.json();
        if (data.text) {
          extractedTexts.push(data.text);
        }
      }

      // Step 3: Send summarization prompt to LLM
      const finalPrompt = `Summarize the key points from this document:\n\n${extractedTexts.join("\n\n")}`;
      const displayMessage = uploadedFilesToSend.map(f => f.name).join(", ");

      setMessages(prev => [...prev, { role: "user", content: displayMessage }]);

      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, mode: reasoningMode }),
      });

      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        alert("Error: " + data.error);
      }

      setUploadedFilesToSend([]);
    } catch (error) {
      console.error(error);
      alert("Failed to summarize document.");
    }

    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) {
      setUploadedFilesToSend((prev) => [...prev, ...selected]);
      e.target.value = ""; 
    }
  };

  return (
    <div className="relative h-screen flex text-white font-sans" style={{ backgroundColor: "#2c2c2c" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 bg-black h-screen flex flex-col p-4 z-10">
          {/* Header & Buttons */}
          <div className="flex items-center justify-between mb-4">
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

      {/* Scrollable Section */}
      <div className="flex-1 overflow-y-auto pr-1 mt-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {/* Uploaded Files */}
        <div>
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
                          { method: "DELETE" }
                        );
                        if (!response.ok) {
                          const error = await response.json();
                          alert(`Failed to delete: ${error.detail || "Unknown error"}`);
                        } else {
                          fetchFiles();
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

        {/* Chat History */}
        <div className="mt-6">
          <span className="text-sm font-bold mb-2 block border-b border-gray-600 pb-1">📝 Chat History</span>
          <div className="space-y-3 pb-6">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="p-3 rounded-lg bg-[#1e1e1e] hover:bg-[#2c2c2c] shadow cursor-pointer transition duration-200"
                onClick={() => {
                  setMessages(chat.messages);
                  setChatId(chat.id);
                  setInput("");
                }}
              >
                <div className="font-medium truncate text-sm mb-1">{chat.title || "Untitled Chat"}</div>
                <div className="text-xs text-gray-400">
                  {new Date(parseInt(chat.id)).toLocaleString()}
                </div>
              </div>
            ))}

            {chatHistory.length > 0 && (
              <button
                className="text-xs text-red-400 hover:text-red-600 mt-4 block"
                onClick={async () => {
                  localStorage.removeItem("chatHistory");
                  setChatHistory([]);

                  if (user?.uid) {
                    const q = query(collection(db, "users", user.uid, "chats"));
                    const snapshot = await getDocs(q);
                    snapshot.forEach(async (docRef) => {
                      await deleteDoc(docRef.ref);
                    });
                  }
                }}
              >
                🗑️ Clear All Chats
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logout */}
      <button className="flex items-center gap-2 mt-4 text-sm text-red-500" onClick={handleLogout}>
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
            <button
              className="bg-white px-3 py-1 rounded shadow"
              onClick={async () => {
                setInput("Summarize key points");
                if (uploadedFilesToSend.length === 0 && messages.length === 0) {
                  alert("Please upload a document or start a conversation first.");
                  return;
                }

                setLoading(true);

                if (uploadedFilesToSend.length > 0) {
                  try {
                    const formData = new FormData();
                    uploadedFilesToSend.forEach((file) => formData.append("files", file));

                    await fetch("http://localhost:8000/api/upload", {
                      method: "POST",
                      body: formData,
                    });

                    for (const file of uploadedFilesToSend) {
                      try {
                        await addDoc(collection(db, "documents"), {
                          filename: file.name,
                          uploadedBy: user?.uid || "anonymous",
                          uploadedAt: Timestamp.now(),
                          downloadUrl: `http://localhost:8000/uploads/${encodeURIComponent(file.name)}`
                        });
                      } catch (err) {
                        console.error("Failed to save document metadata:", err);
                      }
                    }

                    const extractedTexts = [];
                    for (const file of uploadedFilesToSend) {
                      const filename = encodeURIComponent(file.name);
                      const res = await fetch(`http://localhost:8000/api/extract/${filename}`);
                      const data = await res.json();

                      if (data.text) {
                        extractedTexts.push(`--- Content of ${file.name} ---\n${data.text}`);
                      }
                    }

                    const prompt = `Summarize the key points from the following documents:\n\n${extractedTexts.join("\n\n")}`;
                    const filenamesText = uploadedFilesToSend.map(f => f.name).join(", ");

                    const newMessages = [
                      { role: "user", content: filenamesText },
                      { role: "user", content: "Summarize key points" }
                    ];
                    setMessages(prev => [...prev, ...newMessages]);

                    const res = await fetch("http://localhost:8000/api/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt,
                        mode: reasoningMode
                      }),
                    });

                    const data = await res.json();

                    if (data.response) {
                      const assistantMessage = { role: "assistant", content: `📌 **Key Points from ${filenamesText}:**\n${data.response}` };
                      const finalMessages = [...messages, ...newMessages, assistantMessage];
                      setMessages(finalMessages);

                      await saveChatHistory(chatId, filenamesText, finalMessages);
                    } else {
                      alert("Summarization failed: " + data.error);
                    }

                    setInput("");
                    setUploadedFilesToSend([]);
                  } catch (err) {
                    console.error(err);
                    alert("Failed to summarize uploaded files.");
                  }
                } else {
                  // If no uploaded files, summarize the conversation
                  try {
                    const context = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

                    const res = await fetch("http://localhost:8000/api/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: `Please extract and summarize the key points from the following conversation or content:\n\n${context}\n\nReturn them as concise bullet points.`,
                        mode: reasoningMode
                      }),
                    });

                    const data = await res.json();

                    if (data.response) {
                      const userMsg = { role: "user", content: "Summarize key points" };
                      const assistantMsg = { role: "assistant", content: `📌 **Key Points:**\n${data.response}` };
                      const finalMessages = [...messages, userMsg, assistantMsg];
                      setMessages(finalMessages);

                      await saveChatHistory(chatId, "Summarized Chat", finalMessages);
                      setInput("");
                    } else {
                      alert("Summarization failed: " + data.error);
                    }
                  } catch (err) {
                    alert("Failed to summarize.");
                  }
                }

                setLoading(false);
              }}


            >
              📄 Summarized key points
            </button>

            <button
              className="bg-white px-3 py-1 rounded shadow"
              onClick={async () => {
                setInput("Insights Visualized");

                if (!messages.length) {
                  if (uploadedFilesToSend.length > 0) {
                    const fileMessages = [];
                    let combinedText = "";

                    for (const file of uploadedFilesToSend) {
                      const fileName = file?.name;
                      if (!fileName) continue;

                      const formData = new FormData();
                      formData.append("files", file);

                      await fetch("http://localhost:8000/api/upload", {
                        method: "POST",
                        body: formData,
                      });

                      const extractRes = await fetch(`http://localhost:8000/api/extract/${encodeURIComponent(fileName)}`);
                      const extractData = await extractRes.json();

                      if (!extractData.text) {
                        alert(`Failed to extract text from ${fileName}`);
                        return;
                      }

                      combinedText += `From ${fileName}:\n${extractData.text}\n\n`;
                      fileMessages.push({ role: "user", content: `📄 ${fileName}` });
                    }

                    setMessages((prev) => [...prev, ...fileMessages, { role: "user", content: "Insights Visualized" }, { role: "assistant", content: "Thinking..." }]);
                    setUploadedFilesToSend([]);

                    try {
                      const res = await fetch("http://localhost:8000/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          prompt: `Please visualize or describe any key patterns, comparisons, or insights from the following content:\n\n${combinedText}`,
                          mode: reasoningMode,
                        }),
                      });

                      const data = await res.json();
                      if (data.response) {
                        const updated = [
                          ...fileMessages,
                          { role: "user", content: "Insights Visualized" },
                          { role: "assistant", content: data.response }
                        ];
                        setMessages((prev) => [...prev.slice(0, -1), updated[updated.length - 1]]);
                        saveChatHistory(chatId, "Insights Visualized", [...messages, ...updated]);
                      } else {
                        alert("Insight visualization failed: " + data.error);
                      }
                    } catch (err) {
                      alert("Failed to generate insights.");
                    }

                  } else {
                    return alert("Please upload a document or start a conversation first.");
                  }
                } else {
                  {messages.map((msg, i) => (
                    <div key={i}>
                      {msg.content === "Thinking..." ? (
                        <p className="italic text-gray-500 text-sm px-4 py-1">Thinking...</p>
                      ) : (
                        <div className={`message ${msg.role}`}>
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}

                  const latestContext = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

                  try {
                    const res = await fetch("http://localhost:8000/api/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: `Please visualize or explain any insights from the following conversation:\n\n${latestContext}`,
                        mode: reasoningMode
                      }),
                    });

                    const data = await res.json();
                    if (data.response) {
                      const updated = [
                        { role: "user", content: "Insights Visualized" },
                        { role: "assistant", content: data.response }
                      ];
                      setMessages((prev) => [...prev.slice(0, -1), updated[1]]);
                      saveChatHistory(chatId, "Insights Visualized", [...messages, ...updated]);
                    } else {
                      alert("Insight generation failed: " + data.error);
                    }
                  } catch (err) {
                    alert("Failed to generate insights.");
                  }
                }
              }}
            >
              📊 Insights Visualized
            </button>

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
