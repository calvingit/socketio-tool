const assert = require('assert');

function processMessage(obj) {
  if (obj.type === 'COMMAND') {
    return process(obj.msg);
  } else {
    let cache = obj.msg.cache; // 字符串
    if (cache && cache.length > 0) {
      const o = JSON.parse(cache);
      return 'ACK––––' + process(o);
    } else {
      return null;
    }
  }
  return null;
}

function process(msg) {
  const time = msg.updateTime + '    ';
  switch (msg.header) {
    case 'A2B2':
      return time + processA2B2(msg);
    case 'ADBD':
    case 'AC':
      return time + processADBD(msg);
    case 'AEBE':
      return time + processAEBE(msg);
    case 'A3B3':
      return time + processA3B3(msg);
    case 'SENSOR_DOOR_MAGNETIC':
    case 'SENSOR_WINDOW_MAGNETIC':
    case 'SENSOR_INFRARED':
      return time + processInfraredAndMagneticSensors(msg);
    case 'RGB_LIGHT':
      return time + processRGB(msg);
    default:
      if (msg.packetType === 'TYPE_MUSIC' && msg.subType === 'MUSIC_CONTROL') {
        return time + processMusic(msg);
      }
      return null;
  }
}

/// 将整数转成8位长度的16进制字符串
function to16HexString(i) {
  return ('0000000' + ((i | 0) + 4294967296).toString(16)).substr(-8);
}

function processAEBE(msg) {
  const status = msg.on ? '开' : '关';
  let mode = (function(m) {
    const modes = ['OFF', 'SWITCH_FAN', 'AIR_FAN', 'AUTO', 'STRONG', 'ECO'];
    const modesDesc = ['关', '换气', '排气', '智能', '强劲', '省电'];
    return modesDesc[modes.indexOf(m)];
  })(msg.mode);

  let speed = (function(s) {
    const speeds = ['OFF', 'LOW', 'MID', 'HIGH'];
    const speedsDesc = ['关', '低档', '中档', '高档'];
    return speedsDesc[speeds.indexOf(s)];
  })(msg.fanSpeed);

  return `新风(${msg.physicalAddr}): ${status}, 模式=${mode}, 风速=${speed}, 温度${msg.outerTemp}, 湿度${msg.outerHum}`;
}

function processMusic(msg) {
  switch (msg.controlSubType) {
    case 'SetMuteResponse':
    case 'NotifyMute':
      return `背景音乐(${msg.hostId}): ${msg.value === 'mute' ? '静音打开' : '静音关闭'}`;
    case 'SetVolumeResponse':
    case 'NotifyVolume':
      return `背景音乐(${msg.hostId}): 设置音量${msg.value}`;
    case 'SetDevStatResponse':
    case 'NotifyDevStat':
      return `背景音乐(${msg.hostId}): ${msg.value === 'open' ? '打开' : '关闭'}`;
    case 'NotifyPlayStat':
      return `背景音乐(${msg.hostId}): ${msg.value === 'mute' ? '播放' : '暂停'}`;
    default:
      return null;
  }
}

/// 处理灯光、场景
function processA2B2(msg) {
  const addr = to16HexString(msg.physicalAddr);
  if (msg.hasOwnProperty('brightness')) {
    return `调光(${addr}): 亮度${msg.brightness}, 回路${msg.outNo}`;
  } else {
    return `灯光/场景(${addr}): ${msg.on ? '开' : '关'}, 回路${msg.outNo}`;
  }
}

function processRGB(msg) {
  //{"type":"COMMAND","msg":{"masterCode":"mymaster001","updateTime":"2019-10-16 17:30:04","header":"RGB_LIGHT","physicalAddr":292213,"outNo":292213,"white":0,"red":255,"green":255,"blue":204}}
  const on = msg.white || (msg.red && msg.green && msg.blue);
  return `RGB调光: ${on ? '开' : '关'}, 白=${msg.white}, 红=${msg.red}, 绿=${msg.green}, 蓝=${
    msg.blue
  }`;
}

/// 处理温控器、地暖
function processADBD(msg) {
  const on = msg.on ? '开' : '关';
  const mode = msg.mode === 0 ? '制冷' : '制热';
  const speed = msg.funLowSpeed
    ? '低风'
    : msg.funMidSpeed
    ? '中风'
    : msg.funHighSpeed
    ? '高风'
    : '风速无';
  return `温控器/地暖(${to16HexString(msg.physicalAddr)})：${on}, ${mode}, ${speed}, 设置温度${
    msg.setTemp
  }, 室内温度${msg.roomTemp}`;
}

/// 处理传感器
function processA3B3(msg) {
  const status = msg.status === 'OK' ? '正常' : '报警';
  const value = msg.dectVal & '暂无数据';
  const addr = to16HexString(msg.physicalAddr);
  switch (msg.type) {
    case 'GAS':
      return `${msg.areaName}燃气传感器(${addr})：检测值${value}, ${status}`;
    case 'SMOKE':
      return `${msg.areaName}烟雾传感器(${addr})：检测值${value}, ${status}`;
    case 'TEMP':
      return `${msg.areaName}温度传感器(${addr})：检测值${value}, ${status}`;
    case 'HUMIDITY':
      return `${msg.areaName}湿度传感器(${addr})：检测值${value}, ${status}`;
    case 'SOS':
      return `${msg.areaName}SOS传感器(${addr})：检测值${value}, ${status}`;
    case 'CO2':
      return `${msg.areaName}CO2传感器(${addr})：检测值${value}, ${status}`;
    case 'SUN':
      return `${msg.areaName}光照传感器(${addr})：检测值${value}, ${status}`;
    case 'WATER':
      return `${msg.areaName}水浸传感器(${addr})：检测值${value}, ${status}, 电量${msg.voltage}`;
    case 'AQI':
      return `${msg.areaName}AQI传感器(${addr})：检测值${value}, ${status}`;
    case 'PM25':
      return `${msg.areaName}PM2.5传感器(${addr})：检测值${value}, ${status}`;
    case 'VOC':
      return `${msg.areaName}VOC传感器(${addr})：检测值${value}, ${status}`;
    default:
      return null;
  }
}

/// 红外传感器
function processInfraredAndMagneticSensors(msg) {
  const name =
    msg.header === 'SENSOR_DOOR_MAGNETIC'
      ? '门磁'
      : msg.header === 'SENSOR_WINDOW_MAGNETIC'
      ? '窗磁'
      : '红外';
  const addr = to16HexString(msg.physicalAddr);
  const defence = msg.defensed ? '布防' : '撤防';
  const value = msg.dectVal === '0' ? '无人' : msg.dectVal === '' ? '暂无数据' : '有人';
  const warn = msg.warnStatus === 'OK' ? '正常' : '报警';
  if (msg.header !== 'SENSOR_INFRARED') {
    const voltage = msg.voltage.length > 0 ? msg.voltage : '无数据';
    return `${name}传感器(${addr})：${value}, ${defence}, ${warn}, 电量${voltage}`;
  } else {
    return `${name}传感器(${addr})：${value}, ${defence}, ${warn}`;
  }
}

exports.processMessage = processMessage;
