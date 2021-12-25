let tapLength = 15;
let filename = "Harumachi_Clover";

var dataStr = require("Storage").read(filename);

var hitObjStarts = [0];
var hitObjLengths = [0];

function fillObjects() {
  let timings = dataStr.split(",");
  for (var i = 0; i < timings.length; i++) {
    if (i % 2 == 0) {
      hitObjStarts.push(Number(timings[i]));
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

function resetValues() {
  index = 1;
  delay = 0;
  startTime = Math.floor(Date.now());
  tappingLog = [];
}

function recursiveSetTimeout() {
  if (!isOn) {
    return;
  }

  if (index >= hitObjStarts.length) {
    console.log(tappingLog);
    return;
  }

  var relativeStart = hitObjStarts[index] - hitObjStarts[index - 1];
  /*if (relativeStart <= delay) {
    relativeStart = 0;
    delay = 0;
  }*/
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
  console.log(tappingLog);
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

fillObjects();