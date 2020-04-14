const storage = require('./storage');
storage.getUserInfo().then((user) => {
  if (user.username !== undefined) {
    document.getElementById('username').value = user.username;
  }
  if (user.password !== undefined) {
    document.getElementById('password').value = user.password;
  }
});

var userId = '';
const TestHttpURL = 'http://test.jobosz.com:9090';
const ProductHttpURL = 'http://smarthome.jobosz.com';

const TestSocketIOURL = 'http://test.jobosz.com:9092';
const ProductSocketIOURL = 'http://smarthome.jobosz.com:9092';

/****************** dom 事件开始 *******************/
// 是否测试环境
function isTestEnv() {
  /// 选中的单选框
  return document.getElementById('test').checked;
}

// 生成uuid
function uuid() {
  var d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (username.length == 0) {
    alert('请输入用户名');
    return;
  }

  if (password.length == 0) {
    alert('请输入密码');
    return;
  }

  const httpServerURL = isTestEnv() ? TestHttpURL : ProductHttpURL;
  document.getElementById('masters-select').innerHTML = '';
  loginRequest(httpServerURL, username, password);
}

function stopConnecting() {
  masterSocket.close();
  userSocket.close();
}
function startConnecting() {
  if (userId.length == 0) {
    alert('请先登录账号');
    return;
  }

  function isBigEnough(element, index, array) {
    return element >= 10;
  }
  var filtered = [12, 5, 8, 130, 44].filter(isBigEnough);
  console.log(filtered);

  var masterCode = '';
  const options = document.getElementsByTagName('option');
  for (let index = 0; index < options.length; index++) {
    const element = options[index];
    if (element.selected) {
      masterCode = element.value.split('(')[0];
    }
  }

  connect(
    isTestEnv() ? TestSocketIOURL : ProductSocketIOURL,
    userId,
    masterCode.length ? masterCode : userId
  );
}

async function request(url, parameters) {
  const date = new Date();
  const timestamp = Math.floor(date.getTime() / 1000);

  const nonce = uuid();

  sha1 = require('./sha1.js');
  const sign = sha1(timestamp + nonce + 'szjobo');

  var params = {
    bid: 'SmartHome',
    platform: 'IOS',
    version: '1.0',
    ts: String(timestamp),
    nonce: nonce,
    sign: sign,
    deviceid: 'B6C4D30E4BC646C196EB95E026229BCC',
    ...parameters,
  };
  console.log(url);
  console.log(params);
  try {
    return await fetch(url, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
  } catch (error) {
    return nil;
  }
}

/// 登录请求
function loginRequest(url, username, password) {
  const loginURL = url + '/jobo-agw/user/login';
  request(loginURL, { account: username, password: password })
    .then((res) => res.json())
    .catch((error) => console.error('Error:', error))
    .then((response) => {
      if (response.code == 0) {
        /// userId存起来
        userId = response.data.userId;
        storage.setUserInfo(username, password).then();
        getMastersList(userId);
      } else {
        alert(response.msg);
      }
    });
}

/// 获取主机列表
function getMastersList(userId) {
  const url = (isTestEnv() ? TestHttpURL : ProductHttpURL) + '/jobo-agw/my/master/queryMasterList';
  console.log('获取主机列表: ' + url);
  request(url, { userId: userId })
    .then((res) => res.json())
    //.catch(error => console.error('Error:', error))
    .then((response) => {
      if (response.code == 0) {
        updateMastersList(response.data);
      } else {
        alert(response.msg);
      }
    });
}

/// 更新主机列表
function updateMastersList(masters) {
  console.table(masters);
  const options = masters
    .map((obj) => {
      return `<option ${obj['isDefault'] ? 'selected' : ''}>${obj['masterCode']}(${
        obj['masterAlias']
      })</option>`;
    })
    .join('');
  console.log(options);
  document.getElementById('masters-select').innerHTML = options;
}
/****************** dom 事件结束 ********************/

var userSocket;
var masterSocket;

// 连接服务器
function connect(url, userId, masterCode) {
  clearMessage();
  if (userSocket) {
    userSocket.close();
  }
  if (masterSocket) {
    masterSocket.close();
  }

  if (userId) {
    userSocket = createSocket(url, userId, userId);
  }

  if (masterCode) {
    masterSocket = createSocket(url, userId, masterCode);
  }
}

/// 创建socket.io
function createSocket(url, clientId, roomId) {
  const serverURL = url + '?clientId=' + clientId + '&roomId=' + roomId + '&src=iOS';
  console.log('serverURL:' + serverURL);
  var io = require('socket.io-client');
  socket = io.connect(serverURL);

  const { processMessage } = require('./process_message');
  socket.on('push_msg', function (data) {
    console.log(data);
    const obj = JSON.parse(data);
    if (obj.hasOwnProperty('code')) {
      appendMsg(data);
      output.value += `${data}\n`;
    } else {
      const msg = processMessage(obj);
      if (!msg || !isWantedMessage(msg)) return;
      appendMsg(msg);
    }
  });
  socket.on('connect', () => {
    appendMsg('连接服务器成功');
  });
  socket.on('disconnect', () => {
    appendMsg('断开连接服务器');
  });
  return socket;
}

function appendMsg(msg) {
  let output = document.getElementById('output');
  output.value = `${msg}\n${output.value}`;
  //output.scrollTop = output.scrollHeight;
}

// 清空
function clearMessage(argument) {
  // body...
  let output = document.getElementById('output');
  output.value = '';
}

function selectAll() {
  const boxes = document.querySelectorAll('input[type=checkbox]');
  for (let i = 0; i < boxes.length; i++) {
    const input = boxes[i];
    if (!input.checked) {
      input.checked = true;
    }
  }
}

function inverseSelect() {
  const boxes = document.querySelectorAll('input[type=checkbox]');
  for (let i = 0; i < boxes.length; i++) {
    const input = boxes[i];
    input.checked = !input.checked;
  }
}

/// 获取指定的消息类型
function getCheckedMessageTypes() {
  const checkboxes = document.querySelectorAll('input[type=checkbox]');
  return Array.prototype.map
    .call(checkboxes, (box) => ({ checked: box.checked, value: box.value }))
    .filter((i) => i.checked)
    .map((i) => i.value);
}

/// 判断消息是否符合条件
function isWantedMessage(str) {
  const types = getCheckedMessageTypes();
  if (types.length == 0) {
    return false;
  }
  // 自定义过滤字符串
  const input = document.getElementById('filterString');
  if (input.value && !str.includes(input.value)) {
    return false;
  }
  return types.some((e) => str.includes(e));
}
