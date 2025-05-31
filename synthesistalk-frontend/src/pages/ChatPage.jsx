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
  const [reasoningMode, setReasoningMode] = useState("normal");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
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
