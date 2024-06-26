class NoiseGenerator extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.channels = null;
    this.segments = [];
    this.sampleSegments = [];
    this.play = false;
    this.frame = 0;
    this.segmentIdx = 0;
    this.lastSynchronized = 0;

    this.port.onmessage = (e) => {
        if (e.data.type === "AudioData") {
            this.channels = e.data.data.buffs;
            this.avport.postMessage({type: "AudioLoaded"});
        } else if (e.data.type == "Segments") {
            this.segments = e.data.data;
            console.log("Segments", this.segments);
            let sampleSegments = [];
            for (let i = 0; i < this.segments.length; i++) {
                const a = Math.floor(this.segments[i][0] * sampleRate);
                const b = Math.floor(this.segments[i][1] * sampleRate);
                sampleSegments.push([a, b]);
            }
            this.segmentIdx = 0;
            this.sampleSegments = sampleSegments;
            this.frame = this.sampleSegments[0][0];
        } else if (e.data.type == "Play") {
            this.play = true;
        } else if (e.data.type == "Pause") {
            this.play = false;
        } else if (e.data.type == "AudioVisualChannel") {
            this.avport = e.data.data;
        } else if (e.data.type == "Latency") {
            let timeInfo = e.data.data;
            timeInfo.audioCurrentTime = currentTime;
            timeInfo.playTime = this.frame / sampleRate;
            if (this.avport !== undefined) {
                this.avport.postMessage({type: "Time", timeInfo});
            }
            this.port.postMessage({type: "Time", time: timeInfo.playTime})

        } else if (e.data.type == "Seek") {
            let time = e.data.data;
            this.frame = Math.floor(time * sampleRate);
            this.segmentIdx = 0;
            while (this.sampleSegments[this.segmentIdx][1] < this.frame) {
                this.segmentIdx++;
            }
        }
    }
  }


  process(inputs, outputs, parameters) {
    if (this.lastSynchronized + 0.5 < currentTime) {
        this.lastSynchronized = currentTime;
        let info = {
            playTime: this.frame / sampleRate,
            now: this.lastSynchronized
        }
    }

    if (
        this.channels === null || !this.play ||
        this.segments === undefined || this.segments.length == 0 ||
        this.sampleSegments === undefined || this.sampleSegments.length == 0
    ) {
        return true;
    }

    const output = outputs[0];
    if (output.length === 0) {
        return true;
    }

    for (let i = 0; i < output[0].length; ++i) {
        if (this.frame >= this.sampleSegments[this.segmentIdx][1]) {
            if (this.segmentIdx == this.sampleSegments.length - 1) {
                this.play = false;
                this.avport.postMessage({type: "Pause"});
                break;
            } else {
                this.segmentIdx++;
                this.frame = this.sampleSegments[this.segmentIdx][0];
            }
        }

        // for ad-hoc crossfade to avoid pops
        let custDist = Math.min(
            Math.abs(this.frame - this.sampleSegments[this.segmentIdx][1]),
            Math.abs(this.frame - this.sampleSegments[this.segmentIdx][0])
        );

        for (let channel = 0; channel < output.length; ++channel) {
            output[channel][i] = this.channels[channel][this.frame];
            if (custDist < 64) {
                let mult = custDist / 64;
                output[channel][i] *= mult;
            }
        }
        this.frame++;
    }

    return true;
  }
}

registerProcessor('audio-worker', NoiseGenerator);