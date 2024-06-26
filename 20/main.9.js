
console.log("main starting")

let audioContext;
let audioWorker;
async function createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('https://cdn.jsdelivr.net/gh/369-jas/srcdn@main/19/worklet.js');
    audioWorker = new AudioWorkletNode(audioContext, 'audio-worker');
    const audioVisChannel = new MessageChannel();
    worker.postMessage({ type: "AudioVisualChannel", data: audioVisChannel.port1 }, [audioVisChannel.port1]);
    audioWorker.port.postMessage({ type: "AudioVisualChannel", data: audioVisChannel.port2 }, [audioVisChannel.port2]);
    audioWorker.port.onmessage = function(e) {
        if (e.data.type === "Time") {
            let time = e.data.time;
            comms.send("trackBarTime", time);
        }
    }
    audioWorker.port.postMessage({type:"Segments", data: segments});
}

let local = false;
let url = "https://app.smartrazor.ai/worker.19.js";
if (local) {
    url = "./worker.19.js"
}
let worker = new Worker(url);


async function loadVideo(dataUri) {
    createAudioContext();
    const canvas = document.querySelector("canvas").transferControlToOffscreen();
    worker.postMessage({ type: "init", data: {dataUri, canvas}}, [canvas]);
    worker.postMessage({ type: "startRender", data: {}}, []);

    const response = await fetch(dataUri);
    const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());

    let [buffs, sampleRate] = getAudioBufferArrays(buffer);
    let arrBuffs = buffs.map(a=>a.buffer).slice(1)
    audioWorker.port.postMessage({type: "AudioData", data: {buffs, sampleRate}}, arrBuffs);
    audioWorker.connect(audioContext.destination);
}

function getAudioBufferArrays(buffer) {
    let datas = [];
    let sampleRate;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const channelData = buffer.getChannelData(channel);
        sampleRate = buffer.sampleRate;
        datas.push(channelData);
    }
    return [datas, sampleRate];
}

//let source;
let started = false;
let segments;
let loaded = false;

setInterval(function() {
    if (comms === undefined ) {
        return;
    } else if ("dataUri" in comms) {
        if (loaded) {
            return
        }
        loadVideo(comms.get("dataUri"));
        loaded = true;
    } else if (comms.get("start")) {
        started = true;
        audioContext.resume();
        audioWorker.port.postMessage({type:"Play"});
        worker.postMessage({type:"Play"});
    } else if (comms.get("pause")) {
        audioWorker.port.postMessage({type:"Pause"});
        worker.postMessage({type:"Pause"});
    } else if ("segments" in comms) {
        let times = comms.get("segments")
        segments = times;
        worker.postMessage({ type: "segments", data: {segments: times}});
        if (audioWorker !== undefined) {
            audioWorker.port.postMessage({type:"Segments", data: segments});
        }
    } else if ("seek" in comms) {
        let time = comms.get("seek");
        audioWorker.port.postMessage({type:"Seek", data: time});
    }
},100);


setInterval(function() {
    if (worker !== undefined && audioWorker !== undefined && started) {
        let latency = audioContext.outputLatency + audioContext.baseLatency;
        let timing = {
            now: performance.now(),
            timeOrigin: performance.timeOrigin,
            latency: latency,
            audioContextTime: audioContext.currentTime
        };
        audioWorker.port.postMessage({type: "Latency", data: timing});
    }
},100)


