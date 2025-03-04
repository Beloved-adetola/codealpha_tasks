document.addEventListener("DOMContentLoaded", function () {
  const mainImageContainer = document.getElementById("main-image-container");
  const imageList = document.getElementById("image-list");
  const imageUpload = document.getElementById("img-upload");
  const noImagesMessage = document.getElementById("no-images-message");
  let currentIndex = 0;
  let slideshowInterval;
  let db;

  // Open (or create) the IndexedDB database
  const request = indexedDB.open("imageGallery", 1);

  request.onupgradeneeded = function(event) {
      db = event.target.result;
      // Create the "images" object store if it doesn't already exist
      if (!db.objectStoreNames.contains("images")) {
          const objectStore = db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
          objectStore.createIndex("src", "src", { unique: false });
      }
  };

  request.onsuccess = function(event) {
      db = event.target.result;
      // Load images only after the DB connection is ready
      loadImagesFromDB();
  };

  request.onerror = function(event) {
      console.error("IndexedDB error: ", event.target.error);
  };

  // Load images from IndexedDB and add them to the gallery
  function loadImagesFromDB() {
      const transaction = db.transaction("images", "readonly");
      const store = transaction.objectStore("images");
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = function(event) {
          const imagesArray = event.target.result;
          if (imagesArray && imagesArray.length > 0) {
              imagesArray.forEach(imageObj => {
                  addThumbnail(imageObj.src, false);
              });
              displayMainImage(imagesArray[0].src);
              startSlideshow();
          }
          updateNoImagesMessage();
      };

      getAllRequest.onerror = function(event) {
          console.error("Error fetching images: ", event.target.error);
      };
  }

  // Save a new image (as a data URL) to IndexedDB
  function saveImageToDB(src) {
      const transaction = db.transaction("images", "readwrite");
      const store = transaction.objectStore("images");
      const addRequest = store.add({ src });

      addRequest.onerror = function(event) {
          console.error("Error saving image: ", event.target.error);
      };

      addRequest.onsuccess = function(event) {
          console.log("Image saved with id:", event.target.result);
      };
  }

  // Toggle the "no images" message based on the gallery state
  function updateNoImagesMessage() {
      if (imageList.children.length === 0) {
          noImagesMessage.style.display = "block";
          mainImageContainer.style.display = "none";
      } else {
          noImagesMessage.style.display = "none";
          mainImageContainer.style.display = "block";
      }
  }

  // Update the main image display
  function displayMainImage(src) {
      mainImageContainer.innerHTML = `<img src="${src}" alt="Main Image">`;
  }

  // Add a thumbnail to the gallery; if autoSave is true, store the image in IndexedDB
  function addThumbnail(src, autoSave = true) {
      const thumbnail = document.createElement("img");
      thumbnail.classList.add("thumb");
      thumbnail.src = src;
      thumbnail.alt = "Thumbnail";
      thumbnail.addEventListener("click", function() {
          clearInterval(slideshowInterval);
          displayMainImage(src);
          currentIndex = Array.from(imageList.children).indexOf(thumbnail);
          startSlideshow();
      });
      imageList.appendChild(thumbnail);
      if (autoSave) {
          saveImageToDB(src);
      }
  }

  // Start the slideshow, cycling through thumbnails every 5 seconds
  function startSlideshow() {
      const thumbnails = imageList.children;
      if (thumbnails.length > 0) {
          slideshowInterval = setInterval(function() {
              currentIndex = (currentIndex + 1) % thumbnails.length;
              displayMainImage(thumbnails[currentIndex].src);
          }, 5000);
      }
  }

  // When the user uploads images, convert each to a data URL and store it
  imageUpload.addEventListener("change", function(e) {
      const files = e.target.files;
      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = function(event) {
              const fileUrl = event.target.result;
              addThumbnail(fileUrl); // autoSave is true by default
              if (imageList.children.length === 1) {
                  displayMainImage(fileUrl);
                  startSlideshow();
              }
              updateNoImagesMessage();
          };
          reader.readAsDataURL(file);
      });
  });
});
