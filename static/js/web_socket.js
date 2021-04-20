// const io = require("socket.io-client");

const baseURL = document.getElementsByTagName('base')[0].href
const socket = io(baseURL);

class User {
    constructor(id, username, online = false, datetime = new Date()) {
        this.id = id;
        this.username = username;
        this.online = online;
        this.datetime = datetime;
        this.cardHTML = undefined;
    }

    getCardHTML() {
        if (this.cardHTML) {
            return this.cardHTML;
        } else {
            const endpoint = `$(baseURL)/user/${this.id}/card`;
            this.cardHTML = fetch(endpoint, { method: 'GET' }).then(response => response.text());
            return this.cardHTML;
        }
    }

    // load this user's stats onto the user-card element and display
    displayUserCard() {
        makeUserCardDraggable();
        const userCard = document.getElementById("user-card");
        const userCardAvatar = document.getElementById("user-card-avatar");
        const userCardTable = document.getElementById("user-card-table");
        userCardAvatar.src = `/static/avatars/user_${this.id}_avatar.jpg`;
        let newTable = document.createElement("table");
        newTable.id = userCardTable.id;
        newTable.className = userCardTable.className;

        fetch(`${baseURL}api/get/user/${this.id}/stats`)
            .then((response) => response.json())
            .then((userStats) => {
                for (const [label, value] of Object.entries(userStats)) {
                    let tableRow = document.createElement("tr");
                    let td1 = document.createElement("td");
                    let td2 = document.createElement("td");
                    let text1 = document.createTextNode(label);
                    let text2 = document.createTextNode(value);
                    td1.appendChild(text1);
                    td2.appendChild(text2);
                    tableRow.appendChild(td1);
                    tableRow.appendChild(td2);
                    newTable.appendChild(tableRow);
                }
            })

        userCard.replaceChild(newTable, userCardTable);
        if (userCard.style.display !== "block") {
            console.log("user-card is not displayed, resetting position");
            userCard.style.top = document.getElementById("sidebar").style.left;
            userCard.style.left = document.getElementById("navbar").style.bottom;
            userCard.style.display = "block";
        }
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
        console.log(`users online: ${this._online.length}, users offline: ${this._offline.length}`);
        let newHTML = '<b><u>Online</u></b>';
        for (let user of this._online) {
            // newHTML += `<li><a href="${baseURL}user/${user.id}/">${user.username}</a></li>`
            newHTML += `<div id="user-list-item-${user.id}" class="user-list-item">${user.username}</div>`
        }
        newHTML += '</ul><b><u>Offline</u></b>'
        for (let user of this._offline) {
            // newHTML += `<li><a href="${baseURL}user/${user.id}/">${user.username}</a></li>`
            newHTML += `<div id="user-list-item-${user.id}" class="user-list-item">${user.username}</div>`
        }

        this.div.innerHTML = newHTML;

        for (let user of this._map.values()) {
            let element = document.getElementById(`user-list-item-${user.id}`);
            element.onclick = user.displayUserCard.bind(user);
        }
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
        if (!(datetime instanceof Date)) {
            throw TypeError("datetime needs to be a Date object");
        }
        this.datetime = datetime;
        this.user_id = user_id;
        this.text = text;
    }

    getHTML() {
        const username = users.get(this.user_id).username;
        return `<span class="timestamp">[${this.datetime.toLocaleTimeString("en-US")}]</span> `
            + `<span class="username">${username}</span> `
            + `${this.text}<br>`;
    }
}

class Chat {
    constructor(div_id) {
        this.messages = [];
        this.div = document.getElementById(div_id);
        this.div.scrollTop = this.div.scrollHeight;
        this.historyChecker = undefined;
    }

    startHistoryChecker() {
        if (this.historyChecker) {
            console.log('historyChecker is already active!');
        } else {
            this.historyChecker = setInterval((chat) => {
                if (chat.div.scrollTop <= 1) {
                    console.log('historyChecker triggered');
                    chat.getHistory();
                }
            }, 300, this);
            console.log('historyChecker started!');
        }
    }

