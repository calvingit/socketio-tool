const storage = require('electron-json-storage');
const tmpDir = require('os').tmpdir();

storage.setDataPath(tmpDir);

function get(key) {
  return new Promise((resolve, reject) => {
    storage.get(key, function (error, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

function set(key, obj) {
  return new Promise((resolve, reject) => {
    storage.set(key, obj, function (error, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

async function getUserInfo() {
  const data = await get('user');
  return data;
}

async function setUserInfo(username, password) {
  const data = await set('user', { username, password });
  return data;
}

module.exports = { getUserInfo, setUserInfo };
