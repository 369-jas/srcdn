
console.log("main starting")
let local = window.location.href && window.location.href.indexOf("localhost") > -1;

let audioContext;
let audioWorker;
async function createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    if (local) {
        await audioContext.audioWorklet.addModule('./worklet.js');
    } else {
        await audioContext.audioWorklet.addModule('https://cdn.jsdelivr.net/gh/369-jas/srcdn@main/22/worklet.js');
    }
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
    if (segments !== null) {
        audioWorker.port.postMessage({type:"Segments", data: segments});
    }
    console.log("created audio context");
}

let url = "https://app.smartrazor.ai/worker.22.js";
if (local) {
    url = "./worker.22.js"
}
let worker = new Worker(url);


async function loadVideo(dataUri) {
    await createAudioContext();
    const canvas = document.querySelector("canvas").transferControlToOffscreen();
    worker.postMessage({ type: "init", data: {dataUri: dataUri + "STREAM", canvas}}, [canvas]);
    worker.postMessage({ type: "startRender", data: {}}, []);

    const response = await fetch(dataUri + "STREAM.mp3");
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
let segments = null;
let loaded = false;

setInterval(async function listencomms() {
    if (listencomms.running === true) {
        console.log("blocked")
        return;
    } else {
        listencomms.running = true;
    }

    if (comms === undefined ) {
    } else if ("dataUri" in comms) {
        if (!loaded) {
            await loadVideo(comms.get("dataUri"));
            loaded = true;
        }
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

    listencomms.running = false;
},100);


setInterval(function() {
    if (worker !== undefined && audioWorker !== undefined && started) {
        let latency = audioContext.baseLatency;
        if (typeof audioContext.outputLatency !== 'undefined') {
            latency += audioContext.outputLatency;
        } else {
            latency += .02;
        }

        let timing = {
            now: performance.now(),
            timeOrigin: performance.timeOrigin,
            latency: latency,
            audioContextTime: audioContext.currentTime
        };
        audioWorker.port.postMessage({type: "Latency", data: timing});
    }
},100)


