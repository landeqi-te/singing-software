// fork getUserMedia for multiple browser versions, for those
// that need prefixes

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

// set up forked web audio context, for multiple browsers
// window. is needed otherwise Safari explodes

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var voiceSelect = document.getElementById("voice");
var source;
var stream;
var myHeading = document.querySelector('h3');
var mySecondary = document.querySelector('h2');
var SongData;

// grab the mute button to use below

var mute = document.querySelector('.mute');

//set up the different audio nodes we will use for the app

var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var distortion = audioCtx.createWaveShaper();
var gainNode = audioCtx.createGain();
var biquadFilter = audioCtx.createBiquadFilter();
var convolver = audioCtx.createConvolver();

// distortion curve for the waveshaper, thanks to Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion


function makeDistortionCurve(amount) {
  var k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i ) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};

// grab audio track via XHR for convolver node

var soundSource, concertHallBuffer;

ajaxRequest = new XMLHttpRequest();

ajaxRequest.open('GET', 'https://mdn.github.io/voice-change-o-matic/audio/concert-crowd.ogg', true);

ajaxRequest.responseType = 'arraybuffer';


ajaxRequest.onload = function() {
  var audioData = ajaxRequest.response;

  audioCtx.decodeAudioData(audioData, function(buffer) {
      concertHallBuffer = buffer;
      soundSource = audioCtx.createBufferSource();
      soundSource.buffer = concertHallBuffer;
    }, function(e){"Error with decoding audio data" + e.err});

  //soundSource.connect(audioCtx.destination);
  //soundSource.loop = true;
  //soundSource.start();
}

ajaxRequest.send();

// set up canvas context for visualizer
var canvas = document.querySelector('.visualizer');
//var canvas2 = document.querySelector('.visualizer2');
var canvasCtx = canvas.getContext("2d");
//var canvasCtx2 = canvas2.getContext("2d");

var intendedWidth = document.querySelector('.wrapper').clientWidth;

canvas.setAttribute('width',intendedWidth);

var visualSelect = document.getElementById("visual");

var drawVisual;

//main block for doing the audio recording

if (navigator.getUserMedia) {
   console.log('getUserMedia supported.');
   navigator.getUserMedia (
      // constraints - only audio needed for this app
      {
         audio: true
      },

      // Success callback
      function(stream) {
         source = audioCtx.createMediaStreamSource(stream);
         source.connect(analyser);
         analyser.connect(distortion);
         distortion.connect(biquadFilter);
         biquadFilter.connect(convolver);
         convolver.connect(gainNode);
         gainNode.connect(audioCtx.destination);

      	 visualize();
         voiceChange();

      },

      // Error callback
      function(err) {
         console.log('The following gUM error occured: ' + err);
      }
   );
} else {
   console.log('getUserMedia not supported on your browser!');
}

function visualize() {
  WIDTH = canvas.width;
  HEIGHT = canvas.height;

  var visualSetting = visualSelect.value;
  console.log(visualSetting);

  if(visualSetting == "sinewave") {
    analyser.fftSize = 1024;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Float32Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
	//canvasCtx2.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {

      drawVisual = requestAnimationFrame(draw);

      analyser.getFloatTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

      canvasCtx.beginPath();
	  //canvasCtx2.fillStyle = 'rgb(200, 200, 200)';
      //canvasCtx2.fillRect(0, 0, WIDTH, HEIGHT);

      //canvasCtx2.lineWidth = 2;
      //canvasCtx2.strokeStyle = 'rgb(0, 0, 0)';

     // canvasCtx2.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
   
        var v = dataArray[i] * 200.0;
        var y = HEIGHT/2 + v;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
		 // canvasCtx2.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
		 // canvasCtx2.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
	 // canvasCtx2.lineTo(canvas.width, canvas.height/2);
     // canvasCtx2.stroke();
    };

    draw();

  } else if(visualSetting == "frequencybars") {
    analyser.fftSize = 256;
    var bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);
    var dataArray = new Float32Array(bufferLength);
	SongData = dataArray;
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);

      analyser.getFloatFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] + 140)*2;
        myHeading.textContent = dataArray;
        canvasCtx.fillStyle = 'rgb(' + Math.floor(barHeight+100) + ',50,50)';
        canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      }
    };

    draw();

  } else if(visualSetting == "off") {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.fillStyle = "red";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  }

}

function voiceChange() {
  distortion.curve = new Float32Array(analyser.fftSize);
  distortion.oversample = '4x';
  biquadFilter.gain.value = 0;
  convolver.buffer = undefined;

  var voiceSetting = voiceSelect.value;
  console.log(voiceSetting);

  if(voiceSetting == "distortion") {
    distortion.curve = makeDistortionCurve(400);
  } else if(voiceSetting == "convolver") {
    convolver.buffer = concertHallBuffer;
  } else if(voiceSetting == "biquad") {
    biquadFilter.type = "lowshelf";
    biquadFilter.frequency.value = 1000;
    biquadFilter.gain.value = 25;
  } else if(voiceSetting == "off") {
    console.log("Voice settings turned off");
  }

}

