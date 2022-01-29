// Pins on the board
let solenoidLeft = P7;
let solenoidRight = P4;
let xMotorEnable = P10;
let xMotorDirection = P9;
let xMotorStep = P8;

// Constants
let tapLength = 30;
let filename = "LAMA";
let mapLoadingDelay = 1037;

let speedup = 1;
let speedupMult = 1 / speedup;

let logsEnabled = false;

var dataStr = require("Storage").read(filename);

class HitObjectPress {
  constructor(start, length) {
    this.start = start;
    this.length = length;
  }
}

class HitObjectMove {
  constructor(start, x, y) {
    this.start = start;
    this.x = x;
    this.y = y;
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
var uniqueID = 0;

function resetValues() {
  delay = 0;
  startTime = Math.floor(Date.now());
  tappingLog = [];
  pressingLog = [];
  dataIndex = 0;
  uniqueID = 0;
  prevHitObject = new HitObjectPress(0, 0);
  currHitObject = new HitObjectPress(0, 0);
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
  console.log("map data:", dataStr);
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

  return new HitObjectPress(
    Number(readUntilComma()) * speedupMult + mapLoadingDelay,
    Number(readUntilComma()) * speedupMult
  );
}

function recursiveSetTimeout() {
  if (!isOn) {
    return;
  }

  if (timeouts.length > 200) { timeouts = []; }

  var relativeStart = currHitObject.start - prevHitObject.start;
  let prevLength = prevHitObject.length == 0 ? tapLength : prevHitObject.length;
  let absoluteStart = prevHitObject.start;
  let actualStart = Math.floor(Date.now()) - startTime;
  let error = actualStart - absoluteStart;
  relativeStart = currHitObject.start == 0 ? 0 : Math.max(prevLength, relativeStart - error);
  timeouts.push(
    setTimeout(() => {
      let length = currHitObject.length;
      if (length == 0) {
        tap();
      } else {
        press(length);
      }

      if (dataIndex >= dataStr.length) {
        if (logsEnabled) { finalizeLogs(); }
        console.log(process.memory());
        return;
      }

      prevHitObject = currHitObject;
      currHitObject = readNextHitObject();
      recursiveSetTimeout();
    }, relativeStart)
  );
}

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
  }, ms));
}

function sendSignal(value, id) {
  if (id % 2 == 0) {
    solenoidLeft.write(value);
  } else {
    solenoidRight.write(value);
  }
}

function startPlaying() {
  resetValues();
  recursiveSetTimeout();
}

function stopPlaying() {
  timeouts.forEach(t => clearTimeout(t));
  timeouts = [];
  solenoidLeft.write(false);
  solenoidRight.write(false);
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

let maxSteps = 1000;
let testData = [
	new HitObjectMove(0, 0, 0),
	new HitObjectMove(1315, -1, 0),
	new HitObjectMove(2584, 1, 0),
	new HitObjectMove(3854, 0, 0)
];

var currentHitObjIdx = 0;
var moveStartTime = 0;
var currentX = 0;
let stepsRatio = 256;

function recursiveMove() {
	if (currentHitObjIdx == 0) {
		moveStartTime = Math.floor(Date.now());
	}

	currentHitObjIdx++;
	if (currentHitObjIdx > testData.length - 1) {
		xMotorEnable.write(false);
		xMotorDirection.write(false);
		xMotorStep.write(false);
		return;
	}

	let delta = testData[currentHitObjIdx].x - currentX;
	let direction = delta < 0 ? true : false;
	let distance = Math.min(Math.sqrt(8), Math.abs(delta));
	let steps = distance * stepsRatio;
	let deltaTime = testData[currentHitObjIdx].start - testData[currentHitObjIdx - 1].start;
	xMotorDirection.write(direction);
	recursiveMotor(steps * 2);

	setTimeout(() => {
    currentX += delta;
		recursiveMove();
	}, Math.max(deltaTime, 0));
}

var xMotorState = false;
function recursiveMotor(steps) {
  if (steps == 0) {
    xMotorStep.write(false);
	  xMotorState = false;
    return;
  }

  let delayTime = 1;
  setTimeout(() => {
    xMotorState = !xMotorState;
    xMotorStep.write(xMotorState);
    recursiveMotor(steps - 1);
  }, delayTime);
}

function toggleXMotor(isOn) {
  xMotorEnable.write(isOn);

  if (!isOn) {
    currentHitObjIdx = 0;
    xMotorEnable.write(false);
    xMotorStep.write(false);
    xMotorDirection.write(false);
    return;
  }

  recursiveMove();
}

var myButton = require('@amperka/button')
  .connect(BTN1, {
    holdTime: 1.5
  });

myButton.on('click', function() {
  isOn = !isOn;
  LED1.write(isOn);
  toggleXMotor(isOn);
  //toggleSong(isOn);
});