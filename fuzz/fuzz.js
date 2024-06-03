// Declare variables for audio context and nodes
let audioContext;
let source;
let distortion;
let lowcutFilter, lowFilter, midFilter, highFilter, hicutFilter;
let gainNode, outputGainNode;
let inputAnalyser, outputAnalyser;
let inputMeter, eqCurveCanvas, eqCurveContext;

// Get references to the DOM elements
const fuzzControl = document.getElementById("fuzz");
const lowcutControl = document.getElementById("lowcut");
const lowControl = document.getElementById("low");
const midControl = document.getElementById("mid");
const highControl = document.getElementById("high");
const hicutControl = document.getElementById("hicut");
const outputControl = document.getElementById("output");
const startStopButton = document.getElementById("startStop");
const audioFileInput = document.getElementById("audioFile");
const audioInputSelect = document.getElementById("audioInput");
inputMeter = document.getElementById("inputVolume");
eqCurveCanvas = document.getElementById("eqCurve");
eqCurveContext = eqCurveCanvas.getContext("2d");
const led = document.getElementById("led");
const toggleSettingsButton = document.getElementById("toggleSettings");
const settingsContainer = document.querySelector(".settingsContainer");
const pedalControlContainer = document.querySelector(".pedalControlContainer");

// Function to create distortion curve
function createDistortionCurve(amount) {
    const k = typeof amount === "number" ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;

        curve[i] = Math.sign(x) * (1 - Math.exp(-k * Math.abs(x)));
    }
    return curve;
}

// Function to set up the audio context and nodes
function setupAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 44100,
        });

        // Create and configure audio nodes
        distortion = audioContext.createWaveShaper();
        distortion.curve = createDistortionCurve(fuzzControl.value * 50);
        distortion.oversample = "4x";

        lowcutFilter = audioContext.createBiquadFilter();
        lowcutFilter.type = "highpass";
        lowcutFilter.frequency.value = lowcutControl.value;

        lowFilter = audioContext.createBiquadFilter();
        lowFilter.type = "peaking";
        lowFilter.frequency.value = 100;
        lowFilter.Q.value = 1;
        lowFilter.gain.value = lowControl.value;

        midFilter = audioContext.createBiquadFilter();
        midFilter.type = "peaking";
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 0.7;
        midFilter.gain.value = midControl.value;

        highFilter = audioContext.createBiquadFilter();
        highFilter.type = "peaking";
        highFilter.frequency.value = 4000;
        highFilter.Q.value = 0.7;
        highFilter.gain.value = highControl.value;

        hicutFilter = audioContext.createBiquadFilter();
        hicutFilter.type = "lowpass";
        hicutFilter.frequency.value = hicutControl.value;

        gainNode = audioContext.createGain();
        gainNode.gain.value = 1;

        outputGainNode = audioContext.createGain();
        outputGainNode.gain.value = outputControl.value;

        inputAnalyser = audioContext.createAnalyser();
        outputAnalyser = audioContext.createAnalyser();
        inputAnalyser.fftSize = 2048;
        outputAnalyser.fftSize = 2048;
    }
}

// Function to connect the audio nodes
function connectNodes() {
    if (source) {
        source.disconnect();
    }

    source.connect(inputAnalyser);
    inputAnalyser.connect(gainNode);
    gainNode.connect(distortion);
    distortion.connect(lowcutFilter);
    lowcutFilter.connect(lowFilter);
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(hicutFilter);
    hicutFilter.connect(outputGainNode);
    outputGainNode.connect(outputAnalyser);
    outputAnalyser.connect(audioContext.destination);

    console.log("Audio nodes connected");
}

// Function to start or stop the audio context
function startStopAudio() {
    if (!audioContext || audioContext.state === "closed") {
        setupAudio();
        startStopButton.textContent = "ON";
        led.classList.add("on");
        const selectedDeviceId = audioInputSelect.value;
        navigator.mediaDevices
            .getUserMedia({ audio: { deviceId: selectedDeviceId } })
            .then((stream) => {
                source = audioContext.createMediaStreamSource(stream);
                connectNodes();
                visualizeInput();
                visualizeEQCurve();
                console.log("Microphone connected:", stream);
            })
            .catch((err) => {
                console.error("Error accessing microphone: " + err);
            });
    } else if (audioContext.state === "suspended") {
        audioContext.resume().then(() => {
            startStopButton.textContent = "ON";
            led.classList.add("on");
        });
    } else if (audioContext.state === "running") {
        audioContext.suspend().then(() => {
            startStopButton.textContent = "OFF";
            led.classList.remove("on");
        });
    } else if (audioContext.state === "closed") {
        audioContext = null;
        startStopButton.textContent = "OFF";
        led.classList.remove("on");
    }
}

