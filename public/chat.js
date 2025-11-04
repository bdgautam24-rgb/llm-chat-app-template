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
const ASSISTANT_AVATAR = "🕉️";
const TYPING_SPEED = 20; // milliseconds per character for typing effect

// Chat state
let chatHistory = []; // Initial message is now in HTML
let isProcessing = false;

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
  const message = userInput.value.trim();

  // Don't send empty messages
  if (message === "" || isProcessing) return;

  // Disable input while processing
  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  // Add user message to chat
  addMessageToChat("user", message);

  // Clear input
  userInput.value = "";
  userInput.style.height = "auto";

  // Add message to history
  chatHistory.push({ role: "user", content: message });

  // Show typing indicator
  typingIndicatorWrapper.classList.add("visible");
  // Scroll to bottom to show the indicator
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    // Hide typing indicator before starting to stream
    typingIndicatorWrapper.classList.remove("visible");

    // Create new assistant message wrapper and elements
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

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Send request to API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
      }),
    });

    // Handle errors
    if (!response.ok) {
      throw new Error("Failed to get response");
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";
    let displayedText = "";
    let typingTimeout = null;

    const paragraphEl = assistantMessageEl.querySelector("p");

    // Function to update displayed text with typing effect
    const updateDisplayedText = () => {
      if (displayedText.length < responseText.length) {
        displayedText += responseText[displayedText.length];
        paragraphEl.textContent = displayedText;

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Schedule next character
        typingTimeout = setTimeout(updateDisplayedText, TYPING_SPEED);
      }
    };

    // Process streaming chunks
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk
      const chunk = decoder.decode(value, { stream: true });

      // Process SSE format
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.trim() === "") continue;

        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            // Append new content to response buffer
            responseText += jsonData.response;

            // If typing effect is not running, start it
            if (typingTimeout === null) {
              updateDisplayedText();
            }
          }
        } catch (e) {
          // Silently ignore parsing errors for empty or malformed lines
          if (line.trim() !== "") {
            console.debug("Non-JSON line received:", line);
          }
        }
      }
    }

    // Ensure all text is displayed
    if (typingTimeout !== null) {
      clearTimeout(typingTimeout);
    }
    displayedText = responseText;
    paragraphEl.textContent = displayedText;

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add completed response to chat history
    chatHistory.push({ role: "assistant", content: responseText });

    // The indicator is hidden before streaming starts, so no need to hide it her  } catch (error) {
    console.error("Error:", error);
    addMessageToChat(
      "assistant",
      "ক্ষমা করুন, আপনার অনুরোধ প্রক্রিয়া করতে একটি ত্রুটি ঘটেছে।"
    );
    // Ensure indicator is hidden on error
    typingIndicatorWrapper.classList.remove("visible");
  } finally {able input
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Helper function to add message to chat
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
  messageEl.innerHTML = `<p>${escapeHtml(content)}</p>`;

  // User message: [Message] [Avatar]
  // Assistant message: [Avatar] [Message]
  if (isUser) {
    wrapperEl.appendChild(messageEl);
    wrapperEl.appendChild(avatarEl);
  } else {
    wrapperEl.appendChild(avatarEl);
    wrapperEl.appendChild(messageEl);
  }

  chatMessages.appendChild(wrapperEl);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
