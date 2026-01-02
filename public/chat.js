// === DOM Elements ===
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const newChatBtn = document.getElementById("new-chat-btn");
const deleteSessionBtn = document.getElementById("delete-session-btn");

// === State ===
const DEFAULT_WELCOME = { role: "assistant", content: "নমস্কার! আমি গৌতম কুমার দ্বারা তৈরি একটি চ্যাটবট। আমি আপনাকে কীভাবে সাহায্য করতে পারি?" };
let chatHistory = [DEFAULT_WELCOME];
let isProcessing = false;

// === Load History ===
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();
  userInput.focus();
});

function loadHistory() {
  const savedHistory = localStorage.getItem("chatHistory");
  if (savedHistory) {
    try {
      chatHistory = JSON.parse(savedHistory);
    } catch (e) {
      console.error("Error parsing history:", e);
      chatHistory = [DEFAULT_WELCOME];
    }
  } else {
    chatHistory = [DEFAULT_WELCOME];
  }
  renderHistory();
}

// === Session Management ===
newChatBtn.addEventListener("click", () => {
  if (confirm("আপনি কি নতুন চ্যাট শুরু করতে চান? বর্তমান চ্যাটটি হিস্ট্রিতে থাকবে।")) {
    chatHistory = [DEFAULT_WELCOME];
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    renderHistory();
  }
});

deleteSessionBtn.addEventListener("click", () => {
  if (confirm("আপনি কি সমস্ত চ্যাট হিস্ট্রি মুছে ফেলতে চান? এটি আর ফিরে পাওয়া যাবে না।")) {
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("chatTimestamp");
    chatHistory = [DEFAULT_WELCOME];
    renderHistory();
  }
});

// === Auto-resize Textarea ===
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = (this.scrollHeight) + "px";
});

// === Send Message on Enter or Click ===
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendButton.addEventListener("click", sendMessage);

function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

// === Add Message to UI ===
function addMessage(role, content, timestamp = new Date()) {
  const isUser = role === "user";
  const wrapper = document.createElement("div");
  wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;

  const avatar = document.createElement("div");
  avatar.className = `w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${isUser ? 'bg-[#f6821f] ml-3 order-2' : 'bg-blue-500 mr-3 order-1'}`;
  avatar.textContent = isUser ? "👤" : "🔱";

  const messageDiv = document.createElement("div");
  messageDiv.className = `max-w-[75%] p-3 rounded-lg relative group order-1 ${isUser ? 'bg-[#fff2e6] rounded-br-none' : 'bg-[#f3f4f6] rounded-bl-none'}`;

  const p = document.createElement("p");
  p.className = "whitespace-pre-wrap break-words text-sm";
  p.innerHTML = DOMPurify.sanitize(marked.parse(content));
  messageDiv.appendChild(p);

  const time = document.createElement("div");
  time.className = "text-[10px] text-gray-500 text-right mt-1";
  time.textContent = timestamp.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  messageDiv.appendChild(time);

  if (role === "assistant" && content) {
    const copyBtn = document.createElement("button");
    copyBtn.className = "absolute top-1 right-2 bg-transparent border-none text-gray-400 text-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity";
    copyBtn.innerHTML = "📋";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.innerHTML = "✅";
        setTimeout(() => { copyBtn.innerHTML = "📋"; }, 2000);
      });
    };
    messageDiv.appendChild(copyBtn);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(messageDiv);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
  return messageDiv;
}

function renderHistory() {
  chatMessages.innerHTML = "";
  chatHistory.forEach(msg => {
    if (msg.role !== "system") {
      addMessage(msg.role, msg.content);
    }
  });
  scrollToBottom();
}

// === Typing Indicator ===
function showTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.id = "typing-indicator";
  wrapper.className = "flex justify-start mb-4";
  wrapper.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 mr-3">🔱</div>
    <div class="bg-[#f3f4f6] p-3 rounded-lg rounded-bl-none">
      <div class="flex items-center space-x-1">
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s;"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

// === Send Message Logic ===
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    setProcessingState(true);
    addMessage("user", message);
    chatHistory.push({ role: "user", content: message });
    userInput.value = "";
    userInput.style.height = "auto";
    showTypingIndicator();

    let assistantMessageDiv;

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.details || `সার্ভার থেকে ত্রুটি: ${res.status}`);
        }

        removeTypingIndicator();
        assistantMessageDiv = addMessage("assistant", ""); 
        const assistantContentP = assistantMessageDiv.querySelector("p");
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith("data:")) {
                    const jsonStr = trimmedLine.replace("data:", "").trim();
                    if (jsonStr === "[DONE]") continue;
                    try {
                        const data = JSON.parse(jsonStr);
                        if (data.response) {
                            fullResponse += data.response;
                            assistantContentP.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("JSON parsing error:", e);
                    }
                }
            }
        }

        if (fullResponse) {
            chatHistory.push({ role: "assistant", content: fullResponse });
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
        } else {
            throw new Error("সার্ভার থেকে কোনো উত্তর পাওয়া যায়নি।");
        }

    } catch (err) {
        console.error("API call error:", err);
        removeTypingIndicator();
        if (assistantMessageDiv) assistantMessageDiv.remove();
        addMessage("assistant", `<em>ত্রুটি: ${err.message || 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন।'} আবার চেষ্টা করুন।</em>`);
    } finally {
        setProcessingState(false);
        userInput.focus();
    }
}

function setProcessingState(state) {
  isProcessing = state;
  userInput.disabled = state;
  sendButton.disabled = state;
}