    getHistory() {
        const endpoint = baseURL + "api/get/chat/history";
        // const request = new XMLHttpRequest;
        const data = JSON.stringify({ "before": this.messages[0].datetime.getTime() })

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: data,
        })
            .then(response => response.json())
            .then(messages => {
                if (messages.length == 0) {
                    console.log('getHistory reveived no messages, clearing historyChecker...');
                    clearInterval(this.historyChecker);
                } else {
                    for (let msg of messages) {
                        let message = new ChatMessage(
                            new Date(msg.datetime),
                            msg.user_id,
                            msg.text,
                        )
                        this.push_front(message);
                    }
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        this.updateHTML();
    }

    push_front(message) {
        // This could be optimized by using
        // a doubly linked list instead of an array
        this.messages.unshift(message);
    }

    append(message) {
        const scrollSticky = (this.div.scrollHeight - (this.div.clientHeight + this.div.scrollTop) + 1) < 2;
        let index = this.messages.length - 1;
        if (this.messages.length == 0 || this.messages[index].datetime < message.datetime) {
            this.messages.push(message);
            this.div.innerHTML += message.getHTML();
        } else {
            while (index > 0) {
                if (this.messages[index - 1].datetime < message.datetime) {
                    this.messages.splice(index, 0, message);
                    break;
                }
                index--;
            }
            this.updateHTML();
        }
        if (scrollSticky) this.div.scrollTop = this.div.scrollHeight;
    }

    serverMessage(message) {
        const scrollSticky = (this.div.scrollHeight - (this.div.clientHeight + this.div.scrollTop) + 1) < 2;
        this.div.innerHTML += `<span class="server-message">${message}</span><br>`;
        if (scrollSticky) this.div.scrollTop = this.div.scrollHeight;
    }

    updateHTML() {
        const currentHeight = this.div.scrollHeight;
        const currentTopHeight = this.div.scrollTop;
        let newHTML = '';
        this.messages.forEach((message) => {
            newHTML += message.getHTML();
        });
        this.div.innerHTML = newHTML;
        const newHeightOffset = this.div.scrollHeight - currentHeight;
        this.div.scrollTop = currentTopHeight + newHeightOffset;
    }
}

const chatBox = new Chat('chat-box');

function makeUserCardDraggable() {
    const userCard = document.getElementById("user-card");
    userCard.prevMousePos = { x: 0, y: 0 };

    userCard.onmousedown = (event) => {
        userCard.prevMousePos.x = event.offsetX;
        userCard.prevMousePos.y = event.offsetY;

        function onMouseMove(event) {
            const userCard = document.getElementById('user-card');
            const x = event.pageX - userCard.offsetWidth / 2;
            const y = event.pageY - userCard.offsetHeight / 2;

            userCard.style.left = `${x}px`;
            userCard.style.top = `${y}px`;
        }

        // (2) move the ball on mousemove
        console.log("adding event listener onMouseMove");
        document.addEventListener('mousemove', onMouseMove);

        // (3) drop the ball, remove unneeded handlers
        userCard.onmouseup = function () {
            console.log("removing event listener onMouseMove");
            document.removeEventListener('mousemove', onMouseMove);
            userCard.onmouseup = null;
        };

    }
}


socket.on('connect', () => {
    console.log(`connection successful, socket id: ${socket.id}`);
    chatBox.scrollTop = chatBox.scrollHeight;
    console.log("requesting messages");
    socket.emit("get-messages", { "since": null });
});

socket.on('user-joined', (data) => {
    const datetime = new Date(data.timestamp);
    let user = users.get(data.user_id);
    console.log(`user ${data.user_id} has joined`)
    console.log(`${datetime.toTimeString()}`);
    console.log(`${user.datetime.toTimeString()}`);
    console.log(`username is ${user.username}`);
    if (user.datetime < datetime) {
        console.log(`updateing user ${user.id} state`);
        users.setUserOnlineStatus(data.user_id, true);
        user.datetime = datetime;
    }
});

socket.on('user-left', (data) => {
    console.log(`user ${data.user_id} has left`);
    let user = users.get(data.user_id);
    const datetime = new Date(data.timestamp);
    if (user.datetime < datetime) {
        users.setUserOnlineStatus(user_id, false);
        user.datetime = datetime;
    }
});

socket.on('disconnect', (reason) => {
    console.log('disconnected', reason);
});

socket.on('chat-message', (data) => {
    const message = new ChatMessage(new Date(data.datetime), data.user_id, data.text);
    chatBox.append(message);
});

socket.on('message', (message) => {
    chatBox.serverMessage(message);
});

socket.on("return-messages", (messages) => {
    console.log(`recieved ${messages.length} messages, appending to chatBox`);
    console.log(messages);
    for (let message of messages) {
        chatBox.append(new ChatMessage(new Date(message.datetime), message.user_id, message.text));
    }
    if (chatBox.historyChecker == undefined) chatBox.startHistoryChecker();
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
