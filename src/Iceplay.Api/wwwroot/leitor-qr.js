(() => {
  const section = document.getElementById("pairing-reader");
  if (!section) return;
  const start = document.getElementById("reader-start");
  const stop = document.getElementById("reader-stop");
  const video = document.getElementById("reader-video");
  const status = document.getElementById("reader-status");
  const canvas = document.createElement("canvas");
  let available = false;
  let stream = null;
  let timeout = null;
  let generation = 0;

  function closeCamera() {
    generation++;
    if (timeout !== null) window.clearTimeout(timeout);
    timeout = null;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    video.hidden = true;
    stop.hidden = true;
    start.disabled = !available;
    // O frame é usado apenas em memória, sem envio ou armazenamento.
    canvas.width = canvas.height = 0;
  }

  window.iceplayQrReader = Object.freeze({ stop: closeCamera, setAvailable(value) {
    available = value;
    section.hidden = !value;
    if (!value) closeCamera();
    else if (!stream && stop.hidden) start.disabled = false;
  } });

  start.addEventListener("click", async () => {
    if (!available || start.disabled) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Abra o endereço HTTPS do ICEPLAY no Safari para usar a câmera.";
      return;
    }
    if (typeof window.jsQR !== "function") {
      status.textContent = "O leitor não carregou. Atualize a página e tente novamente.";
      return;
    }
    const request = ++generation;
    start.disabled = true;
    stop.hidden = false;
    status.textContent = "Permita o uso da câmera para ler o QR Code do computador.";
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      // A permissão pode chegar depois de Cancelar, sair da página ou entrar.
      if (request !== generation || !available || document.hidden) {
        acquired.getTracks().forEach(track => track.stop());
        return;
      }
      stream = acquired;
      video.srcObject = acquired;
      video.muted = true;
      video.playsInline = true;
      video.hidden = false;
      await video.play();
      if (request !== generation) return;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas");
      status.textContent = "Aponte para o QR Code exibido no computador.";
      const deadline = Date.now() + 90000;
      const frame = () => {
        if (request !== generation) return;
        if (Date.now() >= deadline) {
          closeCamera();
          status.textContent = "Leitura encerrada. Gere um novo QR Code e tente novamente.";
          return;
        }
        try {
          if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
            const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = window.jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
            if (result) {
              if (window.iceplayPairing?.acceptQr(result.data)) {
                closeCamera();
                status.textContent = "QR Code reconhecido. Confirme a conexão abaixo.";
                return;
              }
              status.textContent = "Este QR Code não é um convite deste ICEPLAY. Aponte para o código do computador.";
            }
          }
        } catch {
          closeCamera();
          status.textContent = "Não foi possível ler a imagem. Tente abrir a câmera novamente.";
          return;
        }
        timeout = window.setTimeout(frame, 180);
      };
      frame();
    } catch (error) {
      if (request !== generation) return;
      closeCamera();
      status.textContent = error.name === "NotAllowedError" || error.name === "SecurityError"
        ? "Câmera não autorizada. Permita o acesso à câmera nas opções do Safari e tente novamente."
        : error.name === "NotFoundError" || error.name === "OverconstrainedError"
          ? "Nenhuma câmera disponível. Confira o aparelho e tente novamente."
          : "Não foi possível iniciar a câmera. Feche outros aplicativos que a estejam usando e tente novamente.";
    }
  });

  stop.addEventListener("click", () => { closeCamera(); status.textContent = "Câmera encerrada."; });
  window.addEventListener("pagehide", closeCamera);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { closeCamera(); status.textContent = "Câmera encerrada. Toque em Ler QR Code para retomar."; }
  });
})();
