async function loadImageAndPredict(file, imageContainerId, resultContainerId) {
  // Load the TensorFlow.js model
  const model = await tf.loadLayersModel(
    "https://raw.githubusercontent.com/shkimmie-umb/melanoma_detection/master/meshnet_out/meshnet/model.json"
  );

  // Create an img element and set its source to the provided file
  const img = new Image();
  img.src = URL.createObjectURL(file);

  // Wait for the image to load
  img.onload = async () => {
    // Add the image to the DOM
    const imageContainer = document.getElementById(imageContainerId);
    imageContainer.innerHTML = "";
    imageContainer.appendChild(img);

    // Preprocess the image and predict
    let tensor = tf.browser
      .fromPixels(img)
      .resizeNearestNeighbor([150, 150]) // Resize the image
      .expandDims();

    // Make the prediction
    let prediction = await model.predict(tensor).dataSync();

    // Find the index of the highest score
    const maxIndex = prediction.indexOf(Math.max(...prediction));

    // Define the class labels
    const classLabels = ["Melanoma", "Non-Melanoma"];

    // Display the highest score and corresponding class label
    const resultContainer = document.getElementById(resultContainerId);
    resultContainer.innerHTML = `
      <p>Prediction Result:</p>
      <p>${classLabels[maxIndex]}: ${prediction[maxIndex].toFixed(2)}</p>
    `;
    resultContainer.classList.remove("hidden");
  };

  img.onerror = function () {
    console.error("Error loading the image.");
  };
}

const dropzone = document.getElementById("dropzone");
dropzone.ondragover = (event) => {
  event.preventDefault();
  dropzone.style.backgroundColor = "#eee";
};
dropzone.ondragleave = () => {
  dropzone.style.backgroundColor = "#fff";
};
dropzone.ondrop = (event) => {
  event.preventDefault();
  dropzone.style.backgroundColor = "#fff";
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    loadImageAndPredict(file, "drop-image-container", "drop-result-container");
  }
};

const takePictureButton = document.getElementById("take-picture");
const mobileTakePictureButton = document.getElementById("mobile-take-picture");
const mobileCapture = document.getElementById("mobile-capture");

// Check if the browser is running on a mobile device
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobileDevice) {
  mobileTakePictureButton.onclick = () => {
    // Trigger the file input click event
    mobileCapture.click();
  };

  mobileCapture.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      loadImageAndPredict(file, "capture-image-container", "capture-result-container");
      event.target.value = ""; // Clear the file input
    }
  });
} else {
  
  takePictureButton.onclick = () => {
    // Check if the browser supports the MediaDevices API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Request access to the rear camera
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          // Create a video element to display the camera stream
          const video = document.createElement("video");
          video.srcObject = stream;
          video.autoplay = true;
          video.playsInline = true; // Add this line to ensure video plays inline on mobile devices

          // Create a container for the video and capture button
          const videoContainer = document.createElement("div");
          videoContainer.classList.add("video-container");

          // Create a canvas element to capture the image
          const canvas = document.createElement("canvas");

          // Create a capture button
          const captureButton = document.createElement("button");
          captureButton.textContent = "Capture";
          captureButton.onclick = () => {
            // Set the canvas dimensions to match the video dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw the current video frame onto the canvas
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert the canvas to a data URL
            const dataURL = canvas.toDataURL("image/png");

            // Create an image element and set its source to the data URL
            const img = new Image();
            img.src = dataURL;

            // Call the loadImageAndPredict function with the captured image
            img.onload = () => {
              loadImageAndPredict(dataURLToBlob(dataURL), "capture-image-container", "capture-result-container");
            };

            // Stop the camera stream
            stream.getTracks().forEach((track) => track.stop());

            // Remove the video container and its contents from the DOM
            videoContainer.remove();
          };

          // Add the video and capture button to the video container
          videoContainer.appendChild(video);
          videoContainer.appendChild(captureButton);

          // Add the video container below the "Take Picture" button
          const takePictureFeature = document.querySelector(".feature:last-child");
          takePictureFeature.appendChild(videoContainer);
        })
        .catch((error) => {
          console.error("Error accessing the camera:", error);
        });
    } else {
      console.error("getUserMedia is not supported in this browser.");
    }
  }
}

// Helper function to convert a data URL to a Blob
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(";base64,");
  const contentType = parts[0].split(":")[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}