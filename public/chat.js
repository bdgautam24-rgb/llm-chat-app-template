/**
 * LLM Chat App Frontend
 *
 * Handles the chat UI interactions and communication with the backend API.
 * Enhanced with typing indicator, avatars, and human-like streaming responses.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicatorWrapper = document.getElementById("typing-indicator-wrapper");

// Constants
const USER_AVATAR = "👤";
const ASSISTANT_AVATAR = "🔱";
const TYPING_SPEED = 20; // ms per character for typing effect

// Chat state
let chatHistory = [
  { role: "assistant", content: "নমস্কার! আমি গৌতম কুমার দ্বারা তৈরি একটি চ্যাটবট। আমি আপনাকে কীভাবে সাহায্য করতে পারি?" }
];
let isProcessing = false;

// Auto-resize textarea
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send on Enter (no Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button
sendButton.addEventListener("click", sendMessage);

/**
 * Send message to API and handle streaming response
 */
async function sendMessage() {
  const message = userInput.value.trim();
  if (message === "" || isProcessing) return;

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  // Add user message
  addMessageToChat("user", message);
  userInput.value = "";
  userInput.style.height = "auto";

  // Update history
  chatHistory.push({ role: "user", content: message });

  // Show typing indicator
  typingIndicatorWrapper.classList.add("visible");
  scrollToBottom();

  try {
    // Create assistant message placeholder
    const assistantWrapperEl = document.createElement("div");
    assistantWrapperEl.className = "message-wrapper assistant-message-wrapper";

    const avatarEl = document.createElement("div");
    avatarEl.className = "avatar assistant-avatar";
    avatarEl.textContent = ASSISTANT_AVATAR;

    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";

    assistantWrapperEl.appendChild(avatarEl);
    assistantWrapperEl.appendChild(assistantMessageEl);
    chatMessages.appendChild(assistantWrapperEl);
    scrollToBottom();

    // Hide typing indicator now that streaming starts
    typingIndicatorWrapper.classList.remove("visible");

    // Fetch response
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok) throw new Error("Failed to get response");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";
    let displayedText = "";
    let typingTimeout = null;
    const paragraphEl = assistantMessageEl.querySelector("p");

    const updateTyping = () => {
      if (displayedText.length < responseText.length) {
        displayedText += responseText.charAt(displayedText.length);
        paragraphEl.innerHTML = escapeHtml(displayedText).replace(/\n/g, "<br>");
        scrollToBottom();
        typingTimeout = setTimeout(updateTyping, TYPING_SPEED);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            responseText += jsonData.response;
            if (!typingTimeout) updateTyping();
          }
        } catch (e) {
          if (line.trim()) console.debug("Non-JSON:", line);
        }
      }
    }

    // Finalize typing
    clearTimeout(typingTimeout);
    displayedText = responseText;
    paragraphEl.innerHTML = escapeHtml(displayedText).replace(/\n/g, "<br>");
    scrollToBottom();

    // Update history
    chatHistory.push({ role: "assistant", content: responseText });

  } catch (error) {
    console.error("Error:", error);
    addMessageToChat("assistant", "ক্ষমা করুন, একটি ত্রুটি ঘটেছে। দয়া করে আবার চেষ্টা করুন।");
    typingIndicatorWrapper.classList.remove("visible");
  } finally {
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Add message to chat UI
 */
function addMessageToChat(role, content) {
  const isUser = role === "user";
  const wrapperClass = isUser ? "user-message-wrapper" : "assistant-message-wrapper";
  const messageClass = isUser ? "user-message" : "assistant-message";
  const avatarClass = isUser ? "user-avatar" : "assistant-avatar";
  const avatarText = isUser ? USER_AVATAR : ASSISTANT_AVATAR;

  const wrapperEl = document.createElement("div");
  wrapperEl.className = `message-wrapper ${wrapperClass}`;

  const avatarEl = document.createElement("div");
  avatarEl.className = `avatar ${avatarClass}`;
  avatarEl.textContent = avatarText;

  const messageEl = document.createElement("div");
  messageEl.className = `message ${messageClass}`;
  messageEl.innerHTML = `<p>${escapeHtml(content).replace(/\n/g, "<br>")}</p>`;

  if (isUser) {
    wrapperEl.appendChild(messageEl);
    wrapperEl.appendChild(avatarEl);
  } else {
    wrapperEl.appendChild(avatarEl);
    wrapperEl.appendChild(messageEl);
  }

  chatMessages.appendChild(wrapperEl);
  scrollToBottom();
}

/**
 * Scroll to bottom
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initial scroll
scrollToBottom();