// Functions to update the control values
function updateFuzz() {
    if (distortion) {
        distortion.curve = createDistortionCurve(fuzzControl.value * 50);
        document.getElementById("fuzzValue").value = fuzzControl.value;
        console.log("Fuzz updated:", fuzzControl.value);
    }
}

function updateLowcut() {
    if (lowcutFilter) {
        lowcutFilter.frequency.setTargetAtTime(
            lowcutControl.value,
            audioContext.currentTime,
            0.01
        );
        document.getElementById("lowcutValue").value = lowcutControl.value;
        console.log("Lowcut updated:", lowcutFilter.frequency.value);
    }
}

function updateLow() {
    if (lowFilter) {
        lowFilter.gain.setTargetAtTime(
            lowControl.value,
            audioContext.currentTime,
            0.01
        );
        document.getElementById("lowValue").value = lowControl.value;
        console.log("Low updated:", lowFilter.gain.value);
    }
}

function updateMid() {
    if (midFilter) {
        midFilter.gain.setTargetAtTime(
            midControl.value,
            audioContext.currentTime,
            0.01
        );
        document.getElementById("midValue").value = midControl.value;
        console.log("Mid updated:", midFilter.gain.value);
    }
}

function updateHigh() {
    if (highFilter) {
        highFilter.gain.setTargetAtTime(
            highControl.value,
            audioContext.currentTime,
            0.01
        );
        document.getElementById("highValue").value = highControl.value;
        console.log("High updated:", highFilter.gain.value);
    }
}

function updateHicut() {
    if (hicutFilter) {
        hicutFilter.frequency.setTargetAtTime(
            hicutControl.value,
            audioContext.currentTime,
            0.01
        );
        document.getElementById("hicutValue").value = hicutControl.value;
        console.log("Hicut updated:", hicutFilter.frequency.value);
    }
}

function updateOutput() {
    if (outputGainNode) {
        outputGainNode.gain.setTargetAtTime(
            outputControl.value,
            audioContext.currentTime,
            0.01
        );
        document.getElementById("outputValue").value = outputControl.value;
        console.log("Output updated:", outputGainNode.gain.value);
    }
}

// Function to handle audio file input
function handleAudioFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        setupAudio();
        audioContext.decodeAudioData(arrayBuffer, function (buffer) {
            if (source) {
                source.disconnect();
            }
            source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            connectNodes();
            source.start(0);
            visualizeInput();
            visualizeEQCurve();
            console.log("Audio file loaded and playing");
        });
    };

    reader.readAsArrayBuffer(file);
}

// Function to populate the audio input selection dropdown
function populateAudioInputSelect() {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter(
            (device) => device.kind === "audioinput"
        );
        audioInputSelect.innerHTML = "";
        audioInputs.forEach((device) => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.text =
                device.label || `Microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
        });
    });
}

// Function to visualize the input volume
function visualizeInput() {
    requestAnimationFrame(visualizeInput);
    const dataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
    inputAnalyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b) / dataArray.length / 256;
    inputMeter.value = volume;
}

// Function to visualize the EQ curve
function visualizeEQCurve() {
    requestAnimationFrame(visualizeEQCurve);
    const freqDomain = new Float32Array(outputAnalyser.frequencyBinCount);
    outputAnalyser.getFloatFrequencyData(freqDomain);

    eqCurveContext.clearRect(0, 0, eqCurveCanvas.width, eqCurveCanvas.height);
    eqCurveContext.strokeStyle = "#ff0";
    eqCurveContext.beginPath();
    for (let i = 0; i < freqDomain.length; i++) {
        const value = (freqDomain[i] + 140) / 140;
        const y = (1 - value) * eqCurveCanvas.height;
        if (i === 0) {
            eqCurveContext.moveTo(
                i * (eqCurveCanvas.width / freqDomain.length),
                y
            );
        } else {
            eqCurveContext.lineTo(
                i * (eqCurveCanvas.width / freqDomain.length),
                y
            );
        }
    }
    eqCurveContext.stroke();
}

// Function to toggle the settings container visibility
function toggleSettings() {
    settingsContainer.classList.toggle("hidden");
    pedalControlContainer.classList.toggle("hidden");
}

// Event listener for the toggle button
toggleSettingsButton.addEventListener("click", toggleSettings);

// Event listeners for page load and user interactions
window.addEventListener("load", () => {
    fuzzControl.addEventListener("input", updateFuzz);
    lowcutControl.addEventListener("input", updateLowcut);
    lowControl.addEventListener("input", updateLow);
    midControl.addEventListener("input", updateMid);
    highControl.addEventListener("input", updateHigh);
    hicutControl.addEventListener("input", updateHicut);
    outputControl.addEventListener("input", updateOutput);
    startStopButton.addEventListener("click", startStopAudio);
    audioFileInput.addEventListener("change", handleAudioFile);
    populateAudioInputSelect();
});
