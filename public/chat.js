// === DOM Elements ===
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

// === State ===
let chatHistory = [
  { role: "assistant", content: "নমস্কার! আমি গৌতম কুমার দ্বারা তৈরি একটি চ্যাটবট। আমি আপনাকে কীভাবে সাহায্য করতে পারি?" }
];
let isProcessing = false;

// === Load History with Expiration ===
document.addEventListener("DOMContentLoaded", () => {
  const savedHistory = localStorage.getItem("chatHistory");
  const savedTimestamp = parseInt(localStorage.getItem("chatTimestamp"), 10);
  const currentTime = Date.now();
  const expirationTime = 30 * 60 * 1000; // ৩০ মিনিট

  if (savedHistory && savedTimestamp && (currentTime - savedTimestamp < expirationTime)) {
    try {
      chatHistory = JSON.parse(savedHistory);
    } catch (e) {
      console.error("চ্যাট হিস্ট্রি পার্স করতে সমস্যা হয়েছে:", e);
      localStorage.clear(); // ত্রুটিপূর্ণ হিস্ট্রি মুছে ফেলা হলো
    }
  } else {
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("chatTimestamp");
  }
  renderHistory();
  userInput.focus();
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

// === Scroll to Element/Bottom ===
function scrollToElement(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

// === Add Message to UI ===
function addMessage(role, content, timestamp = new Date()) {
  const isUser = role === "user";
  const wrapper = document.createElement("div");
  wrapper.className = "clearfix mb-4";

  const avatar = document.createElement("div");
  avatar.className = `w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${isUser ? 'bg-primary' : 'bg-blue-500'}`;
  avatar.textContent = isUser ? "👤" : "🔱";
  avatar.style.float = isUser ? "right" : "left";

  const messageDiv = document.createElement("div");
  messageDiv.className = `inline-block max-w-[75%] p-3 rounded-lg relative group ${isUser ? 'bg-user-bg rounded-br-none' : 'bg-assistant-bg rounded-bl-none'}`;
  messageDiv.style.float = isUser ? "right" : "left";
  messageDiv.style.marginLeft = isUser ? "auto" : "12px";
  messageDiv.style.marginRight = isUser ? "12px" : "auto";

  const p = document.createElement("p");
  p.innerHTML = DOMPurify.sanitize(marked.parse(content));
  messageDiv.appendChild(p);

  const time = document.createElement("div");
  time.className = "text-xs text-gray-500 text-right mt-1";
  time.textContent = timestamp.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  messageDiv.appendChild(time);

  if (role === "assistant") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "absolute top-1 right-2 bg-transparent border-none text-gray-500 text-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity";
    copyBtn.innerHTML = "📋";
    copyBtn.setAttribute('aria-label', 'কপি করুন');
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
  wrapper.className = "clearfix mb-4";
  wrapper.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 float-left">🔱</div>
    <div class="inline-block max-w-[75%] bg-assistant-bg p-3 rounded-lg rounded-bl-none ml-12 float-left">
      <div class="flex items-center space-x-1">
        <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0s;"></div>
        <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
        <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
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
            throw new Error(`সার্ভার থেকে ত্রুটি: ${res.status}`);
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
                        console.error("JSON পার্সিং এ সমস্যা:", e, "লাইন:", line);
                    }
                }
            }
        }

        const finalCopyBtn = assistantMessageDiv.querySelector('button[aria-label="কপি করুন"]');
        if (finalCopyBtn) {
            finalCopyBtn.onclick = () => {
                navigator.clipboard.writeText(fullResponse).then(() => {
                    finalCopyBtn.innerHTML = "✅";
                    setTimeout(() => { finalCopyBtn.innerHTML = "📋"; }, 2000);
                });
            };
        }

        if (fullResponse) {
            chatHistory.push({ role: "assistant", content: fullResponse });
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
            localStorage.setItem("chatTimestamp", Date.now().toString());
        } else {
            throw new Error("সার্ভার থেকে কোনো উত্তর পাওয়া যায়নি।");
        }

    } catch (err) {
        console.error("API কল করতে সমস্যা হয়েছে:", err);
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
