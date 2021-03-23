// const io = require("socket.io-client");

const baseURL = document.getElementsByTagName('base')[0].href
const socket = io(baseURL);
class User {
    constructor(id, username, online = false) {
        this.id = id;
        this.username = username;
        this.online = online;
    }
}
class UserList {
    constructor(div_id) {
        this.div = document.getElementById(div_id);
        this._online = [];
        this._offline = [];
        this._map = new Map();
        this.refresh();
    }

    updateHTML() {
        console.log('updating user list html');
        console.log(this._online);
        console.log(this._offline);
        let newHTML = '<b><u>Online</u></b><ul>';
        for (let user of this._online) {
            newHTML += `<li><a href="${baseURL}user/${user.id}/">${user.username}</a></li>`
        }
        newHTML += '</ul><b><u>Offline</u></b><ul>'
        for (let user of this._offline) {
            newHTML += `<li><a href="${baseURL}user/${user.id}/">${user.username}</a></li>`
        }
        newHTML += '</ul>'
        this.div.innerHTML = newHTML;
    }

    refresh() {
        // if (!(users instanceof Array)) throw 'expected an array';
        console.log("refreshing user list");

        const endpoint = baseURL + "api/get/userlist";
        const request = new XMLHttpRequest;
        console.log(`requesting userlist from ${endpoint}`);
        request.open("GET", endpoint, false);
        request.send(null);

        this._map.clear();
        this._online.length = 0;
        this._offline.length = 0;

        for (let userdata of JSON.parse(request.responseText)) {
            let user = new User(userdata.id, userdata.username, userdata.online);
            console.log(`created ${user.username} ${user.id} online: ${user.online}`)
            this._map.set(user.id, user);
            if (user.online) {
                this._online.push(user);
            } else {
                this._offline.push(user);
            }
        }

        this._online.sort((a, b) => a.username > b.username);
        this._offline.sort((a, b) => a.username > b.username);
        console.log(this._map);
        this.updateHTML();
    }

    setUserOnlineStatus(user_id, status, update = true) {
        var user = this._map.get(user_id);
        let status_str = '';
        let user_status_str = '';

        if (status) status_str = 'online';
        else status_str = 'offline';

        if (user.online) user_status_str = 'online';
        else user_status_str = 'offline';

        if (user.online == status) {
            console.log(`${user.username} is already ${status_str}`);
            return;
        } else {
            console.log(`setting ${user.username} from ${user_status_str} to ${status_str}`);
        }

        if (status) {
            let index = this._offline.indexOf(user);
            console.log(`removing user at ${index} from offline list`);
            this._offline.splice(index, 1);

            index = this._online.findIndex((onlineUser) => {
                onlineUser.username > user.username;
            });
            console.log(`adding user at ${index} to online list`);

            if (index == -1) {
                this._online.push(user);
            } else if (!index) {
                this._online.unshift(user);
            } else {
                this._online.splice(index, 0, user);
            }

        } else {
            let index = this._online.indexOf(user);
            console.log(`removing user at ${index} from online list`);
            this._online.splice(index, 1);
            index = this._offline.findIndex((offlineUser) => {
                offlineUser.username > user.username;
            });
            console.log(`adding user at ${index} to offline list`);

            if (!index) {
                this._offline.unshift(user);
            } else if (index == -1) {
                this._offline.push(user);
            } else {
                this._offline.splice(index, 0, user);
            }
        }

        user.online = status;

        if (user.online) user_status_str = 'online';
        else user_status_str = 'offline';

        console.log(`${user.username} is now ${user_status_str}`);

        if (update) this.updateHTML();
    }

    get(user_id) { return this._map.get(user_id); }
}

const users = new UserList("user-list");
class ChatMessage {
    constructor(datetime, user_id, text) {
        this.datetime = datetime;
        this.user_id = user_id;
        this.text = text;
    }

    getHTML() {
        const username = users.get(this.user_id).username;
        return `<span class="timestamp">[${this.datetime}]</span> `
            + `<span class="username">${username}</span> `
            + `${this.text}<br>`;
    }
}

class Chat {
    constructor(div_id) {
        this.messages = [];
        this.div = document.getElementById(div_id);
        this.div.scrollTop = this.div.scrollHeight;
        this.moreHistory = false;
        setInterval((chat) => {
            if (this.moreHistory && chat.div.scrollTop == 0) {
                chat.getHistory();
            }
        }, 300, this)
    }

    getHistory() {
        const endpoint = baseURL + "api/get/chat/history";
        const request = new XMLHttpRequest;
        const data = JSON.stringify({ "before": Date.now() })
        console.log(`requesting chat history from ${endpoint}`);
        request.open("GET", endpoint, false);
        request.setRequestHeader("Content-Type", "application/json");
        request.send(data);

        if (request.status >= 400) {
            this.moreHistory = false;
        }

        for (let message of JSON.parse(request.responseText)) {
            this.push_front(ChatMessage(
                datetime = message.datetime,
                user_id = message.user_id,
                text = message.text
            ));
        }

        this.refresh();
    }

    push_front(message) {
        // This could be optimized by using
        // a doubly linked list instead of an array
        this.messages.unshift(message);
    }

    push_back(message) {
        const scrollSticky = (this.div.scrollHeight - (this.div.clientHeight + this.div.scrollTop) + 1) < 2;
        this.messages.push(message);
        this.div.innerHTML += message.getHTML();
        if (scrollSticky) this.div.scrollTop = this.div.scrollHeight;
    }

    serverMessage(message) {
        const scrollSticky = (this.div.scrollHeight - (this.div.clientHeight + this.div.scrollTop) + 1) < 2;
        this.div.innerHTML += `<span class="server-message">${message}</span><br>`;
        if (scrollSticky) this.div.scrollTop = this.div.scrollHeight;
    }

    refresh() {
        let newHTML = '';
        this.messages.forEach((message) => {
            newHTML += message.getHTML();
        });
        this.div.innerHTML = newHTML;
    }
}

const chatBox = new Chat('chat-box');

socket.on('connect', () => {
    console.log(`connection successful, socket id: ${socket.id}`);
    chatBox.scrollTop = chatBox.scrollHeight;
    console.log("requesting messages");
    socket.emit("get-messages", { "since": null });
});

socket.on('user-joined', (user_id) => {
    users.setUserOnlineStatus(user_id, true);
});

socket.on('user-left', (user_id) => {
    users.setUserOnlineStatus(user_id, false);
});

socket.on('disconnect', (reason) => {
    console.log('disconnected', reason);
});

socket.on('chat-message', (data) => {
    const message = new ChatMessage(data.datetime, data.user_id, data.text);
    chatBox.push_back(message);
});

socket.on('message', (message) => {
    chatBox.serverMessage(message);
});

socket.on("return-messages", (messages) => {
    console.log(`recieved ${messages.length} messages, appending to chatBox`);
    console.log(messages);
    for (let message of messages) {
        chatBox.push_back(new ChatMessage(message.datetime, message.user_id, message.text));
    }
});

const message = document.getElementById('chat-message')
message.addEventListener("keydown", (e) => {
    if (e.keyCode === 13 && message.value) { // enter button
        console.log(`sending message "${message.value}"`)
        socket.emit('chat-message', { "text": message.value });
        chatBox.scrollTop = chatBox.scrollHeight;
        message.value = ""

    }
});

function connectToChat() {
    console.log("getting user list...");
    users.refresh();
    console.log(`connecting to ${baseURL}`);
    socket.connect();
}
