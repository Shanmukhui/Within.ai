 async function sendMessage() {
  const inputBox = document.getElementById("inputBox");
  const chatBox = document.getElementById("chatBox");

  const message = inputBox.value;
  if (!message) return;

  // Show user message
  chatBox.innerHTML += "<p><b>You:</b> " + message + "</p>";

  inputBox.value = "";

  try {
    // 🔴 CHANGE THIS TO YOUR BACKEND URL
    const response = await fetch("https://your-backend.onrender.com/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    });

    const data = await response.json();

    // Show AI response
    chatBox.innerHTML += "<p><b>AI:</b> " + data.reply + "</p>";

  } catch (error) {
    chatBox.innerHTML += "<p style='color:red;'>Error connecting to AI</p>";
  }
}   
