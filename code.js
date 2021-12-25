let tapLength = 30;
let mapLoadingDelay = 43;
let filename = "Harumachi_Clover";

var dataStr = require("Storage").read(filename);

var hitObjStarts = [0];
var hitObjLengths = [0];

function fillHitObjects() {
  let timings = dataStr.split(",");
  for (var i = 0; i < timings.length; i++) {
    if (i % 2 == 0) {
      hitObjStarts.push(Number(timings[i]) + mapLoadingDelay);
    } else {
      hitObjLengths.push(Number(timings[i]));
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

function resetValues() {
  index = 1;
  delay = 0;
  startTime = Math.floor(Date.now());
  tappingLog = [];
}

function finalizeLogs() {
  delayLog = [];
  for (var i = 0; i < tappingLog.length; i++) {
    delayLog.push(tappingLog[i] - hitObjStarts[i]);
  }
  console.log(tappingLog);
  console.log(delayLog);
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

function tap() {
  tappingLog.push(Math.floor(Date.now()) - startTime);
  P4.write(true);
  timeouts.push(setTimeout(() => P4.write(false), tapLength));
}

function press(ms) {
  tappingLog.push(Math.floor(Date.now()) - startTime);
  P4.write(true);
  timeouts.push(setTimeout(() => P4.write(false), ms));
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