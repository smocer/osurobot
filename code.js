let tapLength = 50;
let hitObjBufSize = 100;
let filename = "Made_of_Fire";

require("Storage").list();

var dataStr = require("Storage").read(filename);
var hitObjStarts = [];
var hitObjLengths = [];
var temp = "";
var commaCount = 0;
var dataIndex = 0;
function fillBuffer() {
  while (hitObjStarts.length <= hitObjBufSize && dataIndex < dataStr.length) {
    let char = dataStr[dataIndex++];
    if (char == ",") {
      if (commaCount % 2 == 0) {
        hitObjStarts.push(Number(temp));
      } else {
        hitObjLengths.push(Number(temp));
      }
      temp = "";
      commaCount += 1;
      continue;
    }
    temp += char;
  }
}

function tap() {
  P4.write(true);
  timeouts.push(setTimeout(() => P4.write(false), tapLength));
}

function press(ms) {
  P4.write(true);
  timeouts.push(setTimeout(() => P4.write(false), ms));
}

var timeouts = [];

function startPlaying() {
  dataIndex = 0;
  let startTime = getTime();
  while (dataIndex < dataStr.length) {
    hitObjStarts = [];
    hitObjLengths = [];
    fillBuffer();
    let now = getTime();
    for (var i = 0; i < hitObjStarts.length; i++) {
        var start = hitObjStarts[i];
        var length = hitObjLengths[i];
        var timeout;
        if (length == 0) {
          timeout = setTimeout(tap, start - now + startTime);
          timeouts.push(timeout);
        } else {
          timeout = setTimeout(press, start - now + startTime, length);
          timeouts.push(timeout);
        }
    }
  }
  hitObjStarts = [];
  hitObjLengths = [];
  /*
    hitObjects.forEach(hitObject => {
      var start = hitObject.start;
      var length = hitObject.length;
      var timeout;
      if (length == 0) {
        timeout = setTimeout(tap, start);
        timeouts.push(timeout);
      } else {
        timeout = setTimeout(press, start, length);
        timeouts.push(timeout);
      }
    });
    */
}

function stopPlaying() {
  timeouts.forEach(t => clearTimeout(t));
  timeouts = [];
  hitObjStarts = [];
  hitObjLengths = [];
  console.log(process.memory().free);
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

var isOn = false;

myButton.on('click', function() {
  isOn = !isOn;
  LED1.write(isOn);
  toggleSong(isOn);
});