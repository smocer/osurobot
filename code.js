let tapLength = 20;
let filename = "Inferno";

var dataStr = require("Storage").read(filename);

var hitObjStarts = [];
var hitObjLengths = [];

function fillObjects() {
  let timings = dataStr.split(",");
  for (var i = 0; i < timings.count; i++) {
    if (i % 2 == 0) {
      hitObjStarts.push(Number(timings[i]));
    } else {
      hitObjLengths.push(Number(timings[i]));
    }
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
  for (var i = 0; i < hitObjStarts.length; i++) {
      var start = hitObjStarts[i];
      var length = hitObjLengths[i];
      var timeout;
      if (length == 0) {
        timeout = setTimeout(tap, start);
        timeouts.push(timeout);
      } else {
        timeout = setTimeout(press, start, length);
        timeouts.push(timeout);
      }
  }
}

function stopPlaying() {
  timeouts.forEach(t => clearTimeout(t));
  timeouts = [];
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

fillObjects();