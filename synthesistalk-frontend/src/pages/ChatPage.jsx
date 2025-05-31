import { FiMenu, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import React, { useState, useRef, useEffect } from "react";
import { uploadDocument, listFiles } from "../api/api";
import { saveChatToFirestore, loadChatsFromFirestore } from "../chatStorage";
import { collection, query, getDocs, deleteDoc, addDoc, Timestamp } from "firebase/firestore";
import InsightsChart from "../components/InsightsChart";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState("normal");
  const [sessionId, setSessionId] = useState(null);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [uploadedFilesToSend, setUploadedFilesToSend] = useState([]);
  const [chatId, setChatId] = useState(() => Date.now().toString());
  const [chatHistory, setChatHistory] = useState([]);
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("sessionId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sessionId", id);
    }
    setSessionId(id);
  }, []);

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

  const handleRemoveUploadedFile = (indexToRemove) => {
    setUploadedFilesToSend((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleVisualize = async () => {
  let cleanedInput = input.replace(/\r?\n/g, "\n").trim();

  // Use last assistant message if input is empty
  if (!cleanedInput) {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.type);
    if (!lastAssistant) {
      alert("No input or assistant response available to visualize.");
      return;
    }
    cleanedInput = lastAssistant.content.trim();
  }

  // Step 1: Add the assistant response as user message + follow-up
  const userDataMessage = { role: "user", content: cleanedInput };
  const userPromptMessage = { role: "user", content: "Visualize this data" };

  const initialMessages = [...messages, userDataMessage, userPromptMessage];
  setMessages(initialMessages);

  // Step 2: Send to backend
  const res = await fetch("http://127.0.0.1:8000/api/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: cleanedInput }),
  });

  const { data } = await res.json();

  // Step 3: Display result
  if (data && Array.isArray(data) && data.length > 0) {
    const chartMessage = {
      role: "assistant",
      type: "chart",
      data,
    };
    const finalMessages = [...initialMessages, chartMessage];
    setMessages(finalMessages);
    const title = cleanedInput.split("\n")[0].slice(0, 40);
    await saveChatHistory(chatId, title, finalMessages);
  } else {
    const failMessage = {
      role: "assistant",
      content: "Unable to extract insights. Try being more specific or numeric in your questions.",
    };
    const finalMessages = [...initialMessages, failMessage];
    setMessages(finalMessages);
    await saveChatHistory(chatId, "Unvisualized Chart", finalMessages);
  }

  setInput(""); // optional
};

  
  const fetchFiles = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/files");
      const data = await response.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
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
        body: JSON.stringify({ session_id: sessionId, prompt: finalPrompt, mode: reasoningMode }),
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

  const handleUploadFile = (e) => {
    const files = Array.from(e.target.files || []);
    setUploadedFilesToSend((prev) => [...prev, ...files]);
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
        body: JSON.stringify({ session_id: sessionId, prompt: finalPrompt, mode: reasoningMode }),
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

    setInput("");
    setLoading(false);
  };
  const handleWebSearch = async () => {
    if (!input.trim() && messages.length === 0) {
      alert("Please type a query or start a conversation first.");
      return;
    }

    setLoading(true);

    // 1) Insert the user's actual question
    const questionMessage = { role: "user", content: input.trim() };
    // 2) Immediately follow with a "Web Search Results" marker
    const markerMessage  = { role: "user", content: "Web Search Results" };
    setMessages((prev) => [...prev, questionMessage, markerMessage]);

    try {
      const queryText = input.trim() || "";
      const res = await fetch("http://127.0.0.1:8000/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });
      const { results } = await res.json();

      // 1c. Append an “assistant” message with the snippets
      const assistantMessage = { role: "assistant", content: results };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Search error:", err);
      alert("Web search failed.");
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen flex text-white font-sans" style={{ backgroundColor: "#2c2c2c" }}>
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

          {/* Uploaded Files */}
          <div className="flex-1 overflow-y-auto pr-1 mt-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
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

          {/* Logout Button */}
          <button className="flex items-center gap-2 mt-4 text-sm text-red-500" onClick={handleLogout}>
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
          {messages.length === 0 ? (
            <div className="mt-24 text-center text-white text-5xl" style={{ fontFamily: '"Abril Fatface", cursive' }}>
            Where should we begin?
            </div>
          ) : (
          messages.map((msg, idx) => (
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
                <div className="w-full bg-white rounded-xl shadow p-4 overflow-x-auto">
                  <div className="min-w-[550px]">
                    <InsightsChart data={msg.data} />
                  </div>
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
          )))}
          {loading && <div className="text-white text-sm">Thinking...</div>}
        </div>

        <footer className="w-full max-w-2xl bg-[#9b9b9b] rounded-lg px-6 py-6 text-black shadow-md mt-4">
          {uploadedFilesToSend.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-1 mb-3">
              {uploadedFilesToSend.map((file, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 text-white text-sm px-3 py-1 rounded-full shadow flex items-center gap-2"
                >
                  <span className="truncate max-w-[140px]">📄 {file.name}</span>
                  <button
                    onClick={() => handleRemoveUploadedFile(idx)}
                    className="text-gray-300 hover:text-red-400 text-xs"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-5">
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              placeholder="Let's chat..."
              className="w-full bg-transparent text-black placeholder-black text-lg outline-none resize-none leading-tight h-[42px] py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
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
                        session_id: sessionId,
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
                        session_id: sessionId,
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
            <button onClick={handleVisualize} className="bg-white px-3 py-1 rounded shadow">
              📊 Insights Visualized
            </button>
          </div>
        </footer>

      </div>

      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#2c2c2c] text-white rounded-lg shadow-lg p-8 w-80 text-center relative">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-2 right-2 text-white text-xl"
            >
              ✖
            </button>
            <img
              src="/assets/profile_icon.png"
              alt="User"
              className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-white"
            />
            <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: '"Abril Fatface", cursive' }}>
              {user?.displayName || "Guest"}
            </h2>
            <p className="text-sm text-gray-300">{user?.email}</p>
          </div>
        </div>
      )}

    </div>
  );
}