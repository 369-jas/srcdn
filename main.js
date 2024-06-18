const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const response = await fetch("https://smartrazorvideos.s3.us-west-1.amazonaws.com/1716357432058x7714422730230437001718602864401wPtFR");
const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
const times = [
    [2.042, 2.943], [3.223, 17.956], [44.573, 46.073],
    [48.794, 54.158], [65.2, 69.349], [88.016, 102.363],
    [110.026, 116.789], [119.585, 126.748], [130.629, 134.21],
    [137.091, 145.654], [148.744, 153.348], [156.05, 170.77],
    [192.792, 209.991], [250.231, 259.505], [297.387, 307.638]
];
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
const source = audioContext.createBufferSource();
source.buffer = copiedAudioBuffer;
source.connect(audioContext.destination);
setInterval(function() {
    console.log(audioContext.currentTime);
},1000);

export { source };