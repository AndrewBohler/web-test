// const io = require("socket.io-client");

const socket = io('http://localhost:5000/');
const chatBox = document.getElementById('chat-box');
socket.on('connect', () => {
    console.log(`connected to ${socket.id}`);
});

socket.on('disconnect', (reason) => {
    console.log('disconnected', reason);
});

socket.on('chat-message', (data) => {
    chatBox.innerHTML += `[${data.time}] ${data.username} ${data.text}<br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
})

socket.on('message', (message) => {
    chatBox.innerHTML += `<span class="server-message">${message}</span><br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
})

const message = document.getElementById('chat-message')
message.addEventListener("keydown", (e) => {
    if (e.keyCode === 13 && message.value) { // enter button
        console.log(`sending message "${message.value}"`)
        socket.emit('chat-message', { "text": message.value });
        message.value = ""

    }
});

console.log('connecting...');
socket.connect();
