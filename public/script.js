document.addEventListener('DOMContentLoaded', () => {
    // SVGs for avatars
    const USER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`;
    const BOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM15.5 8C14.67 8 14 7.33 14 6.5S14.67 5 15.5 5 17 5.67 17 6.5 16.33 8 15.5 8zm-7 0C7.67 8 7 7.33 7 6.5S7.67 5 8.5 5 10 5.67 10 6.5 9.33 8 8.5 8z"></path></svg>`;

    // --- DOM Elements ---
    const chatWidget = document.getElementById('chat-widget');
    const chatToggleButton = document.getElementById('chat-toggle-button');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const fileInput = document.getElementById('file-input');
    
    // Preview Elements
    const filePreview = document.getElementById('file-preview');
    const previewName = document.getElementById('preview-name');
    const previewIcon = document.getElementById('preview-icon');
    const cancelFileBtn = document.getElementById('cancel-file');

    // Buttons
    const imageBtn = document.getElementById('image-btn');
    const documentBtn = document.getElementById('document-btn');
    const audioBtn = document.getElementById('audio-btn');

    // --- State Management ---
    let conversationHistory = [];
    let stagedFile = null;
    let stagedFileType = null;

    // --- Toggle Chat ---
    chatToggleButton.addEventListener('click', () => {
        chatWidget.classList.toggle('open');
        chatToggleButton.classList.toggle('open');
    });

    // --- File Selection Logic ---
    const setupFileSelection = (type, accept) => {
        stagedFileType = type;
        fileInput.accept = accept;
        fileInput.click();
    };

    imageBtn.addEventListener('click', () => setupFileSelection('image', 'image/*'));
    documentBtn.addEventListener('click', () => setupFileSelection('document', '.pdf,.doc,.docx,.txt'));
    audioBtn.addEventListener('click', () => setupFileSelection('audio', 'audio/*'));

    // Handle File Input Change (Tampilkan Preview, JANGAN Kirim Dulu)
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        stagedFile = file;
        
        // Update UI Preview
        previewName.textContent = file.name;
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');

        // Update Icon Preview
        if (stagedFileType === 'image') previewIcon.className = 'ph ph-image text-brand-500';
        else if (stagedFileType === 'document') previewIcon.className = 'ph ph-file-text text-brand-500';
        else if (stagedFileType === 'audio') previewIcon.className = 'ph ph-music-note text-brand-500';
    });

    // Batalkan File
    cancelFileBtn.addEventListener('click', () => {
        stagedFile = null;
        stagedFileType = null;
        fileInput.value = '';
        filePreview.classList.add('hidden');
        filePreview.classList.remove('flex');
    });

    // --- Submit Logic ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();

        // Jika tidak ada pesan dan tidak ada file, abaikan
        if (!message && !stagedFile) return;

        if (stagedFile) {
            // ALUR 1: Kirim File + Pesan
            await handleMediaUpload(message, stagedFile, stagedFileType);
        } else {
            // ALUR 2: Kirim Teks Biasa
            await handleTextMessage(message);
        }
    });

    // Fungsi Upload Media (Image/Doc/Audio)
    async function handleMediaUpload(message, file, type) {
        const prompt = message || getDefaultPrompt(type);
        
        // UI: Tampilkan pesan user di chat
        addMessageToChatBox('user', `📎 ${file.name}\n${message}`);
        
        // Reset state staged file
        const thinkingMessage = addMessageToChatBox('bot', 'Processing file...');
        resetStagedFile();

        try {
            const formData = new FormData();
            formData.append(type, file);
            formData.append('prompt', prompt);

            const response = await fetch(`/api/generate-from-${type}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Server error');

            const data = await response.json();
            thinkingMessage.innerHTML = formatResponse(data.result);
            conversationHistory.push({ role: 'model', text: data.result });
        } catch (error) {
            thinkingMessage.textContent = 'Gagal memproses file: ' + error.message;
        }
    }

    // Fungsi Chat Teks Biasa
    async function handleTextMessage(message) {
        addMessageToChatBox('user', message);
        conversationHistory.push({ role: 'user', text: message });
        userInput.value = '';

        const thinkingMessage = addMessageToChatBox('bot', 'Thinking...');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: conversationHistory }),
            });

            const data = await response.json();
            thinkingMessage.innerHTML = formatResponse(data.result);
            conversationHistory.push({ role: 'model', text: data.result });
        } catch (error) {
            thinkingMessage.textContent = 'Failed to get response from server.';
        }
    }

    // --- Helpers ---
    function resetStagedFile() {
        stagedFile = null;
        stagedFileType = null;
        fileInput.value = '';
        userInput.value = '';
        filePreview.classList.add('hidden');
        filePreview.classList.remove('flex');
    }

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

    function formatResponse(text) {
        let formattedText = text;
        formattedText = formattedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/^---$/gim, '<hr>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        return formattedText;
    }

    function getDefaultPrompt(type) {
        switch (type) {
            case 'image': return 'Describe this image in detail';
            case 'document': return 'Tolong buatkan ringkasan dari dokumen berikut';
            case 'audio': return 'Tolong buatkan transkrip dari audio berikut';
            default: return 'Analyze this file';
        }
    }
});