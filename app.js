import { WatermarkEngine } from "./engine.js";

document.addEventListener("DOMContentLoaded", async () => {
  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");
  const previewSection = document.getElementById("previewSection");
  const originalImage = document.getElementById("originalImage");
  const processedImage = document.getElementById("processedImage");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  const toastInner = document.getElementById("toastInner");

  let engine = await WatermarkEngine.create().catch(() => null);
  let processedUrl = null;

  const showToast = (message, type = "info") => {
    if (!toast || !toastText || !toastInner) return;
    toastText.textContent = message;
    toast.classList.remove("hidden");

    toastInner.classList.remove(
      "border-jirox-blue/40",
      "border-jirox-red/40",
      "border-dark-border"
    );
    toastInner.classList.add(
      type === "error" ? "border-jirox-red/40" : "border-jirox-blue/40"
    );

    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.add("hidden"), 4200);
  };

  const setBusy = (busy) => {
    if (busy) {
      loadingOverlay.classList.remove("hidden");
      loadingOverlay.classList.add("flex");
    } else {
      loadingOverlay.classList.add("hidden");
      loadingOverlay.classList.remove("flex");
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!engine) {
      showToast(
        "Engine assets are missing (bg_48.png / bg_96.png). Add them in /assets then reload.",
        "error"
      );
      return;
    }
    if (!file.type?.startsWith("image/")) {
      showToast("Please upload an image file (PNG/JPG/WebP).", "error");
      return;
    }

    try {
      setBusy(true);
      const result = await engine.process(file);
      originalImage.src = result.originalSrc;

      if (processedUrl) URL.revokeObjectURL(processedUrl);
      processedUrl = URL.createObjectURL(result.blob);
      processedImage.src = processedUrl;

      downloadBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = processedUrl;
        a.download = "JiroX_Clean.png";
        a.click();
      };

      uploadArea.classList.add("hidden");
      previewSection.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      showToast(
        "Processing failed. Try a different image or refresh the page.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  // Click-to-upload
  uploadArea.onclick = () => fileInput.click();
  fileInput.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  };

  // Drag & drop
  const setDragUI = (isDragging) => {
    uploadArea.classList.toggle("border-jirox-blue", isDragging);
    uploadArea.classList.toggle("bg-white/5", isDragging);
  };
  ["dragenter", "dragover"].forEach((evt) => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragUI(true);
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragUI(false);
    });
  });
  uploadArea.addEventListener("drop", async (e) => {
    const file = e.dataTransfer?.files?.[0];
    await handleFile(file);
  });

  resetBtn.onclick = () => {
    previewSection.classList.add("hidden");
    uploadArea.classList.remove("hidden");
    fileInput.value = "";
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl);
      processedUrl = null;
    }
  };

  if (!engine) {
    // Non-blocking heads-up; upload still clickable but we'll show a clear error on use.
    showToast(
      "Setup incomplete: add /assets/bg_48.png and /assets/bg_96.png for the remover to work.",
      "error"
    );
  }
});