// event listeners to change visualize and voice settings

visualSelect.onchange = function() {
  window.cancelAnimationFrame(drawVisual);
  visualize();
}

voiceSelect.onchange = function() {
  voiceChange();
}

mute.onclick = voiceMute;

function voiceMute() {
  if(mute.id == "") {
    gainNode.gain.value = 0;
    mute.id = "activated";
    mute.innerHTML = "Unmute";
  } else {
    gainNode.gain.value = 1;
    mute.id = "";    
    mute.innerHTML = "Mute";
  }
}




var AudioContext = window.AudioContext || window.webkitAudioContext; //Cross browser variant.

	var canvas2, ctx;
	var audioContext;
	var file;
	var fileContent;
	var audioBufferSourceNode;
	var analyser2;
	
	var loadFile = function() {
		var fileReader = new FileReader();
		fileReader.onload = function(e) {
			fileContent = e.target.result;
			decodecFile();
		}
		fileReader.readAsArrayBuffer(file);
	}
	
	var decodecFile = function() {
		audioContext.decodeAudioData(fileContent, function(buffer) {
			start(buffer);
		});
	}
	
	var start = function(buffer) {
		if(audioBufferSourceNode) {
			audioBufferSourceNode.stop();
		}
	
		audioBufferSourceNode = audioContext.createBufferSource();
		audioBufferSourceNode.connect(analyser2);
		analyser2.connect(audioContext.destination);
		audioBufferSourceNode.buffer = buffer;
		audioBufferSourceNode.start(0);
		showTip(false);
		window.requestAnimationFrame(render); //先判断是否已经调用一次
	}
	
	var showTip = function(show) {
		var tip = document.getElementById('tip');
		if (show) {
			tip.className = "show";
		} else {
			tip.className = "";
		}
	}
	
	var render = function() {
		/*
		analyser.fftSize = 256;
   		var bufferLength = analyser2.frequencyBinCount;
    	console.log(bufferLength);
    	var dataArray = new Float32Array(bufferLength);
    	ctx.clearRect(0, 0, WIDTH, HEIGHT);

    	function draw() {
     	 drawVisual = requestAnimationFrame(draw);

      	 analyser2.getFloatFrequencyData(dataArray);

     	 ctx.fillStyle = 'rgb(0, 0, 0)';
     	 ctx.fillRect(0, 0, WIDTH, HEIGHT);

      	var barWidth = (WIDTH / bufferLength) * 2.5;
     	 var barHeight;
      	var x = 0;

      	for(var i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] + 140)*2;
        myHeading.textContent = dataArray;
        ctx.fillStyle = 'rgb(' + Math.floor(barHeight+100) + ',50,50)';
        ctx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      	}
    	};
	
    	draw();
	*/
	
	
		WIDTH2 = canvas.width;
  		HEIGHT2 = canvas.height;
		ctx = canvas2.getContext("2d");
		ctx.strokeStyle = "#00d0ff";
		ctx.lineWidth = 2;
		ctx.clearRect(0, 0, canvas2.width, canvas2.height);
		var bufferLength = analyser2.frequencyBinCount;
    	console.log(bufferLength);
		var dataArray = new Float32Array(analyser2.frequencyBinCount);
		analyser2.getFloatFrequencyData(dataArray);
		var step = Math.round(dataArray.length / 60);
	    mySecondary.textContent = dataArray;
		/*
		for (var i = 0; i < 40; i++) {
			var energy = (dataArray[step * i] / 256.0) * 50;
			for (var j = 0; j < energy; j++) {
				ctx.beginPath();
				ctx.moveTo(20 * i + 2, 200 + 4 * j);
				ctx.lineTo(20 * (i + 1) - 2, 200 + 4 * j);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(20 * i + 2, 200 - 4 * j);
				ctx.lineTo(20 * (i + 1) - 2, 200 - 4 * j);
				ctx.stroke();
			}
			ctx.beginPath();
			ctx.moveTo(20 * i + 2, 200);
			ctx.lineTo(20 * (i + 1) - 2, 200);
			ctx.stroke();
		}
	*/
	var barWidth = (WIDTH2 / bufferLength) * 2.5;
     	 var barHeight;
      	var x = 0;

      	for(var i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] + 140)*2;
        //myHeading.textContent = dataArray;
        ctx.fillStyle = 'rgb(' + Math.floor(barHeight+100) + ',50,50)';
		if(dataArray[i] != SongData[i])
			ctx.fillStyle = "blue";
        ctx.fillRect(x,HEIGHT2-barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      	}
		window.requestAnimationFrame(render);
	}
	
	window.onload = function() {
		audioContext = new AudioContext();
		analyser2 = audioContext.createAnalyser();
		analyser2.fftSize = 256;
	
		var fileChooser = document.getElementById('fileChooser');
		fileChooser.onchange = function() {
			if (fileChooser.files[0]) {
				file = fileChooser.files[0];
				showTip(true);
				loadFile();
			}
		}
	
		canvas2 = document.getElementById('visualizer2');
	}
