document.addEventListener('DOMContentLoaded', () => {
    // SVGs for avatars
    const USER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`;
    const BOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM15.5 8C14.67 8 14 7.33 14 6.5S14.67 5 15.5 5 17 5.67 17 6.5 16.33 8 15.5 8zm-7 0C7.67 8 7 7.33 7 6.5S7.67 5 8.5 5 10 5.67 10 6.5 9.33 8 8.5 8z"></path></svg>`;

    // Theme Switcher Logic
    const themeCheckbox = document.getElementById('theme-checkbox');
    const body = document.body;

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeCheckbox.checked = true;
        } else {
            body.classList.remove('dark-mode');
            themeCheckbox.checked = false;
        }
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    themeCheckbox.addEventListener('change', () => {
        const theme = themeCheckbox.checked ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    });

    // Chat Application Logic
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    let conversationHistory = [];

    function formatResponse(text) {
        let formattedText = text;
        formattedText = formattedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/^---$/gim, '<hr>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        return formattedText;
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        addMessageToChatBox('user', userMessage);
        conversationHistory.push({ role: 'user', text: userMessage });

        userInput.value = '';
        const thinkingMessage = addMessageToChatBox('bot', 'Thinking...');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: conversationHistory }),
            });

            if (!response.ok) throw new Error('Failed to get response from server.');

            const data = await response.json();
            if (data && data.result) {
                thinkingMessage.innerHTML = formatResponse(data.result);
                conversationHistory.push({ role: 'model', text: data.result });
            } else {
                thinkingMessage.textContent = 'Sorry, no response received.';
            }
        } catch (error) {
            console.error('Error:', error);
            thinkingMessage.textContent = 'Failed to get response from server.';
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    });

    function addMessageToChatBox(role, text) {
        const messageRow = document.createElement('div');
        messageRow.classList.add('message-row', role);

        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        avatar.innerHTML = role === 'user' ? USER_SVG : BOT_SVG;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', role);
        messageElement.textContent = text;

        if (role === 'user') {
            messageRow.appendChild(messageElement);
            messageRow.appendChild(avatar);
        } else {
            messageRow.appendChild(avatar);
            messageRow.appendChild(messageElement);
        }

        chatBox.appendChild(messageRow);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }
});