
const BACKEND_URL = "http://127.0.0.1:8000/predict";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const eyeImage = document.getElementById("eyeImage");
const uploadZone = document.getElementById("uploadZone");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const previewContainer = document.getElementById("previewContainer");
const imagePreview = document.getElementById("imagePreview");
const fileName = document.getElementById("fileName");
const uploadError = document.getElementById("uploadError");
const removeImage = document.getElementById("removeImage");
const analyzeButton = document.getElementById("analyzeButton");

const emptyResult = document.getElementById("emptyResult");
const resultContent = document.getElementById("resultContent");
const resultTitle = document.getElementById("resultTitle");
const resultStatus = document.getElementById("resultStatus");
const scoreValue = document.getElementById("scoreValue");
const meterTrack = document.getElementById("meterTrack");
const meterFill = document.getElementById("meterFill");
const careTitle = document.getElementById("careTitle");
const resultDescription = document.getElementById("resultDescription");
const doctorTitle = document.getElementById("doctorTitle");
const careNote = document.getElementById("careNote");

let selectedFile = null;
let previewUrl = null;

function showError(message) {
  uploadError.textContent = message;
  uploadError.hidden = false;
}

function clearError() {
  uploadError.textContent = "";
  uploadError.hidden = true;
}

function resetResult() {
  emptyResult.hidden = false;
  resultContent.hidden = true;
}

function handleFile(file) {
  clearError();

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    showError("Please upload a JPG, PNG, or WebP image.");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError("Image size must be 5 MB or less.");
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  selectedFile = file;
  previewUrl = URL.createObjectURL(file);

  imagePreview.src = previewUrl;
  fileName.textContent = file.name;

  uploadPlaceholder.hidden = true;
  previewContainer.hidden = false;
  analyzeButton.disabled = false;

  resetResult();
}

eyeImage.addEventListener("change", (event) => {
  handleFile(event.target.files[0]);
});

uploadZone.addEventListener("click", (event) => {
  if (event.target.closest("#removeImage")) return;
  if (event.target.closest("button")) return;

  eyeImage.click();
});

uploadZone.addEventListener("keydown", (event) => {
  if (
    event.target === uploadZone &&
    (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    eyeImage.click();
  }
});

uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadZone.classList.add("dragging");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragging");
});

uploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadZone.classList.remove("dragging");

  const file = event.dataTransfer.files[0];
  handleFile(file);
});

removeImage.addEventListener("click", (event) => {
  event.stopPropagation();

  selectedFile = null;
  eyeImage.value = "";

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  imagePreview.removeAttribute("src");
  fileName.textContent = "";

  uploadPlaceholder.hidden = false;
  previewContainer.hidden = true;
  analyzeButton.disabled = true;

  clearError();
  resetResult();
});

// Adjusted demonstration score rules
function getDisplayScore(originalScore) {
  if (originalScore <= 15) {
    return originalScore;
  }
  if (originalScore >=16 && originalScore <25) {
   return Math.min(originalScore + 60, 99.5);
  }

  if (originalScore >= 25) {
    return Math.min(originalScore + 70, 99.8);
  }

  return 99.5;
}

// Display category based on the adjusted score
function getDisplayCategory(score) {
  if (score < 70) {
    return "Low score";
  }

  if (score < 90) {
    return "Moderate score";
  }

  if (score < 99.12) {
    return "High score";
  }

  return "Very high score";
}

// Situation text based on the adjusted score
function getDisplayWarning(score) {
  if (score < 70) {
    return {
      title: "Low demonstration score",
      description:
        "The adjusted display score is below 70%. This value cannot establish whether your eyes are healthy."
    };
  }

  if (score < 90) {
    return {
      title: "Moderate demonstration score",
      description:
        "The adjusted display score is between 70% and 90%. It is not a medical risk estimate or a cataract probability."
    };
  }

  if (score < 99.12) {
    return {
      title: "High demonstration score",
      description:
        "The adjusted display score is high, but it does not establish whether cataracts are present or indicate their severity."
    };
  }

  return {
    title: "Very high demonstration score",
    description:
      "The adjusted display score is very high. This is a demonstration value, not a diagnosis or a measure of eye health."
  };
}

function displayResult(data) {
  const originalScore = Number(data.confidence);

  if (
    !Number.isFinite(originalScore) ||
    originalScore < 0 ||
    originalScore > 100
  ) {
    throw new Error("The server returned an invalid score.");
  }

  const displayScore = getDisplayScore(originalScore);
  const category = getDisplayCategory(displayScore);
  const warning = getDisplayWarning(displayScore);

  resultTitle.textContent = category;
  resultStatus.textContent = "Experimental";

  scoreValue.textContent = `${displayScore.toFixed(2)}%`;
  meterFill.style.width = `${displayScore}%`;

  meterTrack.setAttribute(
    "aria-valuenow",
    String(displayScore)
  );

  careTitle.textContent = "Situation";
  resultDescription.textContent =
    `${warning.title}. ${warning.description}`;

  doctorTitle.textContent = "When to consult an eye doctor";
  careNote.textContent =
    "If you have cloudy vision, blurred vision, or other vision changes, arrange an eye examination. Sudden vision changes need prompt medical assessment.";

  emptyResult.hidden = true;
  resultContent.hidden = false;
}

analyzeButton.addEventListener("click", async () => {
  if (!selectedFile) {
    showError("Please select an eye image first.");
    return;
  }

  clearError();
  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing...";

  try {
    const formData = new FormData();
    formData.append("eyeImage", selectedFile);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Unable to analyze this image."
      );
    }

    displayResult(data);
  } catch (error) {
    showError(
      error.message.includes("Failed to fetch")
        ? "Cannot connect to the AI server. Make sure your Python backend is running on port 8000."
        : error.message
    );
  } finally {
    analyzeButton.disabled = !selectedFile;
    analyzeButton.textContent = "Analyze Image →";
  }
});
