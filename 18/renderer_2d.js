class Canvas2DRenderer {
  #canvas = null;
  #ctx = null;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
  }

  drawLoading() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    const text = this.#ctx.measureText("Loading..."); // TextMetrics object
    text.width; // 16;
    this.#ctx.font = "48px serif";
    this.#ctx.fillStyle = "#ffffff";
    this.#ctx.fillText(
      "Loading...",
      this.#canvas.width / 2 - text.width / 2, this.#canvas.height / 2
    );
    console.log("loading");
  }
  draw(frame) {
    //this.#canvas.width = frame.displayWidth;
    //this.#canvas.height = frame.displayHeight;
    this.#ctx.drawImage(frame, 0, 0, this.#canvas.width, this.#canvas.height);
    //frame.close();
  }
};