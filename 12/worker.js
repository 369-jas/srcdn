importScripts("https://cdn.jsdelivr.net/gh/369-jas/srcdn@main/12/demuxer_mp4.js", "https://cdn.jsdelivr.net/gh/369-jas/srcdn@main/12/renderer_2d.js");



// Status UI. Messages are batched per animation frame.
let pendingStatus = null;

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

// Rendering. Drawing is limited to once per animation frame.
let renderer = null;
let pendingFrame = null;
let startTime = null;
let frameCount = 0;

function renderFrame(frame) {
  if (!pendingFrame) {
    // Schedule rendering in the next animation frame.
    requestAnimationFrame(renderAnimationFrame);
  } else {
    // Close the current pending frame before replacing it.
    //pendingFrame.close();
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
let mtime = 0;
let time_received = performance.now();
let segments = [];

function handleInit(dataUri, canvas, segs) {
  // Pick a renderer to use.
  started = true;
  renderer = new Canvas2DRenderer(canvas);
  segments = segs

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

      // Schedule the frame to be rendered.
      
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
    if (type === "init") {
        handleInit(data.dataUri, data.canvas, data.segs)
    }
    if (type === "time") {
        handleTime(data.time);
    }
}

// Listen for the start request.
self.addEventListener("message", message => start(message.data));

self.addEventListener("message", message => function other() {
    console.log("other")
});

requestAnimationFrame(function renderFrame2() {
  if (mtime == 0 && 0 in frames && frames[0].length > 0) {
    renderer.draw(frames[0][0]);
  } else {

    let curr_time = mtime * 1000000 + (performance.now() - time_received) * 1000;
    let t_sec_prec = curr_time / 1000000;

    let seg_idx = 0;
    let tot_time = 0;
    while (tot_time + segments[seg_idx][1] - segments[seg_idx][0] < t_sec_prec) {
        tot_time += segments[seg_idx][1] - segments[seg_idx][0];
        seg_idx++;
    }
    let t_sec_prec_in_vid = segments[seg_idx][0] + t_sec_prec - tot_time;
    let curr_time_in_vid = t_sec_prec_in_vid * 1000000


    let t_sec = Math.floor(t_sec_prec_in_vid);


    if (t_sec in frames && frames[t_sec].length != 0) {
        let diff = Math.abs(frames[t_sec][0].timestamp - curr_time_in_vid);
        let chosen_frame = frames[t_sec][0];
        for (let i = 1 ; i < frames[t_sec].length; i++) {
            let curr_diff = Math.abs(frames[t_sec][i].timestamp - curr_time_in_vid);
            if (curr_diff < diff) {
                chosen_frame = frames[t_sec][i];
                diff = curr_diff;
            }
        }
        renderer.draw(chosen_frame);
    }
  }
  /*
  if (!pendingFrame) {
    // Schedule rendering in the next animation frame.
    requestAnimationFrame(renderAnimationFrame);
  } else {
    // Close the current pending frame before replacing it.
    pendingFrame.close();
  }
  // Set or replace the pending frame.
  pendingFrame = frame;
  */
  requestAnimationFrame(renderFrame2);
})