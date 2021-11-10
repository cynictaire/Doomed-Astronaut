// An IIFE ("Iffy") - see the notes in mycourses
(function()
 {
    "use strict";
		
    let NUM_SAMPLES = 256;
    let SOUND_1 = 'media/Lullaby.mp3';
    let SOUND_2 = 'media/ramune.mp3';
    let SOUND_3 = 'media/Patchwork Staccato.mp3';
    let SOUND_4 = 'media/Here Comes A Thought.mp3';
    let audioElement;
    let analyserNode;
    
    let canvas,ctx;
    
    // circle variables
    let maxRadius = 65; // max radius of the circle slider
    let invert = false, direction = false, heart = false, stars = false;
    let speed = 0;
    
    // star variables
    let starsA = []; // an array of stars
    let starColors = ["#ffffff", "#ffe9c4", "#d4fbff"];
    let x, y, brightness, radius; // stars' properties
    
    // color inputs
    let innerColor = "#c8c800";
	let outerColor = "#ff4500";
    
    // image
    let img = new Image();
    img.src = "media/astro.png";
    
    // heart beat variables
    let heartBeats = []; // line array
    let heartBeatCounter = 0;
    
    // bass variables
    let bassFilter, bassBoost = 0;
    
    function init()
    {
        // set up canvas stuff
        canvas = document.querySelector('canvas');
        ctx = canvas.getContext("2d");
			
        // get reference to <audio> element on page
        audioElement = document.querySelector('audio');
			
        // call our helper function and get an analyser node
        analyserNode = createWebAudioContextWithAnalyserNode(audioElement);
            
        // get sound track <select> and Full Screen button working
        setupUI();
			
        // load and play default sound into audio element
        playStream(audioElement, SOUND_1);
        
        // initialize array of stars
        for (let s = 0; s < 150; s++)
        {
            starsA.push({
                x : Math.random() * canvas.offsetWidth, // random x position
                y : Math.random() * canvas.offsetHeight, // random y position
                radius : Math.random() * 1.5, // random radius
                brightness : random(50, 100) / 100 
            });  
        }
        
        // initialize line array
        for (let l = 0; l < 500; l++)
        {
            heartBeats.push(0);
        }
        
        // hook up the slider
        document.querySelector("#cSlider").onchange = e =>
        {
            maxRadius = e.target.value;
        }
			
        // hook up filters
        // check for the filters
        document.querySelector("#invertC").checked = invert;
        document.querySelector("#directionC").checked = direction;
        document.querySelector("#heartBeatC").checked = heart;
			
        document.querySelector('#invertC').onchange = e => invert = e.target.checked;
        document.querySelector('#directionC').onchange = e => direction = e.target.checked;
        document.querySelector('#heartBeatC').onchange = e => heart = e.target.checked;
        
        // color inputs
        document.querySelector("#innerColor").onchange = e => innerColor = e.target.value;
        document.querySelector("#outerColor").onchange = e => outerColor = e.target.value;
        
        // bass boost
        document.querySelector("#bassFilter").onchange = e =>
        {
            bassBoost = e.target.value;
            bassFilter.gain.value = bassBoost;
            console.log(bassBoost);
        }
            
        // start animation loop
        update();
    }
		
		
    function createWebAudioContextWithAnalyserNode(audioElement) 
    {
        let audioCtx, analyserNode, sourceNode;
        // create new AudioContext
        // The || is because WebAudio has not been standardized across browsers yet
        // http://webaudio.github.io/web-audio-api/#the-audiocontext-interface
        audioCtx = new (window.AudioContext || window.webkitAudioContext);
			
        // create an analyser node
        analyserNode = audioCtx.createAnalyser();
			
        /*
        We will request NUM_SAMPLES number of samples or "bins" spaced equally 
        across the sound spectrum.
			
        If NUM_SAMPLES (fftSize) is 256, then the first bin is 0 Hz, the second is 172 Hz, 
        the third is 344Hz. Each bin contains a number between 0-255 representing 
        the amplitude of that frequency.
        */ 
			
        // fft stands for Fast Fourier Transform
        analyserNode.fftSize = NUM_SAMPLES;
			
        // this is where we hook up the <audio> element to the analyserNode
        sourceNode = audioCtx.createMediaElementSource(audioElement); 
        sourceNode.connect(analyserNode);
        
        // bass boost
        bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = "lowshelf"; 
        bassFilter.frequency.value = 200;  
        bassFilter.gain.value = bassBoost; 
        
        // connect bass to analyser
        sourceNode.connect(bassFilter); 
        bassFilter.connect(analyserNode);
        
        // here we connect to the destination i.e. speakers
        analyserNode.connect(audioCtx.destination);
        return analyserNode;
    }
		
    function setupUI()
    {
        document.querySelector("#trackSelect").onchange = function(e){
            playStream(audioElement, e.target.value);
        };
			
        document.querySelector("#fsButton").onclick = function(){
            requestFullscreen(canvas);
        };
    }
		
    function playStream(audioElement, path)
    {
        audioElement.src = path;
        audioElement.play();
        audioElement.volume = 0.2;
    }
		
    function update() 
    {
            
        // this schedules a call to the update() method in 1/60 seconds
        requestAnimationFrame(update);
			
        /*
        Nyquist Theorem
        http://whatis.techtarget.com/definition/Nyquist-Theorem
        The array of data we get back is 1/2 the size of the sample rate 
        */
			
        // create a new array of 8-bit integers (0-255)
        let data = new Uint8Array(NUM_SAMPLES/2);
        let wData = new Uint8Array(NUM_SAMPLES/2);
			
        // populate the array with the frequency data
        // notice these arrays can be passed "by reference" 
        analyserNode.getByteFrequencyData(data);
		
        // OR
        analyserNode.getByteTimeDomainData(wData); // waveform data

        // draw the sun
        drawSun(data);
        
        // draw the doomed astronaut :(
        drawAstronaut(wData);
        
        // draw the stars
        starField(starsA);
        
        // draw heart beat monitor
        if(heart)
        {
            heartBeat(data);       
        }
        
        // visual manipulations
        manipulatePixels();
    }
    
    function heartBeat(data)
    {
        let count = 0;
        
        // average the  data
        for(let d = 0; d < data.length; d++)
        {
            count += data[d];
        }
        
        count /= data.length;
        
        // if average is high, start beat
        if(heartBeatCounter <= 0)
        {
            if(count > 50)
            {
                heartBeatCounter = count;
            }
        }
        
        // insert values for beat
        heartBeats.splice(50, 0, heartBeatCounter > 0 ? (data[parseInt(heartBeatCounter)] - count) / -3 : 0);
        heartBeats.pop();
        
        // draw heart beats
        for(let h = 0; h < heartBeats.length; h++)
        {
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = makeColor(255, 51, 119, 1);
            ctx.moveTo((canvas.width / heartBeats.length) * h, canvas.height * 0.90 + heartBeats[h]);
            ctx.lineTo((canvas.width / heartBeats.length) * (h + 1), canvas.height * 0.90 + heartBeats[h + 1]);
            ctx.stroke();
            ctx.restore();
        }
        
        // reset
        heartBeatCounter--;
    }
    
    function drawSun(data)
    {
        // DRAW!
        ctx.clearRect(0,0,1000,600);  
        let barWidth = canvas.width/data.length;
        let barHeight = 5;
        let rAngle = Math.PI * 2;
        
        // linear gradient for the rays
        let grd=ctx.createLinearGradient(30, 30, 50, 50);
        grd.addColorStop(0, innerColor);
        grd.addColorStop(1, outerColor);
            
        // loop through the data and draw!
        for(let i = 0; i < data.length; i++) 
        { 
            ctx.fillStyle = 'rgba(0,255,0,0.6)'; 
            
            ctx.save();
            ctx.fillStyle = grd;
            
            // center the ring
            ctx.translate(canvas.width/2, canvas.height/2);
            
            // rotate it
            // switch direction to the left
            if(direction)
            {
                ctx.rotate((rAngle * (i / (data.length / 70))) + (speed -= 0.0002));
            }
            
            // default direction is to the right
            else
            {
                ctx.rotate((rAngle * (i / (data.length / 70))) + (speed += 0.0002));   
            }
                
            ctx.beginPath();
            ctx.fillRect(0, 70, barWidth - 12, barHeight + data[i] * 0.25);
            ctx.restore();
            
            let percent = data[i]/255;
            let circleRadius = percent * maxRadius;
            
            // middle circles
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = innerColor;
            ctx.globalAlpha = 0.10 - (percent/12.0);
            ctx.arc(canvas.width/2, canvas.height/2, circleRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
            
            // outer circles, bigger, more transparent
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = outerColor;
            ctx.globalAlpha = 0.10 - (percent/19.5);
            ctx.arc(canvas.width/2, canvas.height/2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
                
            // inner circles, smaller
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = innerColor;
            ctx.globalAlpha = 0.5 - (percent/9.5);
            ctx.arc(canvas.width/2, canvas.height/2, circleRadius * 0.50, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }
    }
    
    function drawAstronaut(data)
    {
        let timeStep = 1.5;
        
        // draw bezier curves
        for(let i = 0; i < data.length; i++)
        {
            ctx.save();
            ctx.rotate(Math.sin(speed / timeStep) * 0.1);
            ctx.beginPath();
            ctx.strokeStyle = makeColor(255, 255, 255, 1);
            ctx.strokeWidth = 2;
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(50, (50 + data[i/50] * 4), 100, (250  - data[i/50] * 4), 150, 300);
            ctx.stroke();
            ctx.restore();
            
            ctx.save();
            ctx.rotate(Math.sin((speed / timeStep)) * 0.1);
            ctx.beginPath();
            ctx.strokeStyle = makeColor(66, 134, 244, 1);
            ctx.strokeWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(50, (50 + data[i/20] * 4), 100, (250  - data[i/20] * 4), 150, 300);
            ctx.stroke();
            ctx.restore();
        }
        
        // draw image
        ctx.save();
        ctx.rotate(50 * Math.PI/180 + (Math.sin(speed / timeStep) * 0.1));
        ctx.drawImage(img, canvas.width/2 * - 0.4, canvas.height/2 * - 0.85);
        ctx.restore();
    }
    
    // random number generator
    function random (min, max) 
    {
        return Math.round((Math.random() * max - min) + min);
    }
    
    // create stars
    function starField (starsA) 
    {
        ctx.save();
        
        // loop to create stars
        for (let i = 0; i < starsA.length; i++) 
        {
            ctx.beginPath();
            starsA[i].brightness += random(-10, 10);
            ctx.globalAlpha = starsA[i].brightness;
            ctx.fillStyle = starColors[random(0, starColors.length)];
            ctx.arc(starsA[i].x, starsA[i].y, starsA[i].radius, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
        }

        ctx.restore();
    }
        
    function manipulatePixels()
    {
        // i) get all of the rgba pixel data of canvas by grabbing the ImageData object
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
        // ii) imageData.data is an 8-bit type array - values range from 0 - 255
        let data = imageData.data;
        let length = data.length;
        let width = imageData.width;
        
        // iii) iterate through each pixel
        for(let i = 0; i < length; i+=4)
        {   
            // vi) invert every color channel
            if(invert)
            {
				let red = data[i], green = data[i+1], blue=data[i+2];
				data[i] = 255 - red;       // set red value
				data[i+1] = 255 - green;   // set green value
				data[i+2] = 255 - blue;    // set blue value
                //data[i + 3] // alpha value
            } 
        }
            
        // put the modified data back on the canvas
        ctx.putImageData(imageData,0,0);
    }
		
        
    // HELPER
    function makeColor(red, green, blue, alpha)
    {
   	    let color='rgba('+red+','+green+','+blue+', '+alpha+')';
   	    return color;
    }
		
    // FULL SCREEN MODE
    function requestFullscreen(element) 
    {
        if (element.requestFullscreen)
        {
			 element.requestFullscreen();
        } 
        
        else if (element.mozRequestFullscreen) 
        {
			 element.mozRequestFullscreen();
        } 
        
        else if (element.mozRequestFullScreen) 
        { // camel-cased 'S' was changed to 's' in spec
			 element.mozRequestFullScreen();
        } 
        
        else if (element.webkitRequestFullscreen) 
        {
			 element.webkitRequestFullscreen();
        }
			// .. and do nothing if the method is not supported
    };
		
		
    window.addEventListener("load",init);
}());