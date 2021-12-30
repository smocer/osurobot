let tapLength = 40;
let filename = "Inferno";
let mapLoadingDelay = 1080;

let speedup = 1;
let speedupMult = 1 / speedup;

let logsEnabled = true;

var dataStr = require("Storage").read(filename);

class HitObject {
  constructor(start, length) {
    this.start = start;
    this.length = length;
  }
}

var isOn = false;
var dataIndex = 0;
var prevHitObject;
var currHitObject;
var timeouts = [];
var delay = 0;
var startTime = Math.floor(Date.now());
var tappingLog = [];
var pressingLog = [];
var delayLog = [];
var pressingErrorLog = [];

function resetValues() {
  delay = 0;
  startTime = Math.floor(Date.now());
  tappingLog = [];
  pressingLog = [];
  dataIndex = 0;
  prevHitObject = readNextHitObject();
  currHitObject = readNextHitObject();
}

function finalizeLogs() {
  /*
  delayLog = [];
  pressingErrorLog = [];
  for (var i = 0; i < tappingLog.length; i++) {
    delayLog.push(tappingLog[i] - hitObjStarts[i]);
  }
  for (var j = 0; j < pressingLog.length; j++) {
    pressingErrorLog.push(pressingLog[j] - hitObjLengths[j]);
  }
  */
  console.log("tappingLog:", tappingLog);
  // console.log("delayLog:", delayLog);
  console.log("pressingLog:", pressingLog);
  // console.log("pressingErrorLog:", pressingErrorLog);
}

function readNextHitObject() {
  function readUntilComma() {
    var temp = "";
    for (var i = dataIndex; i < dataStr.length; i++) {
      if (dataStr[i] == "," || i == dataStr.length - 1) {
        dataIndex = i + 1;
        return temp;
      }

      temp += dataStr[i];
    }
  }

  return new HitObject(
    Number(readUntilComma()) * speedupMult + mapLoadingDelay,
    Number(readUntilComma()) * speedupMult
  );
}

function recursiveSetTimeout() {
  if (!isOn) {
    return;
  }

  if (dataIndex >= dataStr.length) {
    if (logsEnabled) { finalizeLogs(); }
    console.log(process.memory());
    return;
  }

  if (timeouts.length > 200) { timeouts = []; }

  var relativeStart = currHitObject.start - prevHitObject.start;
  let prevLength = prevHitObject.length == 0 ? tapLength : prevHitObject.length;
  let absoluteStart = prevHitObject.start;
  let actualStart = Math.floor(Date.now()) - startTime;
  let error = actualStart - absoluteStart;
  relativeStart = Math.max(prevLength, relativeStart - error);
  timeouts.push(
    setTimeout(() => {
      let length = currHitObject.length;
      if (length == 0) {
        tap();
      } else {
        press(length);
      }
      prevHitObject = currHitObject;
      currHitObject = readNextHitObject();
      recursiveSetTimeout();
    }, relativeStart)
  );
}

var uniqueID = 0;
function getSignalId() {
  let id = uniqueID;
  uniqueID++;
  return id;
}

function tap() {
  if (logsEnabled) { tappingLog.push(Math.floor(Date.now()) - startTime); }

  let start = Math.floor(Date.now());
  let signalID = getSignalId();
  sendSignal(true, signalID);

  timeouts.push(setTimeout(() => {
    sendSignal(false, signalID);

    if (logsEnabled) { pressingLog.push(Math.floor(Date.now()) - start); }
  }, tapLength));
}

function press(ms) {
  if (logsEnabled) { tappingLog.push(Math.floor(Date.now()) - startTime); }

  let start = Math.floor(Date.now());
  let signalID = getSignalId();
  sendSignal(true, signalID);

  timeouts.push(setTimeout(() => {
    sendSignal(false, signalID);

    if (logsEnabled) { pressingLog.push(Math.floor(Date.now()) - start); }
  }, ms - 10));
}

function sendSignal(value, id) {
  if (id % 2 == 0) {
    P4.write(value);
  } else {
    P7.write(value);
  }
}

function startPlaying() {
  resetValues();
  tap();
  recursiveSetTimeout();
}

function stopPlaying() {
  timeouts.forEach(t => clearTimeout(t));
  timeouts = [];
  P4.write(false);
  P7.write(false);
  if (logsEnabled) { finalizeLogs(); }
}

function toggleSong(isOn) {
  if (isOn) {
    console.log(process.memory());
    startPlaying();
  } else {
    stopPlaying();
    console.log(process.memory());
  }
}

var myButton = require('@amperka/button')
  .connect(BTN1, {
    holdTime: 1.5
  });

myButton.on('click', function() {
  isOn = !isOn;
  LED1.write(isOn);
  toggleSong(isOn);
});