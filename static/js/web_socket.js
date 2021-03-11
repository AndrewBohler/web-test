// const io = require("socket.io-client");

const baseURL = document.getElementsByTagName('base').href
const socket = io(baseURL);
const chatBox = document.getElementById('chat-box');

socket.on('connect', () => {
    console.log(`connection successful, socket id: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
    console.log('disconnected', reason);
});

socket.on('chat-message', (data) => {
    const scrollSticky = (chatBox.scrollHeight - (chatBox.clientHeight + chatBox.scrollTop) + 1) < 2;
    console.log(`stick to bottom = ${scrollSticky}`);
    chatBox.innerHTML += `<span class="timestamp">[${data.time}]</span> <span class="username">${data.username}</span> ${data.text}<br>`;
    if (scrollSticky) chatBox.scrollTop = chatBox.scrollHeight;
})

socket.on('message', (message) => {
    const scrollDown = (chatBox.scrollTop == chatBox.scrollHeight);
    chatBox.innerHTML += `<span class="server-message">${message}</span><br>`;
    if (scrollDown) chatBox.scrollTop = chatBox.scrollHeight;
})

const message = document.getElementById('chat-message')
message.addEventListener("keydown", (e) => {
    if (e.keyCode === 13 && message.value) { // enter button
        console.log(`sending message "${message.value}"`)
        socket.emit('chat-message', { "text": message.value });
        chatBox.scrollTop = chatBox.scrollHeight;
        message.value = ""

    }
});

console.log(`connecting to ${baseURL}`);
socket.connect();
chatBox.scrollTop = chatBox.scrollHeight;
