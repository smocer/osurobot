let tapLength = 20;
let filename = "Inferno";
let solenoidError = 0;
let mapLoadingDelay = 1040;

let speedup = 1.5;
let speedupMult = 1 / speedup;

var dataStr = require("Storage").read(filename);

var hitObjStarts = [0];
var hitObjLengths = [0];

var dataIndex = 0;
function readNextHitObject() {
  function readUntilComma() {
    var temp = "";
    for (var i = dataIndex; i < dataStr.length; i++) {
      if (dataStr[i] == ",") {
        dataIndex = i + 1;
        return temp;
      }

      temp += dataStr[i];
    }
  }

  return [readUntilComma(), readUntilComma()];
}

function fillHitObjects() {
  let timings = dataStr.split(",");
  for (var i = 0; i < timings.length; i++) {
    if (i % 2 == 0) {
      hitObjStarts.push(Number(timings[i]) * speedupMult + mapLoadingDelay - solenoidError);
    } else {
      hitObjLengths.push(Number(timings[i]) * speedupMult);
    }
  }
  console.log(process.memory().free);
}

var isOn = false;
var timeouts = [];
var index = 1;
var delay = 0;
var startTime = Math.floor(Date.now());
var tappingLog = [];
var pressingLog = [];
var delayLog = [];
var pressingErrorLog = [];

function resetValues() {
  dataIndex = 0;
  index = 1;
  delay = 0;
  startTime = Math.floor(Date.now());
  tappingLog = [];
  pressingLog = [];
}

function finalizeLogs() {
  delayLog = [];
  pressingErrorLog = [];
  for (var i = 0; i < tappingLog.length; i++) {
    delayLog.push(tappingLog[i] - hitObjStarts[i]);
  }
  for (var j = 0; j < pressingLog.length; j++) {
    pressingErrorLog.push(pressingLog[j] - hitObjLengths[j]);
  }
  console.log("tappingLog:", tappingLog);
  console.log("delayLog:", delayLog);
  console.log("pressingLog:", pressingLog);
  console.log("pressingErrorLog:", pressingErrorLog);
}

function recursiveSetTimeout() {
  if (!isOn) {
    return;
  }

  if (index >= hitObjStarts.length) {
    finalizeLogs();
    return;
  }

  var relativeStart = hitObjStarts[index] - hitObjStarts[index - 1];
  var error = 0;
  if (index > 0) {
    let prevLength = hitObjLengths[index - 1] == 0 ? tapLength : hitObjLengths[index - 1];
    let absoluteStart = hitObjStarts[index - 1];
    let actualStart = Math.floor(Date.now()) - startTime;
    error = actualStart - absoluteStart;
  }
  relativeStart = Math.max(prevLength, relativeStart - error);
  timeouts.push(
    setTimeout(() => {
      let length = hitObjLengths[index];
      if (length == 0) {
        tap();
      } else {
        press(length);
      }
      index++;
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
  tappingLog.push(Math.floor(Date.now()) - startTime);
  let start = Math.floor(Date.now());
  let signalID = getSignalId();
  sendSignal(true, signalID);
  timeouts.push(setTimeout(() => {
    sendSignal(false, signalID);
    pressingLog.push(Math.floor(Date.now()) - start);
  }, tapLength));
}

function press(ms) {
  tappingLog.push(Math.floor(Date.now()) - startTime);
  let start = Math.floor(Date.now());
  let signalID = getSignalId();
  sendSignal(true, signalID);
  timeouts.push(setTimeout(() => {
    sendSignal(false, signalID);
    pressingLog.push(Math.floor(Date.now()) - start);
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
  finalizeLogs();
}

function toggleSong(isOn) {
  if (isOn) {
    startPlaying();
  } else {
    stopPlaying();
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

fillHitObjects();