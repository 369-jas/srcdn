let renderer = null;
let pendingFrame = null;
let startTime = null;
let frameCount = 0;
let pendingStatus = null;
let avport = null;
let playing = true;
let last_time = 0;

if('function' === typeof importScripts) {
  console.log("initializing workers");

  let local = false;
  if (local) {
    importScripts(
      "./demuxer_mp4.js",
      "./renderer_2d.js"
    );
  } else {
    importScripts(
      "https://cdn.jsdelivr.net/gh/369-jas/srcdn@main/21/demuxer_mp4.js",
      "https://cdn.jsdelivr.net/gh/369-jas/srcdn@main/21/renderer_2d.js"
    );
  }
  self.addEventListener("message", message => start(message.data));
}


function setStatus(type, message) {
  if (pendingStatus) {
    pendingStatus[type] = message;
  } else {
    pendingStatus = {[type]: message};
    self.requestAnimationFrame(statusAnimationFrame);
  }
}

function statusAnimationFrame() {
  self.postMessage(pendingStatus);
  pendingStatus = null;
}

function renderFrame(frame) {
  if (!pendingFrame) {
    // Schedule rendering in the next animation frame.
    requestAnimationFrame(renderAnimationFrame);
  } else {
  }
  // Set or replace the pending frame.
  pendingFrame = frame;
}

function renderAnimationFrame() {
  renderer.draw(pendingFrame);
  pendingFrame = null;
}

// Startup.
let frames = {}
let started = false;
let mtime = -1;
let time_received = performance.now();
let segments = [];

function handleInit(dataUri, canvas, segs) {
  // Pick a renderer to use.
  started = true;
  renderer = new Canvas2DRenderer(canvas);

  // Set up a VideoDecoder.
  const decoder = new VideoDecoder({
    output(frame) {
      // Update statistics.
      if (startTime == null) {
        startTime = performance.now();
      } else {
        const elapsed = (performance.now() - startTime) / 1000;
        const fps = ++frameCount / elapsed;
        setStatus("render", `${fps.toFixed(0)} fps`);
      }

      let time = Math.floor(frame.timestamp / 1000000);
      if (time in frames) {
        frames[time].push(frame);
      } else {
        frames[time] = [frame];
      }
      //renderFrame(frame);
    },
    error(e) {
      setStatus("decode", e);
    }
  });

  // Fetch and demux the media data.
  const demuxer = new MP4Demuxer(dataUri, {
    onConfig(config) {
      setStatus("decode", `${config.codec} @ ${config.codedWidth}x${config.codedHeight}`);
      decoder.configure(config);
    },
    onChunk(chunk) {
      decoder.decode(chunk);
    },
    setStatus
  });
}

function handleTime(t) {
    mtime = t;
    time_received = performance.now();
}

function start({type, data}) { //dataUri, canvas, time}) {
    if (type === "startRender") {
      startRender();
    }
    if (type === "init") {
      handleInit(data.dataUri, data.canvas, data.segs)
    }
    if (type === "Latency") {
      this.latency = data.latency;
    }
    if (type === "segments") {
      segments = data.segments;
    }
    if (type == "AudioVisualChannel") {
      avport = data;
      avport.onmessage = function(e) {
        let type2 = e.data.type;
        let data2 = e.data.timeInfo;
        if (type2 === "Time") {
          //console.log(data2);
          mtime = data2.playTime - data2.latency;
          //mtime = data2.playTime;
          time_received = performance.now();
        }
        if (type2 == "Pause") {
          console.log("Pausing video")
          playing = false;
        }
      }
    }
    if (type == "Pause") {
      playing = false;
    }
    if (type == "Play") {
      playing = true;
    }
}

function startRender() {
  requestAnimationFrame(function renderFrame2() {
    if (!(0 in frames) || frames[0].length == 0) {
      renderer.drawLoading();
      requestAnimationFrame(renderFrame2);
      return;
    }
    if (mtime == -1) {
      renderer.draw(frames[0][0]);
    } else {
      let t_vid = mtime * 1000000 + (performance.now() - time_received) * 1000;
      if (!playing) {
        t_vid = last_time;
      } else {
        last_time = t_vid;
      }

      let sec_idx = Math.floor(t_vid / 1000000);
      if (sec_idx in frames && frames[sec_idx].length != 0) {
          let diff = Math.abs(frames[sec_idx][0].timestamp - t_vid);
          let chosen_frame = frames[sec_idx][0];
          for (let i = 1 ; i < frames[sec_idx].length; i++) {
              let frame = frames[sec_idx][i]
              let curr_diff = Math.abs(frame.timestamp - t_vid);
              if (curr_diff < diff) {
                  chosen_frame = frame;
                  diff = curr_diff;
              }
          }
          renderer.draw(chosen_frame);
      }
    }
    requestAnimationFrame(renderFrame2);
  })
}
