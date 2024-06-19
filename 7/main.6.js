const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const response = await fetch("https://smartrazorvideos.s3.us-west-1.amazonaws.com/1716357432058x7714422730230437001718602864401wPtFR");
const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());

function prepareAudioBuffer(times)  {
    const sampleBounds = [];
    let totalFrames = 0;
    for (let i = 0; i < times.length; i++) {
        const a = Math.floor(times[i][0] * buffer.sampleRate);
        const b = Math.floor(times[i][1] * buffer.sampleRate);
        sampleBounds.push([a, b]);
        totalFrames += b - a;
    }
    const copiedAudioBuffer = new AudioBuffer({
        length: totalFrames,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate
    });
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const channelData = buffer.getChannelData(channel);
        const copiedChannelData = copiedAudioBuffer.getChannelData(channel);

        let sample = 0;
        for (let samples_i = 0; samples_i < sampleBounds.length; samples_i++) {
            for (let src_frame = sampleBounds[samples_i][0]; src_frame < sampleBounds[samples_i][1]; src_frame++) {
                copiedChannelData[sample] = channelData[src_frame];
                sample++;
            }
        }
    }
    return copiedAudioBuffer;
}

let copiedAudioBuffer;
let times;
let source;
source = audioContext.createBufferSource();

setInterval(function() {
    if (comms === undefined ) {
        return;
    }
    if (comms.get("start")) {
        source.start();
    }
    if ("segments" in comms) {
        times = comms.get("segments")
        copiedAudioBuffer = prepareAudioBuffer(times);
        source.buffer = copiedAudioBuffer;
        source.connect(audioContext.destination);
    }
    /*
    if (Math.random() > .95) {
        console.log(audioContext.currentTime);
    }
    */
},100);